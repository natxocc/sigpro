// sigpro
const doc = typeof document !== "undefined" ? document : null;
const isArr = Array.isArray, assign = Object.assign, isFunc = (f) => typeof f === "function", isObj = (o) => typeof o === "object" && o !== null;
const ensureNode = (n) => n?._isRuntime ? n.container : (n instanceof Node ? n : doc.createTextNode(String(n ?? "")));

// --- STATE & SYSTEM VARIABLES ---
let activeEffect = null, currentOwner = null, currentCtx = null, isFlushing = false;
const effectQueue = new Set(), MOUNTED_NODES = new WeakMap();

const runCleanups = (s) => { s?.forEach(f => f()); s?.clear(); };
const clearDeps = (e) => { e._deps.forEach(d => d.delete(e)); e._deps.clear(); };
const onUnmount = (fn) => currentOwner && currentOwner.cleanups.add(fn);

const cleanupNode = (node) => {
  if (node._cleanups) runCleanups(node._cleanups);
  node.childNodes?.forEach(cleanupNode);
};

const runWithContext = (e, cb) => {
  const p = activeEffect; activeEffect = e;
  try { return cb(); } finally { activeEffect = p; }
};

const flush = () => {
  if (isFlushing) return; isFlushing = true;
  const sorted = Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0));
  effectQueue.clear();
  sorted.forEach(e => !e._deleted && e());
  isFlushing = false;
};

const trackUpdate = (subs, trigger = false) => {
  if (!trigger && activeEffect && !activeEffect._deleted) {
    subs.add(activeEffect); activeEffect._deps.add(subs);
  } else if (trigger) {
    subs.forEach(e => {
      if (e === activeEffect || e._deleted) return;
      if (e._isComputed) { e.markDirty(); if (e._subs) trackUpdate(e._subs, true); }
      else effectQueue.add(e);
    });
    if (!isFlushing) queueMicrotask(flush);
  }
};

// --- THE ATOM (Internal Kernel) ---
const _sub = (fn, cb) => {
  const e = () => {
    if (e._deleted) return;
    if (cb) {
      const val = runWithContext(e, fn);
      cb(val);
    } else {
      clearDeps(e);
      runWithContext(e, fn);
    }
  };
  e._deps = new Set();
  e();
  onUnmount(() => { e._deleted = true; clearDeps(e); });
  return e;
};

// --- PUBLIC API ---
const ignore = (fn) => {
  const p = activeEffect;
  activeEffect = null;
  try { return fn(); }
  finally { activeEffect = p; }
};

const Watch = (target, cb) => {
  const isA = isArr(target);
  return _sub(
    isA ? () => target.forEach(s => isFunc(s) ? s() : s) : target,
    isA ? () => ignore(cb) : null
  );
};

const Share = (k, v) => currentCtx && (currentCtx.p[k] = v);
const Use = (k, dft) => (currentCtx && k in currentCtx.p) ? currentCtx.p[k] : dft;

const $ = (val, key = null) => {
  const subs = new Set();
  if (isFunc(val)) {
    let cache, dirty = true;
    const e = _sub(val, (next) => {
      if (!Object.is(cache, next) || dirty) { cache = next; dirty = false; trackUpdate(subs, true); }
    });
    assign(e, { _isComputed: true, _subs: subs, markDirty: () => (dirty = true) });
    return () => { if (dirty) e(); trackUpdate(subs); return cache; };
  }
  if (key) try { val = JSON.parse(localStorage.getItem(key)) ?? val; } catch (e) { }
  return (...args) => {
    if (args.length) {
      const next = isFunc(args[0]) ? args[0](val) : args[0];
      if (!Object.is(val, next)) {
        val = next; if (key) localStorage.setItem(key, JSON.stringify(val));
        trackUpdate(subs, true);
      }
    }
    trackUpdate(subs); return val;
  };
};

const $$ = (obj, cache = new WeakMap()) => {
  if (!isObj(obj)) return obj;
  if (cache.has(obj)) return cache.get(obj);
  const subs = {};
  const proxy = new Proxy(obj, {
    get: (t, k) => { trackUpdate(subs[k] ??= new Set()); return isObj(t[k]) ? $$(t[k], cache) : t[k]; },
    set: (t, k, v) => { if (!Object.is(t[k], v)) { t[k] = v; if (subs[k]) trackUpdate(subs[k], true); } return true; }
  });
  cache.set(obj, proxy); return proxy;
};

const Tag = (tag, props = {}, children = []) => {
  if (props instanceof Node || isArr(props) || !isObj(props)) { children = props; props = {}; }
  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
  const el = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag);
  el._cleanups = new Set();

  for (let [k, v] of Object.entries(props)) {
    if (k === "ref") { isFunc(v) ? v(el) : (v.current = el); continue; }
    if (k.startsWith("on")) {
      const ev = k.slice(2).toLowerCase(); el.addEventListener(ev, v);
      el._cleanups.add(() => el.removeEventListener(ev, v));
    } else if (isFunc(v)) {
      _sub(v, (val) => {
        const safe = (k === 'src' || k === 'href') && String(val).includes('javascript:') ? '#' : val;
        if (k === "class") el.className = safe || "";
        else (safe == null || safe === false) ? el.removeAttribute(k) : el.setAttribute(k, safe === true ? "" : safe);
      });
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
        el.addEventListener(k === "checked" ? "change" : "input", (e) => v(e.target[k]));
      }
    } else el.setAttribute(k, v);
  }

  const append = (c) => {
    if (isArr(c)) return c.forEach(append);
    if (isFunc(c)) {
      const m = doc.createTextNode(""); el.appendChild(m); let curr = [];
      _sub(c, (res) => {
        const next = (isArr(res) ? res : [res]).map(ensureNode);
        curr.forEach(n => { if (n instanceof Node) { cleanupNode(n); n.remove(); } });
        next.forEach(n => m.parentNode?.insertBefore(n, m)); curr = next;
      });
    } else el.appendChild(ensureNode(c));
  };
  append(children); return el;
};

const Render = (fn) => {
  const cleanups = new Set(), prevOwner = currentOwner, prevCtx = currentCtx;
  currentCtx = { p: { ...(prevCtx?.p || {}) } };
  const container = doc.createElement("div");
  container.style.display = "contents";
  currentOwner = { cleanups };
  const res = fn({ onCleanup: (f) => cleanups.add(f) });
  (isArr(res) ? res : [res]).forEach(r => container.appendChild(ensureNode(r)));
  currentCtx = prevCtx; currentOwner = prevOwner;
  return { _isRuntime: true, container, destroy: () => { runCleanups(cleanups); cleanupNode(container); container.remove(); } };
};

const If = (cond, t, f = null, trans = null) => {
  const root = Tag("div", { style: "display:contents" });
  let view = null, last = null;
  _sub(() => !!(isFunc(cond) ? cond() : cond), (s) => {
    if (s === last) return; last = s;
    const dispose = () => { if (view) { view.destroy(); view = null; } };
    if (view && !s && trans?.out) trans.out(view.container, dispose); else dispose();
    const b = s ? t : f;
    if (b) {
      view = Render(() => isFunc(b) ? b() : b);
      root.appendChild(view.container);
      if (trans?.in) trans.in(view.container);
    }
  });
  return root;
};

const For = (src, itemFn, keyFn) => {
  const m = doc.createTextNode(""), root = Tag("div", { style: "display:contents" }, [m]);
  let cache = new Map();
  _sub(() => (isFunc(src) ? src() : src) || [], (items) => {
    const next = new Map(), order = [];
    items.forEach((item, i) => {
      const k = keyFn ? keyFn(item, i) : i;
      let v = cache.get(k) || Render(() => itemFn(item, i));
      cache.delete(k); next.set(k, v); order.push(k);
    });
    cache.forEach(v => v.destroy());
    let anchor = m;
    for (let i = order.length - 1; i >= 0; i--) {
      const v = next.get(order[i]);
      if (v.container.nextSibling !== anchor) root.insertBefore(v.container, anchor);
      anchor = v.container;
    }
    cache = next;
  });
  return root;
};

const Router = (routes) => {
  const getHash = () => window.location.hash.replace(/^#/, "") || "/";
  const path = $(getHash());
  window.addEventListener("hashchange", () => path(getHash()));
  const outlet = Tag("div", { class: "router-outlet" });
  let currentView = null;

  _sub(path, async (cur) => {
    const route = routes.find(r => {
      const p1 = r.path.split("/").filter(Boolean), p2 = cur.split("/").filter(Boolean);
      return p1.length === p2.length && p1.every((p, i) => p.startsWith(":") || p === p2[i]);
    }) || routes.find(r => r.path === "*");

    if (route) {
      let comp = route.component;
      if (isFunc(comp) && comp.toString().includes('import')) comp = (await comp()).default;
      const params = {};
      route.path.split("/").filter(Boolean).forEach((p, i) => { if (p.startsWith(":")) params[p.slice(1)] = cur.split("/").filter(Boolean)[i]; });
      currentView?.destroy();
      Router.params(params);
      currentView = Render(() => isFunc(comp) ? comp(params) : comp);
      outlet.appendChild(currentView.container);
    }
  });
  return outlet;
};

Router.params = $({});
Router.to = (p) => window.location.hash = p.replace(/^#?\/?/, "#/");
Router.back = () => window.history.back();
Router.path = () => window.location.hash.replace(/^#/, "") || "/";

const Mount = (comp, target) => {
  const t = typeof target === "string" ? doc.querySelector(target) : target;
  if (!t) return; if (MOUNTED_NODES.has(t)) MOUNTED_NODES.get(t).destroy();
  const inst = Render(isFunc(comp) ? comp : () => comp);
  t.replaceChildren(inst.container); MOUNTED_NODES.set(t, inst); return inst;
};

const SigPro = Object.freeze({ $, $$, Share, Use, Watch, Tag, Render, If, For, Router, Mount, ignore, onUnmount });

if (typeof window !== "undefined") {
  Object.assign(window, SigPro);
  "div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer ul ol li a em strong pre code form label input textarea select button img svg"
    .split(" ").forEach(t => window[t[0].toUpperCase() + t.slice(1)] = (p, c) => SigPro.Tag(t, p, c));
}

export { $, $$, Share, Use, Watch, Tag, Render, If, For, Router, Mount, ignore, onUnmount };
export default SigPro;