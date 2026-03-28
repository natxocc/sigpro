/**
 * SigPro Core v1.2.0 SSR + Hydration Support
 */
(() => {

  const isServer = typeof window === "undefined" || typeof document === "undefined";
  const _global = isServer ? global : window;

  let activeEffect = null;
  let currentOwner = null;
  const effectQueue = new Set();
  let isFlushing = false;
  const MOUNTED_NODES = new WeakMap();
  let SSR_MODE = false;
  let HYDRATE_PTR = null;

  const _doc = !isServer ? document : {
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      style: {},
      childNodes: [],
      _cleanups: new Set(),
      appendChild: () => { },
      setAttribute: () => { },
      removeAttribute: () => { },
      addEventListener: () => { },
      removeEventListener: () => { },
      insertBefore: () => { },
      remove: () => { }
    }),
    createTextNode: (txt) => ({ nodeType: 3, textContent: txt, remove: () => { } }),
    createComment: (txt) => ({ nodeType: 8, textContent: txt, remove: () => { } })
  };

  /** Flushes all pending effects in the queue */
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

  /** Tracks the current active effect in the given subscriptions set */
  const track = (subs) => {
    if (SSR_MODE || !activeEffect || activeEffect._deleted) return;
    subs.add(activeEffect);
    activeEffect._deps.add(subs);
  };

  /** Triggers all effects subscribed to the given set */
  const trigger = (subs) => {
    if (SSR_MODE) return;
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

  /** Recursively sweeps and cleans up a node and its children */
  const sweep = (node) => {
    if (node && node._cleanups) {
      node._cleanups.forEach((f) => f());
      node._cleanups.clear();
    }
    if (node && node.childNodes) {
      node.childNodes.forEach(sweep);
    }
  };

  /** Internal view factory that creates reactive views */
  const _view = (fn) => {
    const cleanups = new Set();
    const prev = currentOwner;
    currentOwner = { cleanups };

    try {
      const res = fn({ onCleanup: (f) => cleanups.add(f) });

      if (SSR_MODE || isServer) {
        const toString = (n) => {
          if (!n && n !== 0) return '';
          if (n._isRuntime) return n._ssrString || '';
          if (Array.isArray(n)) return n.map(toString).join('');
          if (n && typeof n === 'object' && n.ssr) return n.ssr;
          if (n && typeof n === 'object' && n.nodeType) {
            if (n.tagName) return `<${n.tagName.toLowerCase()}>${n.textContent || ''}</${n.tagName.toLowerCase()}>`;
            return n.textContent || '';
          }
          return String(n);
        };

        return {
          _isRuntime: true,
          _ssrString: toString(res),
          destroy: () => { }
        };
      }

      const container = _doc.createElement("div");
      container.style.display = "contents";

      const process = (n) => {
        if (!n && n !== 0) return;
        if (n._isRuntime) {
          cleanups.add(n.destroy);
          container.appendChild(n.container);
        } else if (Array.isArray(n)) {
          n.forEach(process);
        } else if (n && typeof n === 'object' && n.nodeType) {
          container.appendChild(n);
        } else {
          container.appendChild(_doc.createTextNode(String(n)));
        }
      };
      process(res);

      return {
        _isRuntime: true,
        container,
        _ssrString: null,
        destroy: () => {
          cleanups.forEach((f) => f());
          sweep(container);
          container.remove();
        },
      };
    } finally {
      currentOwner = prev;
    }
  };

  /**
   * Creates a reactive Signal or a Computed Value.
   * 
   * @param {any|Function} initial - Initial value or a getter function for computed state.
   * @param {string} [key] - Optional. Key for automatic persistence in localStorage.
   * @returns {Function} Signal getter/setter. Use `sig()` to read and `sig(val)` to write.
   * 
   * @example
   * // Simple signal
   * const count = $(0);
   * @example
   * // Computed signal
   * const double = $(() => count() * 2);
   * @example
   * // Persisted signal
   * const name = $("John", "user-name");
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
            if (!SSR_MODE && !isServer) trigger(subs);
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

      if (currentOwner && !SSR_MODE && !isServer) {
        currentOwner.cleanups.add(effect.stop);
      }

      if (SSR_MODE || isServer) effect();

      return (...args) => {
        if (args.length && !SSR_MODE && !isServer) {
          const next = typeof args[0] === "function" ? args[0](cached) : args[0];
          if (!Object.is(cached, next)) {
            cached = next;
            if (key) {
              try { localStorage.setItem(key, JSON.stringify(cached)); } catch (e) { }
            }
            trigger(subs);
          }
        }
        track(subs);
        return cached;
      };
    }

    let value = initial;
    if (key && !SSR_MODE && !isServer) {
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
          try { value = JSON.parse(saved); } catch { value = saved; }
        }
      } catch (e) { }
    }

    const subs = new Set();
    return (...args) => {
      if (args.length && !SSR_MODE && !isServer) {
        const next = typeof args[0] === "function" ? args[0](value) : args[0];
        if (!Object.is(value, next)) {
          value = next;
          if (key) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
          }
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
   * 
   * @param {Function|Array} target - Function to execute or Array of signals for explicit dependency tracking.
   * @param {Function} [fn] - If the first parameter is an Array, this is the callback function.
   * @returns {Function} Function to manually stop the watcher.
   * @example
   * // Automatic dependency tracking
   * $watch(() => console.log("Count is:", count())); 
   * @example
   * // Explicit dependency tracking
   * $watch([count], () => console.log("Only runs when count changes"));
   */
  const $watch = (target, fn) => {
    if (SSR_MODE || isServer) return () => { };

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
   * 
   * @param {string} tag - HTML tag name (e.g., 'div', 'span').
   * @param {Object} [props] - Attributes, events (onEvent), or two-way bindings (value, checked).
   * @param {Array|any} [content] - Children: text, other nodes, or reactive signals.
   * @returns {HTMLElement|Object} The configured reactive DOM element (or SSR object).
   * 
   * @example
   * // Basic usage
   * const button = Button({ onClick: () => alert("Clicked!") }, "Click me");
   * @example
   * // With reactive content
   * const counter = Div(
   *   Span(() => `Count: ${count()}`),
   *   Button({ onClick: () => count(count() + 1) }, "Increment")
   * );
   * @example
   * // Two-way binding
   * const input = Input({ value: name, onInput: (e) => name(e.target.value) });
   */
  const $html = (tag, props = {}, content = []) => {
    // Normalize arguments
    if (props && (props.nodeType || Array.isArray(props) || (typeof props !== "object"))) {
      content = props;
      props = {};
    }

    if (SSR_MODE || isServer) {
      let attrs = '';
      let hasDynamic = false;

      for (let [k, v] of Object.entries(props || {})) {
        if (k === "ref" || k.startsWith("on")) continue;

        if (typeof v === "function") {
          hasDynamic = true;
          const val = v();
          if (k === "class" && val) attrs += ` class="${val}"`;
          else if (val != null && val !== false) attrs += ` ${k}="${val}"`;
        } else if (v !== undefined && v !== null && v !== false) {
          if (k === "class") attrs += ` class="${v}"`;
          else attrs += ` ${k}="${v}"`;
        }
      }

      const processChild = (c) => {
        if (!c && c !== 0) return '';
        if (typeof c === "function") {
          hasDynamic = true;
          const res = c();
          if (res && res._isRuntime) return res._ssrString || '';
          if (Array.isArray(res)) return res.map(processChild).join('');
          return String(res ?? '');
        }
        if (c && c._isRuntime) return c._ssrString || '';
        if (Array.isArray(c)) return c.map(processChild).join('');
        if (c && typeof c === 'object' && c.ssr) return c.ssr;
        return String(c ?? '');
      };

      const children = Array.isArray(content)
        ? content.map(processChild).join('')
        : processChild(content);

      const result = `<${tag}${attrs}>${children}</${tag}>`;

      return { ssr: result, _isRuntime: false };
    }

    let el;
    if (HYDRATE_PTR && HYDRATE_PTR.tagName === tag.toUpperCase()) {
      el = HYDRATE_PTR;
      HYDRATE_PTR = el.firstChild;
    } else {
      el = _doc.createElement(tag);
    }

    el._cleanups = el._cleanups || new Set();

    for (let [k, v] of Object.entries(props || {})) {
      if (k === "ref") {
        typeof v === "function" ? v(el) : (v.current = el);
        continue;
      }

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
          else if (val == null) el.removeAttribute(k);
          else el.setAttribute(k, val);
        }));
      } else if (v !== undefined && v !== null && v !== false) {
        if (!el.hasAttribute(k)) el.setAttribute(k, v);
      }
    }

    const append = (c) => {
      if (Array.isArray(c)) return c.forEach(append);
      if (typeof c === "function") {
        const marker = _doc.createTextNode("");

        if (HYDRATE_PTR) {
          el.insertBefore(marker, HYDRATE_PTR);
        } else {
          el.appendChild(marker);
        }

        let nodes = [];
        el._cleanups.add($watch(() => {
          const res = c();
          const next = (Array.isArray(res) ? res : [res]).map((i) => {
            if (i && i._isRuntime) return i.container;
            if (i && i.nodeType) return i;
            return _doc.createTextNode(i ?? "");
          });

          nodes.forEach((n) => { sweep(n); n.remove(); });
          
          next.forEach((n) => marker.parentNode?.insertBefore(n, marker));
          nodes = next;
        }));
      } else if (c && c._isRuntime) {
        if (!HYDRATE_PTR) el.appendChild(c.container);
      } else if (c && c.nodeType) {
        if (!HYDRATE_PTR) el.appendChild(c);
      } else {
        if (HYDRATE_PTR && HYDRATE_PTR.nodeType === 3) {
          const textNode = HYDRATE_PTR;
          HYDRATE_PTR = textNode.nextSibling;
        } else {
          const textNode = _doc.createTextNode(c ?? "");
          if (!HYDRATE_PTR) el.appendChild(textNode);
        }
      }
    };
    append(content);

    if (el === HYDRATE_PTR?.parentNode) HYDRATE_PTR = el.nextSibling;

    return el;
  };

  /**
   * Conditional rendering component.
   * 
   * @param {Function|boolean} condition - Reactive signal or boolean value.
   * @param {Function|HTMLElement} thenVal - Content to show if true.
   * @param {Function|HTMLElement} [otherwiseVal] - Content to show if false (optional).
   * @returns {HTMLElement|string} A reactive container (or SSR string).
   * @example
   * $if(show, () => Div("Visible"), () => Div("Hidden"))
   */
  const $if = (condition, thenVal, otherwiseVal = null) => {
    if (SSR_MODE || isServer) {
      const state = !!(typeof condition === "function" ? condition() : condition);
      const branch = state ? thenVal : otherwiseVal;
      if (!branch) return '';
      const result = typeof branch === "function" ? branch() : branch;
      if (result && result._isRuntime) return result._ssrString || '';
      if (result && result.ssr) return result.ssr;
      if (typeof result === 'string') return result;
      return String(result);
    }

    const marker = _doc.createTextNode("");
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

  /**
   * Negated conditional rendering.
   * @param {Function|boolean} condition - Reactive signal or boolean value.
   * @param {Function|HTMLElement} thenVal - Content to show if false.
   * @param {Function|HTMLElement} [otherwiseVal] - Content to show if true (optional).
   */
  $if.not = (condition, thenVal, otherwiseVal) =>
    $if(() => !(typeof condition === "function" ? condition() : condition), thenVal, otherwiseVal);

  /**
   * Optimized reactive loop with key-based reconciliation.
   * 
   * @param {Function|Array} source - Signal containing an Array of data.
   * @param {Function} render - Function receiving (item, index) and returning a node.
   * @param {Function} keyFn - Function to extract a unique key from the item.
   * @returns {HTMLElement|string} A reactive container (or SSR string).
   * @example
   * $for(items, (item) => Li(item.name), (item) => item.id)
   */
  const $for = (source, render, keyFn) => {
    if (SSR_MODE || isServer) {
      const items = (typeof source === "function" ? source() : source) || [];
      return items.map((item, index) => {
        const result = render(item, index);
        if (result && result._isRuntime) return result._ssrString || '';
        if (result && result.ssr) return result.ssr;
        if (typeof result === 'string') return result;
        return String(result);
      }).join('');
    }

    const marker = _doc.createTextNode("");
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
   * Hash-based (#) routing system with parameter support.
   * 
   * @param {Array<{path: string, component: Function}>} routes - Route definitions.
   * @returns {HTMLElement|string} The router outlet container (or SSR string).
   * @example
   * const routes = [
   *   { path: "/", component: Home },
   *   { path: "/user/:id", component: UserProfile },
   *   { path: "*", component: NotFound }
   * ];
   * $router(routes);
   */
  const $router = (routes) => {
    const getPath = () => {
      if (SSR_MODE) return $router._ssrPath;
      return window.location.hash.replace(/^#/, "") || "/";
    };

    if (SSR_MODE || isServer) {
      const path = getPath();
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
        const result = route.component(params);
        if (typeof result === "function") return $ssr(result);
        if (result && result._isRuntime) return result._ssrString || '';
        if (result && result.ssr) return result.ssr;
        return String(result);
      }
      return '';
    }

    const sPath = $(getPath());
    window.addEventListener("hashchange", () => sPath(getPath()));
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

  /** Reactive route parameters signal */
  $router.params = $({});

  /** Navigate to a route */
  $router.to = (path) => {
    if (SSR_MODE || isServer) return;
    window.location.hash = path.replace(/^#?\/?/, "#/");
  };

  /** Go back in history */
  $router.back = () => {
    if (SSR_MODE || isServer) return;
    window.history.back();
  };

  /** Get current route path */
  $router.path = () => {
    if (SSR_MODE || isServer) return $router._ssrPath || "/";
    return window.location.hash.replace(/^#/, "") || "/";
  };

  /** Internal SSR path storage */
  $router._ssrPath = "/";

  /**
   * Mounts a component or node into a DOM target element.
   * It automatically handles the cleanup of any previously mounted SigPro instances 
   * in that target to prevent memory leaks and duplicate renders.
   * 
   * @param {Function|HTMLElement} component - The component function to render or a pre-built DOM node.
   * @param {string|HTMLElement} target - A CSS selector string or a direct DOM element to mount into.
   * @returns {Object|undefined} The view instance containing the `container` and `destroy` method, or undefined if target is not found.
   * @example
   * // Mount using a component function
   * $mount(() => Div({ class: "app" }, "Hello World"), "#root");
   * @example
   * // Mount using a direct element
   * const myApp = Div("Hello");
   * $mount(myApp, document.getElementById("app"));
   */
  const $mount = (component, target) => {
    if (SSR_MODE || isServer) return;

    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;

    if (el.firstChild && el.firstChild.nodeType === 1) {
      HYDRATE_PTR = el.firstChild;
      const instance = _view(typeof component === "function" ? component : () => component);
      HYDRATE_PTR = null;
      return instance;
    }

    if (MOUNTED_NODES.has(el)) MOUNTED_NODES.get(el).destroy();
    const instance = _view(typeof component === "function" ? component : () => component);
    el.replaceChildren(instance.container);
    MOUNTED_NODES.set(el, instance);
    return instance;
  };

  // ============================================================================
  // SSR API ($ssr)
  // ============================================================================

  /**
   * Server-Side Rendering: Converts a component to an HTML string.
   * 
   * @param {Function|HTMLElement} component - The component to render.
   * @param {string} [path="/"] - Optional route path for SSR routing.
   * @returns {string} The rendered HTML string.
   * 
   * @example
   * // In Node.js
   * const html = $ssr(App, "/users/123");
   * res.send(`<!DOCTYPE html><body><div id="app">${html}</div></body>`);
   */
  const $ssr = (component, path = "/") => {
    const prev = SSR_MODE;
    SSR_MODE = true;
    $router._ssrPath = path;
    try {
      const result = _view(typeof component === "function" ? component : () => component);
      return result._ssrString || '';
    } catch (err) {
      console.error('SSR Error:', err);
      return `<div>Error rendering component: ${err.message}</div>`;
    } finally {
      SSR_MODE = prev;
    }
  };

  // ============================================================================
  // GLOBAL API INJECTION
  // ============================================================================

  const core = { $, $if, $for, $watch, $mount, $router, $html, $ssr };

  for (const [name, fn] of Object.entries(core)) {
    Object.defineProperty(_global, name, {
      value: fn,
      writable: false,
      configurable: false
    });
  }

  // ============================================================================
  // HTML TAG HELPERS
  // ============================================================================

  /**
   * Auto-generated HTML tag helpers (Div, Span, Button, etc.)
   * These provide a JSX-like experience without compilation.
   * 
   * @example
   * Div({ class: "container" }, 
   *   H1("Title"),
   *   Button({ onClick: handleClick }, "Click")
   * )
   */
  const tags = `div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer address 
  ul ol li dl dt dd a em strong small i b u mark time sub sup pre code blockquote details summary dialog 
  form label input textarea select button option fieldset legend table thead tbody tfoot tr th td caption 
  img video audio canvas svg iframe picture source progress meter`.split(/\s+/);

  tags.forEach((tagName) => {
    const helperName = tagName.charAt(0).toUpperCase() + tagName.slice(1);
    Object.defineProperty(_global, helperName, {
      value: (props, content) => $html(tagName, props, content),
      writable: false,
      configurable: true,
      enumerable: true
    });
  });

})();

// ============================================================================
// MODULE EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    $: global.$,
    $watch: global.$watch,
    $html: global.$html,
    $if: global.$if,
    $for: global.$for,
    $router: global.$router,
    $mount: global.$mount,
    $ssr: global.$ssr
  };
}

export const { $, $watch, $html, $if, $for, $router, $mount, $ssr } = typeof window !== 'undefined' ? window : global;
