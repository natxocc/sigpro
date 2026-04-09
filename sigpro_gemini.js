/**
 * SigPro v2 G
 */
const SigPro = (() => {
  const doc = typeof document !== "undefined" ? document : null;
  const isArr = Array.isArray, assign = Object.assign, isFunc = (f) => typeof f === "function", isObj = (o) => typeof o === "object" && o !== null;
  const ensureNode = (n) => n?._isRuntime ? n.container : (n instanceof Node ? n : doc.createTextNode(String(n ?? "")));

  // --- ÁRBOL DE CONTEXTO (OWNER TREE) ---
  // c: Hijos (children), x: Limpiezas (cleanups), d: Dependencias/Señales (deps)
  let activeOwner = null, activeEffect = null, isFlushing = false;
  const effectQueue = new Set(), MOUNTED_NODES = new WeakMap();

  const createOwner = () => {
    const o = { c: new Set(), x: new Set(), d: new Set(), depth: activeOwner ? activeOwner.depth + 1 : 0 };
    if (activeOwner) activeOwner.c.add(o);
    return o;
  };

  const dispose = (o) => {
    if (!o) return;
    o.c?.forEach(dispose);          // 1. Destruye hijos recursivamente
    o.x?.forEach(f => f());         // 2. Ejecuta limpiezas (eventos, timers)
    o.d?.forEach(s => s.delete(o)); // 3. Se desuscribe de las señales
    o.c?.clear(); o.x?.clear(); o.d?.clear();
  };

  const runWithOwner = (o, cb) => {
    const prev = activeOwner; activeOwner = o;
    try { return cb(); } finally { activeOwner = prev; }
  };

  const onUnmount = (fn) => activeOwner?.x.add(fn);

  // --- SCHEDULER ---
  const flush = () => {
    if (isFlushing) return; isFlushing = true;
    const sorted = Array.from(effectQueue).sort((a, b) => a.depth - b.depth);
    effectQueue.clear();
    sorted.forEach(e => !e._deleted && e.run());
    isFlushing = false;
  };

  const trackUpdate = (subs, trigger = false) => {
    if (!trigger && activeEffect && !activeEffect._deleted) {
      subs.add(activeEffect); activeEffect.d.add(subs);
    } else if (trigger) {
      subs.forEach(e => {
        if (e === activeEffect || e._deleted) return;
        if (e._isComputed) { e.markDirty(); if (e._subs) trackUpdate(e._subs, true); }
        else effectQueue.add(e);
      });
      if (!isFlushing) queueMicrotask(flush);
    }
  };

  const untrack = (fn) => {
    const p = activeEffect; activeEffect = null;
    try { return fn(); } finally { activeEffect = p; }
  };

  // --- CORE API ---
  const $ = (val, key = null) => {
    const subs = new Set();
    if (isFunc(val)) {
      let cache, dirty = true;
      const e = createOwner();
      assign(e, { _isComputed: true, _subs: subs, markDirty: () => (dirty = true) });

      e.run = () => {
        if (e._deleted) return;
        dispose(e); // Limpia la ejecución anterior
        const prevE = activeEffect; activeEffect = e;
        runWithOwner(e, () => {
          const next = val();
          if (!Object.is(cache, next) || dirty) { cache = next; dirty = false; trackUpdate(subs, true); }
        });
        activeEffect = prevE;
      };

      onUnmount(() => { e._deleted = true; dispose(e); subs.clear(); });
      return () => { if (dirty) e.run(); trackUpdate(subs); return cache; };
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

  const Watch = (target, cb) => {
    const explicit = isArr(target), e = createOwner();
    e.run = () => {
      if (e._deleted) return;
      dispose(e);
      const prevE = activeEffect; activeEffect = e;
      runWithOwner(e, () => {
        explicit ? (untrack(cb), target.forEach(d => isFunc(d) && d())) : cb();
      });
      activeEffect = prevE;
    };
    onUnmount(() => { e._deleted = true; dispose(e); });
    e.run(); return () => { e._deleted = true; dispose(e); };
  };

  const Tag = (tag, props = {}, children = []) => {
    if (props instanceof Node || isArr(props) || !isObj(props)) { children = props; props = {}; }
    const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
    const el = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag);

    for (let [k, v] of Object.entries(props)) {
      if (k === "ref") { isFunc(v) ? v(el) : (v.current = el); continue; }
      if (k.startsWith("on")) {
        const ev = k.slice(2).toLowerCase(); el.addEventListener(ev, v);
        onUnmount(() => el.removeEventListener(ev, v)); // Se adjunta al Owner activo!
      } else if (isFunc(v)) {
        Watch(() => {
          const val = v(), safe = (k === 'src' || k === 'href') && String(val).includes('javascript:') ? '#' : val;
          k === "class" ? (el.className = safe || "") : (safe == null || safe === false ? el.removeAttribute(k) : el.setAttribute(k, safe === true ? "" : safe));
        });
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
          el.addEventListener(k === "checked" ? "change" : "input", (ev) => v(ev.target[k]));
        }
      } else el.setAttribute(k, v);
    }

    const append = (c) => {
      if (isArr(c)) return c.forEach(append);
      if (isFunc(c)) {
        const m = doc.createTextNode(""); el.appendChild(m); let curr = [];
        Watch(() => {
          const res = c(), next = (isArr(res) ? res : [res]).map(ensureNode);
          curr.forEach(n => { if (n instanceof Node) n.remove(); }); // Adiós cleanupNode()
          next.forEach(n => m.parentNode?.insertBefore(n, m)); curr = next;
        });
      } else el.appendChild(ensureNode(c));
    };
    append(children); return el;
  };

  const Render = (fn) => {
    const root = createOwner(), container = doc.createElement("div");
    container.style.display = "contents";
    runWithOwner(root, () => {
      const res = fn({ onCleanup: onUnmount });
      (isArr(res) ? res : [res]).forEach(r => container.appendChild(ensureNode(r)));
    });
    return { _isRuntime: true, container, destroy: () => { dispose(root); container.remove(); } };
  };

  const If = (cond, t, f = null, trans = null) => {
    const m = doc.createTextNode(""), root = Tag("div", { style: "display:contents" }, [m]);
    let view = null, last = null;
    Watch(() => {
      const s = !!(isFunc(cond) ? cond() : cond);
      if (s === last) return; last = s;
      const disposeView = () => { if (view) { view.destroy(); view = null; } };
      if (view && !s && trans?.out) trans.out(view.container, disposeView); else disposeView();
      const b = s ? t : f;
      if (b) {
        view = Render(() => isFunc(b) ? b() : b);
        root.insertBefore(view.container, m);
        if (trans?.in) trans.in(view.container);
      }
    });
    return root;
  };

  const For = (src, itemFn, keyFn) => {
    const m = doc.createTextNode(""), root = Tag("div", { style: "display:contents" }, [m]);
    let cache = new Map();
    Watch(() => {
      const items = (isFunc(src) ? src() : src) || [], next = new Map(), order = [];
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
    const getHash = () => window.location.hash.slice(1) || "/";
    const path = $(getHash());
    const listener = () => path(getHash());
    window.addEventListener("hashchange", listener);
    onUnmount(() => window.removeEventListener("hashchange", listener)); // Ahora el router se limpia solo

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
        route.path.split("/").filter(Boolean).forEach((p, i) => {
          if (p[0] === ":") params[p.slice(1)] = cur.split("/").filter(Boolean)[i];
        });

        Router.params(params);
        currentView = Render(() => isFunc(route.component) ? route.component(params) : route.component);
        outlet.replaceChildren(currentView.container);
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

  return { $, $$, Watch, Tag, Render, If, For, Router, Mount, untrack, onUnmount };
})();

if (typeof window !== "undefined") {
  Object.assign(window, SigPro);
  "div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer ul ol li a em strong pre code form label input textarea select button img svg"
    .split(" ").forEach(t => window[t[0].toUpperCase() + t.slice(1)] = (p, c) => SigPro.Tag(t, p, c));
}
export default SigPro;