(() => {
  var __create = Object.create;
  var __getProtoOf = Object.getPrototypeOf;
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toESMCache_node;
  var __toESMCache_esm;
  var __toESM = (mod, isNodeMode, target) => {
    var canCache = mod != null && typeof mod === "object";
    if (canCache) {
      var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
      var cached = cache.get(mod);
      if (cached)
        return cached;
    }
    target = mod != null ? __create(__getProtoOf(mod)) : {};
    const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
    if (canCache)
      cache.set(mod, to);
    return to;
  };
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/sigpro.js
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
  var MOUNTED_NODES = new WeakMap;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var XLINK_NS = "http://www.w3.org/1999/xlink";
  var SVG_TAGS = new Set("svg,path,circle,rect,line,polyline,polygon,g,defs,text,textPath,tspan,use,symbol,image,marker,ellipse".split(","));
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
  var batch = (fn) => {
    batchDepth++;
    try {
      return fn();
    } finally {
      batchDepth--;
      if (batchDepth === 0 && effectQueue.size > 0 && !isFlushing)
        flush();
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
  var $ = (val, key = null) => {
    const subs = new Set;
    if (isFunc(val)) {
      let cache;
      const computed = () => {
        if (computed._dirty) {
          const prev = activeEffect;
          activeEffect = computed;
          try {
            const next = val();
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
      return computed;
    }
    if (key)
      try {
        val = JSON.parse(localStorage.getItem(key)) ?? val;
      } catch (e) {}
    return (...args) => {
      if (args.length) {
        const next = isFunc(args[0]) ? args[0](val) : args[0];
        if (!Object.is(val, next)) {
          val = next;
          if (key)
            localStorage.setItem(key, JSON.stringify(val));
          trackUpdate(subs, true);
        }
      }
      trackUpdate(subs);
      return val;
    };
  };
  var watch = (sources, cb) => {
    if (cb === undefined) {
      const effect2 = createEffect(sources);
      effect2();
      return () => dispose(effect2);
    }
    const effect = createEffect(() => {
      const vals = isArr(sources) ? sources.map((s) => s()) : sources();
      untrack(() => cb(vals));
    });
    effect();
    return () => dispose(effect);
  };
  var cleanupNode = (node) => {
    if (!node)
      return;
    if (node._cleanups) {
      node._cleanups.forEach((fn) => fn());
      node._cleanups.clear();
    }
    if (node._ownerEffect)
      dispose(node._ownerEffect);
    if (node.childNodes)
      node.childNodes.forEach((n) => cleanupNode(n));
  };
  var DANGEROUS_PROTOCOL = /^\s*(javascript|data|vbscript):/i;
  var DANGEROUS_URI_ATTRS = new Set(["src", "href", "formaction", "action", "background", "code", "archive"]);
  var isDangerousAttr = (key) => DANGEROUS_URI_ATTRS.has(key) || key.startsWith("on");
  var validateAttr = (key, val) => {
    if (val == null || val === false)
      return null;
    if (isDangerousAttr(key)) {
      const sVal = String(val);
      if (DANGEROUS_PROTOCOL.test(sVal))
        return "#";
    }
    return val;
  };
  var h = (tag, props = {}, children = []) => {
    if (props instanceof Node || isArr(props) || !isObj(props)) {
      children = props;
      props = {};
    }
    if (isFunc(tag)) {
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
    const isSVG = SVG_TAGS.has(tag);
    const el = isSVG ? doc.createElementNS(SVG_NS, tag) : doc.createElement(tag);
    el._cleanups = new Set;
    for (const k of Object.keys(props)) {
      let v = props[k];
      if (k === "ref") {
        isFunc(v) ? v(el) : v.current = el;
        continue;
      }
      if (isSVG && k.startsWith("xlink:")) {
        const cleanVal = validateAttr(k.slice(6), v);
        cleanVal == null ? el.removeAttributeNS(XLINK_NS, k.slice(6)) : el.setAttributeNS(XLINK_NS, k.slice(6), cleanVal);
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
          const val = validateAttr(k, v());
          if (k === "class")
            el.className = val || "";
          else if (val == null)
            el.removeAttribute(k);
          else if (k === "style" && typeof val === "string")
            el.setAttribute("style", val);
          else if (k in el && !isSVG)
            el[k] = val;
          else
            el.setAttribute(k, val === true ? "" : val);
        });
        effect();
        el._cleanups.add(() => dispose(effect));
        onUnmount(() => dispose(effect));
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
          const evType = k === "checked" ? "change" : "input";
          el.addEventListener(evType, (ev) => v(ev.target[k]));
        }
      } else {
        const val = validateAttr(k, v);
        if (val != null) {
          if (k === "style" && typeof val === "string")
            el.setAttribute("style", val);
          else if (k in el && !isSVG)
            el[k] = val;
          else
            el.setAttribute(k, val === true ? "" : val);
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
  var render = (renderFn) => {
    const cleanups = new Set;
    const previousOwner = activeOwner;
    const previousEffect = activeEffect;
    const container = doc.createElement("div");
    container.style.display = "contents";
    container.setAttribute("role", "presentation");
    activeOwner = { _cleanups: cleanups };
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
  var when = (cond, SIP, NOP = null) => {
    const anchor = doc.createTextNode("");
    const root = h("div", { style: "display:contents" }, [anchor]);
    let currentView = null;
    watch(() => !!(isFunc(cond) ? cond() : cond), (show) => {
      if (currentView) {
        currentView.destroy();
        currentView = null;
      }
      const content = show ? SIP : NOP;
      if (content) {
        currentView = render(() => isFunc(content) ? content() : content);
        root.insertBefore(currentView.container, anchor);
      }
    });
    onUnmount(() => currentView?.destroy());
    return root;
  };
  var each = (src, itemFn, keyField) => {
    const anchor = doc.createTextNode("");
    const root = h("div", { style: "display:contents" }, [anchor]);
    let cache = new Map;
    watch(() => (isFunc(src) ? src() : src) || [], (items) => {
      const nextCache = new Map;
      const nextOrder = [];
      const newItems = items || [];
      for (let i = 0;i < newItems.length; i++) {
        const item = newItems[i];
        const key = keyField ? item?.[keyField] ?? i : item?.id ?? i;
        let view = cache.get(key);
        if (!view)
          view = render(() => itemFn(item, i));
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
  var Fragment = (props) => props.children;
  var mount = (comp, target) => {
    const t = typeof target === "string" ? doc.querySelector(target) : target;
    if (!t)
      return;
    if (MOUNTED_NODES.has(t))
      MOUNTED_NODES.get(t).destroy();
    const inst = render(isFunc(comp) ? comp : () => comp);
    t.replaceChildren(inst.container);
    MOUNTED_NODES.set(t, inst);
    return inst;
  };
  if (typeof window !== "undefined") {
    "a abbr article aside audio b blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li main mark meter nav object ol optgroup option output p picture pre progress section select slot small source span strong sub summary sup svg table tbody td template textarea tfoot th thead time tr u ul video".split(" ").forEach((tag) => {
      window[tag] = (props, children) => h(tag, props, children);
    });
  }

  // src/router.js
  var import_node_fs = (() => ({}));

  // node:path
  function assertPath(path) {
    if (typeof path !== "string")
      throw TypeError("Path must be a string. Received " + JSON.stringify(path));
  }
  function normalizeStringPosix(path, allowAboveRoot) {
    var res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, code;
    for (var i = 0;i <= path.length; ++i) {
      if (i < path.length)
        code = path.charCodeAt(i);
      else if (code === 47)
        break;
      else
        code = 47;
      if (code === 47) {
        if (lastSlash === i - 1 || dots === 1)
          ;
        else if (lastSlash !== i - 1 && dots === 2) {
          if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
            if (res.length > 2) {
              var lastSlashIndex = res.lastIndexOf("/");
              if (lastSlashIndex !== res.length - 1) {
                if (lastSlashIndex === -1)
                  res = "", lastSegmentLength = 0;
                else
                  res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
                lastSlash = i, dots = 0;
                continue;
              }
            } else if (res.length === 2 || res.length === 1) {
              res = "", lastSegmentLength = 0, lastSlash = i, dots = 0;
              continue;
            }
          }
          if (allowAboveRoot) {
            if (res.length > 0)
              res += "/..";
            else
              res = "..";
            lastSegmentLength = 2;
          }
        } else {
          if (res.length > 0)
            res += "/" + path.slice(lastSlash + 1, i);
          else
            res = path.slice(lastSlash + 1, i);
          lastSegmentLength = i - lastSlash - 1;
        }
        lastSlash = i, dots = 0;
      } else if (code === 46 && dots !== -1)
        ++dots;
      else
        dots = -1;
    }
    return res;
  }
  function _format(sep, pathObject) {
    var dir = pathObject.dir || pathObject.root, base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
    if (!dir)
      return base;
    if (dir === pathObject.root)
      return dir + base;
    return dir + sep + base;
  }
  function resolve() {
    var resolvedPath = "", resolvedAbsolute = false, cwd;
    for (var i = arguments.length - 1;i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }
      if (assertPath(path), path.length === 0)
        continue;
      resolvedPath = path + "/" + resolvedPath, resolvedAbsolute = path.charCodeAt(0) === 47;
    }
    if (resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute), resolvedAbsolute)
      if (resolvedPath.length > 0)
        return "/" + resolvedPath;
      else
        return "/";
    else if (resolvedPath.length > 0)
      return resolvedPath;
    else
      return ".";
  }
  function normalize(path) {
    if (assertPath(path), path.length === 0)
      return ".";
    var isAbsolute = path.charCodeAt(0) === 47, trailingSeparator = path.charCodeAt(path.length - 1) === 47;
    if (path = normalizeStringPosix(path, !isAbsolute), path.length === 0 && !isAbsolute)
      path = ".";
    if (path.length > 0 && trailingSeparator)
      path += "/";
    if (isAbsolute)
      return "/" + path;
    return path;
  }
  function isAbsolute(path) {
    return assertPath(path), path.length > 0 && path.charCodeAt(0) === 47;
  }
  function join() {
    if (arguments.length === 0)
      return ".";
    var joined;
    for (var i = 0;i < arguments.length; ++i) {
      var arg = arguments[i];
      if (assertPath(arg), arg.length > 0)
        if (joined === undefined)
          joined = arg;
        else
          joined += "/" + arg;
    }
    if (joined === undefined)
      return ".";
    return normalize(joined);
  }
  function relative(from, to) {
    if (assertPath(from), assertPath(to), from === to)
      return "";
    if (from = resolve(from), to = resolve(to), from === to)
      return "";
    var fromStart = 1;
    for (;fromStart < from.length; ++fromStart)
      if (from.charCodeAt(fromStart) !== 47)
        break;
    var fromEnd = from.length, fromLen = fromEnd - fromStart, toStart = 1;
    for (;toStart < to.length; ++toStart)
      if (to.charCodeAt(toStart) !== 47)
        break;
    var toEnd = to.length, toLen = toEnd - toStart, length = fromLen < toLen ? fromLen : toLen, lastCommonSep = -1, i = 0;
    for (;i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47)
            return to.slice(toStart + i + 1);
          else if (i === 0)
            return to.slice(toStart + i);
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47)
            lastCommonSep = i;
          else if (i === 0)
            lastCommonSep = 0;
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i), toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47)
        lastCommonSep = i;
    }
    var out = "";
    for (i = fromStart + lastCommonSep + 1;i <= fromEnd; ++i)
      if (i === fromEnd || from.charCodeAt(i) === 47)
        if (out.length === 0)
          out += "..";
        else
          out += "/..";
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      if (toStart += lastCommonSep, to.charCodeAt(toStart) === 47)
        ++toStart;
      return to.slice(toStart);
    }
  }
  function _makeLong(path) {
    return path;
  }
  function dirname(path) {
    if (assertPath(path), path.length === 0)
      return ".";
    var code = path.charCodeAt(0), hasRoot = code === 47, end = -1, matchedSlash = true;
    for (var i = path.length - 1;i >= 1; --i)
      if (code = path.charCodeAt(i), code === 47) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else
        matchedSlash = false;
    if (end === -1)
      return hasRoot ? "/" : ".";
    if (hasRoot && end === 1)
      return "//";
    return path.slice(0, end);
  }
  function basename(path, ext) {
    if (ext !== undefined && typeof ext !== "string")
      throw TypeError('"ext" argument must be a string');
    assertPath(path);
    var start = 0, end = -1, matchedSlash = true, i;
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path)
        return "";
      var extIdx = ext.length - 1, firstNonSlashEnd = -1;
      for (i = path.length - 1;i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1)
            matchedSlash = false, firstNonSlashEnd = i + 1;
          if (extIdx >= 0)
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1)
                end = i;
            } else
              extIdx = -1, end = firstNonSlashEnd;
        }
      }
      if (start === end)
        end = firstNonSlashEnd;
      else if (end === -1)
        end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1;i >= 0; --i)
        if (path.charCodeAt(i) === 47) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else if (end === -1)
          matchedSlash = false, end = i + 1;
      if (end === -1)
        return "";
      return path.slice(start, end);
    }
  }
  function extname(path) {
    assertPath(path);
    var startDot = -1, startPart = 0, end = -1, matchedSlash = true, preDotState = 0;
    for (var i = path.length - 1;i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1)
        matchedSlash = false, end = i + 1;
      if (code === 46) {
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
      } else if (startDot !== -1)
        preDotState = -1;
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
      return "";
    return path.slice(startDot, end);
  }
  function format(pathObject) {
    if (pathObject === null || typeof pathObject !== "object")
      throw TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    return _format("/", pathObject);
  }
  function parse(path) {
    assertPath(path);
    var ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0)
      return ret;
    var code = path.charCodeAt(0), isAbsolute2 = code === 47, start;
    if (isAbsolute2)
      ret.root = "/", start = 1;
    else
      start = 0;
    var startDot = -1, startPart = 0, end = -1, matchedSlash = true, i = path.length - 1, preDotState = 0;
    for (;i >= start; --i) {
      if (code = path.charCodeAt(i), code === 47) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1)
        matchedSlash = false, end = i + 1;
      if (code === 46) {
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
      } else if (startDot !== -1)
        preDotState = -1;
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1)
        if (startPart === 0 && isAbsolute2)
          ret.base = ret.name = path.slice(1, end);
        else
          ret.base = ret.name = path.slice(startPart, end);
    } else {
      if (startPart === 0 && isAbsolute2)
        ret.name = path.slice(1, startDot), ret.base = path.slice(1, end);
      else
        ret.name = path.slice(startPart, startDot), ret.base = path.slice(startPart, end);
      ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0)
      ret.dir = path.slice(0, startPart - 1);
    else if (isAbsolute2)
      ret.dir = "/";
    return ret;
  }
  var sep = "/";
  var delimiter = ":";
  var posix = ((p) => (p.posix = p, p))({ resolve, normalize, isAbsolute, join, relative, _makeLong, dirname, basename, extname, format, parse, sep, delimiter, win32: null, posix: null });

  // src/router.js
  var router = (routes) => {
    const getHash = () => window.location.hash.slice(1) || "/";
    const path = $(getHash());
    const handler = () => path(getHash());
    window.addEventListener("hashchange", handler);
    onUnmount(() => window.removeEventListener("hashchange", handler));
    const hook = h("div", { class: "router-hook" });
    let currentView = null;
    watch([path], () => {
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
        router.params(params);
        currentView = render(() => isFunc(route.component) ? route.component(params) : route.component);
        hook.replaceChildren(currentView.container);
      }
    });
    return hook;
  };
  router.params = $({});
  router.to = (p) => window.location.hash = p.replace(/^#?\/?/, "#/");
  router.back = () => window.history.back();
  router.path = () => window.location.hash.replace(/^#/, "") || "/";

  // src/build_umd.js
  if (typeof window !== "undefined") {
    Object.assign(window, { $, watch, h, Fragment, when, each, router, mount, batch, onUnmount, isArr, isFunc, isObj });
  }
})();
