const isFunction = (v) => typeof v === 'function';
const isNode = (v) => v instanceof Node;
const doc = typeof document !== "undefined" ? document : null;

let activeEffect = null;
const pendingEffects = new Set();
let flushScheduled = false;

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
export const effect = Watch;
export const scope = Watch;

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
export const signal = $;

export const persistent = (initialValue, storageKey) => {
    let stored = initialValue;
    try {
        const item = localStorage.getItem(storageKey);
        if (item !== null) stored = JSON.parse(item);
    } catch (e) {}
    const sig = $(stored);
    Watch(() => {
        const val = sig.value;
        try { localStorage.setItem(storageKey, JSON.stringify(val)); } catch (e) {}
    });
    return sig;
};

export const computed = (fn) => {
    const s = $();
    Watch(() => { s.value = fn(); });
    return { get value() { return s.value; } };
};

export const untrack = (fn) => {
    const prev = activeEffect;
    activeEffect = null;
    try { return fn(); } finally { activeEffect = prev; }
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

let currentComponentContext = null;

export const onMount = (fn) => {
    if (currentComponentContext) currentComponentContext.mount.push(fn);
};
export const onUnmount = (fn) => {
    if (currentComponentContext) currentComponentContext.unmount.push(fn);
};
export const provide = (key, val) => {
    if (currentComponentContext) currentComponentContext.provisions[key] = val;
};
export const inject = (key, def) => {
    if (currentComponentContext && key in currentComponentContext.provisions)
        return currentComponentContext.provisions[key];
    return def;
};

const setProperty = (el, key, val, isSVG) => {
    if ((key === 'src' || key === 'href') && typeof val === 'string') {
        const lower = val.toLowerCase();
        if (lower.startsWith('javascript:') || lower.startsWith('data:text/html')) {
            console.warn(`Bloqueado ${key}`);
            val = '#';
        }
    }
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
        Watch(() => {
            const raw = child();
            const next = (Array.isArray(raw) ? raw : [raw])
                .flat(Infinity)
                .filter(v => v != null)
                .map(v => isNode(v) ? v : doc.createTextNode(String(v)));
            for (let i = 0; i < currentNodes.length; i++) {
                const n = currentNodes[i];
                if (!next.includes(n)) removeNode(n);
            }
            let ref = anchor;
            for (let i = next.length - 1; i >= 0; i--) {
                const n = next[i];
                if (n.parentNode !== parent) {
                    parent.insertBefore(n, ref);
                    if (n.componentContext) n.componentContext.mount.forEach(fn => fn());
                }
                ref = n;
            }
            currentNodes = next;
        });
    } else if (isNode(child)) {
        parent.appendChild(child);
    } else {
        parent.appendChild(doc.createTextNode(String(child)));
    }
};

const removeNode = (node) => {
    if (node.componentStop) node.componentStop();
    if (node.componentContext) node.componentContext.unmount.forEach(fn => fn());
    if (node.leaveTransition) {
        node.leaveTransition(() => node.remove());
    } else {
        node.remove();
    }
};

export const Tag = (tag, props, ...children) => {
    props = props || {};
    children = children.flat(Infinity);
    if (isFunction(tag)) {
        const prevCtx = currentComponentContext;
        const ctx = {
            mount: [],
            unmount: [],
            provisions: { ...(prevCtx?.provisions || {}) },
        };
        currentComponentContext = ctx;
        let rendered;
        const stop = scope(() => {
            rendered = tag(props, {
                children,
                emit: (ev, ...args) => {
                    const handler = props[`on${ev[0].toUpperCase()}${ev.slice(1)}`];
                    if (isFunction(handler)) handler(...args);
                },
            });
        });
        currentComponentContext = prevCtx;
        if (isNode(rendered) || isFunction(rendered)) {
            rendered.componentContext = ctx;
            rendered.componentStop = stop;
        }
        return rendered;
    }
    if (!tag) return () => children;
    const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|use)$/.test(tag);
    const el = isSVG
        ? doc.createElementNS('http://www.w3.org/2000/svg', tag)
        : doc.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (k === 'ref') {
            if (isFunction(v)) v(el);
            else if (v && 'value' in v) v.value = el;
            continue;
        }
        if (k.startsWith('on')) {
            const ev = k.slice(2).toLowerCase();
            el.addEventListener(ev, v);
            onUnmount(() => el.removeEventListener(ev, v));
            continue;
        }
        if (isFunction(v)) {
            Watch(() => setProperty(el, k, v(), isSVG));
        } else {
            setProperty(el, k, v, isSVG);
        }
    }
    for (const child of children) appendChildNode(el, child);
    return el;
};
export const h = Tag;

export const If = ({ when, children }) => {
    return () => (isFunction(when) ? when() : when) ? children[0] : children[1] || null;
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
                const childFn = children[0];
                node = Tag(childFn, { item, index: i });
            }
            newCache.set(itemKey, node);
            nodes.push(node);
        }
        cache = newCache;
        return nodes;
    };
};

export const Transition = ({ enter, leave, children }) => {
    const decorate = (el) => {
        if (!isNode(el)) return el;
        if (enter) {
            const [from, active, to] = enter;
            requestAnimationFrame(() => {
                el.classList.add(active);
                requestAnimationFrame(() => {
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
                requestAnimationFrame(() => {
                    el.classList.add(from);
                    el.classList.remove(active);
                    el.classList.add(to);
                    const onEnd = () => {
                        el.classList.remove(to, from);
                        el.removeEventListener('transitionend', onEnd);
                        done();
                    };
                    el.addEventListener('transitionend', onEnd, { once: true });
                });
            };
        }
        return el;
    };
    const child = children[0];
    if (!child) return null;
    return isFunction(child) ? () => decorate(child()) : decorate(child);
};

const currentPath = $((window.location.hash.slice(1) || '/'));
window.addEventListener('hashchange', () => {
    currentPath.value = window.location.hash.slice(1) || '/';
});

export const Router = ({ routes }) => {
    const outlet = Tag('div', { class: 'router-outlet' });
    let currentView = null;
    Watch(() => {
        const path = currentPath.value;
        const segments = path.split('/').filter(Boolean);
        const matched = routes.find(route => {
            const rSeg = route.path.split('/').filter(Boolean);
            return rSeg.length === segments.length && rSeg.every((s, i) => s[0] === ':' || s === segments[i]);
        }) || routes.find(r => r.path === '*');
        if (matched) {
            if (currentView && currentView.componentStop) currentView.componentStop();
            const params = {};
            const rSeg = matched.path.split('/').filter(Boolean);
            rSeg.forEach((s, i) => { if (s[0] === ':') params[s.slice(1)] = segments[i]; });
            currentView = Tag(matched.component, { params });
            outlet.innerHTML = '';
            outlet.appendChild(currentView);
        }
    });
    return outlet;
};

export const navigate = (to) => { window.location.hash = to.replace(/^#?\/?/, '#/'); };
export const back = () => window.history.back();
export const getCurrentPath = () => currentPath.value;

export const $$ = (obj, cache = new WeakMap()) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (cache.has(obj)) return cache.get(obj);
    const subs = {};
    const proxy = new Proxy(obj, {
        get: (t, k) => {
            track(subs[k] ??= new Set());
            const val = t[k];
            return (val && typeof val === 'object') ? $$(val, cache) : val;
        },
        set: (t, k, v) => {
            if (Object.is(t[k], v)) return true;
            t[k] = v;
            if (subs[k]) trigger(subs[k]);
            return true;
        },
    });
    cache.set(obj, proxy);
    return proxy;
};
export const reactive = $$;

export const createApp = (Root, rootProps = {}) => (selector) => {
    const target = typeof selector === 'string' ? doc.querySelector(selector) : selector;
    if (!target) throw new Error(`No se encontró ${selector}`);
    if (target.appUnmount) target.appUnmount();
    const app = Tag(Root, rootProps);
    target.appendChild(app);
    if (app.componentContext) app.componentContext.mount.forEach(fn => fn());
    target.appUnmount = () => removeNode(app);
    return target.appUnmount;
};

const tags = 'div span p a button input form label ul li ol header footer main section article nav aside h1 h2 h3 h4 h5 h6 img svg path circle rect line polyline polygon g defs text use br hr pre code strong em table tr td th thead tbody tfoot select option textarea iframe video audio canvas'.split(' ');
tags.forEach(tag => {
    const name = tag[0].toUpperCase() + tag.slice(1);
    globalThis[name] = (props, ...children) => Tag(tag, props, ...children);
});

export const createElement = Tag;
export const Fragment = (props) => props.children;

export default {
    $, signal, $$, reactive, persistent, computed, Watch, effect, scope, watch, untrack,
    onMount, onUnmount, provide, inject, Tag, h, createElement, Fragment, If, For, Transition,
    Router, navigate, back, getCurrentPath, createApp,
};