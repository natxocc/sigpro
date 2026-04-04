(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __moduleCache = /* @__PURE__ */ new WeakMap;
  var __toCommonJS = (from) => {
    var entry = __moduleCache.get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function")
      __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
        get: () => from[key],
        enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      }));
    __moduleCache.set(from, entry);
    return entry;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: (newValue) => all[name] = () => newValue
      });
  };

  // index.js
  var exports_sigpro = {};
  __export(exports_sigpro, {
    Fragment: () => Fragment,
    $watch: () => $watch,
    $router: () => $router,
    $mount: () => $mount,
    $if: () => $if,
    $html: () => $html,
    $for: () => $for,
    $: () => $
  });

  // sigpro/index.js
  var activeEffect = null;
  var currentOwner = null;
  var effectQueue = new Set;
  var isFlushing = false;
  var MOUNTED_NODES = new WeakMap;
  var flush = () => {
    if (isFlushing)
      return;
    isFlushing = true;
    while (effectQueue.size > 0) {
      const sorted = Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0));
      effectQueue.clear();
      for (const eff of sorted)
        if (!eff._deleted)
          eff();
    }
    isFlushing = false;
  };
  var track = (subs) => {
    if (activeEffect && !activeEffect._deleted) {
      subs.add(activeEffect);
      activeEffect._deps.add(subs);
    }
  };
  var trigger = (subs) => {
    for (const eff of subs) {
      if (eff === activeEffect || eff._deleted)
        continue;
      if (eff._isComputed) {
        eff.markDirty();
        if (eff._subs)
          trigger(eff._subs);
      } else {
        effectQueue.add(eff);
      }
    }
    if (!isFlushing)
      queueMicrotask(flush);
  };
  var sweep = (node) => {
    if (node._cleanups) {
      node._cleanups.forEach((f) => f());
      node._cleanups.clear();
    }
    node.childNodes?.forEach(sweep);
  };
  var _view = (fn) => {
    const cleanups = new Set;
    const prev = currentOwner;
    const container = document.createElement("div");
    container.style.display = "contents";
    currentOwner = { cleanups };
    try {
      const res = fn({ onCleanup: (f) => cleanups.add(f) });
      const process = (n) => {
        if (!n)
          return;
        if (n._isRuntime) {
          cleanups.add(n.destroy);
          container.appendChild(n.container);
        } else if (Array.isArray(n))
          n.forEach(process);
        else
          container.appendChild(n instanceof Node ? n : document.createTextNode(String(n)));
      };
      process(res);
    } finally {
      currentOwner = prev;
    }
    return {
      _isRuntime: true,
      container,
      destroy: () => {
        cleanups.forEach((f) => f());
        sweep(container);
        container.remove();
      }
    };
  };
  var $ = (initial, key = null) => {
    if (typeof initial === "function") {
      const subs2 = new Set;
      let cached, dirty = true;
      const effect = () => {
        if (effect._deleted)
          return;
        effect._deps.forEach((s) => s.delete(effect));
        effect._deps.clear();
        const prev = activeEffect;
        activeEffect = effect;
        try {
          const val = initial();
          if (!Object.is(cached, val) || dirty) {
            cached = val;
            dirty = false;
            trigger(subs2);
          }
        } finally {
          activeEffect = prev;
        }
      };
      effect._deps = new Set;
      effect._isComputed = true;
      effect._subs = subs2;
      effect._deleted = false;
      effect.markDirty = () => dirty = true;
      effect.stop = () => {
        effect._deleted = true;
        effect._deps.forEach((s) => s.delete(effect));
        subs2.clear();
      };
      if (currentOwner)
        currentOwner.cleanups.add(effect.stop);
      return () => {
        if (dirty)
          effect();
        track(subs2);
        return cached;
      };
    }
    let value = initial;
    if (key) {
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null)
          value = JSON.parse(saved);
      } catch (e) {
        console.warn("SigPro: LocalStorage locked", e);
      }
    }
    const subs = new Set;
    return (...args) => {
      if (args.length) {
        const next = typeof args[0] === "function" ? args[0](value) : args[0];
        if (!Object.is(value, next)) {
          value = next;
          if (key)
            localStorage.setItem(key, JSON.stringify(value));
          trigger(subs);
        }
      }
      track(subs);
      return value;
    };
  };
  var $watch = (target, fn) => {
    const isExplicit = Array.isArray(target);
    const callback = isExplicit ? fn : target;
    const depsInput = isExplicit ? target : null;
    if (typeof callback !== "function")
      return () => {};
    const owner = currentOwner;
    const runner = () => {
      if (runner._deleted)
        return;
      runner._deps.forEach((s) => s.delete(runner));
      runner._deps.clear();
      runner._cleanups.forEach((c) => c());
      runner._cleanups.clear();
      const prevEffect = activeEffect;
      const prevOwner = currentOwner;
      activeEffect = runner;
      currentOwner = { cleanups: runner._cleanups };
      runner.depth = prevEffect ? prevEffect.depth + 1 : 0;
      try {
        if (isExplicit) {
          activeEffect = null;
          callback();
          activeEffect = runner;
          depsInput.forEach((d) => typeof d === "function" && d());
        } else {
          callback();
        }
      } finally {
        activeEffect = prevEffect;
        currentOwner = prevOwner;
      }
    };
    runner._deps = new Set;
    runner._cleanups = new Set;
    runner._deleted = false;
    runner.stop = () => {
      if (runner._deleted)
        return;
      runner._deleted = true;
      effectQueue.delete(runner);
      runner._deps.forEach((s) => s.delete(runner));
      runner._cleanups.forEach((c) => c());
      if (owner)
        owner.cleanups.delete(runner.stop);
    };
    if (owner)
      owner.cleanups.add(runner.stop);
    runner();
    return runner.stop;
  };
  var $html = (tag, props = {}, content = []) => {
    if (props instanceof Node || Array.isArray(props) || typeof props !== "object") {
      content = props;
      props = {};
    }
    const svgTags = ["svg", "path", "circle", "rect", "line", "polyline", "polygon", "g", "defs", "text", "tspan", "use"];
    const isSVG = svgTags.includes(tag);
    const el = isSVG ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
    const _sanitize = (key, val) => (key === "src" || key === "href") && String(val).toLowerCase().includes("javascript:") ? "#" : val;
    el._cleanups = new Set;
    const boolAttrs = ["disabled", "checked", "required", "readonly", "selected", "multiple", "autofocus"];
    for (let [key, val] of Object.entries(props)) {
      if (key === "ref") {
        typeof val === "function" ? val(el) : val.current = el;
        continue;
      }
      const isSignal = typeof val === "function", isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName), isBindAttr = key === "value" || key === "checked";
      if (isInput && isBindAttr && isSignal) {
        el._cleanups.add($watch(() => {
          const currentVal = val();
          if (el[key] !== currentVal)
            el[key] = currentVal;
        }));
        const eventName = key === "checked" ? "change" : "input", handler = (event) => val(event.target[key]);
        el.addEventListener(eventName, handler);
        el._cleanups.add(() => el.removeEventListener(eventName, handler));
      } else if (key.startsWith("on")) {
        const eventName = key.slice(2).toLowerCase().split(".")[0], handler = (event) => val(event);
        el.addEventListener(eventName, handler);
        el._cleanups.add(() => el.removeEventListener(eventName, handler));
      } else if (isSignal) {
        el._cleanups.add($watch(() => {
          const currentVal = _sanitize(key, val());
          if (key === "class") {
            el.className = currentVal || "";
          } else if (boolAttrs.includes(key)) {
            if (currentVal) {
              el.setAttribute(key, "");
              el[key] = true;
            } else {
              el.removeAttribute(key);
              el[key] = false;
            }
          } else {
            if (currentVal == null) {
              el.removeAttribute(key);
            } else if (isSVG && typeof currentVal === "number") {
              el.setAttribute(key, currentVal);
            } else {
              el.setAttribute(key, currentVal);
            }
          }
        }));
      } else {
        if (boolAttrs.includes(key)) {
          if (val) {
            el.setAttribute(key, "");
            el[key] = true;
          } else {
            el.removeAttribute(key);
            el[key] = false;
          }
        } else {
          el.setAttribute(key, _sanitize(key, val));
        }
      }
    }
    const append = (child) => {
      if (Array.isArray(child))
        return child.forEach(append);
      if (child instanceof Node) {
        el.appendChild(child);
      } else if (typeof child === "function") {
        const marker = document.createTextNode("");
        el.appendChild(marker);
        let nodes = [];
        el._cleanups.add($watch(() => {
          const res = child(), next = (Array.isArray(res) ? res : [res]).map((i) => i?._isRuntime ? i.container : i instanceof Node ? i : document.createTextNode(i ?? ""));
          nodes.forEach((n) => {
            sweep?.(n);
            n.remove();
          });
          next.forEach((n) => marker.parentNode?.insertBefore(n, marker));
          nodes = next;
        }));
      } else
        el.appendChild(document.createTextNode(child ?? ""));
    };
    append(content);
    return el;
  };
  var $if = (condition, thenVal, otherwiseVal = null, transition = null) => {
    const marker = document.createTextNode("");
    const container = $html("div", { style: "display:contents" }, [marker]);
    let current = null, last = null;
    $watch(() => {
      const state = !!(typeof condition === "function" ? condition() : condition);
      if (state === last)
        return;
      last = state;
      if (current && !state && transition?.out) {
        transition.out(current.container, () => {
          current.destroy();
          current = null;
        });
      } else {
        if (current)
          current.destroy();
        current = null;
      }
      if (state || !state && otherwiseVal) {
        const branch = state ? thenVal : otherwiseVal;
        if (branch) {
          current = _view(() => typeof branch === "function" ? branch() : branch);
          container.insertBefore(current.container, marker);
          if (state && transition?.in)
            transition.in(current.container);
        }
      }
    });
    return container;
  };
  $if.not = (condition, thenVal, otherwiseVal) => $if(() => !(typeof condition === "function" ? condition() : condition), thenVal, otherwiseVal);
  var $for = (source, render, keyFn, tag = "div", props = { style: "display:contents" }) => {
    const marker = document.createTextNode("");
    const container = $html(tag, props, [marker]);
    let cache = new Map;
    $watch(() => {
      const items = (typeof source === "function" ? source() : source) || [];
      const newCache = new Map;
      const newOrder = [];
      for (let i = 0;i < items.length; i++) {
        const item = items[i];
        const key = keyFn ? keyFn(item, i) : i;
        let run = cache.get(key);
        if (!run) {
          run = _view(() => render(item, i));
        } else {
          cache.delete(key);
        }
        newCache.set(key, run);
        newOrder.push(key);
      }
      cache.forEach((run) => {
        run.destroy();
        run.container.remove();
      });
      let anchor = marker;
      for (let i = newOrder.length - 1;i >= 0; i--) {
        const run = newCache.get(newOrder[i]);
        if (run.container.nextSibling !== anchor) {
          container.insertBefore(run.container, anchor);
        }
        anchor = run.container;
      }
      cache = newCache;
    });
    return container;
  };
  var $router = (routes) => {
    const sPath = $(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", () => sPath(window.location.hash.replace(/^#/, "") || "/"));
    const outlet = $html("div", { class: "router-outlet" });
    let current = null;
    $watch([sPath], async () => {
      const path = sPath();
      const route = routes.find((r) => {
        const rp = r.path.split("/").filter(Boolean), pp = path.split("/").filter(Boolean);
        return rp.length === pp.length && rp.every((p, i) => p.startsWith(":") || p === pp[i]);
      }) || routes.find((r) => r.path === "*");
      if (route) {
        let comp = route.component;
        if (typeof comp === "function" && comp.toString().includes("import")) {
          comp = (await comp()).default || await comp();
        }
        const params = {};
        route.path.split("/").filter(Boolean).forEach((p, i) => {
          if (p.startsWith(":"))
            params[p.slice(1)] = path.split("/").filter(Boolean)[i];
        });
        if (current)
          current.destroy();
        if ($router.params)
          $router.params(params);
        current = _view(() => {
          try {
            return typeof comp === "function" ? comp(params) : comp;
          } catch (e) {
            return $html("div", { class: "p-4 text-error" }, "Error loading view");
          }
        });
        outlet.appendChild(current.container);
      }
    });
    return outlet;
  };
  $router.params = $({});
  $router.to = (path) => window.location.hash = path.replace(/^#?\/?/, "#/");
  $router.back = () => window.history.back();
  $router.path = () => window.location.hash.replace(/^#/, "") || "/";
  var $mount = (component, target) => {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el)
      return;
    if (MOUNTED_NODES.has(el))
      MOUNTED_NODES.get(el).destroy();
    const instance = _view(typeof component === "function" ? component : () => component);
    el.replaceChildren(instance.container);
    MOUNTED_NODES.set(el, instance);
    return instance;
  };
  var Fragment = ({ children }) => children;
  var SigProCore = { $, $watch, $html, $if, $for, $router, $mount, Fragment };
  if (typeof window !== "undefined") {
    const install = (registry) => {
      Object.keys(registry).forEach((key) => {
        window[key] = registry[key];
      });
      const tags = `div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer address ul ol li dl dt dd a em strong small i b u mark time sub sup pre code blockquote details summary dialog form label input textarea select button option fieldset legend table thead tbody tfoot tr th td caption img video audio canvas svg iframe picture source progress meter`.split(/\s+/);
      tags.forEach((tagName) => {
        const helperName = tagName.charAt(0).toUpperCase() + tagName.slice(1);
        if (!(helperName in window)) {
          window[helperName] = (props, content) => $html(tagName, props, content);
        }
      });
      window.Fragment = Fragment;
      window.SigPro = Object.freeze(registry);
    };
    install(SigProCore);
  }
})();
