/** * Sigwork 2.0 - Memoria Optimizada
 * Soluciona fugas en Atributos, For/If, Router y Transiciones.
 */

const isFunction = (v) => typeof v === 'function';
const isNode = (v) => v instanceof Node;
const doc = typeof document !== "undefined" ? document : null;

let activeEffect = null;
const pendingEffects = new Set();
let flushScheduled = false;

// Registro global para limpiezas vinculadas a nodos DOM nativos
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

const disposeEffectTree = (effect) => {
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

// --- RECTIFICACIÓN: removeNode DEEP & RECURSIVE ---
export const removeNode = (node) => {
    if (!node) return;

    // 1. Limpieza recursiva de hijos (Fuga #6 y #8)
    if (node.childNodes) {
        node.childNodes.forEach(child => removeNode(child));
    }

    // 2. Limpiar efectos vinculados al nodo nativo (Fuga #2 y #3)
    const disposers = nodeDisposers.get(node);
    if (disposers) {
        disposers.forEach(d => d());
        nodeDisposers.delete(node);
    }

    // 3. Cancelar animaciones pendientes (Fuga #7)
    if (node._raf) cancelAnimationFrame(node._raf);

    // 4. Limpiar contexto de componentes
    if (node.componentStop) node.componentStop();
    if (node.componentContext) {
        node.componentContext.unmount.forEach(fn => fn());
        node.componentContext.unmount = [];
    }

    // 5. Salida con transición o eliminación directa
    if (node.leaveTransition) {
        node.leaveTransition(() => node.remove());
    } else {
        node.remove();
    }
};

const track = (subs) => {
    if (activeEffect && !activeEffect.disposed) {
        subs.add(activeEffect);
        activeEffect.dependencies.add(subs);
    }
};

const trigger = (subs) => {
    if (!subs) return;
    for (const eff of subs) {
        if (eff !== activeEffect && !eff.disposed) pendingEffects.add(eff);
    }
    scheduleFlush();
};

export const $ = (initialValue) => {
    const subs = new Set();
    return {
        get value() {
            track(subs);
            return initialValue;
        },
        set value(newVal) {
            if (Object.is(newVal, initialValue)) return;
            initialValue = newVal;
            trigger(subs);
        },
    };
};

// Utilidades reactivas (Fuga #1: Watch ahora se auto-asocia al componente actual)
export const persistent = (initialValue, storageKey) => {
    let stored = initialValue;
    try {
        const item = localStorage.getItem(storageKey);
        if (item !== null) stored = JSON.parse(item);
    } catch (e) {}
    const sig = $(stored);
    Watch(() => {
        localStorage.setItem(storageKey, JSON.stringify(sig.value));
    });
    return sig;
};

export const computed = (fn) => {
    const s = $();
    Watch(() => { s.value = fn(); });
    return { get value() { return s.value; } };
};

export const watch = (source, callback) => {
    let first = true, oldVal;
    return Watch(() => {
        const newVal = isFunction(source) ? source() : source.value;
        if (!first) untrack(() => callback(newVal, oldVal));
        else first = false;
        oldVal = newVal;
    });
};

export const untrack = (fn) => {
    const prev = activeEffect;
    activeEffect = null;
    try { return fn(); } finally { activeEffect = prev; }
};

let currentComponentContext = null;

export const onMount = (fn) => currentComponentContext?.mount.push(fn);
export const onUnmount = (fn) => currentComponentContext?.unmount.push(fn);

const setProperty = (el, key, val, isSVG) => {
    if (key === 'class' || key === 'className') {
        el.className = val || '';
    } else if (key === 'style' && typeof val === 'object') {
        Object.assign(el.style, val);
    } else if (key in el && !isSVG) {
        el[key] = val;
    } else {
        if (val == null || val === false) el.removeAttribute(key);
        else if (val === true) el.setAttribute(key, '');
        else el.setAttribute(key, val);
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

            // RECTIFICACIÓN Fuga #6: Eliminación explícita mediante removeNode
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
        registerNodeCleanup(anchor, stop); // Fuga #3 corregida
    } else if (isNode(child)) {
        parent.appendChild(child);
    } else {
        parent.appendChild(doc.createTextNode(String(child)));
    }
};

export const Tag = (tag, props = {}, ...children) => {
    children = children.flat(Infinity);
    
    if (isFunction(tag)) {
        const prevCtx = currentComponentContext;
        const ctx = { mount: [], unmount: [], provisions: { ...(prevCtx?.provisions || {}) } };
        currentComponentContext = ctx;
        
        let rendered;
        const stop = Watch(() => {
            rendered = tag(props, { children, emit: (ev, ...args) => {
                const h = props[`on${ev[0].toUpperCase()}${ev.slice(1)}`];
                if (isFunction(h)) h(...args);
            }});
        });
        
        currentComponentContext = prevCtx;
        if (isNode(rendered)) {
            rendered.componentContext = ctx;
            rendered.componentStop = stop;
        }
        return rendered;
    }

    const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|use)$/.test(tag);
    const el = isSVG ? doc.createElementNS('http://www.w3.org/2000/svg', tag) : doc.createElement(tag);

    for (const [k, v] of Object.entries(props)) {
        if (k.startsWith('on')) {
            const ev = k.slice(2).toLowerCase();
            el.addEventListener(ev, v);
            onUnmount(() => el.removeEventListener(ev, v));
        } else if (isFunction(v)) {
            // Fuga #2 corregida: El efecto del atributo se registra en el nodo
            const stopAttr = Watch(() => setProperty(el, k, v(), isSVG));
            registerNodeCleanup(el, stopAttr);
        } else {
            setProperty(el, k, v, isSVG);
        }
    }

    for (const child of children) appendChildNode(el, child);
    return el;
};

export const If = ({ when, children }) => {
    let lastResult = null;
    let node = null;
    return () => {
        const condition = !!(isFunction(when) ? when() : when);
        if (condition === lastResult) return node;
        
        if (node) removeNode(node); // Limpieza de la rama anterior
        lastResult = condition;
        node = condition ? children[0] : (children[1] || null);
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
            if (!node) {
                node = Tag(children[0], { item, index: i });
            }
            newCache.set(itemKey, node);
            nodes.push(node);
            cache.delete(itemKey);
        }

        // Fuga #6 corregida: Los nodos que sobran se destruyen formalmente
        for (const node of cache.values()) removeNode(node);
        cache = newCache;
        return nodes;
    };
};

export const Transition = ({ enter, leave, children }) => {
    const decorate = (el) => {
        if (!isNode(el)) return el;
        
        if (enter) {
            const [from, active, to] = enter;
            el._raf = requestAnimationFrame(() => {
                el.classList.add(active);
                el._raf = requestAnimationFrame(() => {
                    el.classList.add(from);
                    el.classList.remove(active);
                    el.classList.add(to);
                    const onEnd = () => {
                        el.classList.remove(to, from);
                        el.removeEventListener('transitionend', onEnd);
                    };
                    el.addEventListener('transitionend', onEnd, { once: true });
                });
            });
        }

        if (leave) {
            const [from, active, to] = leave;
            el.leaveTransition = (done) => {
                el.classList.add(active);
                el._raf = requestAnimationFrame(() => {
                    el.classList.add(from);
                    el.classList.remove(active);
                    el.classList.add(to);
                    const onEnd = () => {
                        el.classList.remove(to, from);
                        done();
                    };
                    el.addEventListener('transitionend', onEnd, { once: true });
                });
            };
        }
        return el;
    };
    const child = children[0];
    return isFunction(child) ? () => decorate(child()) : decorate(child);
};

export const Router = ({ routes }) => {
    const outlet = Tag('div', { class: 'router-outlet' });
    let currentView = null;

    Watch(() => {
        const path = currentPath.value;
        const matched = routes.find(r => {
            const rSeg = r.path.split('/').filter(Boolean);
            const pSeg = path.split('/').filter(Boolean);
            return rSeg.length === pSeg.length && rSeg.every((s, i) => s[0] === ':' || s === pSeg[i]);
        }) || routes.find(r => r.path === '*');

        if (matched) {
            // Fuga #8 corregida: Limpieza profunda de la vista anterior
            while (outlet.firstChild) removeNode(outlet.firstChild);
            
            const params = {};
            matched.path.split('/').filter(Boolean).forEach((s, i) => {
                if (s[0] === ':') params[s.slice(1)] = path.split('/').filter(Boolean)[i];
            });
            
            currentView = Tag(matched.component, { params });
            outlet.appendChild(currentView);
        }
    });
    return outlet;
};

// --- RESTO DE EXPORTS ---
export const currentPath = $((window.location.hash.slice(1) || '/'));
window.addEventListener('hashchange', () => currentPath.value = window.location.hash.slice(1) || '/');

export const createApp = (Root, rootProps = {}) => (selector) => {
    const target = typeof selector === 'string' ? doc.querySelector(selector) : selector;
    if (target.appUnmount) target.appUnmount();
    const app = Tag(Root, rootProps);
    target.appendChild(app);
    if (app.componentContext) app.componentContext.mount.forEach(f => f());
    target.appUnmount = () => removeNode(app);
    return target.appUnmount;
};

// Global Tags DX
'div span p a button input form label ul li ol header footer main section article nav aside h1 h2 h3 h4 h5 h6 img svg path circle rect line polyline polygon g defs text use br hr pre code strong em table tr td th thead tbody tfoot select option textarea iframe video audio canvas'
.split(' ').forEach(tag => {
    globalThis[tag[0].toUpperCase() + tag.slice(1)] = (props, ...children) => Tag(tag, props, ...children);
});

export default { $, Watch, Tag, If, For, Transition, Router, createApp, removeNode };