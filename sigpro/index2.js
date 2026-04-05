/**
 * SigPro Core - Refactorizado para eficiencia de compresión
 */
let activeEffect = null;
let currentOwner = null;
const effectQueue = new Set();
let isFlushing = false;
const MOUNTED_NODES = new WeakMap();

const runWithContext = (effect, callback) => {
  const previousEffect = activeEffect;
  activeEffect = effect;
  try { return callback(); } 
  finally { activeEffect = previousEffect; }
};

const cleanupNode = (node) => {
  if (node._cleanups) {
    node._cleanups.forEach((dispose) => dispose());
    node._cleanups.clear();
  }
  node.childNodes?.forEach(cleanupNode);
};

const flushEffects = () => {
  if (isFlushing) return;
  isFlushing = true;
  while (effectQueue.size > 0) {
    const sortedEffects = Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0));
    effectQueue.clear();
    for (const effect of sortedEffects) {
      if (!effect._deleted) effect();
    }
  }
  isFlushing = false;
};

const trackSubscription = (subscribers) => {
  if (activeEffect && !activeEffect._deleted) {
    subscribers.add(activeEffect);
    activeEffect._deps.add(subscribers);
  }
};

const triggerUpdate = (subscribers) => {
  subscribers.forEach((effect) => {
    if (effect === activeEffect || effect._deleted) return;
    if (effect._isComputed) {
      effect.markDirty();
      if (effect._subs) triggerUpdate(effect._subs);
    } else {
      effectQueue.add(effect);
    }
  });
  if (!isFlushing) queueMicrotask(flushEffects);
};

const _view = (renderFn) => {
  const cleanups = new Set();
  const previousOwner = currentOwner;
  const container = document.createElement("div");
  container.style.display = "contents";
  currentOwner = { cleanups };

  const processResult = (result) => {
    if (!result) return;
    if (result._isRuntime) {
      cleanups.add(result.destroy);
      container.appendChild(result.container);
    } else if (Array.isArray(result)) {
      result.forEach(processResult);
    } else {
      container.appendChild(result instanceof Node ? result : document.createTextNode(String(result)));
    }
  };

  try {
    processResult(renderFn({ onCleanup: (fn) => cleanups.add(fn) }));
  } finally { currentOwner = previousOwner; }

  return {
    _isRuntime: true,
    container,
    destroy: () => {
      cleanups.forEach((fn) => fn());
      cleanupNode(container);
      container.remove();
    },
  };
};

const $ = (initialValue, storageKey = null) => {
  const subscribers = new Set();

  if (typeof initialValue === "function") {
    let cachedValue, isDirty = true;
    const effect = () => {
      if (effect._deleted) return;
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

    Object.assign(effect, {
      _deps: new Set(),
      _isComputed: true,
      _subs: subscribers,
      _deleted: false,
      markDirty: () => (isDirty = true),
      stop: () => {
        effect._deleted = true;
        effect._deps.forEach((dep) => dep.delete(effect));
        subscribers.clear();
      }
    });

    if (currentOwner) currentOwner.cleanups.add(effect.stop);
    return () => { if (isDirty) effect(); trackSubscription(subscribers); return cachedValue; };
  }

  let value = initialValue;
  if (storageKey) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) value = JSON.parse(saved);
    } catch (e) { console.warn("SigPro Storage Lock", e); }
  }

  return (...args) => {
    if (args.length) {
      const nextValue = typeof args[0] === "function" ? args[0](value) : args[0];
      if (!Object.is(value, nextValue)) {
        value = nextValue;
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(value));
        triggerUpdate(subscribers);
      }
    }
    trackSubscription(subscribers);
    return value;
  };
};

const $$ = (object, cache = new WeakMap()) => {
  if (typeof object !== "object" || object === null) return object;
  if (cache.has(object)) return cache.get(object);

  const keySubscribers = {};
  const proxy = new Proxy(object, {
    get(target, key) {
      if (activeEffect) trackSubscription(keySubscribers[key] ??= new Set());
      const value = Reflect.get(target, key);
      return (typeof value === "object" && value !== null) ? $$(value, cache) : value;
    },
    set(target, key, value) {
      if (Object.is(target[key], value)) return true;
      const success = Reflect.set(target, key, value);
      if (keySubscribers[key]) triggerUpdate(keySubscribers[key]);
      return success;
    }
  });

  cache.set(object, proxy);
  return proxy;
};

const $watch = (target, callbackFn) => {
  const isExplicit = Array.isArray(target);
  const callback = isExplicit ? callbackFn : target;
  if (typeof callback !== "function") return () => {};

  const owner = currentOwner;
  const runner = () => {
    if (runner._deleted) return;
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
        target.forEach((dep) => typeof dep === "function" && dep());
      } else {
        callback();
      }
      currentOwner = previousOwner;
    });
  };

  Object.assign(runner, {
    _deps: new Set(),
    _cleanups: new Set(),
    _deleted: false,
    stop: () => {
      if (runner._deleted) return;
      runner._deleted = true;
      effectQueue.delete(runner);
      runner._deps.forEach((dep) => dep.delete(runner));
      runner._cleanups.forEach((cleanup) => cleanup());
      if (owner) owner.cleanups.delete(runner.stop);
    }
  });

  if (owner) owner.cleanups.add(runner.stop);
  runner();
  return runner.stop;
};

const $html = (tag, props = {}, children = []) => {
  if (props instanceof Node || Array.isArray(props) || typeof props !== "object") {
    children = props; props = {};
  }

  const svgTags = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/;
  const isSVG = svgTags.test(tag);
  const element = isSVG 
    ? document.createElementNS("http://www.w3.org/2000/svg", tag) 
    : document.createElement(tag);

  element._cleanups = new Set();
  const booleanAttributes = ["disabled", "checked", "required", "readonly", "selected", "multiple", "autofocus"];

  const updateAttribute = (name, value) => {
    const sanitized = (name === 'src' || name === 'href') && String(value).toLowerCase().includes('javascript:') ? '#' : value;
    if (booleanAttributes.includes(name)) {
      element[name] = !!sanitized;
      sanitized ? element.setAttribute(name, "") : element.removeAttribute(name);
    } else {
      sanitized == null ? element.removeAttribute(name) : element.setAttribute(name, sanitized);
    }
  };

  for (let [key, value] of Object.entries(props)) {
    if (key === "ref") { (typeof value === "function" ? value(element) : (value.current = element)); continue; }
    
    const isSignal = typeof value === "function";
    if (key.startsWith("on")) {
      const eventName = key.slice(2).toLowerCase().split(".")[0];
      element.addEventListener(eventName, value);
      element._cleanups.add(() => element.removeEventListener(eventName, value));
    } else if (isSignal) {
      element._cleanups.add($watch(() => {
        const currentVal = value();
        key === "class" ? (element.className = currentVal || "") : updateAttribute(key, currentVal);
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

  const appendChild = (child) => {
    if (Array.isArray(child)) return child.forEach(appendChild);
    if (typeof child === "function") {
      const marker = document.createTextNode("");
      element.appendChild(marker);
      let currentNodes = [];
      element._cleanups.add($watch(() => {
        const result = child();
        const nextNodes = (Array.isArray(result) ? result : [result]).map((node) =>
          node?._isRuntime ? node.container : node instanceof Node ? node : document.createTextNode(node ?? "")
        );
        currentNodes.forEach((node) => { cleanupNode(node); node.remove(); });
        nextNodes.forEach((node) => marker.parentNode?.insertBefore(node, marker));
        currentNodes = nextNodes;
      }));
    } else {
      element.appendChild(child instanceof Node ? child : document.createTextNode(child ?? ""));
    }
  };

  appendChild(children);
  return element;
};

const $if = (condition, thenVal, otherwiseVal = null, transition = null) => {
  const marker = document.createTextNode("");
  const container = $html("div", { style: "display:contents" }, [marker]);
  let currentView = null, lastState = null;

  $watch(() => {
    const state = !!(typeof condition === "function" ? condition() : condition);
    if (state === lastState) return;
    lastState = state;

    const dispose = () => { if (currentView) currentView.destroy(); currentView = null; };

    if (currentView && !state && transition?.out) {
      transition.out(currentView.container, dispose);
    } else {
      dispose();
    }

    const branch = state ? thenVal : otherwiseVal;
    if (branch) {
      currentView = _view(() => typeof branch === "function" ? branch() : branch);
      container.insertBefore(currentView.container, marker);
      if (state && transition?.in) transition.in(currentView.container);
    }
  });

  return container;
};

const $for = (source, renderFn, keyFn, tag = "div", props = { style: "display:contents" }) => {
  const marker = document.createTextNode("");
  const container = $html(tag, props, [marker]);
  let viewCache = new Map();

  $watch(() => {
    const items = (typeof source === "function" ? source() : source) || [];
    const nextCache = new Map();
    const order = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = keyFn ? keyFn(item, i) : i;
      let view = viewCache.get(key) || _view(() => renderFn(item, i));
      viewCache.delete(key);
      nextCache.set(key, view);
      order.push(key);
    }

    viewCache.forEach((view) => { view.destroy(); view.container.remove(); });
    
    let anchor = marker;
    for (let i = order.length - 1; i >= 0; i--) {
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

const $router = (routes) => {
  const currentPath = $(window.location.hash.replace(/^#/, "") || "/");
  window.addEventListener("hashchange", () => currentPath(window.location.hash.replace(/^#/, "") || "/"));
  const outlet = $html("div", { class: "router-outlet" });
  let currentView = null;

  $watch([currentPath], async () => {
    const path = currentPath();
    const route = routes.find(r => {
      const routeParts = r.path.split("/").filter(Boolean);
      const pathParts = path.split("/").filter(Boolean);
      return routeParts.length === pathParts.length && routeParts.every((part, i) => part.startsWith(":") || part === pathParts[i]);
    }) || routes.find(r => r.path === "*");

    if (route) {
      let component = route.component;
      if (typeof component === "function" && component.toString().includes('import')) {
        component = (await component()).default || (await component());
      }

      const params = {};
      route.path.split("/").filter(Boolean).forEach((part, i) => {
        if (part.startsWith(":")) params[part.slice(1)] = path.split("/").filter(Boolean)[i];
      });

      if (currentView) currentView.destroy();
      if ($router.params) $router.params(params);

      currentView = _view(() => {
        try {
          return typeof component === "function" ? component(params) : component;
        } catch (e) {
          return $html("div", { class: "p-4 text-error" }, "Error loading view");
        }
      });
      outlet.appendChild(currentView.container);
    }
  });
  return outlet;
};

$router.params = $({});
$router.to = (path) => (window.location.hash = path.replace(/^#?\/?/, "#/"));
$router.back = () => window.history.back();
$router.path = () => window.location.hash.replace(/^#/, "") || "/";

const $mount = (component, target) => {
  const targetEl = typeof target === "string" ? document.querySelector(target) : target;
  if (!targetEl) return;
  if (MOUNTED_NODES.has(targetEl)) MOUNTED_NODES.get(targetEl).destroy();
  const instance = _view(typeof component === "function" ? component : () => component);
  targetEl.replaceChildren(instance.container);
  MOUNTED_NODES.set(targetEl, instance);
  return instance;
};

export const Fragment = ({ children }) => children;

const SigProCore = { $, $watch, $html, $if, $for, $router, $mount, Fragment };

// Registro Global
if (typeof window !== "undefined") {
  Object.assign(window, SigProCore);
  const tags = `div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer address ul ol li dl dt dd a em strong small i b u mark time sub sup pre code blockquote details summary dialog form label input textarea select button option fieldset legend table thead tbody tfoot tr th td caption img video audio canvas svg iframe picture source progress meter`.split(" ");
  tags.forEach((tag) => {
    const helper = tag[0].toUpperCase() + tag.slice(1);
    if (!(helper in window)) window[helper] = (p, c) => $html(tag, p, c);
  });
  window.SigPro = Object.freeze(SigProCore);
}

export { $, $watch, $html, $if, $for, $router, $mount };
export default SigProCore;
