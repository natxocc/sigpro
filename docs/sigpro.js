(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // index.js
  var exports_sigpro = {};
  __export(exports_sigpro, {
    onUnmount: () => onUnmount,
    onMount: () => onMount,
    initDX: () => initDX,
    Watch: () => Watch,
    Tag: () => Tag,
    Router: () => Router,
    Render: () => Render,
    Mount: () => Mount,
    If: () => If,
    For: () => For,
    Batch: () => Batch,
    Anim: () => Anim,
    $$: () => $$,
    $: () => $
  });

  // sigpro.js
  var isFunc = (f) => typeof f === "function";
  var isObj = (o) => o && typeof o === "object";
  var isArr = Array.isArray;
  var doc = typeof document !== "undefined" ? document : null;
  var ensureNode = (n) => n?._isRuntime ? n.container : n instanceof Node ? n : doc.createTextNode(n == null ? "" : String(n));
  var activeEffect = null;
  var activeOwner = null;
  var isFlushing = false;
  var batchDepth = 0;
  var effectQueue = new Set;
  var proxyCache = new WeakMap;
  var ITER = Symbol("iter");
  var MOUNTED_NODES = new WeakMap;
  var dispose = (eff) => {
    if (!eff || eff._disposed)
      return;
    eff._disposed = true;
    const stack = [eff];
    while (stack.length) {
      const e = stack.pop();
      if (e._cleanups) {
        e._cleanups.forEach((fn) => fn());
        e._cleanups.clear();
      }
      if (e._children) {
        e._children.forEach((child) => stack.push(child));
        e._children.clear();
      }
      if (e._deps) {
        e._deps.forEach((depSet) => depSet.delete(e));
        e._deps.clear();
      }
    }
  };
  var onMount = (fn) => {
    if (activeOwner)
      (activeOwner._mounts ||= []).push(fn);
  };
  var onUnmount = (fn) => {
    if (activeOwner)
      (activeOwner._cleanups ||= new Set).add(fn);
  };
  var untrack = (fn) => {
    const p = activeEffect;
    activeEffect = null;
    try {
      return fn();
    } finally {
      activeEffect = p;
    }
  };
  var createEffect = (fn, isComputed = false) => {
    const effect = () => {
      if (effect._disposed)
        return;
      if (effect._deps)
        effect._deps.forEach((s) => s.delete(effect));
      if (effect._cleanups) {
        effect._cleanups.forEach((c) => c());
        effect._cleanups.clear();
      }
      const prevEffect = activeEffect;
      const prevOwner = activeOwner;
      activeEffect = activeOwner = effect;
      try {
        return effect._result = fn();
      } catch (e) {
        console.error("[SigPro]", e);
      } finally {
        activeEffect = prevEffect;
        activeOwner = prevOwner;
      }
    };
    effect._deps = effect._cleanups = effect._children = null;
    effect._disposed = false;
    effect._isComputed = isComputed;
    effect._depth = activeEffect ? activeEffect._depth + 1 : 0;
    effect._mounts = [];
    effect._parent = activeOwner;
    if (activeOwner)
      (activeOwner._children ||= new Set).add(effect);
    return effect;
  };
  var flush = () => {
    if (isFlushing)
      return;
    isFlushing = true;
    const sorted = Array.from(effectQueue).sort((a, b) => a._depth - b._depth);
    effectQueue.clear();
    for (const e of sorted)
      if (!e._disposed)
        e();
    isFlushing = false;
  };
  var Batch = (fn) => {
    batchDepth++;
    try {
      return fn();
    } finally {
      batchDepth--;
      if (batchDepth === 0 && effectQueue.size > 0 && !isFlushing) {
        flush();
      }
    }
  };
  var trackUpdate = (subs, trigger = false) => {
    if (!trigger && activeEffect && !activeEffect._disposed) {
      subs.add(activeEffect);
      (activeEffect._deps ||= new Set).add(subs);
    } else if (trigger && subs.size > 0) {
      let hasQueue = false;
      for (const e of subs) {
        if (e === activeEffect || e._disposed)
          continue;
        if (e._isComputed) {
          e._dirty = true;
          if (e._subs)
            trackUpdate(e._subs, true);
        } else {
          effectQueue.add(e);
          hasQueue = true;
        }
      }
      if (hasQueue && !isFlushing && batchDepth === 0)
        queueMicrotask(flush);
    }
  };
  var $ = (val2, key = null) => {
    const subs = new Set;
    if (isFunc(val2)) {
      let cache;
      const computed = () => {
        if (computed._dirty) {
          const prev = activeEffect;
          activeEffect = computed;
          try {
            const next = val2();
            if (!Object.is(cache, next)) {
              cache = next;
              trackUpdate(subs, true);
            }
          } finally {
            activeEffect = prev;
          }
          computed._dirty = false;
        }
        trackUpdate(subs);
        return cache;
      };
      computed._isComputed = true;
      computed._subs = subs;
      computed._dirty = true;
      computed._deps = null;
      computed._disposed = false;
      computed.stop = () => {};
      if (activeOwner)
        onUnmount(computed.stop);
      return computed;
    }
    if (key)
      try {
        val2 = JSON.parse(localStorage.getItem(key)) ?? val2;
      } catch (e) {}
    return (...args) => {
      if (args.length) {
        const next = isFunc(args[0]) ? args[0](val2) : args[0];
        if (!Object.is(val2, next)) {
          val2 = next;
          if (key)
            localStorage.setItem(key, JSON.stringify(val2));
          trackUpdate(subs, true);
        }
      }
      trackUpdate(subs);
      return val2;
    };
  };
  var $$ = (target) => {
    if (!isObj(target))
      return target;
    let proxy = proxyCache.get(target);
    if (proxy)
      return proxy;
    const subsMap = new Map;
    const getSubs = (k) => {
      let s = subsMap.get(k);
      if (!s)
        subsMap.set(k, s = new Set);
      return s;
    };
    proxy = new Proxy(target, {
      get(t, k, receiver) {
        if (typeof k !== "symbol")
          trackUpdate(getSubs(k));
        return $$(Reflect.get(t, k, receiver));
      },
      set(t, k, v, receiver) {
        const isNew = !Reflect.has(t, k);
        const oldV = Reflect.get(t, k, receiver);
        const result = Reflect.set(t, k, v, receiver);
        if (result && !Object.is(oldV, v)) {
          trackUpdate(getSubs(k), true);
          if (isNew)
            trackUpdate(getSubs(ITER), true);
        }
        return result;
      },
      deleteProperty(t, k) {
        const result = Reflect.deleteProperty(t, k);
        if (result) {
          trackUpdate(getSubs(k), true);
          trackUpdate(getSubs(ITER), true);
        }
        return result;
      },
      ownKeys(t) {
        trackUpdate(getSubs(ITER));
        return Reflect.ownKeys(t);
      }
    });
    proxyCache.set(target, proxy);
    return proxy;
  };
  var Watch = (sources, cb) => {
    if (cb === undefined) {
      const effect2 = createEffect(sources);
      effect2();
      return () => dispose(effect2);
    }
    const effect = createEffect(() => {
      const vals = Array.isArray(sources) ? sources.map((s) => s()) : sources();
      untrack(() => cb(vals));
    });
    effect();
    return () => dispose(effect);
  };
  var cleanupNode = (node) => {
    if (node._cleanups) {
      node._cleanups.forEach((fn) => fn());
      node._cleanups.clear();
    }
    if (node._ownerEffect)
      dispose(node._ownerEffect);
    if (node.childNodes)
      node.childNodes.forEach(cleanupNode);
  };
  var DANGEROUS_PROTOCOL = /^\s*(javascript|data|vbscript):/i;
  var isDangerousAttr = (key) => key === "src" || key === "href" || key.startsWith("on");
  var validateAttr = (key, val2) => {
    if (val2 == null || val2 === false)
      return null;
    if (isDangerousAttr(key)) {
      const sVal = String(val2);
      if (DANGEROUS_PROTOCOL.test(sVal)) {
        console.warn(`[SigPro] Bloqueado protocolo peligroso en ${key}`);
        return "#";
      }
    }
    return val2;
  };
  var Tag = (tag, props = {}, children = []) => {
    if (props instanceof Node || isArr(props) || !isObj(props)) {
      children = props;
      props = {};
    }
    if (isFunc(tag)) {
      const ctx = { _mounts: [], _cleanups: new Set };
      const effect = createEffect(() => {
        const result2 = tag(props, {
          children,
          emit: (ev, ...args) => props[`on${ev[0].toUpperCase()}${ev.slice(1)}`]?.(...args)
        });
        effect._result = result2;
        return result2;
      });
      effect();
      const result = effect._result;
      if (result == null)
        return null;
      const node = result instanceof Node || isArr(result) && result.every((n) => n instanceof Node) ? result : doc.createTextNode(String(result));
      const attach = (n) => {
        if (isObj(n) && !n._isRuntime) {
          n._mounts = effect._mounts || [];
          n._cleanups = effect._cleanups || new Set;
          n._ownerEffect = effect;
        }
      };
      isArr(node) ? node.forEach(attach) : attach(node);
      return node;
    }
    const isSVG = /^(svg|path|circle|rect|line|poly(line|gon)|g|defs|text(path)?|tspan|use|symbol|image|marker|ellipse)$/i.test(tag);
    const el = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag);
    el._cleanups = new Set;
    for (let k in props) {
      if (!props.hasOwnProperty(k))
        continue;
      let v = props[k];
      if (k === "ref") {
        isFunc(v) ? v(el) : v.current = el;
        continue;
      }
      if (isSVG && k.startsWith("xlink:")) {
        const ns = "http://www.w3.org/1999/xlink";
        val == null ? el.removeAttributeNS(ns, k.slice(6)) : el.setAttributeNS(ns, k.slice(6), val);
        continue;
      }
      if (k.startsWith("on")) {
        const ev = k.slice(2).toLowerCase();
        el.addEventListener(ev, v);
        const off = () => el.removeEventListener(ev, v);
        el._cleanups.add(off);
        onUnmount(off);
      } else if (isFunc(v)) {
        const effect = createEffect(() => {
          const val2 = validateAttr(k, v());
          if (k === "class")
            el.className = val2 || "";
          else if (val2 == null)
            el.removeAttribute(k);
          else if (k in el && !isSVG)
            el[k] = val2;
          else
            el.setAttribute(k, val2 === true ? "" : val2);
        });
        effect();
        el._cleanups.add(() => dispose(effect));
        onUnmount(() => dispose(effect));
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
          const evType = k === "checked" ? "change" : "input";
          el.addEventListener(evType, (ev) => v(ev.target[k]));
        }
      } else {
        const val2 = validateAttr(k, v);
        if (val2 != null) {
          if (k in el && !isSVG)
            el[k] = val2;
          else
            el.setAttribute(k, val2 === true ? "" : val2);
        }
      }
    }
    const append = (c) => {
      if (isArr(c))
        return c.forEach(append);
      if (isFunc(c)) {
        const anchor = doc.createTextNode("");
        el.appendChild(anchor);
        let currentNodes = [];
        const effect = createEffect(() => {
          const res = c();
          const next = (isArr(res) ? res : [res]).map(ensureNode);
          currentNodes.forEach((n) => {
            if (n._isRuntime)
              n.destroy();
            else
              cleanupNode(n);
            if (n.parentNode)
              n.remove();
          });
          let ref = anchor;
          for (let i = next.length - 1;i >= 0; i--) {
            const node = next[i];
            if (node.parentNode !== ref.parentNode)
              ref.parentNode?.insertBefore(node, ref);
            if (node._mounts)
              node._mounts.forEach((fn) => fn());
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
        if (node._mounts)
          node._mounts.forEach((fn) => fn());
      }
    };
    append(children);
    return el;
  };
  var Render = (renderFn) => {
    const cleanups = new Set;
    const mounts = [];
    const previousOwner = activeOwner;
    const previousEffect = activeEffect;
    const container = doc.createElement("div");
    container.style.display = "contents";
    container.setAttribute("role", "presentation");
    activeOwner = { _cleanups: cleanups, _mounts: mounts };
    activeEffect = null;
    const processResult = (result) => {
      if (!result)
        return;
      if (result._isRuntime) {
        cleanups.add(result.destroy);
        container.appendChild(result.container);
      } else if (isArr(result)) {
        result.forEach(processResult);
      } else {
        container.appendChild(result instanceof Node ? result : doc.createTextNode(String(result == null ? "" : result)));
      }
    };
    try {
      processResult(renderFn({ onCleanup: (fn) => cleanups.add(fn) }));
    } finally {
      activeOwner = previousOwner;
      activeEffect = previousEffect;
    }
    mounts.forEach((fn) => fn());
    return {
      _isRuntime: true,
      container,
      destroy: () => {
        cleanups.forEach((fn) => fn());
        cleanupNode(container);
        container.remove();
      }
    };
  };
  var If = (cond, ifYes, ifNot = null) => {
    const anchor = doc.createTextNode("");
    const root = Tag("div", { style: "display:contents" }, [anchor]);
    let currentView = null;
    Watch(() => !!(isFunc(cond) ? cond() : cond), (show) => {
      if (currentView) {
        currentView.destroy();
        currentView = null;
      }
      const content = show ? ifYes : ifNot;
      if (content) {
        currentView = Render(() => isFunc(content) ? content() : content);
        root.insertBefore(currentView.container, anchor);
      }
    });
    onUnmount(() => currentView?.destroy());
    return root;
  };
  var For = (src, itemFn, keyFn) => {
    const anchor = doc.createTextNode("");
    const root = Tag("div", { style: "display:contents" }, [anchor]);
    let cache = new Map;
    Watch(() => (isFunc(src) ? src() : src) || [], (items) => {
      const nextCache = new Map;
      const nextOrder = [];
      const newItems = items || [];
      for (let i = 0;i < newItems.length; i++) {
        const item = newItems[i];
        const key = keyFn ? keyFn(item, i) : item?.id ?? i;
        let view = cache.get(key);
        if (!view)
          view = Render(() => itemFn(item, i));
        else
          cache.delete(key);
        nextCache.set(key, view);
        nextOrder.push(view);
      }
      cache.forEach((view) => view.destroy());
      let lastRef = anchor;
      for (let i = nextOrder.length - 1;i >= 0; i--) {
        const view = nextOrder[i];
        const node = view.container;
        if (node.nextSibling !== lastRef)
          root.insertBefore(node, lastRef);
        lastRef = node;
      }
      cache = nextCache;
    });
    return root;
  };
  var Router = (routes) => {
    const getHash = () => window.location.hash.slice(1) || "/";
    const path = $(getHash());
    const handler = () => path(getHash());
    window.addEventListener("hashchange", handler);
    onUnmount(() => window.removeEventListener("hashchange", handler));
    const hook = Tag("div", { class: "router-hook" });
    let currentView = null;
    Watch([path], () => {
      const cur = path();
      const route = routes.find((r) => {
        const p1 = r.path.split("/").filter(Boolean);
        const p2 = cur.split("/").filter(Boolean);
        return p1.length === p2.length && p1.every((p, i) => p[0] === ":" || p === p2[i]);
      }) || routes.find((r) => r.path === "*");
      if (route) {
        currentView?.destroy();
        const params = {};
        route.path.split("/").filter(Boolean).forEach((p, i) => {
          if (p[0] === ":")
            params[p.slice(1)] = cur.split("/").filter(Boolean)[i];
        });
        Router.params(params);
        currentView = Render(() => isFunc(route.component) ? route.component(params) : route.component);
        hook.replaceChildren(currentView.container);
      }
    });
    return hook;
  };
  Router.params = $({});
  Router.to = (p) => window.location.hash = p.replace(/^#?\/?/, "#/");
  Router.back = () => window.history.back();
  Router.path = () => window.location.hash.replace(/^#/, "") || "/";
  var Anim = (show, render, { enter, leave } = {}) => {
    const wrap = Tag("div", { style: "display:contents" });
    let view = null;
    const wait = (el, cb) => {
      let done = false;
      const finish = () => !done && (done = true, cb());
      if (!el)
        return finish();
      "transitionend animationend".split(" ").map((e) => el.addEventListener(e, finish, { once: true }));
      setTimeout(finish, 500);
    };
    Watch(show, (on) => {
      if (on && !view) {
        const el = (view = Render(render)).container.firstChild;
        wrap.appendChild(view.container);
        if (enter && el) {
          el.classList.add(enter);
          el.clientTop;
          el.classList.add(enter + "-active");
          wait(el, () => el.classList.remove(enter, enter + "-active"));
        }
      } else if (!on && view) {
        const el = view.container.firstChild;
        const del = () => (view?.destroy(), view = null);
        leave && el ? (el.classList.add(leave), wait(el, del)) : del();
      }
    });
    return onUnmount(() => view?.destroy()), wrap;
  };
  var Mount = (comp, target) => {
    const t = typeof target === "string" ? doc.querySelector(target) : target;
    if (!t)
      return;
    if (MOUNTED_NODES.has(t))
      MOUNTED_NODES.get(t).destroy();
    const inst = Render(isFunc(comp) ? comp : () => comp);
    t.replaceChildren(inst.container);
    MOUNTED_NODES.set(t, inst);
    return inst;
  };
  var SigPro = Object.freeze({
    $,
    $$,
    Watch,
    Tag,
    Render,
    If,
    For,
    Router,
    Mount,
    onMount,
    onUnmount,
    Anim,
    Batch
  });
  var initDX = () => {
    if (typeof window !== "undefined") {
      Object.assign(window, SigPro);
      "div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer ul ol li a em strong pre code form label input textarea select button img svg".split(" ").forEach((t) => {
        const name = t[0].toUpperCase() + t.slice(1);
        window[name] = (p, c) => Tag(t, p, c);
      });
    }
  };
})();
