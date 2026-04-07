/*
* SigPro
*/

// --- Scheduler (Ciclo Completo) ---
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

// --- Estado Global y Contexto ---
let activeEffect = null;
let currentContext = null;
const nodeContexts = new WeakMap();
const reactiveCache = new WeakMap(); // <-- Añadido para que Reactive funcione

// --- Seguridad ---
const DANGEROUS = /^(javascript|data|vbscript):/i;
const sanitize = v => DANGEROUS.test(String(v)) ? '#' : v;

// --- Sistema de Efectos con Scope ---
export const Effect = (fn, is_scope = false) => {
    let cleanup = null;
    const runner = () => {
        stop();
        const prevContext = currentContext;
        const prevEffect = activeEffect;
        activeEffect = runner;
        cleanup = fn(); 
        activeEffect = prevEffect;
        currentContext = prevContext;
    };

    const stop = () => {
        runner.deps?.forEach(subs => subs.delete(runner));
        runner.deps?.clear();
        if (typeof cleanup === 'function') cleanup();
        runner.cleanups?.forEach(f => f());
        runner.cleanups = [];
    };

    runner.deps = new Set();
    runner.cleanups = [];
    
    if (activeEffect) activeEffect.cleanups.push(stop);
    else if (currentContext) currentContext.cleanups.add(stop);

    runner();
    return stop;
};

// --- Signals & Reactividad ---
const track = (subs) => {
    if (activeEffect) {
        subs.add(activeEffect);
        activeEffect.deps.add(subs);
    }
};

export const Signal = (value) => {
    const subs = new Set();
    return {
        _isSig: true,
        get value() {
            track(subs);
            return value;
        },
        set value(v) {
            if (v === value) return;
            value = v;
            subs.forEach(fn => queue.add(fn));
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
                subs[k].forEach(fn => queue.add(fn));
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

export const Storage = (key, val) => {
    const saved = localStorage.getItem(key);
    const s = Signal(saved !== null ? JSON.parse(saved) : val);
    Effect(() => localStorage.setItem(key, JSON.stringify(s.value)));
    return s;
};

// --- Renderer Core (Diffing Avanzado y SVG) ---
const isNode = v => v instanceof Node;

export const destroy = (node) => {
    if (!node) return;
    const ctx = nodeContexts.get(node);
    if (ctx) {
        ctx.unmount.forEach(fn => fn());
        ctx.cleanups.forEach(fn => fn());
        nodeContexts.delete(node);
    }
    node.childNodes?.forEach(destroy);
    node.remove();
};

const append = (parent, child) => {
    if (child == null) return;
    if (typeof child === 'function') {
        const anchor = document.createTextNode('');
        parent.appendChild(anchor);
        let nodes = [];
        Effect(() => {
            const raw = child();
            const next = [raw].flat(Infinity)
                .map(n => typeof n === 'function' ? n() : n)
                .flat(Infinity)
                .filter(n => n != null)
                .map(n => isNode(n) ? n : document.createTextNode(String(n)));

            const nextSet = new Set(next);
            nodes.forEach(n => { if (!nextSet.has(n)) destroy(n); });

            const oldIdxs = new Map(nodes.filter(n => nextSet.has(n)).map((n, i) => [n, i]));
            let p = oldIdxs.size - 1;

            for (let i = next.length - 1; i >= 0; i--) {
                const node = next[i];
                const ref = next[i + 1] || anchor;
                if (!oldIdxs.has(node) || nodes[p] !== node) {
                    parent.insertBefore(node, ref);
                } else {
                    p--;
                }
            }
            nodes = next;
        }, true);
    } else {
        parent.appendChild(isNode(child) ? child : document.createTextNode(String(child)));
    }
};

export const h = (tag, props = {}, ...children) => {
    props = props || {};
    const flatChildren = children.flat(Infinity);
    if (!tag) return () => flatChildren;

    if (typeof tag === 'function') {
        const context = { mount: [], unmount: [], Share: {}, parent: currentContext, cleanups: new Set() };
        const prevCtx = currentContext;
        currentContext = context;
        const el = tag(props, { children: flatChildren });
        if (isNode(el)) nodeContexts.set(el, context);
        currentContext = prevCtx;
        queueMicrotask(() => context.mount.forEach(fn => fn()));
        return el;
    }

    let el;
    const isSVG = /^(svg|path|circle|rect|g)$/i.test(tag);
    if (isSVG) {
        el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    } else {
        el = document.createElement(tag);
    }

    for (const key in props) {
        const val = props[key];
        if (key.startsWith('on')) {
            el.addEventListener(key.slice(2).toLowerCase(), val);
        } 
        else if (key === 'ref') {
            if (typeof val === 'function') val(el);
            else if (val && val._isSig) val.value = el;
        }
        else if (typeof val === 'function' || (val && val._isSig)) {
            Effect(() => {
                const v = typeof val === 'function' ? val() : val.value;
                const attr = (key === 'href' || key === 'src') ? sanitize(v) : v;
                if (!isSVG && key in el) el[key] = attr; else el.setAttribute(key, attr);
            });
        } else {
            const attr = (key === 'href' || key === 'src') ? sanitize(val) : val;
            if (!isSVG && key in el) el[key] = attr; else el.setAttribute(key, attr);
        }
    }
    flatChildren.forEach(c => append(el, c));
    return el;
};

// --- Helpers ---
export const If = (cond, a, b) => () => cond() ? a() : (b ? b() : null);

export const For = (list, key, render) => {
    let cache = new Map();
    return () => {
        const items = typeof list === 'function' ? list() : list.value;
        const nextCache = new Map();
        const nodes = items.map((item, i) => {
            const k = key ? key(item, i) : (item.id || i);
            let node = cache.get(k) || render(item, i);
            nextCache.set(k, node);
            return node;
        });
        cache = nextCache;
        return nodes;
    };
};

// --- Router ---
export const Router = (routes) => {
    const path = Signal(window.location.hash.replace(/^#/, '') || '/');
    window.onhashchange = () => path.value = window.location.hash.replace(/^#/, '') || '/';
    const outlet = h('div', { class: 'router-outlet' });
    let currentView = null;
    Effect(() => {
        const route = routes.find(r => r.path === path.value) || routes.find(r => r.path === '*');
        if (currentView) destroy(currentView);
        if (route) {
            currentView = route.component();
            outlet.appendChild(currentView);
        }
    });
    return outlet;
};

export const Mount = (root, target) => {
    const el = typeof root === 'function' ? root() : root;
    (typeof target === 'string' ? document.querySelector(target) : target).replaceChildren(el);
    return () => destroy(el);
};

export const onMount = (fn) => currentContext?.mount.push(fn);
export const onUnmount = (fn) => currentContext?.unmount.push(fn);
export const Share = (key, value) => { if (currentContext) currentContext.Share[key] = value; };
export const Use = (key, def) => {
    let ctx = currentContext;
    while (ctx) {
        if (ctx.Share[key] !== undefined) return ctx.Share[key];
        ctx = ctx.parent;
    }
    return def;
};

export default { Signal, Reactive, Computed, Storage, Effect, h, If, For, Router, Mount, Share, Use, onMount, onUnmount };