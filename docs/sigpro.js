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
    Watch: () => Watch,
    Tag: () => Tag,
    Router: () => Router,
    Render: () => Render,
    Mount: () => Mount,
    If: () => If,
    For: () => For,
    $$: () => $$,
    $: () => $
  });

  // sigpro.js
  var activeEffect = null;
  var currentOwner = null;
  var effectQueue = new Set;
  var isFlushing = false;
  var MOUNTED_NODES = new WeakMap;
  var doc = document;
  var isArr = Array.isArray;
  var assign = Object.assign;
  var createEl = (t) => doc.createElement(t);
  var createText = (t) => doc.createTextNode(String(t ?? ""));
  var isFunc = (f) => typeof f === "function";
  var isObj = (o) => typeof o === "object" && o !== null;
  var runWithContext = (effect, callback) => {
    const previousEffect = activeEffect;
    activeEffect = effect;
    try {
      return callback();
    } finally {
      activeEffect = previousEffect;
    }
  };
  var cleanupNode = (node) => {
    if (node._cleanups) {
      node._cleanups.forEach((dispose) => dispose());
      node._cleanups.clear();
    }
    node.childNodes?.forEach(cleanupNode);
  };
  var flushEffects = () => {
    if (isFlushing)
      return;
    isFlushing = true;
    while (effectQueue.size > 0) {
      const sortedEffects = Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0));
      effectQueue.clear();
      for (const effect of sortedEffects) {
        if (!effect._deleted)
          effect();
      }
    }
    isFlushing = false;
  };
  var trackSubscription = (subscribers) => {
    if (activeEffect && !activeEffect._deleted) {
      subscribers.add(activeEffect);
      activeEffect._deps.add(subscribers);
    }
  };
  var triggerUpdate = (subscribers) => {
    subscribers.forEach((effect) => {
      if (effect === activeEffect || effect._deleted)
        return;
      if (effect._isComputed) {
        effect.markDirty();
        if (effect._subs)
          triggerUpdate(effect._subs);
      } else {
        effectQueue.add(effect);
      }
    });
    if (!isFlushing)
      queueMicrotask(flushEffects);
  };
  var Render = (renderFn) => {
    const cleanups = new Set;
    const previousOwner = currentOwner;
    const container = createEl("div");
    container.style.display = "contents";
    currentOwner = { cleanups };
    const processResult = (result) => {
      if (!result)
        return;
      if (result._isRuntime) {
        cleanups.add(result.destroy);
        container.appendChild(result.container);
      } else if (isArr(result)) {
        result.forEach(processResult);
      } else {
        container.appendChild(result instanceof Node ? result : createText(result));
      }
    };
    try {
      processResult(renderFn({ onCleanup: (fn) => cleanups.add(fn) }));
    } finally {
      currentOwner = previousOwner;
    }
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
  var $ = (initialValue, storageKey = null) => {
    const subscribers = new Set;
    if (isFunc(initialValue)) {
      let cachedValue, isDirty = true;
      const effect = () => {
        if (effect._deleted)
          return;
        effect._deps.forEach((dep) => dep.delete(effect));
        effect._deps.clear();
        runWithContext(effect, () => {
          const newValue = initialValue();
          if (!Object.is(cachedValue, newValue) || isDirty) {
            cachedValue = newValue;
            isDirty = false;
            triggerUpdate(subscribers);
          }
        });
      };
      assign(effect, {
        _deps: new Set,
        _isComputed: true,
        _subs: subscribers,
        _deleted: false,
        markDirty: () => isDirty = true,
        stop: () => {
          effect._deleted = true;
          effect._deps.forEach((dep) => dep.delete(effect));
          subscribers.clear();
        }
      });
      if (currentOwner)
        currentOwner.cleanups.add(effect.stop);
      return () => {
        if (isDirty)
          effect();
        trackSubscription(subscribers);
        return cachedValue;
      };
    }
    let value = initialValue;
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null)
          value = JSON.parse(saved);
      } catch (e) {
        console.warn("SigPro Storage Lock", e);
      }
    }
    return (...args) => {
      if (args.length) {
        const nextValue = isFunc(args[0]) ? args[0](value) : args[0];
        if (!Object.is(value, nextValue)) {
          value = nextValue;
          if (storageKey)
            localStorage.setItem(storageKey, JSON.stringify(value));
          triggerUpdate(subscribers);
        }
      }
      trackSubscription(subscribers);
      return value;
    };
  };
  var $$ = (object, cache = new WeakMap) => {
    if (!isObj(object))
      return object;
    if (cache.has(object))
      return cache.get(object);
    const keySubscribers = {};
    const proxy = new Proxy(object, {
      get(target, key) {
        if (activeEffect)
          trackSubscription(keySubscribers[key] ??= new Set);
        const value = Reflect.get(target, key);
        return isObj(value) ? $$(value, cache) : value;
      },
      set(target, key, value) {
        if (Object.is(target[key], value))
          return true;
        const success = Reflect.set(target, key, value);
        if (keySubscribers[key])
          triggerUpdate(keySubscribers[key]);
        return success;
      }
    });
    cache.set(object, proxy);
    return proxy;
  };
  var Watch = (target, callbackFn) => {
    const isExplicit = isArr(target);
    const callback = isExplicit ? callbackFn : target;
    if (!isFunc(callback))
      return () => {};
    const owner = currentOwner;
    const runner = () => {
      if (runner._deleted)
        return;
      runner._deps.forEach((dep) => dep.delete(runner));
      runner._deps.clear();
      runner._cleanups.forEach((cleanup) => cleanup());
      runner._cleanups.clear();
      const previousOwner = currentOwner;
      runner.depth = activeEffect ? activeEffect.depth + 1 : 0;
      runWithContext(runner, () => {
        currentOwner = { cleanups: runner._cleanups };
        if (isExplicit) {
          runWithContext(null, callback);
          target.forEach((dep) => isFunc(dep) && dep());
        } else {
          callback();
        }
        currentOwner = previousOwner;
      });
    };
    assign(runner, {
      _deps: new Set,
      _cleanups: new Set,
      _deleted: false,
      stop: () => {
        if (runner._deleted)
          return;
        runner._deleted = true;
        effectQueue.delete(runner);
        runner._deps.forEach((dep) => dep.delete(runner));
        runner._cleanups.forEach((cleanup) => cleanup());
        if (owner)
          owner.cleanups.delete(runner.stop);
      }
    });
    if (owner)
      owner.cleanups.add(runner.stop);
    runner();
    return runner.stop;
  };
  var Tag = (tag, props = {}, children = []) => {
    if (props instanceof Node || isArr(props) || !isObj(props)) {
      children = props;
      props = {};
    }
    const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
    const element = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : createEl(tag);
    element._cleanups = new Set;
    element.onUnmount = (fn) => element._cleanups.add(fn);
    const booleanAttributes = ["disabled", "checked", "required", "readonly", "selected", "multiple", "autofocus"];
    const updateAttribute = (name, value) => {
      const sanitized = (name === "src" || name === "href") && String(value).toLowerCase().includes("javascript:") ? "#" : value;
      if (booleanAttributes.includes(name)) {
        element[name] = !!sanitized;
        sanitized ? element.setAttribute(name, "") : element.removeAttribute(name);
      } else {
        sanitized == null ? element.removeAttribute(name) : element.setAttribute(name, sanitized);
      }
    };
    for (let [key, value] of Object.entries(props)) {
      if (key === "ref") {
        isFunc(value) ? value(element) : value.current = element;
        continue;
      }
      const isSignal = isFunc(value);
      if (key.startsWith("on")) {
        const eventName = key.slice(2).toLowerCase().split(".")[0];
        element.addEventListener(eventName, value);
        element._cleanups.add(() => element.removeEventListener(eventName, value));
      } else if (isSignal) {
        element._cleanups.add(Watch(() => {
          const currentVal = value();
          key === "class" ? element.className = currentVal || "" : updateAttribute(key, currentVal);
        }));
        if (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) && (key === "value" || key === "checked")) {
          const event = key === "checked" ? "change" : "input";
          const handler = (e) => value(e.target[key]);
          element.addEventListener(event, handler);
          element._cleanups.add(() => element.removeEventListener(event, handler));
        }
      } else {
        updateAttribute(key, value);
      }
    }
    const appendChildNode = (child) => {
      if (isArr(child))
        return child.forEach(appendChildNode);
      if (isFunc(child)) {
        const marker = createText("");
        element.appendChild(marker);
        let currentNodes = [];
        element._cleanups.add(Watch(() => {
          const result = child();
          const nextNodes = (isArr(result) ? result : [result]).map((node) => node?._isRuntime ? node.container : node instanceof Node ? node : createText(node));
          currentNodes.forEach((node) => {
            cleanupNode(node);
            node.remove();
          });
          nextNodes.forEach((node) => marker.parentNode?.insertBefore(node, marker));
          currentNodes = nextNodes;
        }));
      } else {
        element.appendChild(child instanceof Node ? child : createText(child));
      }
    };
    appendChildNode(children);
    return element;
  };
  var If = (condition, thenVal, otherwiseVal = null, transition = null) => {
    const marker = createText("");
    const container = Tag("div", { style: "display:contents" }, [marker]);
    let currentView = null, lastState = null;
    Watch(() => {
      const state = !!(isFunc(condition) ? condition() : condition);
      if (state === lastState)
        return;
      lastState = state;
      const dispose = () => {
        if (currentView)
          currentView.destroy();
        currentView = null;
      };
      if (currentView && !state && transition?.out) {
        transition.out(currentView.container, dispose);
      } else {
        dispose();
      }
      const branch = state ? thenVal : otherwiseVal;
      if (branch) {
        currentView = Render(() => isFunc(branch) ? branch() : branch);
        container.insertBefore(currentView.container, marker);
        if (state && transition?.in)
          transition.in(currentView.container);
      }
    });
    return container;
  };
  var For = (source, renderFn, keyFn, tag = "div", props = { style: "display:contents" }) => {
    const marker = createText("");
    const container = Tag(tag, props, [marker]);
    let viewCache = new Map;
    Watch(() => {
      const items = (isFunc(source) ? source() : source) || [];
      const nextCache = new Map;
      const order = [];
      for (let i = 0;i < items.length; i++) {
        const item = items[i];
        const key = keyFn ? keyFn(item, i) : i;
        let view = viewCache.get(key);
        if (!view) {
          const result = renderFn(item, i);
          view = result instanceof Node ? { container: result, destroy: () => {
            cleanupNode(result);
            result.remove();
          } } : Render(() => result);
        }
        viewCache.delete(key);
        nextCache.set(key, view);
        order.push(key);
      }
      viewCache.forEach((v) => v.destroy());
      let anchor = marker;
      for (let i = order.length - 1;i >= 0; i--) {
        const view = nextCache.get(order[i]);
        if (view.container.nextSibling !== anchor) {
          container.insertBefore(view.container, anchor);
        }
        anchor = view.container;
      }
      viewCache = nextCache;
    });
    return container;
  };
  var Router = (routes) => {
    const currentPath = $(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", () => currentPath(window.location.hash.replace(/^#/, "") || "/"));
    const outlet = Tag("div", { class: "router-transition" });
    let currentView = null;
    Watch([currentPath], async () => {
      const path = currentPath();
      const route = routes.find((r) => {
        const routeParts = r.path.split("/").filter(Boolean);
        const pathParts = path.split("/").filter(Boolean);
        return routeParts.length === pathParts.length && routeParts.every((part, i) => part.startsWith(":") || part === pathParts[i]);
      }) || routes.find((r) => r.path === "*");
      if (route) {
        let component = route.component;
        if (isFunc(component) && component.toString().includes("import")) {
          component = (await component()).default || await component();
        }
        const params = {};
        route.path.split("/").filter(Boolean).forEach((part, i) => {
          if (part.startsWith(":"))
            params[part.slice(1)] = path.split("/").filter(Boolean)[i];
        });
        if (currentView)
          currentView.destroy();
        if (Router.params)
          Router.params(params);
        currentView = Render(() => {
          try {
            return isFunc(component) ? component(params) : component;
          } catch (e) {
            return Tag("div", { class: "p-4 text-error" }, "Error loading view");
          }
        });
        outlet.appendChild(currentView.container);
      }
    });
    return outlet;
  };
  Router.params = $({});
  Router.to = (path) => window.location.hash = path.replace(/^#?\/?/, "#/");
  Router.back = () => window.history.back();
  Router.path = () => window.location.hash.replace(/^#/, "") || "/";
  var Mount = (component, target) => {
    const targetEl = typeof target === "string" ? doc.querySelector(target) : target;
    if (!targetEl)
      return;
    if (MOUNTED_NODES.has(targetEl))
      MOUNTED_NODES.get(targetEl).destroy();
    const instance = Render(isFunc(component) ? component : () => component);
    targetEl.replaceChildren(instance.container);
    MOUNTED_NODES.set(targetEl, instance);
    return instance;
  };
  var SigPro = { $, $$, Render, Watch, Tag, If, For, Router, Mount };
  if (typeof window !== "undefined") {
    assign(window, SigPro);
    const tags = `div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer address ul ol li dl dt dd a em strong small i b u mark time sub sup pre code blockquote details summary dialog form label input textarea select button option fieldset legend table thead tbody tfoot tr th td caption img video audio canvas svg iframe picture source progress meter`.split(" ");
    tags.forEach((tag) => {
      const helper = tag[0].toUpperCase() + tag.slice(1);
      if (!(helper in window))
        window[helper] = (p, c) => Tag(tag, p, c);
    });
    window.SigPro = Object.freeze(SigPro);
  }
})();
