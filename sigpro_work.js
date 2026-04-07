//sigpro
let activeEffect = null;
let currentOwner = null;
const effectQueue = new Set();
let isFlushing = false;
const MOUNTED_NODES = new WeakMap();
const reactiveCache = new WeakMap();
const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i;
const sanitizeUrl = (url) => {
    const str = String(url ?? '').trim().toLowerCase();
    return DANGEROUS_PROTOCOLS.test(str) ? '#' : str;
};
const doc = document;
const createEl = (t) => doc.createElement(t);
const createText = (t) => doc.createTextNode(String(t ?? ""));

const flushEffects = () => {
  if (isFlushing) return;
  isFlushing = true;
  const runs = [...effectQueue];
  effectQueue.clear();
  runs.forEach((e) => { if (!e._deleted) e(); });
  isFlushing = false;
};

const cleanupNode = (node) => {
  if (node._cleanups) {
    node._cleanups.forEach((d) => d());
    node._cleanups.clear();
  }
  node.childNodes?.forEach(cleanupNode);
};

const untrack = (fn) => {
  const prev = activeEffect;
  activeEffect = null;
  try { return fn(); }
  finally { activeEffect = prev; }
};

const $ = (val, key = null) => {
  const subs = new Set();
  if (key) {
    try {
      const saved = localStorage.getItem(key);
      if (saved != null) val = JSON.parse(saved);
    } catch {}
  }
  const sig = (...args) => {
    if (args.length) {
      const next = typeof args[0] === "function" ? untrack(() => args[0](val)) : args[0];
      if (!Object.is(val, next)) {
        val = next;
        if (key) localStorage.setItem(key, JSON.stringify(val));
        subs.forEach(e => effectQueue.add(e));
        if (!isFlushing) queueMicrotask(flushEffects);
      }
    } else if (activeEffect && !activeEffect._deleted) {
      subs.add(activeEffect);
      activeEffect._deps.add(subs);
    }
    return val;
  };
  sig._isSig = true;
  return sig;
};

const Computed = (fn) => {
  const subs = new Set();
  let cached, dirty = true;
  
  const runner = Effect(() => {
    if (!dirty) {
      dirty = true;
      subs.forEach(e => effectQueue.add(e));
      if (!isFlushing) queueMicrotask(flushEffects);
    }
  });

  const sig = () => {
    if (dirty) {
      cached = fn(); 
      dirty = false;
    }
    if (activeEffect && !activeEffect._deleted) {
      subs.add(activeEffect);
      activeEffect._deps.add(subs);
    }
    return cached;
  };
  
  sig._isSig = true;
  return sig;
};

const Store = (obj) => {
  if (obj === null || typeof obj !== "object" || obj._isSig) return obj;
  if (reactiveCache.has(obj)) return reactiveCache.get(obj);

  const subs = new Map();
  const proxy = new Proxy(obj, {
    get(target, key) {
      if (!subs.has(key)) subs.set(key, new Set());
      const keySubs = subs.get(key);

      if (activeEffect && !activeEffect._deleted) {
        keySubs.add(activeEffect);
        activeEffect._deps.add(keySubs);
      }

      const value = Reflect.get(target, key);
      return (typeof value === "object" && value !== null) ? Store(value) : value;
    },
    set(target, key, value) {
      const prev = Reflect.get(target, key);
      if (Object.is(prev, value)) return true;

      const result = Reflect.set(target, key, value);
      const keySubs = subs.get(key);

      if (keySubs) {
        keySubs.forEach(e => effectQueue.add(e));
        if (!isFlushing) queueMicrotask(flushEffects);
      }
      return result;
    }
  });

  reactiveCache.set(obj, proxy);
  return proxy;
};

const Effect = (cb) => {
  if (typeof cb !== "function") return () => { };
  const owner = currentOwner;
  const runner = () => {
    if (runner._deleted) return;
    runner._deps.forEach(d => d.delete(runner));
    runner._deps.clear();
    runner._cleanups.forEach(c => c());
    runner._cleanups.clear();
    const prevOwner = currentOwner;
    const prevEffect = activeEffect;
    currentOwner = { cleanups: runner._cleanups, parent: owner };
    activeEffect = runner;
    try { cb(); }
    finally {
      currentOwner = prevOwner;
      activeEffect = prevEffect;
    }
  };
  runner._deps = new Set();
  runner._cleanups = new Set();
  runner._deleted = false;
  runner.stop = () => {
    if (runner._deleted) return;
    runner._deleted = true;
    effectQueue.delete(runner);
    runner._deps.forEach(d => d.delete(runner));
    runner._cleanups.forEach(c => c());
    if (owner) owner.cleanups.delete(runner.stop);
  };
  if (owner) owner.cleanups.add(runner.stop);
  runner();
  return runner.stop;
};

const Watch = (source, cb) => {
  let oldValue;
  let first = true;
  return Effect(() => {
    const newValue = typeof source === "function" ? source() : source();
    
    if (!first) {
      untrack(() => cb(newValue, oldValue));
    }
    
    first = false;
    oldValue = newValue;
  });
};

const Tag = (tag, props = {}, children = []) => {
  if (props instanceof Node || Array.isArray(props) || typeof props !== "object") {
    children = props; props = {};
  }
  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
  const el = isSVG
    ? doc.createElementNS("http://www.w3.org/2000/svg", tag)
    : createEl(tag);
  el._cleanups = new Set();
  el.onUnmount = (fn) => el._cleanups.add(fn);
  const booleanAttrs = ["disabled", "checked", "required", "readonly", "selected", "multiple", "autofocus"];
  
  for (let [k, v] of Object.entries(props)) {
    if (k === "ref") {
      typeof v === "function" ? v(el) : (v.current = el);
      continue;
    }
    if (k.startsWith("on")) {
      const evt = k.slice(2).toLowerCase().split(".")[0];
      el.addEventListener(evt, v);
      el._cleanups.add(() => el.removeEventListener(evt, v));
      continue;
    }
    const setAttr = (val) => {
      if (k === "class") el.className = val || "";
      else if (booleanAttrs.includes(k)) {
        el[k] = !!val;
        val ? el.setAttribute(k, "") : el.removeAttribute(k);
      } else {
        const finalVal = (k === 'src' || k === 'href') ? sanitizeUrl(val) : val;
        el.setAttribute(k, finalVal);
      }
    };
    if (typeof v === "function") {
      el._cleanups.add(Effect(() => setAttr(v())));
    } else {
      setAttr(v);
    }
  }
  
  const append = (c) => {
    if (Array.isArray(c)) return c.forEach(append);
    if (typeof c === "function") {
      const marker = createText("");
      el.appendChild(marker);
      let nodes = [];
      el._cleanups.add(Effect(() => {
        const res = c();
        const next = (Array.isArray(res) ? res : [res]).map(n =>
          n?._isRuntime ? n.container : n instanceof Node ? n : createText(n)
        );
        nodes.forEach(n => { cleanupNode(n); n.remove(); });
        next.forEach(n => marker.parentNode?.insertBefore(n, marker));
        nodes = next;
      }));
    } else {
      el.appendChild(c instanceof Node ? c : createText(c));
    }
  };
  append(children);
  return el;
};

const Render = (fn) => {
  const cleanups = new Set();
  const prevOwner = currentOwner;
  const container = createEl("div");
  container.style.display = "contents";

  currentOwner = {
    cleanups,
    parent: prevOwner,
    context: null
  };

  const process = (res) => {
    if (!res) return;
    if (res._isRuntime) {
      cleanups.add(res.destroy);
      container.appendChild(res.container);
    } else if (Array.isArray(res)) {
      res.forEach(process);
    } else {
      container.appendChild(res instanceof Node ? res : createText(res));
    }
  };

  try {
    process(fn({ onCleanup: (f) => cleanups.add(f) }));
  } finally {
    currentOwner = prevOwner;
  }

  return {
    _isRuntime: true,
    container,
    destroy: () => {
      cleanups.forEach((f) => f());
      cleanupNode(container);
      container.remove();
    },
  };
};

const Share = (key, value) => {
  if (!currentOwner) return;
  if (!currentOwner.context) currentOwner.context = new Map();
  currentOwner.context.set(key, value);
};

const Use = (key, defaultValue) => {
  let owner = currentOwner;
  while (owner) {
    if (owner.context && owner.context.has(key)) {
      return owner.context.get(key);
    }
    owner = owner.parent;
  }
  return defaultValue;
};

const If = (cond, a, b = null, options = {}) => {
  const marker = createText("");
  const container = Tag("div", { style: "display:contents" }, [marker]);
  let currentView = null;
  let lastState = null;

  Effect(() => {
    const state = !!(typeof cond === "function" ? cond() : cond);
    if (state === lastState) return;
    lastState = state;

    const branch = state ? a : b;
    const oldView = currentView;

    if (oldView) {
      if (options.off) {
        options.off(oldView.container, () => oldView.destroy());
      } else {
        oldView.destroy();
      }
    }

    if (branch) {
      currentView = Render(() => typeof branch === "function" ? branch() : branch);
      const el = currentView.container;
      container.insertBefore(el, marker);

      if (options.on) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => options.on(el));
        });
      }
    } else {
      currentView = null;
    }
  });

  return container;
};

const For = (source, renderFn, keyFn, tag = "div", props = { style: "display:contents" }) => {
  const marker = createText("");
  const container = Tag(tag, props, [marker]);
  let cache = new Map();
  Effect(() => {
    const items = (typeof source === "function" ? source() : source) || [];
    const next = new Map();
    const order = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = keyFn ? keyFn(item, i) : i;
      let view = cache.get(key);
      if (!view) {
        const res = renderFn(item, i);
        view = res instanceof Node
          ? { container: res, destroy: () => { cleanupNode(res); res.remove(); } }
          : Render(() => res);
      }
      cache.delete(key);
      next.set(key, view);
      order.push(key);
    }
    cache.forEach(v => v.destroy());
    let anchor = marker;
    for (let i = order.length - 1; i >= 0; i--) {
      const v = next.get(order[i]);
      if (v.container.nextSibling !== anchor) {
        container.insertBefore(v.container, anchor);
      }
      anchor = v.container;
    }
    cache = next;
  });
  return container;
};

const Router = (routes) => {
  const path = $(window.location.hash.replace(/^#/, "") || "/");
  window.addEventListener("hashchange", () =>
    path(window.location.hash.replace(/^#/, "") || "/")
  );
  const outlet = Tag("div");
  let view = null;
  Effect(() => {
    const p = path();
    const route = routes.find(r => {
      const rp = r.path.split("/").filter(Boolean);
      const pp = p.split("/").filter(Boolean);
      return rp.length === pp.length && rp.every((x, i) => x.startsWith(":") || x === pp[i]);
    }) || routes.find(r => r.path === "*");
    if (route) {
      const params = {};
      const rp = route.path.split("/").filter(Boolean);
      const pp = p.split("/").filter(Boolean);
      rp.forEach((part, i) => {
        if (part.startsWith(":")) params[part.slice(1)] = pp[i];
      });

      Router.params(params);
      
      if (view) view.destroy();
      view = Render(() => route.component(params));
      outlet.appendChild(view.container);
    }
  });
  return outlet;
};

Router.params = $({});
Router.to = (p) => (window.location.hash = p.replace(/^#?\/?/, "#/"));
Router.back = () => window.history.back();
Router.path = () => window.location.hash.replace(/^#/, "") || "/";

const Mount = (component, target) => {
  const el = typeof target === "string" ? doc.querySelector(target) : target;
  if (!el) return;
  if (MOUNTED_NODES.has(el)) MOUNTED_NODES.get(el).destroy();
  const instance = Render(typeof component === "function" ? component : () => component);
  el.replaceChildren(instance.container);
  MOUNTED_NODES.set(el, instance);
  return instance;
};

const SigPro = { $, Computed, Store, untrack, Render, Effect, Watch, Tag, If, For, Router, Mount, Share, Use };

if (typeof window !== "undefined") {
  Object.assign(window, SigPro);
  const tags = `div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer address ul ol li dl dt dd a em strong small i b u mark time sub sup pre code blockquote details summary dialog form label input textarea select button option fieldset legend table thead tbody tfoot tr th td caption img video audio canvas svg iframe picture source progress meter`.split(" ");
  tags.forEach(tag => {
    const name = tag[0].toUpperCase() + tag.slice(1);
    if (!(name in window)) {
      window[name] = (p, c) => Tag(tag, p, c);
    }
  });
  window.SigPro = Object.freeze(SigPro);
}

export { $, Computed, Store, untrack, Render, Effect, Watch, Tag, If, For, Router, Mount, Share, Use };
export { Tag as jsx, Tag as jsxs, Tag as Fragment };
export default SigPro;