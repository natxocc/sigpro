const isFunction = (value) => typeof value === 'function';
const isNode = (value) => value instanceof Node;
const get = (sig) => (sig?._isSignal ? sig.value : (isFn(sig) ? sig() : sig));

// --- Schedule System ---
let isScheduled = false;
const updateQueue = new Set();
const processQueue = () => {
    updateQueue.forEach(callback => callback());
    updateQueue.clear();
    isScheduled = false;
}

// --- Effects System ---
let activeEffect = null;
export const effect = (fn, isScope = false) => {
    let cleanup = null;
    const run = () => {
        stop();
        const previousEffect = activeEffect;
        activeEffect = run;
        try { cleanup = fn(); } finally { activeEffect = previousEffect; }
    }
    const stop = () => {
        run.subscriptions.forEach(subscribers => subscribers.delete(run));
        run.subscriptions.clear();
        if (isFunction(cleanup)) cleanup();
        if (run.childEffects) {
            run.childEffects.forEach(stopChild => stopChild());
            run.childEffects.length = 0;
        }
    }
    run.subscriptions = new Set();
    if (isScope) run.childEffects = [];
    run();
    if (activeEffect?.childEffects) activeEffect.childEffects.push(stop);
    return stop;
}

export const scope = (fn) => effect(fn, true);

const track = (subscribers) => {
    if (activeEffect && !activeEffect.childEffects) {
        subscribers.add(activeEffect);
        activeEffect.subscriptions.add(subscribers);
    }
}

// --- Signals Core ---
export const signal = (initialValue, storageKey = null) => {
    const subscribers = new Set();
    const hasStorage = typeof localStorage !== 'undefined';
    let currentValue = initialValue;

    if (storageKey && hasStorage) {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) try { currentValue = JSON.parse(saved); } catch { }
    }

    const signalObject = {
        _isSignal: true,
        get value() { track(subscribers); return currentValue; },
        set value(newValue) {
            if (newValue === currentValue) return;
            currentValue = newValue;
            subscribers.forEach(callback => updateQueue.add(callback));
            if (!isScheduled) { isScheduled = true; queueMicrotask(processQueue); }
        }
    };

    if (storageKey && hasStorage) {
        effect(() => localStorage.setItem(storageKey, JSON.stringify(signalObject.value)));
    }

    return signalObject;
};

export const untrack = (fn) => {
    const previousEffect = activeEffect;
    activeEffect = null;
    const result = fn();
    activeEffect = previousEffect;
    return result;
}

export const computed = (fn) => {
    const sig = signal();
    effect(() => sig.value = fn());
    return { get value() { return sig.value; } };
}

const reactiveCache = new WeakMap();
export const reactive = (targetObject) => {
    if (reactiveCache.has(targetObject)) return reactiveCache.get(targetObject);
    const subscribersMap = {};
    const proxy = new Proxy(targetObject, {
        get(target, key) {
            track(subscribersMap[key] ??= new Set());
            const value = target[key];
            return (value && typeof value === 'object') ? reactive(value) : value;
        },
        set(target, key, value) {
            if (target[key] === value) return true;
            target[key] = value;
            if (subscribersMap[key]) {
                subscribersMap[key].forEach(callback => updateQueue.add(callback));
                if (!isScheduled) { isScheduled = true; queueMicrotask(processQueue); }
            }
            return true;
        }
    });
    reactiveCache.set(targetObject, proxy);
    return proxy;
}

export const watch = (source, callback) => {
    let isFirstRun = true, oldValue;
    return effect(() => {
        const newValue = isFunction(source) ? source() : source.value;
        if (!isFirstRun) untrack(() => callback(newValue, oldValue));
        else isFirstRun = false;
        oldValue = newValue;
    });
}

// --- Rendering System ---
let currentContext = null;
export const onMount = (fn) => currentContext?.mountHooks.push(fn);
export const onUnmount = (fn) => currentContext?.unmountHooks.push(fn);
export const provide = (key, value) => currentContext && (currentContext.providers[key] = value);
export const inject = (key, defaultValue) => currentContext && (key in currentContext.providers ? currentContext.providers[key] : defaultValue);

const remove = (node) => {
    if (Array.isArray(node)) return node.forEach(remove);
    node.$stopEffect?.();
    if (node.$context) node.$context.unmountHooks.forEach(hook => hook());
    const finalize = () => node.remove();
    node.$leaveTransition ? node.$leaveTransition(finalize) : finalize();
}

const render = (renderFn, ...data) => {
    let node;
    const stop = effect(() => {
        node = renderFn(...data);
        if (isFunction(node)) node = node();
    }, true);
    if (node) node.$stopEffect = stop;
    return node;
}

export const h = (tag, props = {}, ...children) => {
    children = children.flat(Infinity);

    if (isFunction(tag)) {
        const previousContext = currentContext;
        currentContext = { mountHooks: [], unmountHooks: [], providers: { ...(previousContext?.providers || {}) } };
        const localContext = currentContext;
        let element;
        const stop = effect(() => {
            element = tag(props, {
                children,
                emit: (event, ...args) => props[`on${event[0].toUpperCase()}${event.slice(1)}`]?.(...args)
            });
            return () => localContext.unmountHooks.forEach(hook => hook());
        }, true);

        const output = isNode(element) ? element : document.createTextNode(String(element));
        output.$context = localContext;
        output.$stopEffect = stop;
        currentContext = previousContext;
        return output;
    }

    if (!tag) return children;

    const isSvg = /^(svg|path|circle|rect|line|polyline|polygon|g|text|defs|use|symbol)$/.test(tag);
    const element = isSvg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);

    const set = (k, v) => isSvg ? element.setAttribute(k, v) : (element[k] = v);

    for (const key in props) {
        const val = props[key];
        if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), val);
        else if (key === "ref") isFunction(val) ? val(element) : val.value = element;
        else if (isFunction(val) || val?._isSignal) effect(() => set(key, get(val)));
        else set(key, val);
    }

    children.forEach(child => append(element, child));
    return element;
}

const append = (parent, child) => {
    if (child == null) return;
    if (isFunction(child)) {
        const anchor = document.createTextNode('');
        parent.appendChild(anchor);
        let currentNodes = [];
        effect(() => {
            const rawChildren = [child()].flat(Infinity).filter(node => node != null);
            const nextNodes = rawChildren.map(node => isNode(node) ? node : document.createTextNode(String(node)));
            currentNodes.forEach(node => { if (!nextNodes.includes(node)) remove(node); });
            nextNodes.forEach((node, index) => {
                if (!currentNodes.includes(node)) {
                    parent.insertBefore(node, nextNodes[index + 1] || anchor);
                    if (node.$context) node.$context.mountHooks.forEach(hook => hook());
                }
            });
            currentNodes = nextNodes;
        }, true);
    } else {
        parent.appendChild(isNode(child) ? child : document.createTextNode(String(child)));
    }
}

// --- Control Flow & Built-in Components ---
export const If = (condition, renderFn, fallback = null) => {
    let cachedNode, currentCondition;
    return () => {
        const show = !!condition();
        if (show !== currentCondition) {
            if (cachedNode) remove(cachedNode);
            cachedNode = show ? render(renderFn) : (isFunction(fallback) ? render(fallback) : fallback);
            currentCondition = show;
        }
        return cachedNode;
    }
}

export const For = (list, keyFn, renderFn) => {
    let nodeCache = new Map();
    return () => {
        const nextCache = new Map();
        const items = isFunction(list) ? list() : (list.value || list);
        const results = items.map((item, index) => {
            const id = isFunction(keyFn) ? keyFn(item, index) : (keyFn ? item[keyFn] : item);
            let node = nodeCache.get(id);
            if (!node) node = render(renderFn, item, index);
            nextCache.set(id, node);
            return node;
        });
        nodeCache.forEach((node, id) => { if (!nextCache.has(id)) remove(node); });
        nodeCache = nextCache;
        return results;
    }
}

export const Component = ({ is, ...props }, { children }) => () => h(isFunction(is) ? is() : is, props, children);

export const Transition = ({ enter, idle, leave }, { children: [child] }) => {
    const decorate = (element) => {
        if (!isNode(element)) return element;
        const addClasses = css => css && element.classList.add(...css.split(' '));
        const removeClasses = css => css && element.classList.remove(...css.split(' '));

        if (enter) {
            requestAnimationFrame(() => {
                addClasses(enter[1]);
                requestAnimationFrame(() => {
                    addClasses(enter[0]); removeClasses(enter[1]); addClasses(enter[2]);
                    element.addEventListener('transitionend', () => {
                        removeClasses(enter[2]); removeClasses(enter[0]); addClasses(idle);
                    }, { once: true });
                });
            });
        }
        if (leave) {
            element.$leaveTransition = (done) => {
                removeClasses(idle); addClasses(leave[1]);
                requestAnimationFrame(() => {
                    addClasses(leave[0]); removeClasses(leave[1]); addClasses(leave[2]);
                    element.addEventListener('transitionend', () => {
                        removeClasses(leave[2]); removeClasses(leave[0]); done();
                    }, { once: true });
                });
            }
        }
        return element;
    }
    return isFunction(child) ? () => decorate(child()) : decorate(child);
}

// --- Routing & Application Entry ---
export const Router = (routes) => {
    const path = signal(window.location.hash.slice(1) || '/'), params = signal({});
    Router.path = path;
    Router.params = params;
    Router.to = (p) => window.location.hash = p;
    Router.back = () => window.history.back();
    window.onhashchange = () => path.value = window.location.hash.slice(1) || '/';
    return h('div', { class: 'router-view' }, () => {
        const cur = path.value;
        for (const r of routes) {
            const match = cur.match(new RegExp(`^${r.path.replace(/:[^\s/]+/g, '([^/]+)')}$`));
            if (match) {
                const p = {};
                (r.path.match(/:[^\s/]+/g) || []).forEach((k, i) => p[k.slice(1)] = match[i + 1]);
                untrack(() => params.value = p);
                return h(r.component, { params: p, path: cur });
            }
        }
        const fallback = routes.find(r => r.path === '*');
        return fallback ? h(fbk.component) : '404';
    });
};


export const mount = (root, target, props = {}) => {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return;

    container.replaceChildren();

    const el = h(root, props);
    container.appendChild(el);

    return () => remove(el);
};

export default (target, rootComponent, props) => {
    const element = h(rootComponent, props);
    target.appendChild(element);
    if (element.$context) element.$context.mountHooks.forEach(hook => hook());
    return () => remove(element);
}