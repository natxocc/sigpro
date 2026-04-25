// sigpro 1.2.19
const isFunc = f => typeof f === "function"
const isObj = o => o && typeof o === "object"
const isArr = Array.isArray
const doc = typeof document !== "undefined" ? document : null
const ensureNode = n => n?._isRuntime ? n.container : (n instanceof Node ? n : doc.createTextNode(n == null ? "" : String(n)))

let activeEffect = null
let activeOwner = null
let isFlushing = false
let batchDepth = 0
const effectQueue = new Set()
const proxyCache = new WeakMap()
const ITER = Symbol('iter')
const MOUNTED_NODES = new WeakMap()

const dispose = eff => {
  if (!eff || eff._disposed) return
  eff._disposed = true
  const stack = [eff]
  while (stack.length) {
    const e = stack.pop()
    if (e._cleanups) {
      e._cleanups.forEach(fn => fn())
      e._cleanups.clear()
    }
    if (e._children) {
      e._children.forEach(child => stack.push(child))
      e._children.clear()
    }
    if (e._deps) {
      e._deps.forEach(depSet => depSet.delete(e))
      e._deps.clear()
    }
  }
}

const onUnmount = fn => {
  if (activeOwner) (activeOwner._cleanups ||= new Set()).add(fn)
}

const untrack = fn => {
  const p = activeEffect
  activeEffect = null
  try { return fn() } finally { activeEffect = p }
}

const createEffect = (fn, isComputed = false) => {
  const effect = () => {
    if (effect._disposed) return
    if (effect._deps) effect._deps.forEach(s => s.delete(effect))
    if (effect._cleanups) {
      effect._cleanups.forEach(c => c())
      effect._cleanups.clear()
    }
    const prevEffect = activeEffect
    const prevOwner = activeOwner
    activeEffect = activeOwner = effect
    try {
      return effect._result = fn()
    } catch (e) {
      console.error("[SigPro]", e)
    } finally {
      activeEffect = prevEffect
      activeOwner = prevOwner
    }
  }
  effect._deps = effect._cleanups = effect._children = null
  effect._disposed = false
  effect._isComputed = isComputed
  effect._depth = activeEffect ? activeEffect._depth + 1 : 0
  effect._mounts = []
  effect._parent = activeOwner
  if (activeOwner) (activeOwner._children ||= new Set()).add(effect)
  return effect
}

const flush = () => {
  if (isFlushing) return
  isFlushing = true
  const sorted = Array.from(effectQueue).sort((a, b) => a._depth - b._depth)
  effectQueue.clear()
  for (const e of sorted) if (!e._disposed) e()
  isFlushing = false
}

const batch = fn => {
  batchDepth++
  try {
    return fn()
  } finally {
    batchDepth--
    if (batchDepth === 0 && effectQueue.size > 0 && !isFlushing) {
      flush()
    }
  }
}

const trackUpdate = (subs, trigger = false) => {
  if (!trigger && activeEffect && !activeEffect._disposed) {
    subs.add(activeEffect)
      ; (activeEffect._deps ||= new Set()).add(subs)
  } else if (trigger && subs.size > 0) {
    let hasQueue = false
    for (const e of subs) {
      if (e === activeEffect || e._disposed) continue
      if (e._isComputed) {
        e._dirty = true
        if (e._subs) trackUpdate(e._subs, true)
      } else {
        effectQueue.add(e)
        hasQueue = true
      }
    }
    if (hasQueue && !isFlushing && batchDepth === 0) queueMicrotask(flush)
  }
}

const $ = (val, key = null) => {
  const subs = new Set()
  if (isFunc(val)) {
    let cache
    const computed = () => {
      if (computed._dirty) {
        const prev = activeEffect
        activeEffect = computed
        try {
          const next = val()
          if (!Object.is(cache, next)) {
            cache = next
            trackUpdate(subs, true)
          }
        } finally {
          activeEffect = prev
        }
        computed._dirty = false
      }
      trackUpdate(subs)
      return cache
    }
    computed._isComputed = true
    computed._subs = subs
    computed._dirty = true
    computed._deps = null
    computed._disposed = false
    computed.stop = () => { }
    if (activeOwner) onUnmount(computed.stop)
    return computed
  }
  if (key) try { val = JSON.parse(localStorage.getItem(key)) ?? val } catch (e) { }
  return (...args) => {
    if (args.length) {
      const next = isFunc(args[0]) ? args[0](val) : args[0]
      if (!Object.is(val, next)) {
        val = next
        if (key) localStorage.setItem(key, JSON.stringify(val))
        trackUpdate(subs, true)
      }
    }
    trackUpdate(subs)
    return val
  }
}

const $$ = (target) => {
  if (!isObj(target)) return target
  const cached = proxyCache.get(target)
  if (cached) return cached

  const subs = new Map()
  const getSubs = (key) => {
    let set = subs.get(key)
    if (!set) subs.set(key, set = new Set())
    return set
  }

  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      if (typeof key !== 'symbol') trackUpdate(getSubs(key))
      return $$(Reflect.get(target, key, receiver))
    },
    set(target, key, value, receiver) {
      const hadKey = Reflect.has(target, key)
      const oldValue = Reflect.get(target, key, receiver)
      const result = Reflect.set(target, key, value, receiver)
      if (result && !Object.is(oldValue, value)) {
        trackUpdate(getSubs(key), true)
        if (!hadKey) trackUpdate(getSubs(ITER), true)
      }
      return result
    },
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key)
      if (result) {
        trackUpdate(getSubs(key), true)
        trackUpdate(getSubs(ITER), true)
      }
      return result
    },
    ownKeys(target) {
      trackUpdate(getSubs(ITER))
      return Reflect.ownKeys(target)
    }
  })

  proxyCache.set(target, proxy)
  return proxy
}

const watch = (sources, cb) => {
  if (cb === undefined) {
    const effect = createEffect(sources)
    effect()
    return () => dispose(effect)
  }
  const effect = createEffect(() => {
    const vals = Array.isArray(sources) ? sources.map(s => s()) : sources()
    untrack(() => cb(vals))
  })
  effect()
  return () => dispose(effect)
}

const cleanupNode = (node) => {
  if (!node) return;
  if (node._cleanups) {
    node._cleanups.forEach(fn => fn());
    node._cleanups.clear();
  }
  if (node._ownerEffect) dispose(node._ownerEffect);
  if (node.childNodes) node.childNodes.forEach(n => cleanupNode(n));
};

const DANGEROUS_PROTOCOL = /^\s*(javascript|data|vbscript):/i
const isDangerousAttr = key => key === 'src' || key === 'href' || key.startsWith('on')

const validateAttr = (key, val) => {
  if (val == null || val === false) return null
  if (isDangerousAttr(key)) {
    const sVal = String(val)
    if (DANGEROUS_PROTOCOL.test(sVal)) {
      console.warn(`[SigPro] Bloqueado protocolo peligroso en ${key}`)
      return '#'
    }
  }
  return val
}

const h = (tag, props = {}, children = []) => {
  if (props instanceof Node || isArr(props) || !isObj(props)) {
    children = props
    props = {}
  }

  if (isFunc(tag)) {
    const effect = createEffect(() => {
      const result = tag(props, {
        children,
        emit: (ev, ...args) => props[`on${ev[0].toUpperCase()}${ev.slice(1)}`]?.(...args)
      })
      effect._result = result
      return result
    })
    effect()

    const result = effect._result
    if (result == null) return null

    const node = (result instanceof Node || (isArr(result) && result.every(n => n instanceof Node)))
      ? result
      : doc.createTextNode(String(result))

    const attach = n => {
      if (isObj(n) && !n._isRuntime) {
        n._mounts = effect._mounts || []
        n._cleanups = effect._cleanups || new Set()
        n._ownerEffect = effect
      }
    }

    isArr(node) ? node.forEach(attach) : attach(node)
    return node
  }
  const isSVG = /^(svg|path|circle|rect|line|poly(line|gon)|g|defs|text(path)?|tspan|use|symbol|image|marker|ellipse)$/i.test(tag);
  const el = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag)
  el._cleanups = new Set()

  for (let k in props) {
    if (!props.hasOwnProperty(k)) continue
    let v = props[k]
    if (k === "ref") {
      isFunc(v) ? v(el) : (v.current = el)
      continue
    }
    if (isSVG && k.startsWith("xlink:")) {
      const ns = "http://www.w3.org/1999/xlink"
      v == null ? el.removeAttributeNS(ns, k.slice(6)) : el.setAttributeNS(ns, k.slice(6), v)
      continue
    }
    if (k.startsWith("on")) {
      const ev = k.slice(2).toLowerCase()
      el.addEventListener(ev, v)
      const off = () => el.removeEventListener(ev, v)
      el._cleanups.add(off)
      onUnmount(off)
    } else if (isFunc(v)) {
      const effect = createEffect(() => {
        const val = validateAttr(k, v())
        if (k === "class") el.className = val || ""
        else if (val == null) el.removeAttribute(k)
        else if (k in el && !isSVG) el[k] = val
        else el.setAttribute(k, val === true ? "" : val)
      })
      effect()
      el._cleanups.add(() => dispose(effect))
      onUnmount(() => dispose(effect))
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
        const evType = k === "checked" ? "change" : "input"
        el.addEventListener(evType, ev => v(ev.target[k]))
      }
    } else {
      const val = validateAttr(k, v)
      if (val != null) {
        if (k in el && !isSVG) el[k] = val
        else el.setAttribute(k, val === true ? "" : val)
      }
    }
  }

  const append = c => {
    if (isArr(c)) return c.forEach(append)
    if (isFunc(c)) {
      const anchor = doc.createTextNode("")
      el.appendChild(anchor)
      let currentNodes = []
      const effect = createEffect(() => {
        const res = c()
        const next = (isArr(res) ? res : [res]).map(ensureNode)
        currentNodes.forEach(n => {
          if (n._isRuntime) n.destroy()
          else cleanupNode(n)
          if (n.parentNode) n.remove()
        })
        let ref = anchor
        for (let i = next.length - 1; i >= 0; i--) {
          const node = next[i]
          if (node.parentNode !== ref.parentNode) ref.parentNode?.insertBefore(node, ref)
          if (node._mounts) node._mounts.forEach(fn => fn())
          ref = node
        }
        currentNodes = next
      })
      effect()
      el._cleanups.add(() => dispose(effect))
      onUnmount(() => dispose(effect))
    } else {
      const node = ensureNode(c)
      el.appendChild(node)
      if (node._mounts) node._mounts.forEach(fn => fn())
    }
  }
  append(children)
  return el
}

const render = renderFn => {
  const cleanups = new Set()
  const previousOwner = activeOwner
  const previousEffect = activeEffect
  const container = doc.createElement("div")
  container.style.display = "contents"
  container.setAttribute("role", "presentation")
  activeOwner = { _cleanups: cleanups }
  activeEffect = null

  const processResult = result => {
    if (!result) return
    if (result._isRuntime) {
      cleanups.add(result.destroy)
      container.appendChild(result.container)
    } else if (isArr(result)) {
      result.forEach(processResult)
    } else {
      container.appendChild(result instanceof Node ? result : doc.createTextNode(String(result == null ? "" : result)))
    }
  }

  try {
    processResult(renderFn({ onCleanup: fn => cleanups.add(fn) }))
  } finally {
    activeOwner = previousOwner
    activeEffect = previousEffect
  }

  return {
    _isRuntime: true,
    container,
    destroy: () => {
      cleanups.forEach(fn => fn())
      cleanupNode(container)
      container.remove()
    }
  }
}

const when = (cond, SIP, NOP = null) => {
  const anchor = doc.createTextNode("")
  const root = h("div", { style: "display:contents" }, [anchor])
  let currentView = null

  watch(
    () => !!(isFunc(cond) ? cond() : cond),
    show => {
      if (currentView) {
        currentView.destroy()
        currentView = null
      }

      const content = show ? SIP : NOP
      if (content) {
        currentView = render(() => isFunc(content) ? content() : content)
        root.insertBefore(currentView.container, anchor)
      }
    }
  )

  onUnmount(() => currentView?.destroy())
  return root
}

const fx = ({ name, duration = 200, scale, slide, rotate, blur }, child) => {
  const el = typeof child === "function" ? child() : child;
  if (!(el instanceof Node)) return el;

  if (name) {
    el.style.animation = `${name}-in ${duration}ms`;
    return el;
  }

  const hasTransform = scale || slide || rotate || blur;
  const initialTransform = [
    scale ? "scale(0.95)" : "",
    slide ? "translateY(-10px)" : "",
    rotate ? "rotate(-2deg)" : ""
  ].filter(Boolean).join(" ");

  el.style.transition = `all ${duration}ms ease`;
  el.style.opacity = "0";
  if (hasTransform) el.style.transform = initialTransform;
  if (blur) el.style.filter = "blur(4px)";

  requestAnimationFrame(() => {
    el.style.opacity = "1";
    if (hasTransform) el.style.transform = "none";
    if (blur) el.style.filter = "none";
  });

  return el;
};

const each = (src, itemFn, keyField) => {
  const anchor = doc.createTextNode("")
  const root = h("div", { style: "display:contents" }, [anchor])
  let cache = new Map()
  watch(() => (isFunc(src) ? src() : src) || [], items => {
    const nextCache = new Map()
    const nextOrder = []
    const newItems = items || []
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i]
      const key = keyField ? (item?.[keyField] ?? i) : (item?.id ?? i)
      let view = cache.get(key)
      if (!view) view = render(() => itemFn(item, i))
      else cache.delete(key)
      nextCache.set(key, view)
      nextOrder.push(view)
    }
    cache.forEach(view => view.destroy())
    let lastRef = anchor
    for (let i = nextOrder.length - 1; i >= 0; i--) {
      const view = nextOrder[i]
      const node = view.container
      if (node.nextSibling !== lastRef) root.insertBefore(node, lastRef)
      lastRef = node
    }
    cache = nextCache
  })
  return root
}

const router = routes => {
  const getHash = () => window.location.hash.slice(1) || "/"
  const path = $(getHash())
  const handler = () => path(getHash())
  window.addEventListener("hashchange", handler)
  onUnmount(() => window.removeEventListener("hashchange", handler))
  const hook = h("div", { class: "router-hook" })
  let currentView = null
  watch([path], () => {
    const cur = path()
    const route = routes.find(r => {
      const p1 = r.path.split("/").filter(Boolean)
      const p2 = cur.split("/").filter(Boolean)
      return p1.length === p2.length && p1.every((p, i) => p[0] === ":" || p === p2[i])
    }) || routes.find(r => r.path === "*")
    if (route) {
      currentView?.destroy()
      const params = {}
      route.path.split("/").filter(Boolean).forEach((p, i) => {
        if (p[0] === ":") params[p.slice(1)] = cur.split("/").filter(Boolean)[i]
      })
      router.params(params)
      currentView = render(() => isFunc(route.component) ? route.component(params) : route.component)
      hook.replaceChildren(currentView.container)
    }
  })
  return hook
}
router.params = $({})
router.to = p => window.location.hash = p.replace(/^#?\/?/, "#/")
router.back = () => window.history.back()
router.path = () => window.location.hash.replace(/^#/, "") || "/"

const req = ({ url, method = 'GET', headers = {} }) => {
  const loading = $(false);
  const error = $(null);
  const data = $(null);
  let controller = null;
  let timeoutId = null;

  const run = async (body = null) => {
    controller?.abort();
    clearTimeout(timeoutId);
    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 10000);
    loading(true);
    error(null);

    try {
      const isFormData = body instanceof FormData;
      const res = await fetch(url, {
        method,
        headers: isFormData ? headers : { 'Content-Type': 'application/json', ...headers },
        body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
        signal: controller.signal
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(json?.message || res.statusText);
      data(json);
      return json;
    } catch (e) {
      if (e.name !== 'AbortError') error(e.message);
      throw e;
    } finally {
      loading(false);
      clearTimeout(timeoutId);
      controller = null;
      timeoutId = null;
    }
  };

  const abort = () => controller?.abort();

  return { run, abort, loading, error, data };
};

const mount = (comp, target) => {
  const t = typeof target === "string" ? doc.querySelector(target) : target
  if (!t) return
  if (MOUNTED_NODES.has(t)) MOUNTED_NODES.get(t).destroy()
  const inst = render(isFunc(comp) ? comp : () => comp)
  t.replaceChildren(inst.container)
  MOUNTED_NODES.set(t, inst)
  return inst
}

const SigPro = Object.freeze({ $, $$, watch, h, when, each, fx, router, req, mount, batch })

if (typeof window !== "undefined") {
  Object.assign(window, SigPro)
  "a abbr article aside audio b blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li main mark meter nav object ol optgroup option output p picture pre progress section select slot small source span strong sub summary sup svg table tbody td template textarea tfoot th thead time tr u ul video"
    .split(" ").forEach(tag => {
      window[tag] = (props, children) => h(tag, props, children)
    })
}

export { $, $$, watch, h, when, each, fx, router, req, mount, batch }