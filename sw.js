/*
* Fixed: Memory Leaks, Fragment Lifecycle, and List Reconciler.
* Refactored: Compact & Descriptive naming.
*/

// --- Utilities ---
const isFunction = (v) => typeof v === 'function', isNode = (v) => v instanceof Node;

// --- Schedule System ---
let isScheduled = false;
const updateQueue = new Set();
const processQueue = () => { updateQueue.forEach(cb => cb()); updateQueue.clear(); isScheduled = false; };

// --- Effects System ---
let activeEffect = null;
export const effect = (fn, isScope = false) => {
    let cleanup = null;
    const run = () => {
        stop();
        const prev = activeEffect; activeEffect = run;
        try { cleanup = fn(); } finally { activeEffect = prev; }
    };
    const stop = () => {
        run.subscriptions.forEach(subs => subs.delete(run)); run.subscriptions.clear();
        if (isFunction(cleanup)) cleanup();
        if (run.childEffects) { run.childEffects.forEach(s => s()); run.childEffects.length = 0; }
    };
    run.subscriptions = new Set(); if (isScope) run.childEffects = [];
    run(); if (activeEffect?.childEffects) activeEffect.childEffects.push(stop);
    return stop;
};

export const scope = (fn) => effect(fn, true);
const track = (subs) => { if (activeEffect && !activeEffect.childEffects) { subs.add(activeEffect); activeEffect.subscriptions.add(subs); } };

// --- Signals Core ---
export const signal = (val, key = null) => {
    const subs = new Set(), storage = typeof localStorage !== 'undefined';
    let current = val;
    if (key && storage) { const saved = localStorage.getItem(key); if (saved !== null) try { current = JSON.parse(saved); } catch {} }

    const sig = {
        _isSignal: true,
        get value() { track(subs); return current; },
        set value(v) {
            if (v === current) return;
            current = v; subs.forEach(cb => updateQueue.add(cb));
            if (!isScheduled) { isScheduled = true; queueMicrotask(processQueue); }
        }
    };
    if (key && storage) effect(() => localStorage.setItem(key, JSON.stringify(sig.value)));
    return sig;
};

export const untrack = (fn) => { const prev = activeEffect; activeEffect = null; const res = fn(); activeEffect = prev; return res; };
export const computed = (fn) => { const sig = signal(); effect(() => sig.value = fn()); return { get value() { return sig.value; } }; };

const reactiveCache = new WeakMap();
export const reactive = (obj) => {
    if (reactiveCache.has(obj)) return reactiveCache.get(obj);
    const subsMap = {};
    const proxy = new Proxy(obj, {
        get(t, k) { track(subsMap[k] ??= new Set()); const v = t[k]; return (v && typeof v === 'object') ? reactive(v) : v; },
        set(t, k, v) {
            if (t[k] === v) return true;
            t[k] = v; if (subsMap[k]) { subsMap[k].forEach(cb => updateQueue.add(cb)); if (!isScheduled) { isScheduled = true; queueMicrotask(processQueue); } }
            return true;
        }
    });
    reactiveCache.set(obj, proxy); return proxy;
};

export const watch = (src, cb) => {
    let first = true, old;
    return effect(() => {
        const val = isFunction(src) ? src() : src.value;
        if (!first) untrack(() => cb(val, old)); else first = false;
        old = val;
    });
};

// --- Rendering System ---
let currentContext = null;
export const onMount = (fn) => currentContext?.mountHooks.push(fn);
export const onUnmount = (fn) => currentContext?.unmountHooks.push(fn);
export const provide = (k, v) => currentContext && (currentContext.providers[k] = v);
export const inject = (k, dft) => currentContext && (k in currentContext.providers ? currentContext.providers[k] : dft);

const remove = (node) => {
    if (Array.isArray(node)) return node.forEach(remove);
    node.$stopEffect?.(); if (node.$context) node.$context.unmountHooks.forEach(h => h());
    const done = () => node.remove();
    node.$leave ? node.$leave(done) : done();
};

const render = (fn, ...data) => {
    let node; const stop = effect(() => { node = fn(...data); if (isFunction(node)) node = node(); }, true);
    if (node) node.$stopEffect = stop; return node;
};

export const h = (tag, props = {}, ...children) => {
    children = children.flat(Infinity);
    if (isFunction(tag)) {
        const prev = currentContext;
        currentContext = { mountHooks: [], unmountHooks: [], providers: { ...(prev?.providers || {}) } };
        const ctx = currentContext; let el;
        const stop = effect(() => {
            el = tag(props, { children, emit: (e, ...a) => props[`on${e[0].toUpperCase()}${e.slice(1)}`]?.(...a) });
            return () => ctx.unmountHooks.forEach(h => h());
        }, true);
        const out = isNode(el) ? el : document.createTextNode(String(el));
        out.$context = ctx; out.$stopEffect = stop; currentContext = prev; return out;
    }
    if (!tag) return children;
    const el = ['svg', 'path', 'circle'].includes(tag) ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
    for (const k in props) {
        if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), props[k]);
        else if (k === "ref") isFunction(props[k]) ? props[k](el) : props[k].value = el;
        else if (isFunction(props[k])) effect(() => el[k] = props[k]());
        else el[k] = props[k];
    }
    children.forEach(c => append(el, c)); return el;
};

const append = (parent, child) => {
    if (child == null) return;
    if (isFunction(child)) {
        const anchor = document.createTextNode(''); parent.appendChild(anchor);
        let nodes = [];
        effect(() => {
            const raw = [child()].flat(Infinity).filter(n => n != null);
            const next = raw.map(n => isNode(n) ? n : document.createTextNode(String(n)));
            nodes.forEach(n => { if (!next.includes(n)) remove(n); });
            next.forEach((n, i) => { if (!nodes.includes(n)) { parent.insertBefore(n, next[i+1] || anchor); if (n.$context) n.$context.mountHooks.forEach(h => h()); } });
            nodes = next;
        }, true);
    } else parent.appendChild(isNode(child) ? child : document.createTextNode(String(child)));
};

// --- Components & Router ---
export const If = (cond, renderFn, fallback = null) => {
    let cached, current;
    return () => {
        const show = !!cond();
        if (show !== current) { if (cached) remove(cached); cached = show ? render(renderFn) : (isFunction(fallback) ? render(fallback) : fallback); current = show; }
        return cached;
    };
};

export const For = (list, keyFn, renderFn) => {
    let cache = new Map();
    return () => {
        const next = new Map(), items = isFunction(list) ? list() : (list.value || list);
        const res = items.map((item, i) => {
            const id = isFunction(keyFn) ? keyFn(item, i) : (keyFn ? item[keyFn] : item);
            let node = cache.get(id) || render(renderFn, item, i);
            next.set(id, node); return node;
        });
        cache.forEach((n, id) => { if (!next.has(id)) remove(n); }); cache = next; return res;
    };
};

export const Router = (routes) => {
    const path = signal(window.location.hash.slice(1) || '/');
    window.onhashchange = () => path.value = window.location.hash.slice(1) || '/';
    return h('div', { class: 'router-view' }, () => {
        const cur = path.value;
        for (const r of routes) {
            const match = cur.match(new RegExp(`^${r.path.replace(/:[^\s/]+/g, '([^/]+)')}$`));
            if (match) {
                const params = {}; (r.path.match(/:[^\s/]+/g) || []).forEach((k, i) => params[k.slice(1)] = match[i+1]);
                return h(r.component, { params, path: cur });
            }
        }
        const fbk = routes.find(r => r.path === '*'); return fbk ? h(fbk.component) : '404';
    });
};

export const Transition = ({ enter: e, idle, leave: l }, { children: [c] }) => {
    const decorate = (el) => {
        if (!isNode(el)) return el;
        const cls = (css, add = true) => css && el.classList[add ? 'add' : 'remove'](...css.split(' '));
        if (e) {
            cls(e[1]);
            requestAnimationFrame(() => {
                cls(e[0]); cls(e[2]); cls(e[1], false);
                el.addEventListener('transitionend', () => { cls(e[2], false); cls(e[0], false); cls(idle); }, { once: true });
            });
        }
        if (l) el.$leave = (done) => {
            cls(idle, false); cls(l[1]);
            requestAnimationFrame(() => {
                cls(l[0]); cls(l[2]); cls(l[1], false);
                el.addEventListener('transitionend', () => { cls(l[2], false); cls(l[0], false); done(); }, { once: true });
            });
        };
        return el;
    };
    return isFunction(c) ? () => decorate(c()) : decorate(c);
};

export const mount = (root, target, props = {}) => {
    const dest = typeof target === 'string' ? document.querySelector(target) : target;
    if (!dest) return;
    while (dest.firstChild) remove(dest.firstChild);
    const el = h(root, props); dest.appendChild(el);
    if (el.$context) { el.$context.mountHooks.forEach(h => h()); el.$context.mountHooks.length = 0; }
    return () => remove(el);
};