const SigPro = (() => {
  const doc = typeof document !== "undefined" ? document : null;
  const isFunc = (f) => typeof f === "function";
  const isArr = Array.isArray;

  let activeEffect = null, currentOwner = null;
  const queue = new Set();

  const tick = () => {
    const runs = [...queue]; queue.clear();
    runs.forEach(fn => fn());
    if (queue.size) tick();
  };

  const onUnmount = (fn) => currentOwner?._cleanups.add(fn);

  const cleanupNode = (node) => {
    if (node._cleanups) { node._cleanups.forEach(f => f()); node._cleanups.clear(); }
    node.childNodes?.forEach(cleanupNode);
  };

  const effect = (fn) => {
    const runner = () => {
      stop();
      const prevEff = activeEffect, prevOwn = currentOwner;
      activeEffect = runner; currentOwner = runner;
      try { runner._cb = fn(); } finally { activeEffect = prevEff; currentOwner = prevOwn; }
    };
    const stop = () => {
      runner._deps?.forEach(subs => subs.delete(runner)); runner._deps?.clear();
      if (isFunc(runner._cb)) runner._cb();
      runner._cleanups?.forEach(f => f()); runner._cleanups?.clear();
    };
    Object.assign(runner, { _deps: new Set(), _cleanups: new Set(), stop });
    if (currentOwner) onUnmount(stop);
    runner(); return stop;
  };

  const signal = (val) => {
    const subs = new Set();
    return (...args) => {
      if (args.length) {
        const next = isFunc(args[0]) ? args[0](val) : args[0];
        if (!Object.is(val, next)) {
          val = next;
          subs.forEach(e => { queue.add(e); if (queue.size === 1) queueMicrotask(tick); });
        }
      } else {
        if (activeEffect) { subs.add(activeEffect); activeEffect._deps.add(subs); }
        return val;
      }
    };
  };

  const computed = (fn) => {
  const s = signal();
  effect(() => s(fn()));
  return () => s(); 
};

  const h = (tag, props = {}, children = []) => {
    if (props instanceof Node || isArr(props) || typeof props !== 'object') { children = props; props = {}; }
    const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
    const el = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag);
    el._cleanups = new Set();

    for (let [k, v] of Object.entries(props)) {
      if (k === "ref") { isFunc(v) ? v(el) : (v.current = el); continue; }
      if (k.startsWith("on")) {
        const ev = k.slice(2).toLowerCase(); el.addEventListener(ev, v);
        el._cleanups.add(() => el.removeEventListener(ev, v));
      } else if (isFunc(v)) {
        el._cleanups.add(effect(() => {
          const val = v(), safe = (k === 'src' || k === 'href') && String(val).includes('javascript:') ? '#' : val;
          k === "class" ? (el.className = safe || "") : (safe == null || safe === false ? el.removeAttribute(k) : el.setAttribute(k, safe === true ? "" : safe));
        }));
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
          el.addEventListener(k === "checked" ? "change" : "input", (e) => v(e.target[k === "checked" ? "checked" : "value"]));
        }
      } else el.setAttribute(k, v);
    }

    const ensureNode = (n) => n instanceof Node ? n : doc.createTextNode(String(n ?? ""));
    const append = (c) => {
      if (isArr(c)) return c.forEach(append);
      if (isFunc(c)) {
        const m = doc.createTextNode(""); el.appendChild(m); let curr = [];
        el._cleanups.add(effect(() => {
          const res = c(), next = (isArr(res) ? res : [res]).flat().map(ensureNode);
          curr.forEach(n => { cleanupNode(n); n.remove(); });
          next.forEach(n => m.parentNode?.insertBefore(n, m)); curr = next;
        }));
      } else if (c !== null && c !== false) el.appendChild(ensureNode(c));
    };
    append(children); 
    if (currentOwner) onUnmount(() => cleanupNode(el));
    return el;
  };

  const If = (cond, thenFn, elseFn = null) => {
    let last, cached;
    return () => {
      const v = !!(isFunc(cond) ? cond() : cond);
      if (v === last) return cached;
      last = v;
      const target = v ? thenFn : elseFn;
      return cached = isFunc(target) ? target() : target;
    };
  };

  const For = (list, keyFn, itemFn) => {
    let cache = new Map();
    return () => {
      const items = (isFunc(list) ? list() : list) || [];
      const nextCache = new Map();
      const nodes = items.map((item, i) => {
        const key = keyFn(item, i);
        const node = cache.get(key) || itemFn(item, i);
        nextCache.set(key, node); return node;
      });
      for (const [k, n] of cache) if (!nextCache.has(k)) { cleanupNode(n); n.remove(); }
      cache = nextCache; return nodes;
    };
  };

  const mount = (comp, target) => {
    const t = typeof target === "string" ? doc.querySelector(target) : target;
    cleanupNode(t);
    const prev = currentOwner, _cleanups = new Set();
    currentOwner = { _cleanups };
    const node = h(comp);
    currentOwner = prev;
    node._cleanups = new Set([...(node._cleanups || []), ..._cleanups]);
    t.replaceChildren(node);
    return () => cleanupNode(node);
  };

  return { signal, computed,  effect, h, If, For, mount, onUnmount };
})();