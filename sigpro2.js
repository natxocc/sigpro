/**
 * SigPro - Fine-Grained Reactive UI Framework
 * Zero-Dependency Single-File Architecture
 */

// --- 1. CORE HELPERS (DRY) ---
const doc = typeof document !== "undefined" ? document : null;
const isArr = Array.isArray;
const assign = Object.assign;
const isFunc = (f) => typeof f === "function";
const isObj = (o) => typeof o === "object" && o !== null;

const createEl = (t) => doc?.createElement(t);
const createText = (t) => doc?.createTextNode(String(t ?? ""));
const ensureNode = (n) => n?._isRuntime ? n.container : (n instanceof Node ? n : createText(n));

// Funciones DRY para reducir repetición en memoria y reactividad
const runCleanups = (set) => { set?.forEach(fn => fn()); set?.clear(); };
const clearDeps = (effect) => { effect._deps.forEach(d => d.delete(effect)); effect._deps.clear(); };

// --- 2. INTERNAL STATE ---
let activeEffect = null;
let currentOwner = null;
const effectQueue = new Set();
let isFlushing = false;
const MOUNTED_NODES = new WeakMap();

// --- 3. SCHEDULER & MEMORY ---
const runWithContext = (effect, callback) => {
  const prev = activeEffect;
  activeEffect = effect;
  try { return callback(); }
  finally { activeEffect = prev; }
};

const cleanupNode = (node) => {
  runCleanups(node._cleanups);
  node.childNodes?.forEach(cleanupNode);
};

const flushEffects = () => {
  if (isFlushing) return;
  isFlushing = true;
  const sorted = Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0));
  effectQueue.clear();
  sorted.forEach(effect => !effect._deleted && effect());
  isFlushing = false;
};

const trackUpdate = (subscribers, isTrigger = false) => {
  if (!isTrigger && activeEffect && !activeEffect._deleted) {
    subscribers.add(activeEffect);
    activeEffect._deps.add(subscribers);
  } else if (isTrigger) {
    subscribers.forEach((eff) => {
      if (eff === activeEffect || eff._deleted) return;
      if (eff._isComputed) { eff.markDirty(); if (eff._subs) trackUpdate(eff._subs, true); }
      else effectQueue.add(eff);
    });
    if (!isFlushing) queueMicrotask(flushEffects);
  }
};

// --- 4. REACTIVITY ---
const $ = (initialValue, storageKey = null) => {
  const subscribers = new Set();

  if (isFunc(initialValue)) { // Computed
    let cachedValue, isDirty = true;
    const effect = () => {
      if (effect._deleted) return;
      clearDeps(effect);
      runWithContext(effect, () => {
        const newVal = initialValue();
        if (!Object.is(cachedValue, newVal) || isDirty) {
          cachedValue = newVal; isDirty = false; trackUpdate(subscribers, true);
        }
      });
    };
    assign(effect, {
      _deps: new Set(), _isComputed: true, _subs: subscribers, _deleted: false,
      markDirty: () => (isDirty = true),
      stop: () => { effect._deleted = true; clearDeps(effect); subscribers.clear(); }
    });
    if (currentOwner) currentOwner.cleanups.add(effect.stop);
    return () => { if (isDirty) effect(); trackUpdate(subscribers); return cachedValue; };
  }

  // Signal
  let value = initialValue;
  if (storageKey) try { value = JSON.parse(localStorage.getItem(storageKey) || "null") ?? value; } catch(e){}

  return (...args) => {
    if (args.length) {
      const next = isFunc(args[0]) ? args[0](value) : args[0];
      if (!Object.is(value, next)) {
        value = next;
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(value));
        trackUpdate(subscribers, true);
      }
    }
    trackUpdate(subscribers);
    return value;
  };
};

const $$ = (object, cache = new WeakMap()) => {
  if (!isObj(object)) return object;
  if (cache.has(object)) return cache.get(object);
  const subs = {};
  const proxy = new Proxy(object, {
    get: (t, k) => { trackUpdate(subs[k] ??= new Set()); const v = t[k]; return isObj(v) ? $$(v, cache) : v; },
    set: (t, k, v) => { if (!Object.is(t[k], v)) { t[k] = v; if (subs[k]) trackUpdate(subs[k], true); } return true; }
  });
  cache.set(object, proxy); return proxy;
};

const Watch = (target, callbackFn) => {
  const isExplicit = isArr(target);
  const callback = isExplicit ? callbackFn : target;
  if (!isFunc(callback)) return () => {};

  const owner = currentOwner;
  const runner = () => {
    if (runner._deleted) return;
    clearDeps(runner); runCleanups(runner._cleanups);
    runner.depth = activeEffect ? activeEffect.depth + 1 : 0;
    
    runWithContext(runner, () => {
      const prevOwner = currentOwner;
      currentOwner = { cleanups: runner._cleanups };
      if (isExplicit) { runWithContext(null, callback); target.forEach(d => isFunc(d) && d()); } 
      else callback();
      currentOwner = prevOwner;
    });
  };

  assign(runner, {
    _deps: new Set(), _cleanups: new Set(), _deleted: false,
    stop: () => {
      if (runner._deleted) return;
      runner._deleted = true; effectQueue.delete(runner);
      clearDeps(runner); runCleanups(runner._cleanups);
      if (owner) owner.cleanups.delete(runner.stop);
    }
  });
  
  if (owner) owner.cleanups.add(runner.stop);
  runner(); return runner.stop;
};

// --- 5. DOM & COMPONENTS ---
const Render = (renderFn) => {
  const cleanups = new Set(), prev = currentOwner, container = createEl("div");
  container.style.display = "contents";
  currentOwner = { cleanups };

  const process = (res) => {
    if (!res) return;
    if (res._isRuntime) { cleanups.add(res.destroy); container.appendChild(res.container); } 
    else if (isArr(res)) res.forEach(process); 
    else container.appendChild(ensureNode(res));
  };

  try { process(renderFn({ onCleanup: (fn) => cleanups.add(fn) })); } 
  finally { currentOwner = prev; }

  return { _isRuntime: true, container, destroy: () => { runCleanups(cleanups); cleanupNode(container); container.remove(); } };
};

const Tag = (tag, props = {}, children = []) => {
  if (props instanceof Node || isArr(props) || !isObj(props)) { children = props; props = {}; }
  
  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
  const el = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : createEl(tag);
  el._cleanups = new Set(); el.onUnmount = (fn) => el._cleanups.add(fn);

  for (let [k, v] of Object.entries(props)) {
    if (k === "ref") { isFunc(v) ? v(el) : (v.current = el); continue; }
    const isSig = isFunc(v);
    
    if (k.startsWith("on")) {
      const evt = k.slice(2).toLowerCase().split(".")[0];
      el.addEventListener(evt, v); el._cleanups.add(() => el.removeEventListener(evt, v));
    } else if (isSig) {
      el._cleanups.add(Watch(() => {
        const val = v(), clean = (k === 'src' || k === 'href') && String(val).toLowerCase().includes('javascript:') ? '#' : val;
        k === "class" ? (el.className = clean || "") : clean == null || clean === false ? el.removeAttribute(k) : el.setAttribute(k, clean === true ? "" : clean);
      }));
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
        const evt = k === "checked" ? "change" : "input", handler = (e) => v(e.target[k]);
        el.addEventListener(evt, handler); el._cleanups.add(() => el.removeEventListener(evt, handler));
      }
    } else el.setAttribute(k, v);
  }

  const append = (c) => {
    if (isArr(c)) return c.forEach(append);
    if (isFunc(c)) {
      const marker = createText(""); el.appendChild(marker);
      let curr = [];
      el._cleanups.add(Watch(() => {
        const res = c(), next = (isArr(res) ? res : [res]).map(ensureNode);
        curr.forEach(n => { cleanupNode(n); n.remove(); });
        next.forEach(n => marker.parentNode?.insertBefore(n, marker));
        curr = next;
      }));
    } else el.appendChild(ensureNode(c));
  };
  append(children); return el;
};

// --- 6. CONTROL FLOW ---
const If = (condition, thenVal, otherwiseVal = null, transition = null) => {
  const marker = createText(""), container = Tag("div", { style: "display:contents" }, [marker]);
  let currentView = null, lastState = null;

  Watch(() => {
    const state = !!(isFunc(condition) ? condition() : condition);
    if (state === lastState) return;
    lastState = state;

    const dispose = () => { currentView?.destroy(); currentView = null; };
    if (currentView && !state && transition?.out) transition.out(currentView.container, dispose); else dispose();

    const branch = state ? thenVal : otherwiseVal;
    if (branch) {
      currentView = Render(() => isFunc(branch) ? branch() : branch);
      container.insertBefore(currentView.container, marker);
      if (state && transition?.in) transition.in(currentView.container);
    }
  });
  return container;
};

const For = (source, renderFn, keyFn, tag = "div", props = { style: "display:contents" }) => {
  const marker = createText(""), container = Tag(tag, props, [marker]);
  let viewCache = new Map();

  Watch(() => {
    const items = (isFunc(source) ? source() : source) || [], nextCache = new Map(), order = [];
    
    items.forEach((item, i) => {
      const key = keyFn ? keyFn(item, i) : i;
      let view = viewCache.get(key);
      if (!view) {
        const res = renderFn(item, i);
        view = res instanceof Node ? { container: res, destroy: () => { cleanupNode(res); res.remove(); } } : Render(() => res);
      }
      viewCache.delete(key); nextCache.set(key, view); order.push(key);
    });

    viewCache.forEach(v => v.destroy());
    let anchor = marker;
    for (let i = order.length - 1; i >= 0; i--) {
      const view = nextCache.get(order[i]);
      if (view.container.nextSibling !== anchor) container.insertBefore(view.container, anchor);
      anchor = view.container;
    }
    viewCache = nextCache;
  });
  return container;
};

// --- 7. ROUTER & MOUNT ---
const Router = (routes) => {
  const path = $(window.location.hash.replace(/^#/, "") || "/");
  window.addEventListener("hashchange", () => path(window.location.hash.replace(/^#/, "") || "/"));
  const outlet = Tag("div", { class: "router-transition" });
  let currentView = null;

  Watch([path], async () => {
    const current = path();
    const route = routes.find(r => {
      const p1 = r.path.split("/").filter(Boolean), p2 = current.split("/").filter(Boolean);
      return p1.length === p2.length && p1.every((part, i) => part.startsWith(":") || part === p2[i]);
    }) || routes.find(r => r.path === "*");

    if (route) {
      let comp = route.component;
      if (isFunc(comp) && comp.toString().includes('import')) comp = (await comp()).default || await comp();
      
      const params = {};
      route.path.split("/").filter(Boolean).forEach((p, i) => { if (p.startsWith(":")) params[p.slice(1)] = current.split("/").filter(Boolean)[i]; });
      
      currentView?.destroy();
      if (Router.params) Router.params(params);
      
      currentView = Render(() => { try { return isFunc(comp) ? comp(params) : comp; } catch (e) { return Tag("div", {}, "Error"); } });
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
  const el = typeof target === "string" ? doc.querySelector(target) : target;
  if (!el) return;
  if (MOUNTED_NODES.has(el)) MOUNTED_NODES.get(el).destroy();
  const instance = Render(isFunc(comp) ? comp : () => comp);
  el.replaceChildren(instance.container);
  MOUNTED_NODES.set(el, instance);
  return instance;
};

const SigPro = { $, $$, Render, Watch, Tag, If, For, Router, Mount };

if (typeof window !== "undefined") {
  assign(window, SigPro);
  "div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer address ul ol li dl dt dd a em strong small i b u mark time sub sup pre code blockquote details summary dialog form label input textarea select button option fieldset legend table thead tbody tfoot tr th td caption img video audio canvas svg iframe picture source progress meter"
    .split(" ").forEach(t => {
      const h = t[0].toUpperCase() + t.slice(1);
      if (!(h in window)) window[h] = (p, c) => Tag(t, p, c);
    });
  window.SigPro = Object.freeze(SigPro);
}

export { $, $$, Render, Watch, Tag, If, For, Router, Mount };
export default SigPro;