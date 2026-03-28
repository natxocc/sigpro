/**
 * SigPro Core v1.1.13 - Full SSR & Hydration Support
 */
(() => {
  const isServer = typeof window === "undefined";
  const _global = isServer ? global : window;
  
  let activeEffect = null;
  let currentOwner = null;
  let SSR_MODE = false;
  let HYDRATE_PTR = null; // Puntero al nodo real en el DOM durante hidratación

  // --- MOCK DOM PARA NODE.JS ---
  const _doc = !isServer ? document : {
    createElement: (tag) => ({ tagName: tag.toUpperCase(), childNodes: [], appendChild: () => {}, setAttribute: () => {}, style: {} }),
    createTextNode: (txt) => ({ nodeType: 3, textContent: txt }),
    createComment: (txt) => ({ nodeType: 8, textContent: txt })
  };

  // --- REACTIVITY CORE ---
  const effectQueue = new Set();
  let isFlushing = false;
  const flush = () => {
    isFlushing = true;
    for (const eff of Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0))) {
      if (!eff._deleted) eff();
    }
    effectQueue.clear();
    isFlushing = false;
  };

  const track = (subs) => {
    if (SSR_MODE || !activeEffect || activeEffect._deleted) return;
    subs.add(activeEffect);
    activeEffect._deps.add(subs);
  };

  const trigger = (subs) => {
    if (SSR_MODE) return;
    for (const eff of subs) {
      if (eff === activeEffect || eff._deleted) continue;
      eff._isComputed ? (eff.markDirty(), eff._subs && trigger(eff._subs)) : effectQueue.add(eff);
    }
    if (!isFlushing) queueMicrotask(flush);
  };

  // --- SIGNALS ($) ---
  const $ = (initial, key = null) => {
    if (typeof initial === "function") {
      const subs = new Set();
      let cached, dirty = true;
      const effect = () => {
        if (effect._deleted) return;
        effect._deps.forEach(s => s.delete(effect));
        effect._deps.clear();
        const prev = activeEffect;
        activeEffect = effect;
        try {
          const val = initial();
          if (!Object.is(cached, val) || dirty) { cached = val; dirty = false; if (!SSR_MODE) trigger(subs); }
        } finally { activeEffect = prev; }
      };
      effect._deps = new Set();
      effect._isComputed = true;
      effect._subs = subs;
      effect.markDirty = () => (dirty = true);
      effect.stop = () => { effect._deleted = true; effect._deps.forEach(s => s.delete(effect)); };
      if (currentOwner && !SSR_MODE) currentOwner.cleanups.add(effect.stop);
      effect(); // Primera ejecución
      return () => { if (dirty && !SSR_MODE) effect(); track(subs); return cached; };
    }

    let value = initial;
    if (key && !isServer) {
      const saved = localStorage.getItem(key);
      if (saved) try { value = JSON.parse(saved); } catch { value = saved; }
    }
    const subs = new Set();
    return (...args) => {
      if (args.length && !SSR_MODE) {
        const next = typeof args[0] === "function" ? args[0](value) : args[0];
        if (!Object.is(value, next)) {
          value = next;
          if (key && !isServer) localStorage.setItem(key, JSON.stringify(value));
          trigger(subs);
        }
      }
      track(subs);
      return value;
    };
  };

  const $watch = (target, fn) => {
    if (SSR_MODE) return () => {};
    const isArr = Array.isArray(target);
    const cb = isArr ? fn : target;
    const runner = () => {
      if (runner._deleted) return;
      runner._deps.forEach(s => s.delete(runner)); runner._deps.clear();
      runner._cleanups.forEach(c => c()); runner._cleanups.clear();
      const prevEff = activeEffect, prevOwn = currentOwner;
      activeEffect = runner; currentOwner = { cleanups: runner._cleanups };
      runner.depth = prevEff ? prevEff.depth + 1 : 0;
      try { isArr ? (cb(), target.forEach(d => typeof d === "function" && d())) : cb(); }
      finally { activeEffect = prevEff; currentOwner = prevOwn; }
    };
    runner._deps = new Set(); runner._cleanups = new Set();
    runner.stop = () => { runner._deleted = true; runner._deps.forEach(s => s.delete(runner)); runner._cleanups.forEach(c => c()); };
    if (currentOwner) currentOwner.cleanups.add(runner.stop);
    runner();
    return runner.stop;
  };

  // --- VIRTUAL VIEW / HYDRATION ENGINE ---
  const _view = (fn) => {
    const cleanups = new Set();
    const prev = currentOwner;
    currentOwner = { cleanups };
    try {
      const res = fn({ onCleanup: f => cleanups.add(f) });
      if (SSR_MODE) {
        const toStr = (n) => {
          if (Array.isArray(n)) return n.map(toStr).join('');
          return n?._isRuntime ? n._ssrString : (n?.ssr || String(n ?? ''));
        };
        return { _isRuntime: true, _ssrString: toStr(res) };
      }
      const container = _doc.createElement("div");
      container.style.display = "contents";
      const process = (n) => {
        if (!n) return;
        if (n._isRuntime) container.appendChild(n.container);
        else if (Array.isArray(n)) n.forEach(process);
        else container.appendChild(n.nodeType ? n : _doc.createTextNode(String(n)));
      };
      process(res);
      return { _isRuntime: true, container, destroy: () => { cleanups.forEach(f => f()); container.remove(); } };
    } finally { currentOwner = prev; }
  };

  // --- HTML TAG ENGINE ---
  const $html = (tag, props = {}, content = []) => {
    if (props.nodeType || Array.isArray(props) || typeof props !== "object") { content = props; props = {}; }

    if (SSR_MODE) {
      let attrs = '';
      for (let [k, v] of Object.entries(props)) {
        if (k === "ref" || k.startsWith("on")) continue;
        const val = typeof v === "function" ? v() : v;
        if (val !== false && val != null) attrs += ` ${k === "class" ? "class" : k}="${val}"`;
      }
      const children = [].concat(content).map(c => {
        const v = typeof c === "function" ? c() : c;
        return v?._isRuntime ? v._ssrString : (v?.ssr || String(v ?? ''));
      }).join('');
      return { ssr: `<${tag}${attrs}>${children}</${tag}>` };
    }

    // CLIENT / HYDRATION
    let el;
    if (HYDRATE_PTR && HYDRATE_PTR.tagName === tag.toUpperCase()) {
      el = HYDRATE_PTR;
      HYDRATE_PTR = el.firstChild; // Entramos al primer hijo para la recursión
    } else {
      el = _doc.createElement(tag);
    }

    el._cleanups = el._cleanups || new Set();
    for (let [k, v] of Object.entries(props)) {
      if (k === "ref") { typeof v === "function" ? v(el) : (v.current = el); continue; }
      if (k.startsWith("on")) {
        const name = k.slice(2).toLowerCase();
        el.addEventListener(name, v);
        el._cleanups.add(() => el.removeEventListener(name, v));
      } else if (typeof v === "function") {
        el._cleanups.add($watch(() => {
          const val = v();
          if (k === "class") el.className = val || "";
          else val == null ? el.removeAttribute(k) : el.setAttribute(k, val);
        }));
      } else if (!el.hasAttribute(k)) el.setAttribute(k, v);
    }

    const append = (c) => {
      if (Array.isArray(c)) return c.forEach(append);
      if (typeof c === "function") {
        const marker = _doc.createTextNode("");
        if (!HYDRATE_PTR) el.appendChild(marker);
        let nodes = [];
        el._cleanups.add($watch(() => {
          const res = c();
          const next = (Array.isArray(res) ? res : [res]).map(i => i?._isRuntime ? i.container : (i instanceof Node ? i : _doc.createTextNode(i ?? "")));
          nodes.forEach(n => n.remove());
          next.forEach(n => marker.parentNode?.insertBefore(n, marker));
          nodes = next;
        }));
      } else {
        const child = c?._isRuntime ? c.container : (c instanceof Node ? c : _doc.createTextNode(String(c ?? "")));
        if (!HYDRATE_PTR) el.appendChild(child);
        else if (HYDRATE_PTR.nodeType === 3) HYDRATE_PTR = HYDRATE_PTR.nextSibling; // Saltar texto ya hidratado
      }
    };
    append(content);

    if (el === HYDRATE_PTR?.parentNode) HYDRATE_PTR = el.nextSibling; // Volvemos al nivel superior
    return el;
  };

  // --- CONTROL FLOW ---
  const $if = (cond, t, f = null) => {
    if (SSR_MODE) {
      const b = (typeof cond === "function" ? cond() : cond) ? t : f;
      return b ? (typeof b === "function" ? b() : b) : '';
    }
    const marker = _doc.createTextNode("");
    const container = $html("div", { style: "display:contents" }, [marker]);
    let curr = null, last = null;
    $watch(() => {
      const s = !!(typeof cond === "function" ? cond() : cond);
      if (s !== last) {
        last = s; if (curr) curr.destroy();
        const b = s ? t : f;
        if (b) { curr = _view(() => typeof b === "function" ? b() : b); container.insertBefore(curr.container, marker); }
      }
    });
    return container;
  };

  const $for = (src, itemFn, keyFn) => {
    if (SSR_MODE) {
      return ((typeof src === "function" ? src() : src) || []).map((item, i) => {
        const r = itemFn(item, i);
        return r?._isRuntime ? r._ssrString : (r?.ssr || String(r));
      }).join('');
    }
    const marker = _doc.createTextNode("");
    const container = $html("div", { style: "display:contents" }, [marker]);
    const cache = new Map();
    $watch(() => {
      const items = (typeof src === "function" ? src() : src) || [];
      const newKeys = new Set();
      items.forEach((item, i) => {
        const k = keyFn(item, i); newKeys.add(k);
        let run = cache.get(k);
        if (!run) { run = _view(() => itemFn(item, i)); cache.set(k, run); }
        container.insertBefore(run.container, marker);
      });
      cache.forEach((r, k) => { if (!newKeys.has(k)) { r.destroy(); cache.delete(k); }});
    });
    return container;
  };

  // --- ROUTER ---
  const $router = (routes) => {
    const getPath = () => SSR_MODE ? $router._ssrPath : (window.location.hash.replace(/^#/, "") || "/");
    if (SSR_MODE) {
      const path = getPath();
      const r = routes.find(rt => rt.path === path || rt.path === "*") || routes[0];
      const res = r.component({});
      return typeof res === "function" ? $ssr(res) : (res?.ssr || String(res));
    }
    const sPath = $(getPath());
    window.addEventListener("hashchange", () => sPath(getPath()));
    const outlet = $html("div", { class: "router-outlet" });
    let curr = null;
    $watch([sPath], () => {
      if (curr) curr.destroy();
      const r = routes.find(rt => rt.path === sPath() || rt.path === "*") || routes[0];
      curr = _view(() => r.component({}));
      outlet.appendChild(curr.container);
    });
    return outlet;
  };
  $router._ssrPath = "/";

  // --- PUBLIC API ---
  _global.$ssr = (comp, path = "/") => {
    const prev = SSR_MODE; SSR_MODE = true; $router._ssrPath = path;
    try { return _view(typeof comp === "function" ? comp : () => comp)._ssrString; }
    finally { SSR_MODE = prev; }
  };

  _global.$mount = (comp, target) => {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    if (el.firstChild) {
      HYDRATE_PTR = el.firstChild;
      const inst = _view(typeof comp === "function" ? comp : () => comp);
      HYDRATE_PTR = null;
      return inst;
    }
    const inst = _view(typeof comp === "function" ? comp : () => comp);
    el.replaceChildren(inst.container);
    return inst;
  };

  _global.$ = $; _global.$watch = $watch; _global.$html = $html; _global.$if = $if; _global.$for = $for; _global.$router = $router;

  const tags = 'div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer ul ol li a em strong i b u mark code form label input textarea select button table tr th td img video audio svg'.split(' ');
  tags.forEach(t => _global[t.charAt(0).toUpperCase() + t.slice(1)] = (p, c) => $html(t, p, c));

})();
