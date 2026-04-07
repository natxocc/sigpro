// ---------------------------
// SigPro v2
// ---------------------------

// --- Scheduler ---
let isScheduled = false;
const queue = new Set();
const flushQueue = () => {
  const runs = [...queue];
  queue.clear();
  runs.forEach(fn => fn());
  isScheduled = false;
};

// --- Core State & Ownership ---
let activeEffect = null;
let currentOwner = null;
let currentContext = null;
const nodeContexts = new WeakMap();

// --- Security ---
const DANGEROUS = /^(javascript|data|vbscript):/i;
const sanitize = v => DANGEROUS.test(String(v)) ? '#' : v;

// --- Effect System ---
export const Effect = (fn) => {
  const owner = currentOwner;
  const runner = () => {
    cleanup();
    const prevOwner = currentOwner;
    const prevEffect = activeEffect;
    currentOwner = owner;
    activeEffect = runner;
    runner.cleanupFns = [];
    try { fn(); }
    finally { currentOwner = prevOwner; activeEffect = prevEffect; }
  };
  const cleanup = () => {
    runner.deps?.forEach(dep => dep.delete(runner));
    runner.cleanupFns?.forEach(f => f());
    runner.deps?.clear();
  };
  runner.deps = new Set();
  runner.cleanupFns = [];
  owner?.cleanups.add(cleanup);
  runner();
  return cleanup;
};

// --- Signals ---
export const Signal = (value) => {
  const subs = new Set();
  return {
    _isSig: true,
    get value() {
      if (activeEffect) { subs.add(activeEffect); activeEffect.deps.add(subs); }
      return value;
    },
    set value(v) {
      if (v === value) return;
      value = v;
      subs.forEach(fn => queue.add(fn));
      if (!isScheduled) { isScheduled = true; queueMicrotask(flushQueue); }
    }
  };
};

export const Computed = (fn) => {
  const c = Signal(fn());
  Effect(() => c.value = fn());
  return { get value() { return c.value; } };
};

export const Storage = (key, val) => {
  const saved = localStorage.getItem(key);
  const s = Signal(saved !== null ? JSON.parse(saved) : val);
  
  Effect(() => {
    localStorage.setItem(key, JSON.stringify(s.value));
  });
  
  return s;
};

const reactiveCache = new WeakMap();
export const Reactive = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (reactiveCache.has(obj)) return reactiveCache.get(obj);
  const subs = {};
  const proxy = new Proxy(obj, {
    get(t, k) {
      if (!subs[k]) subs[k] = new Set();
      if (activeEffect) { subs[k].add(activeEffect); activeEffect.deps.add(subs[k]); }
      const val = t[k];
      return val && typeof val === 'object' ? Reactive(val) : val;
    },
    set(t, k, v) {
      if (t[k] === v) return true;
      t[k] = v;
      subs[k]?.forEach(fn => queue.add(fn));
      if (!isScheduled) { isScheduled = true; queueMicrotask(flushQueue); }
      return true;
    }
  });
  reactiveCache.set(obj, proxy);
  return proxy;
};

// --- Watch with cleanup ---
export const Watch = (source, cb, options = {}) => {
  let oldValue, firstRun = true, lastCleanup = null;
  const stop = Effect(() => {
    const newValue = typeof source === 'function' ? source() : source.value;

    if (!firstRun || options.immediate) {
      if (lastCleanup) { lastCleanup(); lastCleanup = null; }
      const prevEffect = activeEffect;
      activeEffect = null;
      try { cb(newValue, oldValue, (fn) => { lastCleanup = fn; }); }
      finally { activeEffect = prevEffect; }
    }

    oldValue = newValue;
    firstRun = false;
  });

  return () => { stop(); if (lastCleanup) lastCleanup(); };
};

// --- Lifecycle ---
export const onMount = (fn) => currentContext?.mount.push(fn);
export const onUnmount = (fn) => currentContext?.unmount.push(fn);
export const Share = (key, value) => { if (currentContext) currentContext.Share[key] = value; };
export const Use = (key, def) => {
  let ctx = currentContext;
  while (ctx) {
    if (ctx.Share[key] !== undefined) return ctx.Share[key];
    ctx = ctx.parent;
  }
  return def;
};

// --- Renderer ---
const isNode = v => v instanceof Node;

export const destroy = (node) => {
  if (!node) return;
  const ctx = nodeContexts.get(node);
  if (ctx) {
    ctx.unmount.forEach(fn => fn());
    ctx.cleanups.forEach(fn => fn());
    nodeContexts.delete(node);
  }
  node.childNodes?.forEach(destroy);
  node.remove();
};

const append = (parent, child) => {
  if (child == null) return;
  if (typeof child === 'function') {
    const marker = document.createTextNode('');
    parent.appendChild(marker);
    let nodes = [];
    Effect(() => {
      const raw = child();
      const next = [raw].flat(Infinity)
        .map(n => typeof n === 'function' ? n() : n)
        .filter(n => n != null)
        .map(n => isNode(n) ? n : document.createTextNode(String(n)));

      const nextSet = new Set(next);
      nodes.forEach(n => { if (!nextSet.has(n)) destroy(n); });
      next.forEach((n, i) => {
        if (nodes[i] !== n) marker.parentNode.insertBefore(n, nodes[i] || marker);
      });
      nodes = next;
    });
  } else {
    parent.appendChild(isNode(child) ? child : document.createTextNode(String(child)));
  }
};

export const h = (tag, props = {}, ...children) => {
  if (typeof tag === 'function') {
    const prevCtx = currentContext;
    const context = { mount: [], unmount: [], Share: {}, parent: prevCtx, cleanups: new Set() };
    currentContext = context;
    const prevOwner = currentOwner;
    currentOwner = context;

    const el = tag(props, { children: children.flat(Infinity) });
    if (isNode(el)) nodeContexts.set(el, context);

    currentContext = prevCtx;
    currentOwner = prevOwner;
    queueMicrotask(() => context.mount.forEach(fn => fn()));
    return el;
  }

  const el = document.createElement(tag);
  for (const key in props) {
    const val = props[key];

    if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } 
    else if (typeof val === 'function' || (val && val._isSig)) {
      Effect(() => {
        const v = typeof val === 'function' ? val() : val.value;
        el[key] = (key === 'href' || key === 'src') ? sanitize(v) : v;
      });
    } else {
      el[key] = (key === 'href' || key === 'src') ? sanitize(val) : val;
    }
  }
  
  children.flat(Infinity).forEach(c => append(el, c));
  return el;
};

// --- Conditionals & Loops ---
export const If = (cond, a, b) => () => cond() ? a() : (b ? b() : null);

export const For = (list, key, render) => {
  let cache = new Map();
  return () => {
    const items = list();
    const nextCache = new Map();
    const nodes = items.map((item, i) => {
      const k = key ? key(item, i) : i;
      let node = cache.get(k);
      if (!node) node = render(item, i);
      nextCache.set(k, node);
      return node;
    });
    cache.forEach((n, k) => { if (!nextCache.has(k)) destroy(n); });
    cache = nextCache;
    return nodes;
  };
};

// --- Router ---
export const Router = (routes) => {
  const path = Signal(window.location.hash.replace(/^#/, '') || '/');
  window.addEventListener('hashchange', () => path.value = window.location.hash.replace(/^#/, '') || '/');
  let view = null;
  const outlet = h('div', { class: 'router-outlet' });
  Effect(() => {
    const route = routes.find(r => r.path === path.value) || routes.find(r => r.path === '*');
    if (view) destroy(view);
    if (route) {
      view = route.component();
      outlet.appendChild(view);
    }
  });
  return outlet;
};

// --- Mounting ---
export const Mount = (root, target) => {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  const el = typeof root === 'function' ? root() : root;
  container.replaceChildren(el);
  return () => destroy(el);
};

// --- Export API ---
export default { Signal, Computed, Storage, Effect, Reactive, Watch, h, If, For, Router, Mount, Share, Use, onMount, onUnmount };
export { h as jsx, h as jsxs, h as Fragment };