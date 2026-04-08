/*
* Fixed: Memory Leaks, Fragment Lifecycle, and List Reconciler.
*/

const isFn = (v) => typeof v === 'function';
const isNode = (v) => v instanceof Node;

// --- Schedule System ---
let isScheduled = false;
const queue = new Set();
const tick = () => {
    queue.forEach(fn => fn());
    queue.clear();
    isScheduled = false;
}

// --- Effects System ---
let activeEffect = null;
export const effect = (fn, is_scope = false) => {
    let cleanup = null;
    const run = () => {
        stop(); // Limpia antes de re-ejecutar
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

// --- Signals Core ---
export const signal = (value, key = null) => {
    const subs = new Set();
    const storage = typeof localStorage !== 'undefined';
    
    if (key && storage) {
        const saved = localStorage.getItem(key);
        if (saved !== null) try { value = JSON.parse(saved); } catch {}
    }

    const sig = {
        _isSig: true,
        get value() { track(subs); return value; },
        set value(v) {
            if (v === value) return;
            value = v;
            subs.forEach(fn => queue.add(fn));
            if (!isScheduled) { isScheduled = true; queueMicrotask(tick); }
        }
    };

    if (key && storage) effect(() => localStorage.setItem(key, JSON.stringify(sig.value)));

    return sig;
};

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

export const watch = (source, cb) => {
    let first = true, oldValue;
    return effect(() => {
        const newValue = isFn(source) ? source() : source.value;
        if (!first) untrack(() => cb(newValue, oldValue));
        else first = false;
        oldValue = newValue;
    });
}

// --- Rendering System ---
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
        
        // Normalización para asegurar que el nodo tenga metadatos
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

// --- Helpers & Built-in ---
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
    const dest = typeof target === 'string' ? document.querySelector(target) : target;
    if (!dest) return;

    while (dest.firstChild) remove(dest.firstChild);

    const el = h(root, props);
    dest.appendChild(el);

    if (el.$c) {
        el.$c.m.forEach(f => f());
        el.$c.m.length = 0;
    }

    return () => remove(el);
};

export default (target, root, props) => {
    const el = h(root, props);
    target.appendChild(el);
    if (el.$c) el.$c.m.forEach(f => f());
    return () => remove(el);
}