/**
 * SigPro Core 
 */
(() => {
  let activeEffect = null;
  let currentOwner = null;
  const effectQueue = new Set();
  let isFlushing = false;
  const MOUNTED_NODES = new WeakMap();

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

  const track = (subs) => {
    if (activeEffect && !activeEffect._deleted) {
      subs.add(activeEffect);
      activeEffect._deps.add(subs);
    }
  };

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

  $.watch = (target, fn) => {
    const isExplicit = Array.isArray(target);
    const callback = isExplicit ? fn : target;
    const depsInput = isExplicit ? target : null;

    if (typeof callback !== "function") return () => {};

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

  const sweep = (node) => {
    if (node._cleanups) {
      node._cleanups.forEach((f) => f());
      node._cleanups.clear();
    }
    node.childNodes?.forEach(sweep);
  };

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

  $.html = (tag, props = {}, content = []) => {
    if (props instanceof Node || Array.isArray(props) || typeof props !== "object") {
      content = props; props = {};
    }
    const el = document.createElement(tag);
    el._cleanups = new Set();

    for (let [k, v] of Object.entries(props)) {
      if (k.startsWith("on")) {
        const name = k.slice(2).toLowerCase().split(".")[0];
        const handler = (e) => v(e);
        el.addEventListener(name, handler);
        el._cleanups.add(() => el.removeEventListener(name, handler));
      } else if (k.startsWith("$")) {
        const attr = k.slice(1);
        el._cleanups.add($.watch(() => {
          const val = typeof v === "function" ? v() : v;
          if (el[attr] !== val) el[attr] = val;
        }));
        if (typeof v === "function") {
          const evt = attr === "checked" ? "change" : "input";
          el.addEventListener(evt, (e) => v(e.target[attr]));
        }
      } else if (typeof v === "function") {
        el._cleanups.add($.watch(() => {
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
        el._cleanups.add($.watch(() => {
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

  $.if = (condition, thenVal, otherwiseVal = null) => {
    const marker = document.createTextNode("");
    const container = $.html("div", { style: "display:contents" }, [marker]);
    let current = null, last = null;
    $.watch(() => {
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

  $.for = (source, render, keyFn) => {
    const marker = document.createTextNode("");
    const container = $.html("div", { style: "display:contents" }, [marker]);
    const cache = new Map();
    $.watch(() => {
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

  $.router = (routes) => {
    const sPath = $(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", () => sPath(window.location.hash.replace(/^#/, "") || "/"));
    const outlet = Div({ class: "router-outlet" });
    let current = null;

    $.watch([sPath], () => {
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
        current = _view(() => {
          const res = route.component(params);
          return typeof res === "function" ? res() : res;
        });
        outlet.appendChild(current.container);
      }
    });
    return outlet;
  };

  $.go = (p) => (window.location.hash = p.replace(/^#?\/?/, "#/"));

  $.mount = (component, target) => {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    if (MOUNTED_NODES.has(el)) MOUNTED_NODES.get(el).destroy();
    const instance = _view(typeof component === "function" ? component : () => component);
    el.replaceChildren(instance.container);
    MOUNTED_NODES.set(el, instance);
    return instance;
  };

  const tags = `div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer address ul ol li dl dt dd a em strong small i b u mark time sub sup pre code blockquote details summary dialog form label input textarea select button option fieldset legend table thead tbody tfoot tr th td caption img video audio canvas svg iframe picture source progress meter`.split(/\s+/);
  tags.forEach((t) => {
    window[t.charAt(0).toUpperCase() + t.slice(1)] = (p, c) => $.html(t, p, c);
  });

  window.$ = $;
})();
export const { $ } = window;