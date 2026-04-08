const isFn = (v) => typeof v === 'function';
const isNode = (v) => v instanceof Node;
const DANGEROUS = /^(javascript|data|vbscript):/i;
const sanitize = v => DANGEROUS.test(String(v)) ? '#' : v;

let isScheduled = false, activeEffect = null, context = null;
const queue = new Set(), reactiveCache = new WeakMap();

const tick = () => {
    while (queue.size) {
        const runs = [...queue];
        queue.clear();
        runs.forEach(fn => fn());
    }
    isScheduled = false;
}

const get = (v) => (v?._isSig ? v.value : (isFn(v) ? v() : v));

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
        if (run.c) { run.c.forEach(s => s()); run.c.length = 0; }
    }
    run.e = new Set();
    if (is_scope) run.c = [];
    run();
    if (activeEffect?.c) activeEffect.c.push(stop);
    return stop;
}

const track = (subs) => {
    if (activeEffect && !activeEffect.c) {
        subs.add(activeEffect);
        activeEffect.e.add(subs);
    }
}

export const signal = (value, key = null) => {
    const subs = new Set();
    if (key && typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(key);
        if (saved !== null) try { value = JSON.parse(saved); } catch {}
    }
    const sig = {
        _isSig: true,
        get value() { track(subs); return value; },
        set value(v) {
            if (v === value) return;
            value = v;
            subs.forEach(f => queue.add(f));
            if (!isScheduled) { isScheduled = true; queueMicrotask(tick); }
        }
    };
    if (key && typeof localStorage !== 'undefined') {
        effect(() => localStorage.setItem(key, JSON.stringify(sig.value)));
    }
    return sig;
};

export const untrack = (fn) => {
    const prev = activeEffect;
    activeEffect = null;
    const res = fn();
    activeEffect = prev;
    return res;
}

export const computed = (fn) => {
    const sig = signal();
    effect(() => sig.value = fn());
    return { get value() { return sig.value; } };
}

export const reactive = (obj) => {
    if (reactiveCache.has(obj)) return reactiveCache.get(obj);
    const subs = {};
    const proxy = new Proxy(obj, {
        get(t, k) {
            track(subs[k] ??= new Set());
            const v = t[k];
            return (v && typeof v === 'object') ? reactive(v) : v;
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
}

export const storage = (key, val) => persist(key, signal(val));

export const watch = (source, cb) => {
    let first = true, old;
    return effect(() => {
        const val = get(source);
        if (!first) untrack(() => cb(val, old));
        first = false; old = val;
    });
}

export const onMount = (f) => context?.m.push(f);
export const onUnmount = (f) => context?.u.push(f);
export const share = (k, v) => context && (context.p[k] = v);
export const use = (k, d) => context && (k in context.p ? context.p[k] : d);

const remove = async (n) => {
    if (Array.isArray(n)) return Promise.all(n.map(remove));
    if (n.$off) await n.$off(n);
    else if (n.$l) await new Promise(r => n.$l(r));
    n.$s?.();
    if (n.$c) n.$c.u.forEach(f => f());
    n.remove();
}

const render = (fn, ...d) => {
    let n;
    const s = effect(() => { n = fn(...d); if (isFn(n)) n = n(); }, true);
    if (n) n.$s = s;
    return n;
}

export const h = (tag, props = {}, ...children) => {
    children = children.flat(Infinity);
    if (isFn(tag)) {
        const prev = context;
        context = { m: [], u: [], p: { ...(prev?.p || {}) } };
        const ctx = context;
        let el;
        const s = effect(() => {
            el = tag(props, { children, emit: (e, ...a) => props[`on${e[0].toUpperCase()}${e.slice(1)}`]?.(...a) });
            return () => ctx.u.forEach(f => f());
        }, true);
        const out = isNode(el) ? el : document.createTextNode(String(el));
        out.$c = ctx; out.$s = s;
        if (props.on) out.$on = props.on;
        if (props.off) out.$off = props.off;
        context = prev;
        return out;
    }
    if (!tag) return children;
    const isSvg = /^(svg|path|circle|rect|line|polyline|polygon|g|text|defs|use|symbol)$/.test(tag);
    const el = isSvg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
    for (const k in props) {
        const v = props[k];
        if (k.startsWith('on') && k !== 'on' && k !== 'off') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "ref") isFn(v) ? v(el) : v.value = el;
        else if (k === "on") el.$on = v;
        else if (k === "off") el.$off = v;
        else if (isFn(v) || v?._isSig) effect(() => {
            const val = get(v);
            const attr = (k === 'href' || k === 'src') ? sanitize(val) : val;
            isSvg ? el.setAttribute(k, attr) : (el[k] = attr);
        });
        else {
            const attr = (k === 'href' || k === 'src') ? sanitize(v) : v;
            isSvg ? el.setAttribute(k, attr) : (el[k] = attr);
        }
    }
    children.forEach(c => append(el, c));
    return el;
}

const append = (p, c) => {
    if (c == null || c === false || c === true) return;
    if (isFn(c) || c?._isSig) {
        const anchor = document.createTextNode('');
        p.appendChild(anchor);
        let nodes = [];
        effect(async () => {
            const raw = [get(c)].flat(Infinity).filter(n => n != null && n !== false && n !== true);
            const next = raw.map(n => isNode(n) ? n : document.createTextNode(String(n)));
            for (const n of nodes) { if (!next.includes(n)) await remove(n); }
            next.forEach((n, i) => {
                if (!nodes.includes(n)) {
                    p.insertBefore(n, next[i + 1] || anchor);
                    if (n.$on) n.$on(n);
                    if (n.$c) n.$c.m.forEach(f => f());
                }
            });
            nodes = next;
        }, true);
    } else {
        const n = isNode(c) ? c : document.createTextNode(String(c));
        p.appendChild(n);
        if (n.$on) n.$on(n);
    }
}

export const If = (cond, t, f = null, trans = {}) => {
    let cached, current;
    return () => {
        const show = !!get(cond);
        if (show !== current) {
            const up = async () => {
                if (cached) await remove(cached);
                cached = show ? render(t) : (isFn(f) ? render(f) : f);
                if (isNode(cached)) {
                    if (trans.on) cached.$on = trans.on;
                    if (trans.off) cached.$off = trans.off;
                }
                current = show;
            };
            up();
        }
        return cached;
    }
}

export const For = (list, key, renderFn) => {
    let cache = new Map();
    return () => {
        const next = new Map();
        const items = get(list);
        const res = items.map((item, i) => {
            const id = isFn(key) ? key(item, i) : (key ? item[id] : item);
            let n = cache.get(id);
            if (!n) n = render(renderFn, item, i);
            next.set(id, n);
            return n;
        });
        cache.forEach(async (n, id) => { if (!next.has(id)) await remove(n); });
        cache = next;
        return res;
    }
}

export const Router = (routes) => {
    const path = signal(window.location.hash.slice(1) || '/');
    window.onhashchange = () => path.value = window.location.hash.slice(1) || '/';

    return h('div', { class: 'router-view' }, () => {
        const cur = path.value;
        for (const r of routes) {
            const reg = new RegExp(`^${r.path.replace(/:[^\s/]+/g, '([^/]+)')}$`);
            const match = cur.match(reg);

            if (match) {
                const params = {};
                const keys = r.path.match(/:[^\s/]+/g) || [];
                keys.forEach((key, i) => params[key.slice(1)] = match[i + 1]);
                return h(r.component, { params, path: cur });
            }
        }
        const fallback = routes.find(x => x.path === '*');
        return fallback ? h(fallback.component) : '404';
    });
};

export const mount = (root, target, props = {}) => {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    container.replaceChildren();
    const el = h(root, props);
    container.appendChild(el);
    if (el.$on) el.$on(el);
    if (el.$c) el.$c.m.forEach(f => f());
    return () => remove(el);
};

export default { signal, effect, reactive, computed, watch, storage, h, mount, If, For, Router, onMount, onUnmount, share, use };