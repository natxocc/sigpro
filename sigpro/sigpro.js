/**
 * SigPro Core 
 */
(() => {

  let activeEffect = null;
  let currentOwner = null;
  const effectQueue = new Set();
  let isFlushing = false;
  const MOUNTED_NODES = new WeakMap();

  /** flush */
  const flush = () => {
    if (isFlushing) return;
    isFlushing = true;
    while (effectQueue.size > 0) {
      const sorted = Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0));
      effectQueue.clear();
      for (const eff of sorted) if (!eff._deleted) eff();
    }
    isFlushing = false;
  };

  /** track */
  const track = (subs) => {
    if (activeEffect && !activeEffect._deleted) {
      subs.add(activeEffect);
      activeEffect._deps.add(subs);
    }
  };

  /** trigger */
  const trigger = (subs) => {
    for (const eff of subs) {
      if (eff === activeEffect || eff._deleted) continue;
      if (eff._isComputed) {
        eff.markDirty();
        if (eff._subs) trigger(eff._subs);
      } else {
        effectQueue.add(eff);
      }
    }
    if (!isFlushing) queueMicrotask(flush);
  };

  /** sweep */
  const sweep = (node) => {
    if (node._cleanups) {
      node._cleanups.forEach((f) => f());
      node._cleanups.clear();
    }
    node.childNodes?.forEach(sweep);
  };

  /** _view */
  const _view = (fn) => {
    const cleanups = new Set();
    const prev = currentOwner;
    const container = document.createElement("div");
    container.style.display = "contents";
    currentOwner = { cleanups };
    try {
      const res = fn({ onCleanup: (f) => cleanups.add(f) });
      const process = (n) => {
        if (!n) return;
        if (n._isRuntime) {
          cleanups.add(n.destroy);
          container.appendChild(n.container);
        } else if (Array.isArray(n)) n.forEach(process);
        else container.appendChild(n instanceof Node ? n : document.createTextNode(String(n)));
      };
      process(res);
    } finally { currentOwner = prev; }
    return {
      _isRuntime: true,
      container,
      destroy: () => {
        cleanups.forEach((f) => f());
        sweep(container);
        container.remove();
      },
    };
  };

  /**
   * Creates a reactive Signal or a Computed Value.
   * @param {any|Function} initial - Initial value or a getter function for computed state.
   * @param {string} [key] - Optional. Key for automatic persistence in localStorage.
   * @returns {Function} Signal getter/setter. Use `sig()` to read and `sig(val)` to write.
   * @example
   * const count = $(0); // Simple signal
   * const double = $(() => count() * 2); // Computed signal
   * const name = $("John", "user-name"); // Persisted signal
   */

  const $ = (initial, key = null) => {
    if (typeof initial === "function") {
      const subs = new Set();
      let cached, dirty = true;
      const effect = () => {
        if (effect._deleted) return;
        effect._deps.forEach((s) => s.delete(effect));
        effect._deps.clear();
        const prev = activeEffect;
        activeEffect = effect;
        try {
          const val = initial();
          if (!Object.is(cached, val) || dirty) {
            cached = val;
            dirty = false;
            trigger(subs);
          }
        } finally { activeEffect = prev; }
      };
      effect._deps = new Set();
      effect._isComputed = true;
      effect._subs = subs;
      effect._deleted = false;
      effect.markDirty = () => (dirty = true);
      effect.stop = () => {
        effect._deleted = true;
        effect._deps.forEach((s) => s.delete(effect));
        subs.clear();
      };
      if (currentOwner) currentOwner.cleanups.add(effect.stop);
      return () => { if (dirty) effect(); track(subs); return cached; };
    }

    let value = initial;
    if (key) {
      const saved = localStorage.getItem(key);
      if (saved !== null) try { value = JSON.parse(saved); } catch { value = saved; }
    }
    const subs = new Set();
    return (...args) => {
      if (args.length) {
        const next = typeof args[0] === "function" ? args[0](value) : args[0];
        if (!Object.is(value, next)) {
          value = next;
          if (key) localStorage.setItem(key, JSON.stringify(value));
          trigger(subs);
        }
      }
      track(subs);
      return value;
    };
  };

  /**
 * Watches for signal changes and executes a side effect.
 * Handles automatic cleanup of previous effects.
 * @param {Function|Array} target - Function to execute or Array of signals for explicit dependency tracking.
 * @param {Function} [fn] - If the first parameter is an Array, this is the callback function.
 * @returns {Function} Function to manually stop the watcher.
 * @example
 * $watch(() => console.log("Count is:", count()));
 * $watch([count], () => console.log("Only runs when count changes"));
 */

  const $watch = (target, fn) => {
    const isExplicit = Array.isArray(target);
    const callback = isExplicit ? fn : target;
    const depsInput = isExplicit ? target : null;

    if (typeof callback !== "function") return () => { };

    const owner = currentOwner;
    const runner = () => {
      if (runner._deleted) return;
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
          depsInput.forEach(d => typeof d === "function" && d());
        } else {
          callback();
        }
      } finally {
        activeEffect = prevEffect;
        currentOwner = prevOwner;
      }
    };

    runner._deps = new Set();
    runner._cleanups = new Set();
    runner._deleted = false;
    runner.stop = () => {
      if (runner._deleted) return;
      runner._deleted = true;
      effectQueue.delete(runner);
      runner._deps.forEach((s) => s.delete(runner));
      runner._cleanups.forEach((c) => c());
      if (owner) owner.cleanups.delete(runner.stop);
    };

    if (owner) owner.cleanups.add(runner.stop);
    runner();
    return runner.stop;
  };

  /**
 * DOM element rendering engine with built-in reactivity.
 * @param {string} tag - HTML tag name (e.g., 'div', 'span').
 * @param {Object} [props] - Attributes, events (onEvent), or two-way bindings (value, checked).
 * @param {Array|any} [content] - Children: text, other nodes, or reactive signals.
 * @returns {HTMLElement} The configured reactive DOM element.
 */

  const $html = (tag, props = {}, content = []) => {
    if (props instanceof Node || Array.isArray(props) || typeof props !== "object") {
      content = props; props = {};
    }
    const el = document.createElement(tag);
    el._cleanups = new Set();

    for (let [k, v] of Object.entries(props)) {
      const isSignal = typeof v === "function";
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      const isBindAttr = (k === "value" || k === "checked");

      if (isInput && isBindAttr && isSignal) {
        el._cleanups.add($watch(() => {
          const val = v();
          if (el[k] !== val) el[k] = val;
        }));
        const evt = k === "checked" ? "change" : "input";
        const handler = (e) => v(e.target[k]);
        el.addEventListener(evt, handler);
        el._cleanups.add(() => el.removeEventListener(evt, handler));
      } else if (k.startsWith("on")) {
        const name = k.slice(2).toLowerCase().split(".")[0];
        const handler = (e) => v(e);
        el.addEventListener(name, handler);
        el._cleanups.add(() => el.removeEventListener(name, handler));
      } else if (isSignal) {
        el._cleanups.add($watch(() => {
          const val = v();
          if (k === "class") el.className = val || "";
          else val == null ? el.removeAttribute(k) : el.setAttribute(k, val);
        }));
      } else {
        el.setAttribute(k, v);
      }
    }

    const append = (c) => {
      if (Array.isArray(c)) return c.forEach(append);
      if (typeof c === "function") {
        const marker = document.createTextNode("");
        el.appendChild(marker);
        let nodes = [];
        el._cleanups.add($watch(() => {
          const res = c();
          const next = (Array.isArray(res) ? res : [res]).map((i) =>
            i?._isRuntime ? i.container : i instanceof Node ? i : document.createTextNode(i ?? "")
          );
          nodes.forEach((n) => { sweep(n); n.remove(); });
          next.forEach((n) => marker.parentNode?.insertBefore(n, marker));
          nodes = next;
        }));
      } else el.appendChild(c instanceof Node ? c : document.createTextNode(c ?? ""));
    };
    append(content);
    return el;
  };

  /**
 * Conditional rendering component.
 * @param {Function|boolean} condition - Reactive signal or boolean value.
 * @param {Function|HTMLElement} thenVal - Content to show if true.
 * @param {Function|HTMLElement} [otherwiseVal] - Content to show if false (optional).
 * @returns {HTMLElement} A reactive container (display: contents).
 */

  const $if = (condition, thenVal, otherwiseVal = null) => {
    const marker = document.createTextNode("");
    const container = $html("div", { style: "display:contents" }, [marker]);
    let current = null, last = null;
    $watch(() => {
      const state = !!(typeof condition === "function" ? condition() : condition);
      if (state !== last) {
        last = state;
        if (current) current.destroy();
        const branch = state ? thenVal : otherwiseVal;
        if (branch) {
          current = _view(() => typeof branch === "function" ? branch() : branch);
          container.insertBefore(current.container, marker);
        }
      }
    });
    return container;
  };

  $if.not = (condition, thenVal, otherwiseVal) => $if(() => !(typeof condition === "function" ? condition() : condition), thenVal, otherwiseVal);

  /**
 * Optimized reactive loop with key-based reconciliation.
 * @param {Function|Array} source - Signal containing an Array of data.
 * @param {Function} render - Function receiving (item, index) and returning a node.
 * @param {Function} keyFn - Function to extract a unique key from the item.
 * @returns {HTMLElement} A reactive container (display: contents).
 */

  const $for = (source, render, keyFn) => {
    const marker = document.createTextNode("");
    const container = $html("div", { style: "display:contents" }, [marker]);
    const cache = new Map();
    $watch(() => {
      const items = (typeof source === "function" ? source() : source) || [];
      const newKeys = new Set();
      items.forEach((item, index) => {
        const key = keyFn(item, index);
        newKeys.add(key);
        let run = cache.get(key);
        if (!run) {
          run = _view(() => render(item, index));
          cache.set(key, run);
        }
        container.insertBefore(run.container, marker);
      });
      cache.forEach((run, key) => {
        if (!newKeys.has(key)) { run.destroy(); cache.delete(key); }
      });
    });
    return container;
  };

  /**
 * Hash-based (#) routing system.
 * @param {Array<{path: string, component: Function}>} routes - Route definitions.
 * @returns {HTMLElement} The router outlet container.
 */

  const $router = (routes) => {
    const sPath = $(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", () => sPath(window.location.hash.replace(/^#/, "") || "/"));
    const outlet = Div({ class: "router-outlet" });
    let current = null;

    $watch([sPath], () => {
      if (current) current.destroy();
      const path = sPath();
      const route = routes.find(r => {
        const rp = r.path.split("/").filter(Boolean);
        const pp = path.split("/").filter(Boolean);
        return rp.length === pp.length && rp.every((p, i) => p.startsWith(":") || p === pp[i]);
      }) || routes.find(r => r.path === "*");

      if (route) {
        const params = {};
        route.path.split("/").filter(Boolean).forEach((p, i) => {
          if (p.startsWith(":")) params[p.slice(1)] = path.split("/").filter(Boolean)[i];
        });
        if ($router.params) $router.params(params);
        current = _view(() => {
          const res = route.component(params);
          return typeof res === "function" ? res() : res;
        });
        outlet.appendChild(current.container);
      }
    });
    return outlet;
  };

  $router.params = $({});
  $router.to = (path) => (window.location.hash = path.replace(/^#?\/?/, "#/"));
  $router.back = () => window.history.back();
  $router.path = () => window.location.hash.replace(/^#/, "") || "/";

  /**
   * Mounts a component or node into a DOM target element.
   * It automatically handles the cleanup of any previously mounted SigPro instances 
   * in that target to prevent memory leaks and duplicate renders.
   * * @param {Function|HTMLElement} component - The component function to render or a pre-built DOM node.
   * @param {string|HTMLElement} target - A CSS selector string or a direct DOM element to mount into.
   * @returns {Object|undefined} The view instance containing the `container` and `destroy` method, or undefined if target is not found.
   * * @example
   * // Mount using a component function
   * $mount(() => Div({ class: "app" }, "Hello World"), "#root");
   * * // Mount using a direct element
   * const myApp = Div("Hello");
   * $mount(myApp, document.getElementById("app"));
   */

  const $mount = (component, target) => {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    if (MOUNTED_NODES.has(el)) MOUNTED_NODES.get(el).destroy();
    const instance = _view(typeof component === "function" ? component : () => component);
    el.replaceChildren(instance.container);
    MOUNTED_NODES.set(el, instance);
    return instance;
  };

  /* * Global API & DOM Tag Helpers Injection
 * ------------------------------------------------
 * This block exposes the SigPro core API ($, $if, etc.) and auto-generates 
 * PascalCase helpers (Div, Span, Button) for all standard HTML tags.
 * * - Uses Object.defineProperty to prevent accidental overwriting (read-only).
 * - Enables a "Zero-Import" developer experience by attaching everything to 'window'.
 * - Maps every helper directly to the $html factory for instant DOM creation.
 */

  const core = { $, $if, $for, $watch, $mount, $router, $html };

  for (const [name, fn] of Object.entries(core)) {
    Object.defineProperty(window, name, {
      value: fn,
      writable: false,
      configurable: false
    });
  }

  /** HELPER TAGS */
  const tags = `div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer address 
  ul ol li dl dt dd a em strong small i b u mark time sub sup pre code blockquote details summary dialog 
  form label input textarea select button option fieldset legend table thead tbody tfoot tr th td caption 
  img video audio canvas svg iframe picture source progress meter`.split(/\s+/);

  tags.forEach((tagName) => {
    const helperName = tagName.charAt(0).toUpperCase() + tagName.slice(1);
    /** Protect Tags */
    Object.defineProperty(window, helperName, {
      value: (props, content) => $html(tagName, props, content),
      writable: false,
      configurable: true,
      enumerable: true
    });
  });

})();
export const { $, $watch, $html, $if, $for, $router, $mount } = window;