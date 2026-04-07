// =====================
// SECURITY
// =====================
const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i;
const DANGEROUS_ATTR = /^on/i;

const sanitizeUrl = (url) => {
  const str = String(url ?? "").trim().toLowerCase().replace(/\s+/g, "");
  return DANGEROUS_PROTOCOLS.test(str) ? "#" : str;
};

const sanitizeAttr = (name, value) => {
  if (value == null) return null;
  if (DANGEROUS_ATTR.test(name)) return null;
  if (name === "srcdoc") return null;

  const str = String(value);

  if (name === "href" || name === "src") {
    return sanitizeUrl(str);
  }

  return str;
};

// =====================
// CORE
// =====================
let activeEffect = null;
let currentOwner = null;
const effectQueue = new Set();
let isFlushing = false;
const MOUNTED_NODES = new WeakMap();

const doc = document;
const isArr = Array.isArray;
const assign = Object.assign;
const createEl = (t) => doc.createElement(t);
const createText = (t) => doc.createTextNode(String(t ?? ""));
const isFunc = (f) => typeof f === "function";
const isObj = (o) => typeof o === "object" && o !== null;

const runWithContext = (effect, callback) => {
  const prev = activeEffect;
  activeEffect = effect;
  try { return callback(); }
  finally { activeEffect = prev; }
};

const cleanupNode = (node) => {
  if (node._cleanups) {
    node._cleanups.forEach((d) => d());
    node._cleanups.clear();
  }
  node.childNodes?.forEach(cleanupNode);
};

const flushEffects = () => {
  if (isFlushing) return;
  isFlushing = true;

  while (effectQueue.size) {
    const list = Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0));
    effectQueue.clear();
    for (const e of list) if (!e._deleted) e();
  }

  isFlushing = false;
};

const track = (subs) => {
  if (activeEffect && !activeEffect._deleted) {
    subs.add(activeEffect);
    activeEffect._deps.add(subs);
  }
};

const trigger = (subs) => {
  subs.forEach((e) => {
    if (e === activeEffect || e._deleted) return;
    if (e._isComputed) {
      e.markDirty();
      if (e._subs) trigger(e._subs);
    } else {
      effectQueue.add(e);
    }
  });
  if (!isFlushing) queueMicrotask(flushEffects);
};

// =====================
// RENDER
// =====================
const Render = (fn) => {
  const cleanups = new Set();
  const prevOwner = currentOwner;
  const container = createEl("div");
  container.style.display = "contents";

  currentOwner = { cleanups };

  const process = (res) => {
    if (!res) return;
    if (res._isRuntime) {
      cleanups.add(res.destroy);
      container.appendChild(res.container);
    } else if (isArr(res)) {
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

// =====================
// SIGNAL
// =====================
const $ = (init, key = null) => {
  const subs = new Set();

  if (isFunc(init)) {
    let val, dirty = true;

    const effect = () => {
      if (effect._deleted) return;

      effect._deps.forEach(d => d.delete(effect));
      effect._deps.clear();

      runWithContext(effect, () => {
        const next = init();
        if (!Object.is(val, next) || dirty) {
          val = next;
          dirty = false;
          trigger(subs);
        }
      });
    };

    assign(effect, {
      _deps: new Set(),
      _isComputed: true,
      _subs: subs,
      _deleted: false,
      markDirty: () => dirty = true,
      stop: () => {
        effect._deleted = true;
        effect._deps.forEach(d => d.delete(effect));
        subs.clear();
      }
    });

    if (currentOwner) currentOwner.cleanups.add(effect.stop);

    return () => {
      if (dirty) effect();
      track(subs);
      return val;
    };
  }

  let val = init;

  if (key) {
    try {
      const saved = localStorage.getItem(key);
      if (saved != null) val = JSON.parse(saved);
    } catch {}
  }

  return (...args) => {
    if (args.length) {
      const next = isFunc(args[0]) ? args[0](val) : args[0];
      if (!Object.is(val, next)) {
        val = next;
        if (key) localStorage.setItem(key, JSON.stringify(val));
        trigger(subs);
      }
    }
    track(subs);
    return val;
  };
};

// =====================
// REACTIVE OBJECT
// =====================
const $$ = (obj, cache = new WeakMap()) => {
  if (!isObj(obj)) return obj;
  if (cache.has(obj)) return cache.get(obj);

  const subs = {};

  const proxy = new Proxy(obj, {
    get(t, k) {
      track(subs[k] ??= new Set());
      const v = Reflect.get(t, k);
      return isObj(v) ? $$(v, cache) : v;
    },
    set(t, k, v) {
      if (Object.is(t[k], v)) return true;
      const ok = Reflect.set(t, k, v);
      subs[k] && trigger(subs[k]);
      return ok;
    }
  });

  cache.set(obj, proxy);
  return proxy;
};

// =====================
// WATCH
// =====================
const Watch = (target, cb) => {
  const explicit = isArr(target);
  const fn = explicit ? cb : target;
  if (!isFunc(fn)) return () => {};

  const owner = currentOwner;

  const runner = () => {
    if (runner._deleted) return;

    runner._deps.forEach(d => d.delete(runner));
    runner._deps.clear();

    runner._cleanups.forEach(c => c());
    runner._cleanups.clear();

    const prevOwner = currentOwner;
    runner.depth = activeEffect ? activeEffect.depth + 1 : 0;

    runWithContext(runner, () => {
      currentOwner = { cleanups: runner._cleanups };

      if (explicit) {
        runWithContext(null, fn);
        target.forEach(d => isFunc(d) && d());
      } else {
        fn();
      }

      currentOwner = prevOwner;
    });
  };

  assign(runner, {
    _deps: new Set(),
    _cleanups: new Set(),
    _deleted: false,
    stop: () => {
      if (runner._deleted) return;
      runner._deleted = true;
      effectQueue.delete(runner);
      runner._deps.forEach(d => d.delete(runner));
      runner._cleanups.forEach(c => c());
      if (owner) owner.cleanups.delete(runner.stop);
    }
  });

  if (owner) owner.cleanups.add(runner.stop);
  runner();
  return runner.stop;
};

// =====================
// TAG (SECURE)
// =====================
const Tag = (tag, props = {}, children = []) => {
  if (props instanceof Node || isArr(props) || !isObj(props)) {
    children = props; props = {};
  }

  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
  const el = isSVG
    ? doc.createElementNS("http://www.w3.org/2000/svg", tag)
    : createEl(tag);

  el._cleanups = new Set();
  el.onUnmount = (fn) => el._cleanups.add(fn);

  const booleanAttrs = ["disabled","checked","required","readonly","selected","multiple","autofocus"];

  const setAttr = (k, v) => {
    const safe = sanitizeAttr(k, v);
    if (safe == null) return el.removeAttribute(k);

    if (booleanAttrs.includes(k)) {
      el[k] = !!safe;
      safe ? el.setAttribute(k, "") : el.removeAttribute(k);
    } else {
      el.setAttribute(k, safe);
    }
  };

  for (let [k, v] of Object.entries(props)) {
    if (k === "ref") {
      isFunc(v) ? v(el) : (v.current = el);
      continue;
    }

    if (k.startsWith("on")) {
      const evt = k.slice(2).toLowerCase().split(".")[0];
      el.addEventListener(evt, v);
      el._cleanups.add(() => el.removeEventListener(evt, v));
      continue;
    }

    if (isFunc(v)) {
      el._cleanups.add(Watch(() => {
        const val = v();
        k === "class" ? (el.className = val || "") : setAttr(k, val);
      }));
    } else {
      setAttr(k, v);
    }
  }

  const append = (c) => {
    if (isArr(c)) return c.forEach(append);

    if (isFunc(c)) {
      const marker = createText("");
      el.appendChild(marker);
      let nodes = [];

      el._cleanups.add(Watch(() => {
        const res = c();
        const next = (isArr(res) ? res : [res]).map(n =>
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

// =====================
// IF
// =====================
const If = (cond, a, b = null) => {
  const marker = createText("");
  const container = Tag("div", { style: "display:contents" }, [marker]);
  let view = null;

  Watch(() => {
    const state = !!(isFunc(cond) ? cond() : cond);
    if (view) view.destroy();

    const branch = state ? a : b;
    if (branch) {
      view = Render(() => isFunc(branch) ? branch() : branch);
      container.insertBefore(view.container, marker);
    }
  });

  return container;
};

// =====================
// FOR (OPTIMIZED)
// =====================
const For = (source, renderFn, keyFn, tag = "div", props = { style: "display:contents" }) => {
  const marker = createText("");
  const container = Tag(tag, props, [marker]);
  let cache = new Map();

  Watch(() => {
    const items = (isFunc(source) ? source() : source) || [];
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

// =====================
// ROUTER
// =====================
const Router = (routes) => {
  const path = $(window.location.hash.replace(/^#/, "") || "/");

  window.addEventListener("hashchange", () =>
    path(window.location.hash.replace(/^#/, "") || "/")
  );

  const outlet = Tag("div");
  let view = null;

  Watch([path], () => {
    const p = path();

    const route = routes.find(r => {
      const rp = r.path.split("/").filter(Boolean);
      const pp = p.split("/").filter(Boolean);
      return rp.length === pp.length && rp.every((x, i) => x.startsWith(":") || x === pp[i]);
    }) || routes.find(r => r.path === "*");

    if (route) {
      if (view) view.destroy();
      view = Render(() => route.component());
      outlet.appendChild(view.container);
    }
  });

  return outlet;
};

// =====================
// MOUNT
// =====================
const Mount = (component, target) => {
  const el = typeof target === "string" ? doc.querySelector(target) : target;
  if (!el) return;

  if (MOUNTED_NODES.has(el)) MOUNTED_NODES.get(el).destroy();

  const instance = Render(isFunc(component) ? component : () => component);
  el.replaceChildren(instance.container);

  MOUNTED_NODES.set(el, instance);
  return instance;
};

// =====================
// GLOBAL + TAG HELPERS
// =====================
const SigPro = { $, $$, Render, Watch, Tag, If, For, Router, Mount };

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

export { $, $$, Render, Watch, Tag, If, For, Router, Mount };
export default SigPro;