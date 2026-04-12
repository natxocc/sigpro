const isFunction = v => typeof v === 'function';
const isNode = v => v instanceof Node;
const doc = typeof document !== "undefined" ? document : null;

let activeEffect = null;
const pendingEffects = new Set();
let flushScheduled = false;
const nodeDisposers = new WeakMap();

const registerNodeCleanup = (node, disposer) => {
    if (!nodeDisposers.has(node)) nodeDisposers.set(node, []);
    nodeDisposers.get(node).push(disposer);
};

const flushEffects = () => {
    if (pendingEffects.size === 0) return;
    const all = Array.from(pendingEffects);
    pendingEffects.clear();
    all.sort((a, b) => a.depth - b.depth);
    for (let i = 0; i < all.length; i++) {
        const e = all[i];
        if (!e.disposed) e.execute();
    }
    flushScheduled = false;
};

const scheduleFlush = () => {
    if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flushEffects);
    }
};

const disposeEffectTree = effect => {
    if (effect.disposed) return;
    effect.disposed = true;
    const stack = [effect];
    while (stack.length) {
        const cur = stack.pop();
        if (cur.cleanups) {
            for (const fn of cur.cleanups) fn();
            cur.cleanups.clear();
        }
        if (cur.dependencies) {
            for (const depSet of cur.dependencies) depSet.delete(cur);
            cur.dependencies.clear();
        }
        if (cur.children) {
            for (const child of cur.children) stack.push(child);
            cur.children.clear();
        }
    }
};

const createEffect = (fn) => {
    const effect = {
        execute: null,
        dependencies: new Set(),
        cleanups: new Set(),
        children: new Set(),
        depth: activeEffect ? activeEffect.depth + 1 : 0,
        disposed: false,
        owner: activeEffect // <-- CLAVE: Herencia de contexto
    };
    effect.execute = () => {
        if (effect.disposed) return;
        if (effect.dependencies) {
            for (const depSet of effect.dependencies) depSet.delete(effect);
            effect.dependencies.clear();
        }
        if (effect.cleanups) {
            for (const fn of effect.cleanups) fn();
            effect.cleanups.clear();
        }
        const prev = activeEffect;
        activeEffect = effect;
        try {
            const cleanup = fn();
            if (isFunction(cleanup)) effect.cleanups.add(cleanup);
        } finally {
            activeEffect = prev;
        }
    };
    if (activeEffect) activeEffect.children.add(effect);
    effect.execute();
    return () => disposeEffectTree(effect);
};

export const Watch = createEffect;

// --- CONTEXTO ROBUSTO (6 líneas) ---
const getComponentContext = () => {
    let eff = activeEffect;
    while (eff) {
        if (eff.componentContext) return eff.componentContext;
        eff = eff.owner;
    }
    return null;
};

export const removeNode = node => {
    if (!node) return;
    if (node.childNodes) {
        node.childNodes.forEach(child => removeNode(child));
    }
    const disposers = nodeDisposers.get(node);
    if (disposers) {
        disposers.forEach(d => d());
        nodeDisposers.delete(node);
    }
    if (node._raf) cancelAnimationFrame(node._raf);
    if (node.componentStop) node.componentStop();
    
    const ctx = node.componentContext;
    if (ctx) {
        ctx.unmount.forEach(fn => fn());
        ctx.unmount = [];
    }
    
    if (node.leaveTransition) {
        node.leaveTransition(() => node.remove());
    } else {
        node.remove();
    }
};

const track = subs => {
    if (activeEffect && !activeEffect.disposed) {
        subs.add(activeEffect);
        activeEffect.dependencies.add(subs);
    }
};

const trigger = subs => {
    if (!subs) return;
    for (const eff of subs) {
        if (eff !== activeEffect && !eff.disposed) pendingEffects.add(eff);
    }
    scheduleFlush();
};

export const $ = (initialValue, storageKey) => {
    if (isFunction(initialValue)) {
        let dirty = true, cached;
        const s = $();
        const stop = Watch(() => {
            const v = initialValue();
            if (!Object.is(v, cached)) { cached = v; dirty = false; s(v); }
        });
        const ctx = getComponentContext();
        if (ctx) ctx.unmount.push(stop);
        const signal = newVal => {
            if (newVal === undefined) {
                if (dirty) { cached = initialValue(); dirty = false; s(cached); }
                return s();
            }
            return s(newVal);
        };
        return signal;
    }
    const subs = new Set();
    let value = initialValue;
    if (storageKey) {
        try {
            const item = localStorage.getItem(storageKey);
            if (item !== null) value = JSON.parse(item);
        } catch (e) {}
    }
    const signal = newVal => {
        if (newVal === undefined) {
            track(subs);
            return value;
        }
        const next = isFunction(newVal) ? newVal(value) : newVal;
        if (!Object.is(next, value)) {
            value = next;
            if (storageKey) {
                try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch (e) {}
            }
            trigger(subs);
        }
        return value;
    };
    if (storageKey) {
        const sync = Watch(() => { signal(value); });
        const ctx = getComponentContext();
        if (ctx) ctx.unmount.push(sync);
    }
    return signal;
};

export const set = (signal, path, value) => {
    if (value === undefined) {
        signal(isFunction(path) ? path(signal()) : path);
    } else {
        const keys = path.split('.');
        const last = keys.pop();
        const obj = keys.reduce((o, k) => ({ ...o, [k]: { ...o[k] } }), { ...signal() });
        obj[last] = value;
        signal(obj);
    }
};

export const watch = (source, callback) => {
    let first = true, oldVal;
    return Watch(() => {
        const newVal = isFunction(source) ? source() : source;
        if (!first) untrack(() => callback(newVal, oldVal));
        else first = false;
        oldVal = newVal;
    });
};

export const untrack = fn => {
    const prev = activeEffect;
    activeEffect = null;
    try { return fn(); } finally { activeEffect = prev; }
};

export const onMount = fn => {
    const ctx = getComponentContext();
    if (ctx) ctx.mount.push(fn);
};
export const onUnmount = fn => {
    const ctx = getComponentContext();
    if (ctx) ctx.unmount.push(fn);
};

const DANGEROUS_PROTOCOL = /^\s*(javascript|data|vbscript):/i;
const isDangerousAttr = key => key === 'src' || key === 'href' || key.startsWith('on');

const validateAttr = (key, val) => {
    if (val == null || val === false) return null;
    if (isDangerousAttr(key)) {
        const sVal = String(val);
        if (DANGEROUS_PROTOCOL.test(sVal)) {
            console.warn(`[SP] Bloqueado protocolo peligroso en ${key}`);
            return '#';
        }
    }
    return val;
};

const setProperty = (el, key, val, isSVG) => {
    val = validateAttr(key, val);
    if (key === 'class' || key === 'className') {
        el.className = val || '';
    } else if (key === 'style' && typeof val === 'object') {
        Object.assign(el.style, val);
    } else if (key in el && !isSVG) {
        el[key] = val;
    } else {
        if (isSVG) {
            if (key.startsWith('xlink:')) {
                if (val == null || val === false) el.removeAttributeNS('http://www.w3.org/1999/xlink', key.slice(6));
                else el.setAttributeNS('http://www.w3.org/1999/xlink', key, val);
            } else if (key === 'xmlns' || key.startsWith('xmlns:')) {
                if (val == null || val === false) el.removeAttributeNS('http://www.w3.org/2000/xmlns/', key);
                else el.setAttributeNS('http://www.w3.org/2000/xmlns/', key, val);
            } else {
                if (val == null || val === false) el.removeAttribute(key);
                else if (val === true) el.setAttribute(key, '');
                else el.setAttribute(key, val);
            }
        } else {
            if (val == null || val === false) el.removeAttribute(key);
            else if (val === true) el.setAttribute(key, '');
            else el.setAttribute(key, val);
        }
    }
};

const appendChildNode = (parent, child) => {
    if (child == null) return;
    if (isFunction(child)) {
        const anchor = doc.createTextNode('');
        parent.appendChild(anchor);
        let currentNodes = [];
        const stop = Watch(() => {
            const raw = child();
            const next = (Array.isArray(raw) ? raw : [raw])
                .flat(Infinity)
                .filter(v => v != null)
                .map(v => isNode(v) ? v : doc.createTextNode(String(v)));
            for (const n of currentNodes) {
                if (!next.includes(n)) removeNode(n);
            }
            let ref = anchor;
            for (let i = next.length - 1; i >= 0; i--) {
                const n = next[i];
                if (n.parentNode !== parent) {
                    parent.insertBefore(n, ref);
                    if (n.componentContext) n.componentContext.mount.forEach(f => f());
                }
                ref = n;
            }
            currentNodes = next;
        });
        registerNodeCleanup(anchor, stop);
    } else if (isNode(child)) {
        parent.appendChild(child);
    } else {
        parent.appendChild(doc.createTextNode(String(child)));
    }
};

const SVG_TAGS = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use|image|ellipse|foreignObject|linearGradient|radialGradient|stop|pattern|mask|clipPath|filter|feColorMatrix|feBlend|feGaussianBlur|animate|animateTransform|set|metadata|desc|title|symbol|marker|view)$/i;

export const Tag = (tag, props = {}, ...children) => {
    children = children.flat(Infinity);
    if (isFunction(tag)) {
        const ctx = { mount: [], unmount: [], provisions: {} };
        let rendered;
        const stop = Watch(() => {
            // Asignamos el contexto al efecto actual para que los hijos lo encuentren
            if (activeEffect) activeEffect.componentContext = ctx;
            rendered = tag(props, { children, emit: (ev, ...args) => {
                const h = props[`on${ev[0].toUpperCase()}${ev.slice(1)}`];
                if (isFunction(h)) h(...args);
            }});
            if (activeEffect) activeEffect.componentContext = null;
        });
        if (isNode(rendered)) {
            rendered.componentContext = ctx;
            rendered.componentStop = stop;
        }
        return rendered;
    }
    const isSVG = SVG_TAGS.test(tag);
    const el = isSVG ? doc.createElementNS('http://www.w3.org/2000/svg', tag) : doc.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (k.startsWith('on')) {
            const ev = k.slice(2).toLowerCase();
            el.addEventListener(ev, v);
            onUnmount(() => el.removeEventListener(ev, v));
        } else if (isFunction(v)) {
            const stopAttr = Watch(() => setProperty(el, k, v(), isSVG));
            registerNodeCleanup(el, stopAttr);
            if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === 'value' || k === 'checked')) {
                const evType = k === 'checked' ? 'change' : 'input';
                const handler = e => v(e.target[k]);
                el.addEventListener(evType, handler);
                onUnmount(() => el.removeEventListener(evType, handler));
            }
        } else {
            setProperty(el, k, v, isSVG);
        }
    }
    for (const child of children) appendChildNode(el, child);
    return el;
};

export const If = (cond, thenFn, elseFn = null, hooks = {}) => {
    let lastResult = null;
    let node = null;
    let exitPromise = null;
    return () => {
        const condition = !!(isFunction(cond) ? cond() : cond);
        if (condition === lastResult) return node;
        if (node) {
            if (hooks.leave) {
                if (exitPromise && exitPromise.cancel) exitPromise.cancel();
                const anim = hooks.leave(node);
                exitPromise = anim;
                if (anim && anim.finished) {
                    anim.finished.then(() => removeNode(node));
                } else {
                    removeNode(node);
                }
            } else {
                removeNode(node);
            }
        }
        lastResult = condition;
        const newNode = condition ? thenFn() : elseFn?.();
        node = newNode;
        if (node && hooks.enter) hooks.enter(node);
        return node;
    };
};

export const For = ({ each, key, children }) => {
    let cache = new Map();
    return () => {
        const items = isFunction(each) ? each() : each || [];
        const newCache = new Map();
        const nodes = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemKey = key ? (isFunction(key) ? key(item, i) : item[key]) : i;
            let node = cache.get(itemKey);
            if (!node) node = Tag(children[0], { item, index: i });
            newCache.set(itemKey, node);
            nodes.push(node);
            cache.delete(itemKey);
        }
        for (const node of cache.values()) removeNode(node);
        cache = newCache;
        return nodes;
    };
};

export const Router = ({ routes }) => {
    const outlet = Tag('div', { class: 'router-outlet' });
    const getHash = () => window.location.hash.slice(1) || '/';
    const path = $(getHash());
    const handler = () => { path(getHash()); };
    window.addEventListener('hashchange', handler);
    onUnmount(() => window.removeEventListener('hashchange', handler));
    Watch(() => {
        const current = path();
        const matched = routes.find(r => {
            const rSeg = r.path.split('/').filter(Boolean);
            const pSeg = current.split('/').filter(Boolean);
            return rSeg.length === pSeg.length && rSeg.every((s, i) => s[0] === ':' || s === pSeg[i]);
        }) || routes.find(r => r.path === '*');
        if (matched) {
            while (outlet.firstChild) removeNode(outlet.firstChild);
            const params = {};
            matched.path.split('/').filter(Boolean).forEach((s, i) => {
                if (s[0] === ':') params[s.slice(1)] = current.split('/').filter(Boolean)[i];
            });
            Router.params(params);
            const view = Tag(matched.component, { params });
            outlet.appendChild(view);
        }
    });
    return outlet;
};

Router.params = $({});

export const navigate = path => { window.location.hash = path; };
export const currentPath = () => window.location.hash.slice(1) || '/';

export const createApp = (Root, rootProps = {}) => selector => {
    const target = typeof selector === 'string' ? doc.querySelector(selector) : selector;
    if (target.appUnmount) target.appUnmount();
    const app = Tag(Root, rootProps);
    target.appendChild(app);
    if (app.componentContext) app.componentContext.mount.forEach(f => f());
    target.appUnmount = () => removeNode(app);
    return target.appUnmount;
};

'div span p a button input form label ul li ol header footer main section article nav aside h1 h2 h3 h4 h5 h6 img svg path circle rect line polyline polygon g defs text tspan use image ellipse foreignObject linearGradient radialGradient stop pattern mask clipPath filter feColorMatrix feBlend feGaussianBlur animate animateTransform set metadata desc title symbol marker view br hr pre code strong em table tr td th thead tbody tfoot select option textarea iframe video audio canvas'
.split(' ').forEach(tag => {
    globalThis[tag[0].toUpperCase() + tag.slice(1)] = (props, ...children) => Tag(tag, props, ...children);
});

export default { $, set, Watch, watch, untrack, Tag, If, For, Router, createApp, removeNode, navigate, currentPath, onMount, onUnmount };