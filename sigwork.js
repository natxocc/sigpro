let activeEffect = null, currentContext = null, isScheduled = false;
const queue = new Set(), nodeContexts = new WeakMap(), reactiveCache = new WeakMap();

const tick = () => {
    while (queue.size) {
        const runs = [...queue];
        queue.clear();
        runs.forEach(fn => fn());
    }
    isScheduled = false;
};

const track = (subs) => {
    if (activeEffect) {
        subs.add(activeEffect);
        activeEffect.deps.add(subs);
    }
};

export const untrack = (fn) => {
    const prev = activeEffect;
    activeEffect = null;
    const res = fn();
    activeEffect = prev;
    return res;
};

export const Signal = (value) => {
    const subs = new Set();
    return {
        _isSig: true,
        get value() { track(subs); return value; },
        set value(v) {
            if (v === value) return;
            value = v;
            subs.forEach(f => queue.add(f));
            if (!isScheduled) { isScheduled = true; queueMicrotask(tick); }
        }
    };
};

export const Reactive = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (reactiveCache.has(obj)) return reactiveCache.get(obj);
    const subs = {};
    const proxy = new Proxy(obj, {
        get(t, k) {
            track(subs[k] ??= new Set());
            const val = t[k];
            return (val && typeof val === 'object') ? Reactive(val) : val;
        },
        set(t, k, v) {
            if (t[k] === v) return true;
            t[k] = v;
            if (subs[k]) {
                subs[k].forEach(f => queue.add(f));
                if (!isScheduled) { isScheduled = true; queueMicrotask(tick); }
            }
            return true;
        }
    });
    reactiveCache.set(obj, proxy);
    return proxy;
};

export const Computed = (fn) => {
    const c = Signal(fn());
    Effect(() => c.value = fn());
    return { get value() { return c.value; } };
};

export const Watch = (source, cb) => {
    let old;
    return Effect(() => {
        const val = typeof source === 'function' ? source() : source.value;
        const prev = old;
        old = val;
        untrack(() => cb(val, prev));
    });
};

export const Storage = (key, val) => {
    const saved = localStorage.getItem(key);
    const s = Signal(saved !== null ? JSON.parse(saved) : val);
    Effect(() => localStorage.setItem(key, JSON.stringify(s.value)));
    return s;
};

export const Effect = (fn) => {
    let cleanup;
    const runner = () => {
        if (cleanup) cleanup();
        const prevEff = activeEffect;
        activeEffect = runner;
        cleanup = fn();
        activeEffect = prevEff;
    };
    runner.deps = new Set();
    if (activeEffect?.scopes) activeEffect.scopes.push(runner);
    else if (currentContext) currentContext.cleanups.push(runner);
    runner();
    return () => { if (cleanup) cleanup(); runner.deps.forEach(s => s.delete(runner)); };
};

export const Scope = (fn) => {
    const scopes = [];
    const prev = activeEffect;
    activeEffect = { scopes };
    fn();
    activeEffect = prev;
    return () => scopes.forEach(s => s());
};

export const onMount = f => currentContext?.mount.push(f);
export const onUnmount = f => currentContext?.unmount.push(f);

const isNode = v => v instanceof Node;
const DANGEROUS = /^(javascript|data|vbscript):/i;
const sanitize = v => DANGEROUS.test(String(v)) ? '#' : v;

export const destroy = async (node) => {
    if (!node) return;
    const ctx = nodeContexts.get(node);
    if (node.off) await node.off(node);
    if (ctx) {
        ctx.unmount.forEach(f => f());
        ctx.cleanups.forEach(f => f());
        nodeContexts.delete(node);
    }
    const children = Array.from(node.childNodes);
    for (const child of children) await destroy(child);
    node.remove();
};

const append = (parent, child) => {
    if (child == null) return;
    if (typeof child === 'function') {
        const anchor = document.createTextNode('');
        parent.appendChild(anchor);
        let nodes = [];
        Effect(async () => {
            const next = [child()].flat(Infinity)
                .map(n => typeof n === 'function' ? n() : n).flat(Infinity)
                .filter(n => n != null)
                .map(n => isNode(n) ? n : document.createTextNode(String(n)));

            const nextSet = new Set(next);
            for (const n of nodes) { if (!nextSet.has(n)) await destroy(n); }

            const oldIdxs = new Map(nodes.filter(n => nextSet.has(n)).map((n, i) => [n, i]));
            let p = oldIdxs.size - 1;

            for (let i = next.length - 1; i >= 0; i--) {
                const node = next[i];
                const ref = next[i+1] || anchor;
                if (!oldIdxs.has(node) || nodes[p] !== node) {
                    parent.insertBefore(node, ref);
                    if (node.on) queueMicrotask(() => node.on(node));
                } else p--;
            }
            nodes = next;
        });
    } else {
        const n = isNode(child) ? child : document.createTextNode(String(child));
        parent.appendChild(n);
        if (n.on) queueMicrotask(() => n.on(n));
    }
};

export const h = (tag, props = {}, ...children) => {
    props = props || {};
    const flat = children.flat(Infinity);
    if (!tag) return () => flat;
    if (tag === 'component') return () => h(props.is, props, ...flat);

    if (typeof tag === 'function') {
        const ctx = { mount: [], unmount: [], cleanups: [], Share: {}, parent: currentContext };
        const prev = currentContext;
        currentContext = ctx;
        const el = tag(props, { children: flat });
        if (isNode(el)) nodeContexts.set(el, ctx);
        currentContext = prev;
        queueMicrotask(() => ctx.mount.forEach(f => f()));
        return el;
    }

    const isSVG = /^(svg|path|circle|rect|g)$/i.test(tag);
    const el = isSVG ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);

    for (const k in props) {
        const v = props[k];
        if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'ref') { if (typeof v === 'function') v(el); else if (v?._isSig) v.value = el; }
        else if (typeof v === 'function' || v?._isSig) {
            Effect(() => {
                const val = typeof v === 'function' ? v() : v.value;
                if (k === 'on' || k === 'off') { el[k] = val; return; }
                const attr = (k === 'href' || k === 'src') ? sanitize(val) : val;
                if (!isSVG && k in el) el[k] = attr; else el.setAttribute(k, attr);
            });
        } else {
            if (k === 'on' || k === 'off') { el[k] = v; continue; }
            const attr = (k === 'href' || k === 'src') ? sanitize(v) : v;
            if (!isSVG && k in el) el[k] = attr; else el.setAttribute(k, attr);
        }
    }
    flat.forEach(c => append(el, c));
    return el;
};

export const If = (c, t, e) => () => c() ? t() : (e ? e() : null);

export const For = (l, k, r) => {
    let cache = new Map();
    return () => {
        const items = typeof l === 'function' ? l() : l.value;
        const next = new Map();
        const res = items.map((item, i) => {
            const id = k ? k(item, i) : (item.id || i);
            const n = cache.get(id) || r(item, i);
            next.set(id, n);
            return n;
        });
        cache = next; return res;
    };
};

export const Router = (routes) => {
    const path = Signal(window.location.hash.replace(/^#/, '') || '/');
    window.onhashchange = () => path.value = window.location.hash.replace(/^#/, '') || '/';
    const outlet = h('div', { class: 'router-outlet' });
    let view = null;
    Effect(async () => {
        const r = routes.find(x => x.path === path.value) || routes.find(x => x.path === '*');
        if (view) await destroy(view);
        if (r) {
            view = r.component();
            outlet.appendChild(view);
        }
    });
    return outlet;
};

export const Mount = (r, t) => {
    const el = typeof r === 'function' ? r() : r;
    const container = (typeof t === 'string' ? document.querySelector(t) : t);
    container.replaceChildren(el);
    return () => destroy(el);
};

export const Share = (k, v) => { if (currentContext) currentContext.Share[k] = v; };
export const Use = (k, d) => {
    let c = currentContext;
    while (c) { if (c.Share[k] !== undefined) return c.Share[k]; c = c.parent; }
    return d;
};

export default { 
    Signal, Reactive, Computed, Effect, Watch, Storage, 
    untrack, Scope, h, If, For, Router, Mount, 
    onMount, onUnmount, Share, Use 
};