const isFn = (v) => typeof v === 'function';
const isNode = (v) => v instanceof Node;

let isScheduled = false;
const queue = new Set();
const tick = () => {
    queue.forEach(fn => fn());
    queue.clear();
    isScheduled = false;
}

let activeEffect = null;
export const effect = (fn, is_scope = false) => {
    let cleanup = null;
    const run = () => {
        stop();
        const prev = activeEffect;
        activeEffect = run;
        try { cleanup = fn(); } finally { activeEffect = prev; }
    }
    const stop = () => {
        run.e.forEach(subs => subs.delete(run));
        run.e.clear();
        if (isFn(cleanup)) cleanup();
        if (run.c) {
            run.c.forEach(s => s());
            run.c.length = 0;
        }
    }
    run.e = new Set();
    if (is_scope) run.c = [];
    run();
    if (activeEffect?.c) activeEffect.c.push(stop);
    return stop;
}

export const scope = f => effect(f, true);

const track = (subs) => {
    if (activeEffect && !activeEffect.c) {
        subs.add(activeEffect);
        activeEffect.e.add(subs);
    }
}

export const signal = (value) => {
    const subs = new Set();
    return {
        _isSig: true,
        get value() { track(subs); return value; },
        set value(newValue) {
            if (newValue === value) return;
            value = newValue;
            subs.forEach(fn => queue.add(fn));
            if (!isScheduled) { isScheduled = true; queueMicrotask(tick); }
        }
    }
}

export const untrack = (fn) => {
    const prev = activeEffect;
    activeEffect = null;
    const result = fn();
    activeEffect = prev;
    return result;
}

export const computed = (fn) => {
    const sig = signal();
    effect(() => sig.value = fn());
    return { get value() { return sig.value; } };
}

const reactiveCache = new WeakMap();
export const reactive = (obj) => {
    if (reactiveCache.has(obj)) return reactiveCache.get(obj);
    const subs = {};
    const proxy = new Proxy(obj, {
        get(t, key) {
            track(subs[key] ??= new Set());
            const val = t[key];
            return (val && typeof val === 'object') ? reactive(val) : val;
        },
        set(t, key, val) {
            if (t[key] === val) return true;
            t[key] = val;
            if (subs[key]) {
                subs[key].forEach(fn => queue.add(fn));
                if (!isScheduled) { isScheduled = true; queueMicrotask(tick); }
            }
            return true;
        }
    });
    reactiveCache.set(obj, proxy);
    return proxy;
}

export const persist = (key, target) => {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
        const data = JSON.parse(saved);
        if (target._isSig) target.value = data;
        else Object.assign(target, data);
    }
    effect(() => {
        const val = target._isSig ? target.value : target;
        localStorage.setItem(key, JSON.stringify(val));
    });
    return target;
};

export const storage = (key, val) => persist(key, signal(val));

export const watch = (source, cb) => {
    let first = true, oldValue;
    return effect(() => {
        const newValue = isFn(source) ? source() : source.value;
        if (!first) untrack(() => cb(newValue, oldValue));
        else first = false;
        oldValue = newValue;
    });
}

let context = null;
export const onMount = (fn) => context?.m.push(fn);
export const onUnmount = (fn) => context?.u.push(fn);
export const provide = (key, value) => context && (context.p[key] = value);
export const inject = (key, dft) => context && (key in context.p ? context.p[key] : dft);

const remove = (node) => {
    if (Array.isArray(node)) return node.forEach(remove);
    node.$s?.(); 
    if (node.$c) node.$c.u.forEach(f => f());
    const done = () => node.remove();
    node.$l ? node.$l(done) : done();
}

const render = (fn, ...data) => {
    let node;
    const stop = effect(() => {
        node = fn(...data);
        if (isFn(node)) node = node();
    }, true);
    if (node) node.$s = stop;
    return node;
}

export const h = (tag, props = {}, ...children) => {
    children = children.flat(Infinity);
    if (isFn(tag)) {
        const prev = context;
        context = { m: [], u: [], p: { ...(prev?.p || {}) } };
        const ctx = context;
        let el;
        const stop = effect(() => {
            el = tag(props, { children, emit: (evt, ...args) => props[`on${evt[0].toUpperCase()}${evt.slice(1)}`]?.(...args) });
            return () => ctx.u.forEach(f => f());
        }, true);
        const out = isNode(el) ? el : document.createTextNode(String(el));
        out.$c = ctx;
        out.$s = stop;
        context = prev;
        return out;
    }
    if (!tag) return children;
    const isSvg = tag === 'svg' || tag === 'path' || tag === 'circle';
    const el = isSvg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
    for (const key in props) {
        if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), props[key]);
        else if (key === "ref") isFn(props[key]) ? props[key](el) : props[key].value = el;
        else if (isFn(props[key])) effect(() => el[key] = props[key]());
        else el[key] = props[key];
    }
    children.forEach(child => append(el, child));
    return el;
}

const append = (parent, child) => {
    if (child == null) return;
    if (isFn(child)) {
        const anchor = document.createTextNode('');
        parent.appendChild(anchor);
        let nodes = [];
        effect(() => {
            const raw = [child()].flat(Infinity).filter(n => n != null);
            const newNodes = raw.map(n => isNode(n) ? n : document.createTextNode(String(n)));
            nodes.forEach(n => { if (!newNodes.includes(n)) remove(n); });
            newNodes.forEach((n, i) => {
                if (!nodes.includes(n)) {
                    parent.insertBefore(n, newNodes[i+1] || anchor);
                    if (n.$c) n.$c.m.forEach(f => f());
                }
            });
            nodes = newNodes;
        }, true);
    } else {
        parent.appendChild(isNode(child) ? child : document.createTextNode(String(child)));
    }
}

export const If = (cond, renderFn, fallback = null) => {
    let cached, current;
    return () => {
        const show = !!cond();
        if (show !== current) {
            if (cached) remove(cached);
            cached = show ? render(renderFn) : (isFn(fallback) ? render(fallback) : fallback);
            current = show;
        }
        return cached;
    }
}

export const For = (list, key, renderFn) => {
    let cache = new Map();
    return () => {
        const next = new Map();
        const items = isFn(list) ? list() : (list.value || list);
        const res = items.map((item, i) => {
            const id = isFn(key) ? key(item, i) : (key ? item[id] : item);
            let node = cache.get(id);
            if (!node) node = render(renderFn, item, i);
            next.set(id, node);
            return node;
        });
        cache.forEach((node, id) => { if (!next.has(id)) remove(node); });
        cache = next;
        return res;
    }
}

export const Component = ({ is, ...props }, { children }) => () => h(isFn(is) ? is() : is, props, children);

export const Transition = ({ enter: e, idle, leave: l }, { children: [c] }) => {
    const decorate = (el) => {
        if (!isNode(el)) return el;
        const addClass = c => c && el.classList.add(...c.split(' '));
        const removeClass = c => c && el.classList.remove(...c.split(' '));
        if (e) {
            requestAnimationFrame(() => {
                addClass(e[1]);
                requestAnimationFrame(() => {
                    addClass(e[0]); removeClass(e[1]); addClass(e[2]);
                    el.addEventListener('transitionend', () => {
                        removeClass(e[2]); removeClass(e[0]); addClass(idle);
                    }, { once: true });
                });
            });
        }
        if (l) {
            el.$l = (done) => {
                removeClass(idle); addClass(l[1]);
                requestAnimationFrame(() => {
                    addClass(l[0]); removeClass(l[1]); addClass(l[2]);
                    el.addEventListener('transitionend', () => {
                        removeClass(l[2]); removeClass(l[0]); done();
                    }, { once: true });
                });
            }
        }
        return el;
    }
    return isFn(c) ? () => decorate(c()) : decorate(c);
}

export default (target, root, props) => {
    const el = h(root, props);
    target.appendChild(el);
    if (el.$c) el.$c.m.forEach(f => f());
    return () => remove(el);
}