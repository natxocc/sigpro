const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i;
const DANGEROUS_ATTRIBUTES = /^on/i;

const sanitizeUrl = (url) => {
    const str = String(url ?? '').trim().toLowerCase();
    if (DANGEROUS_PROTOCOLS.test(str)) return '#';
    return str;
};

const sanitizeAttribute = (name, value) => {
    if (value == null) return null;
    const strValue = String(value);
    if (DANGEROUS_ATTRIBUTES.test(name)) {
        console.warn(`[SigPro] XSS prevention: blocked attribute "${name}"`);
        return null;
    }
    if (name === 'src' || name === 'href') {
        return sanitizeUrl(strValue);
    }
    return strValue;
};

let activeEffect = null;
let isScheduled = false;
const queue = new Set();

const tick = () => {
    while (queue.size) {
        const runs = [...queue];
        queue.clear();
        runs.forEach(fn => fn());
    }
    isScheduled = false;
};

const schedule = (fn) => {
    if (fn.d) return;
    queue.add(fn);
    if (!isScheduled) {
        queueMicrotask(tick);
        isScheduled = true;
    }
};

const depend = (subs) => {
    if (activeEffect && !activeEffect.c) {
        subs.add(activeEffect);
        activeEffect.e.add(subs);
    }
};

export const effect = (fn, isScope = false) => {
    let cleanup = null;

    const run = () => {
        if (run.d) return;
        const prev = activeEffect;
        activeEffect = run;
        const result = fn();
        if (typeof result === 'function') cleanup = result;
        activeEffect = prev;
    };

    const stop = () => {
        if (run.d) return;
        run.d = true;
        run.e.forEach(subs => subs.delete(run));
        run.e.clear();
        cleanup?.();
        run.c?.forEach(f => f());
    };

    run.e = new Set();
    run.d = false;
    if (isScope) run.c = [];

    run();
    activeEffect?.c?.push(stop);

    return stop;
};

effect.react = (fn) => {
    const prev = activeEffect;
    activeEffect = null;
    const result = fn();
    activeEffect = prev;
    return result;
};

export function $(initial, storageKey) {
    const isComputed = typeof initial === 'function';

    if (!isComputed) {
        let value = initial;
        const subs = new Set();

        if (storageKey) {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved !== null) value = JSON.parse(saved);
            } catch { }
        }

        const signalFn = (...args) => {
            if (args.length === 0) {
                return value;
            }
            const next = typeof args[0] === 'function' ? args[0](value) : args[0];
            if (Object.is(value, next)) return value;
            value = next;
            if (storageKey) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(value));
                } catch { }
            }
            subs.forEach(fn => schedule(fn));
            return value;
        };

        signalFn.react = () => {
            depend(subs);
            return value;
        };

        return signalFn;
    }

    let cached;
    let dirty = true;
    const subs = new Set();
    const fn = initial;

    effect(() => {
        const newValue = fn();
        if (!Object.is(cached, newValue) || dirty) {
            cached = newValue;
            dirty = false;
            subs.forEach(fn => schedule(fn));
        }
    });

    const computedFn = () => {
        return cached;
    };

    computedFn.react = () => {
        depend(subs);
        return cached;
    };

    return computedFn;
}

export const scope = (fn) => effect(fn, true);

export const watch = (source, callback) => {
    let first = true;
    let oldValue;

    return effect(() => {
        const newValue = source();
        if (!first) {
            effect.react(() => callback(newValue, oldValue));
        } else {
            first = false;
        }
        oldValue = newValue;
    });
};

const reactiveCache = new WeakMap();

export function $$(obj) {
    if (reactiveCache.has(obj)) {
        return reactiveCache.get(obj);
    }

    const subs = {};

    const proxy = new Proxy(obj, {
        get(target, key, receiver) {
            const subsForKey = subs[key] ??= new Set();
            depend(subsForKey);
            const val = Reflect.get(target, key, receiver);
            return (val && typeof val === 'object') ? $$(val) : val;
        },
        set(target, key, val, receiver) {
            if (Object.is(target[key], val)) return true;
            const success = Reflect.set(target, key, val, receiver);
            if (subs[key]) {
                subs[key].forEach(fn => schedule(fn));
                if (!isScheduled) {
                    queueMicrotask(tick);
                    isScheduled = true;
                }
            }
            return success;
        }
    });

    reactiveCache.set(obj, proxy);
    return proxy;
}

let context = null;

export const onMount = (fn) => {
    context?.m.push(fn);
};

export const onUnmount = (fn) => {
    context?.u.push(fn);
};

export const share = (key, value) => {
    if (context) context.p[key] = value;
};

export const use = (key, defaultValue) => {
    if (context && key in context.p) return context.p[key];
    return defaultValue;
};

export function createContext(defaultValue) {
    const key = Symbol('context');

    const useContext = () => {
        let current = context;
        while (current) {
            if (key in current.p) {
                return current.p[key];
            }
            current = null;
        }
        if (defaultValue !== undefined) return defaultValue;
        throw new Error(`Context not found: ${String(key)}`);
    };

    const Provider = ({ value, children }) => {
        const prevContext = context;
        if (!context) {
            context = { m: [], u: [], p: {} };
        }
        context.p[key] = value;
        const result = h('div', { style: 'display: contents' }, children);
        context = prevContext;
        return result;
    };

    return { Provider, use: useContext };
}

export function createSharedContext(key, initialValue) {
    if (context && !(key in context.p)) {
        share(key, initialValue);
    }

    return {
        set: (value) => share(key, value),
        get: () => use(key)
    };
}

const isFn = (v) => typeof v === 'function';
const isNode = (v) => v instanceof Node;

const append = (parent, child) => {
    if (child === null) return;

    if (isFn(child)) {
        const anchor = document.createTextNode('');
        parent.appendChild(anchor);
        let nodes = [];

        effect(() => {
            effect(() => {
                const newNodes = [child()]
                    .flat(Infinity)
                    .map((node) => isFn(node) ? node() : node)
                    .flat(Infinity)
                    .filter((node) => node !== null)
                    .map((node) => isNode(node) ? node : document.createTextNode(String(node)));

                const oldNodes = nodes.filter(node => {
                    const keep = newNodes.includes(node);
                    if (!keep) remove(node);
                    return keep;
                });

                const oldIdxs = new Map(oldNodes.map((node, i) => [node, i]));

                for (let i = newNodes.length - 1, p = oldNodes.length - 1; i >= 0; i--) {
                    const node = newNodes[i];
                    const ref = newNodes[i + 1] || anchor;

                    if (!oldIdxs.has(node)) {
                        anchor.parentNode?.insertBefore(node, ref);
                        node.$c?.m.forEach(fn => fn());
                    } else if (oldNodes[p] !== node) {
                        if (newNodes[i - 1] !== oldNodes[p]) {
                            anchor.parentNode?.insertBefore(oldNodes[p], node);
                            oldNodes[oldIdxs.get(node)] = oldNodes[p];
                            oldNodes[p] = node;
                            p--;
                        }
                        anchor.parentNode?.insertBefore(node, ref);
                    } else {
                        p--;
                    }
                }
                nodes = newNodes;
            });
        }, true);
    } else if (isNode(child)) {
        parent.appendChild(child);
    } else {
        parent.appendChild(document.createTextNode(String(child)));
    }
};

const remove = (node) => {
    const el = node;
    el.$s?.();
    el.$l?.(() => node.remove());
    if (!el.$l) node.remove();
};

const render = (fn, ...data) => {
    let node;
    const stop = effect(() => {
        node = fn(...data);
        if (isFn(node)) node = node();
    }, true);
    if (node) node.$s = stop;
    return node;
};

export const h = (tag, props, ...children) => {
    props = props || {};
    children = children.flat(Infinity);

    if (isFn(tag)) {
        const prev = context;
        context = { m: [], u: [], p: { ...(prev?.p || {}) } };
        let el;

        const stop = effect(() => {
            el = tag(props, {
                children,
                emit: (evt, ...args) =>
                    props[`on${evt[0].toUpperCase()}${evt.slice(1)}`]?.(...args),
            });
            return () => el.$c.u.forEach(fn => fn());
        }, true);

        if (isNode(el) || isFn(el)) {
            el.$c = context;
            el.$s = stop;
        }

        context = prev;
        return el;
    }

    if (!tag) return () => children;

    let el;
    let is_svg = false;

    try {
        el = document.createElement(tag);
        if (el instanceof HTMLUnknownElement) {
            is_svg = true;
            el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        }
    } catch {
        is_svg = true;
        el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    }

    const booleanAttributes = ["disabled", "checked", "required", "readonly", "selected", "multiple", "autofocus"];

    for (const key in props) {
        if (key.startsWith('on')) {
            const eventName = key.slice(2).toLowerCase();
            el.addEventListener(eventName, props[key]);
        } else if (key === "ref") {
            if (isFn(props[key])) {
                props[key](el);
            } else {
                props[key].current = el;
            }
        } else if (isFn(props[key])) {
            effect(() => {
                const val = props[key]();
                if (key === 'className') {
                    el.setAttribute('class', String(val ?? ''));
                } else if (booleanAttributes.includes(key)) {
                    el[key] = !!val;
                    val ? el.setAttribute(key, '') : el.removeAttribute(key);
                } else if (key in el && !is_svg) {
                    el[key] = val;
                } else {
                    const safeVal = sanitizeAttribute(key, val);
                    if (safeVal !== null) el.setAttribute(key, safeVal);
                }
            });
        } else {
            const value = props[key];
            if (key === 'className') {
                el.setAttribute('class', String(value ?? ''));
            } else if (booleanAttributes.includes(key)) {
                el[key] = !!value;
                value ? el.setAttribute(key, '') : el.removeAttribute(key);
            } else if (key in el && !is_svg) {
                el[key] = value;
            } else {
                const safeVal = sanitizeAttribute(key, value);
                if (safeVal !== null) el.setAttribute(key, safeVal);
            }
        }
    }

    children.forEach((child) => append(el, child));

    return el;
};

export const If = (cond, renderFn, fallback = null) => {
    let cached;
    let current = null;

    return () => {
        const show = isFn(cond) ? cond() : cond;
        if (show !== current) {
            cached = show ? render(renderFn) : (isFn(fallback) ? render(fallback) : fallback);
        }
        current = show;
        return cached;
    };
};

export const For = (list, key, renderFn) => {
    let cache = new Map();

    return () => {
        const next = new Map();
        const items = (isFn(list) ? list() : list.value || list);

        const nodes = items.map((item, index) => {
            const idx = isFn(key) ? key(item, index) : key ? item[key] : index;
            let node = cache.get(idx);
            if (!node) {
                node = render(renderFn, item, index);
            }
            next.set(idx, node);
            return node;
        });

        cache = next;
        return nodes;
    };
};

export const Transition = ({ enter: e, idle, leave: l }, { children: [c] }) => {
    const decorate = (el) => {
        if (!isNode(el)) return el;

        const addClass = (c) => c && el.classList.add(...c.split(' '));
        const removeClass = (c) => c && el.classList.remove(...c.split(' '));

        if (e) {
            requestAnimationFrame(() => {
                addClass(e[1]);
                requestAnimationFrame(() => {
                    addClass(e[0]);
                    removeClass(e[1]);
                    addClass(e[2]);
                    el.addEventListener('transitionend', () => {
                        removeClass(e[2]);
                        removeClass(e[0]);
                        addClass(idle);
                    }, { once: true });
                });
            });
        }

        if (l) {
            el.$l = (done) => {
                removeClass(idle);
                addClass(l[1]);
                requestAnimationFrame(() => {
                    addClass(l[0]);
                    removeClass(l[1]);
                    addClass(l[2]);
                    el.addEventListener('transitionend', () => {
                        removeClass(l[2]);
                        removeClass(l[0]);
                        done();
                    }, { once: true });
                });
            };
        }

        return el;
    };

    if (!c) return null;
    if (isFn(c)) {
        return () => decorate(c());
    }
    return decorate(c);
};

export const Router = (routes) => {
    const getPath = () => window.location.hash.slice(1) || "/";
    const path = $(getPath());
    const params = $({});

    const matchRoute = (path) => {
        for (const route of routes) {
            const routeParts = route.path.split("/").filter(Boolean);
            const pathParts = path.split("/").filter(Boolean);

            if (routeParts.length !== pathParts.length) continue;

            const matchedParams = {};
            let ok = true;

            for (let i = 0; i < routeParts.length; i++) {
                if (routeParts[i].startsWith(":")) {
                    matchedParams[routeParts[i].slice(1)] = pathParts[i];
                } else if (routeParts[i] !== pathParts[i]) {
                    ok = false;
                    break;
                }
            }

            if (ok) return { component: route.component, params: matchedParams };
        }

        const wildcard = routes.find(r => r.path === "*");
        if (wildcard) return { component: wildcard.component, params: {} };

        return null;
    };

    window.addEventListener("hashchange", () => path(getPath()));

    const outlet = h("div");

    effect(() => {
        const matched = matchRoute(path());
        if (!matched) return;

        params(matched.params);

        while (outlet.firstChild) outlet.removeChild(outlet.firstChild);
        outlet.appendChild(h(matched.component));
    });

    return {
        view: outlet,
        to: (p) => { window.location.hash = p; },
        back: () => window.history.back(),
        params: () => params,
    };
};

export const mount = (component, target, props) => {
    const targetEl = typeof target === "string" ? document.querySelector(target) : target;
    if (!targetEl) throw new Error("Target element not found");
    const el = h(component, props);
    targetEl.appendChild(el);
    el.$c?.m.forEach(fn => fn());
    return () => remove(el);
};

export default (target, root, props) => {
    const el = h(root, props);
    target.appendChild(el);
    el.$c?.m.forEach(fn => fn());
    return () => remove(el);
};

export { h as jsx, h as jsxs, h as Fragment };