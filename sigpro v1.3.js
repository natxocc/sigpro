/** SigPro (Signals & Proxies) */

// Helpers
const doc = typeof document !== "undefined" ? document : null;
const isArr = Array.isArray, isFunc = f => typeof f === "function", isObj = o => o && typeof o === "object";
const ensureNode = n => n?._isRuntime ? n.container : (n instanceof Node ? n : doc.createTextNode(n == null ? "" : String(n)));

let activeEffect = null, activeOwner = null, isFlushing = false;
const effectQueue = new Set(), MOUNTED_NODES = new WeakMap();

const dispose = eff => {
  if (!eff || eff._disposed) return;
  eff._disposed = true;
  const stack = [eff];
  while (stack.length) {
    const e = stack.pop();
    if (e._cleanups) { e._cleanups.forEach(fn => fn()); e._cleanups.clear(); }
    if (e._children) { e._children.forEach(child => stack.push(child)); e._children.clear(); }
    if (e._deps) { e._deps.forEach(depSet => depSet.delete(e)); e._deps.clear(); }
  }
};

export const onUnmount = fn => {
  if (activeOwner) (activeOwner._cleanups ||= new Set()).add(fn);
};

// Effect creation
const createEffect = (fn, isComputed = false) => {
  const effect = () => {
    if (effect._disposed) return;
    if (effect._deps) effect._deps.forEach(depSet => depSet.delete(effect));
    if (effect._cleanups) { effect._cleanups.forEach(cl => cl()); effect._cleanups.clear(); }
    const prevEffect = activeEffect, prevOwner = activeOwner;
    activeEffect = activeOwner = effect;
    try { return isComputed ? fn() : (fn(), undefined); }
    finally { activeEffect = prevEffect; activeOwner = prevOwner; }
  };
  effect._deps = effect._cleanups = effect._children = null;
  effect._disposed = false;
  effect._isComputed = isComputed;
  effect._depth = activeEffect ? activeEffect._depth + 1 : 0;
  effect._mounts = [];
  effect._parent = activeOwner;
  effect._provisions = activeOwner ? { ...activeOwner._provisions } : {};
  if (activeOwner) (activeOwner._children ||= new Set()).add(effect);
  return effect;
};

const flush = () => {
  if (isFlushing) return;
  isFlushing = true;
  const sorted = Array.from(effectQueue).sort((a, b) => a._depth - b._depth);
  effectQueue.clear();
  for (const e of sorted) if (!e._disposed) e();
  isFlushing = false;
};

const trackUpdate = (subs, trigger = false) => {
  if (!trigger && activeEffect && !activeEffect._disposed) {
    subs.add(activeEffect);
    (activeEffect._deps ||= new Set()).add(subs);
  } else if (trigger) {
    let hasQueue = false;
    subs.forEach(e => {
      if (e === activeEffect || e._disposed) return;
      if (e._isComputed) {
        e._dirty = true;
        if (e._subs) trackUpdate(e._subs, true);
      } else {
        effectQueue.add(e);
        hasQueue = true;
      }
    });
    if (hasQueue && !isFlushing) queueMicrotask(flush);
  }
};

export const untrack = fn => { const p = activeEffect; activeEffect = null; try { return fn(); } finally { activeEffect = p; } };

export const onMount = fn => {
  if (activeOwner) (activeOwner._mounts ||= []).push(fn);
};

// Reactive state
export const $ = (val, key = null) => {
  const subs = new Set();
  if (isFunc(val)) {
    let cache, dirty = true;
    const computed = () => {
      if (dirty) {
        const prev = activeEffect;
        activeEffect = computed;
        try {
          const next = val();
          if (!Object.is(cache, next)) { cache = next; dirty = false; trackUpdate(subs, true); }
        } finally { activeEffect = prev; }
      }
      trackUpdate(subs);
      return cache;
    };
    computed._isComputed = true;
    computed._subs = subs;
    computed._dirty = true;
    computed._deps = null;
    computed._disposed = false;
    computed.markDirty = () => { dirty = true; };
    computed.stop = () => {
      computed._disposed = true;
      if (computed._deps) { computed._deps.forEach(depSet => depSet.delete(computed)); computed._deps.clear(); }
      subs.clear();
    };
    onUnmount(computed.stop);
    return computed;
  }
  if (key) try { val = JSON.parse(localStorage.getItem(key)) ?? val; } catch (e) { }
  return (...args) => {
    if (args.length) {
      const next = isFunc(args[0]) ? args[0](val) : args[0];
      if (!Object.is(val, next)) { val = next; if (key) localStorage.setItem(key, JSON.stringify(val)); trackUpdate(subs, true); }
    }
    trackUpdate(subs);
    return val;
  };
};

export const $$ = (obj, cache = new WeakMap()) => {
  if (!isObj(obj)) return obj;
  if (cache.has(obj)) return cache.get(obj);
  const subs = {};
  const proxy = new Proxy(obj, {
    get: (t, k) => { trackUpdate(subs[k] ??= new Set()); return isObj(t[k]) ? $$(t[k], cache) : t[k]; },
    set: (t, k, v) => { if (!Object.is(t[k], v)) { t[k] = v; if (subs[k]) trackUpdate(subs[k], true); } return true; }
  });
  cache.set(obj, proxy);
  return proxy;
};

// Watcher
export const Watch = (target, cb) => {
  const explicit = isArr(target);
  const effect = createEffect(() => explicit ? (untrack(cb), target.forEach(d => isFunc(d) && d())) : cb());
  effect();
  return () => dispose(effect);
};

const cleanupNode = node => {
  if (node._cleanups) { node._cleanups.forEach(fn => fn()); node._cleanups.clear(); }
  if (node._ownerEffect) dispose(node._ownerEffect);
  if (node.childNodes) node.childNodes.forEach(cleanupNode);
};

// provide/inject
export const provide = (key, value) => {
  if (activeOwner) activeOwner._provisions[key] = value;
};

export const inject = (key, defaultValue) => {
  let ctx = activeOwner;
  while (ctx) {
    if (key in ctx._provisions) return ctx._provisions[key];
    ctx = ctx._parent;
  }
  return defaultValue;
};

// CreateElement
export const Tag = (tag, props = {}, children = []) => {
  if (props instanceof Node || isArr(props) || !isObj(props)) { children = props; props = {}; }
  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
  const el = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag);
  el._cleanups = new Set();
  for (let [k, v] of Object.entries(props)) {
    if (k === "ref") { isFunc(v) ? v(el) : (v.current = el); continue; }
    if (k.startsWith("on")) {
      const ev = k.slice(2).toLowerCase();
      el.addEventListener(ev, v);
      const off = () => el.removeEventListener(ev, v);
      el._cleanups.add(off);
      onUnmount(off);
    } else if (isFunc(v)) {
      const effect = createEffect(() => {
        const val = v();
        const safe = (k === 'src' || k === 'href') && String(val).includes('javascript:') ? '#' : val;
        if (k === "class") el.className = safe || "";
        else if (safe == null || safe === false) el.removeAttribute(k);
        else el.setAttribute(k, safe === true ? "" : safe);
      });
      effect();
      el._cleanups.add(() => dispose(effect));
      onUnmount(() => dispose(effect));
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
        const evType = k === "checked" ? "change" : "input";
        el.addEventListener(evType, ev => v(ev.target[k]));
      }
    } else el.setAttribute(k, v);
  }
  const append = c => {
    if (isArr(c)) return c.forEach(append);
    if (isFunc(c)) {
      const anchor = doc.createTextNode("");
      el.appendChild(anchor);
      let currentNodes = [];
      const effect = createEffect(() => {
        const res = c();
        const next = (isArr(res) ? res : [res]).map(ensureNode);
        currentNodes.forEach(n => { if (n._isRuntime) n.destroy(); else cleanupNode(n); });
        let ref = anchor;
        for (let i = next.length - 1; i >= 0; i--) {
          const node = next[i];
          if (node.parentNode !== ref.parentNode) ref.parentNode?.insertBefore(node, ref);
          if (node._mounts) node._mounts.forEach(fn => fn());
          ref = node;
        }
        currentNodes = next;
      });
      effect();
      el._cleanups.add(() => dispose(effect));
      onUnmount(() => dispose(effect));
    } else {
      const node = ensureNode(c);
      el.appendChild(node);
      if (node._mounts) node._mounts.forEach(fn => fn());
    }
  };
  append(children);
  return el;
};

// Render
export const Render = fn => {
  const container = doc.createElement("div");
  container.style.display = "contents";
  const rootEffect = createEffect(() => {
    const res = fn({ onCleanup: onUnmount });
    (isArr(res) ? res : [res]).forEach(r => container.appendChild(ensureNode(r)));
  });
  rootEffect();
  rootEffect._mounts?.forEach(fn => fn());
  return { _isRuntime: true, container, destroy: () => { dispose(rootEffect); container.remove(); } };
};

// If
export const If = (cond, t, f = null, trans = null) => {
  const anchor = doc.createTextNode("");
  const root = Tag("div", { style: "display:contents" }, [anchor]);
  let currentView = null, last = null;
  Watch(() => {
    const show = !!(isFunc(cond) ? cond() : cond);
    if (show === last) return;
    last = show;
    const disposeView = () => { if (currentView) { currentView.destroy(); currentView = null; } };
    if (currentView && !show && trans?.out) trans.out(currentView.container, disposeView);
    else disposeView();
    const content = show ? t : f;
    if (content) {
      currentView = Render(() => isFunc(content) ? content() : content);
      root.insertBefore(currentView.container, anchor);
      if (trans?.in) trans.in(currentView.container);
    }
  });
  return root;
};

// For
export const For = (src, itemFn, keyFn) => {
  const anchor = doc.createTextNode("");
  const root = Tag("div", { style: "display:contents" }, [anchor]);
  let cache = new Map();
  Watch(() => {
    const items = (isFunc(src) ? src() : src) || [];
    const next = new Map(), order = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = keyFn ? keyFn(item, i) : i;
      let view = cache.get(key);
      if (!view) view = Render(() => itemFn(item, i));
      next.set(key, view);
      order.push(key);
      cache.delete(key);
    }
    cache.forEach(v => v.destroy());
    cache = next;
    let ref = anchor;
    for (let i = order.length - 1; i >= 0; i--) {
      const view = next.get(order[i]);
      if (view.container.nextSibling !== ref) root.insertBefore(view.container, ref);
      ref = view.container;
    }
  });
  return root;
};

// Router
export const Router = routes => {
  const getHash = () => window.location.hash.slice(1) || "/";
  const path = $(getHash());
  const handler = () => path(getHash());
  window.addEventListener("hashchange", handler);
  onUnmount(() => window.removeEventListener("hashchange", handler));
  const outlet = Tag("div", { class: "router-outlet" });
  let currentView = null;
  Watch([path], () => {
    const cur = path();
    const route = routes.find(r => {
      const p1 = r.path.split("/").filter(Boolean);
      const p2 = cur.split("/").filter(Boolean);
      return p1.length === p2.length && p1.every((p, i) => p[0] === ":" || p === p2[i]);
    }) || routes.find(r => r.path === "*");
    if (route) {
      currentView?.destroy();
      const params = {};
      route.path.split("/").filter(Boolean).forEach((p, i) => { if (p[0] === ":") params[p.slice(1)] = cur.split("/").filter(Boolean)[i]; });
      Router.params(params);
      currentView = Render(() => isFunc(route.component) ? route.component(params) : route.component);
      outlet.replaceChildren(currentView.container);
    }
  });
  return outlet;
};
Router.params = $({});
Router.to = p => window.location.hash = p.replace(/^#?\/?/, "#/");
Router.back = () => window.history.back();
Router.path = () => window.location.hash.replace(/^#/, "") || "/";

// Mount
export const Mount = (comp, target) => {
  const t = typeof target === "string" ? doc.querySelector(target) : target;
  if (!t) return;
  if (MOUNTED_NODES.has(t)) MOUNTED_NODES.get(t).destroy();
  const inst = Render(isFunc(comp) ? comp : () => comp);
  t.replaceChildren(inst.container);
  MOUNTED_NODES.set(t, inst);
  return inst;
};

const SigPro = Object.freeze({ $, $$, Watch, Tag, Render, If, For, Router, Mount, untrack, onMount, onUnmount, provide, inject });

export const initDX = () => {
  if (typeof window === "undefined") return;
  Object.assign(window, SigPro);
  "div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer ul ol li a em strong pre code form label input textarea select button img svg"
    .split(" ").forEach(t => window[t[0].toUpperCase() + t.slice(1)] = (p, c) => SigPro.Tag(t, p, c));
};