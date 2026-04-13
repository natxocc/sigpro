// sigpro 1.2.0
const isFunc = f => typeof f === "function"
const isObj = o => o && typeof o === "object"
const isArr = Array.isArray
const doc = typeof document !== "undefined" ? document : null
const ensureNode = n => n?._isRuntime ? n.container : (n instanceof Node ? n : doc.createTextNode(n == null ? "" : String(n)))

let activeEffect = null
let activeOwner = null
let isFlushing = false
const effectQueue = new Set()
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

const onMount = fn => {
  if (activeOwner) (activeOwner._mounts ||= []).push(fn)
}

const onUnmount = fn => {
  if (activeOwner) (activeOwner._cleanups ||= new Set()).add(fn)
}

const set = (signal, path, value) => {
  if (value === undefined) return signal(isFunc(path) ? path(signal()) : path)
  const keys = path.split('.'), root = { ...signal() }
  let acc = root, k
  for (k of keys.slice(0, -1)) acc = acc[k] = { ...(acc[k] || {}) }
  acc[keys.at(-1)] = value
  signal(root)
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

const trackUpdate = (subs, trigger = false) => {
  if (!trigger && activeEffect && !activeEffect._disposed) {
    subs.add(activeEffect)
      ; (activeEffect._deps ||= new Set()).add(subs)
  } else if (trigger) {
    let hasQueue = false
    subs.forEach(e => {
      if (e === activeEffect || e._disposed) return
      if (e._isComputed) {
        e._dirty = true
        if (e._subs) trackUpdate(e._subs, true)
      } else {
        effectQueue.add(e)
        hasQueue = true
      }
    })
    if (hasQueue && !isFlushing) queueMicrotask(flush)
  }
}

const $ = (val, key = null) => {
  const subs = new Set()
  if (isFunc(val)) {
    let cache, dirty = true
    const computed = () => {
      if (dirty) {
        const prev = activeEffect
        activeEffect = computed
        try {
          const next = val()
          if (!Object.is(cache, next)) {
            cache = next
            dirty = false
            trackUpdate(subs, true)
          }
        } finally { activeEffect = prev }
      }
      trackUpdate(subs)
      return cache
    }
    computed._isComputed = true
    computed._subs = subs
    computed._dirty = true
    computed._deps = null
    computed._disposed = false
    computed.markDirty = () => { dirty = true }
    computed.stop = () => {
      computed._disposed = true
      if (computed._deps) {
        computed._deps.forEach(depSet => depSet.delete(computed))
        computed._deps.clear()
      }
      subs.clear()
    }
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

const Watch = (sources, cb) => {
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

const cleanupNode = node => {
  if (node._cleanups) {
    node._cleanups.forEach(fn => fn())
    node._cleanups.clear()
  }
  if (node._ownerEffect) dispose(node._ownerEffect)
  if (node.childNodes) node.childNodes.forEach(cleanupNode)
}

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

const Tag = (tag, props = {}, children = []) => {
  if (props instanceof Node || isArr(props) || !isObj(props)) {
    children = props
    props = {}
  }
  if (isFunc(tag)) {
  const ctx = { _mounts: [], _cleanups: new Set() }
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
  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag)
  const el = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag)
  el._cleanups = new Set()

  for (let k in props) {
    if (!props.hasOwnProperty(k)) continue
    let v = props[k]
    if (k === "ref") {
      isFunc(v) ? v(el) : (v.current = el)
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

const Render = renderFn => {
  const cleanups = new Set()
  const mounts = []
  const previousOwner = activeOwner
  const previousEffect = activeEffect
  const container = doc.createElement("div")
  container.style.display = "contents"
  container.setAttribute("role", "presentation")
  activeOwner = { _cleanups: cleanups, _mounts: mounts }
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

  mounts.forEach(fn => fn())
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

const If = (cond, ifYes, ifNot = null) => {
  const anchor = doc.createTextNode("")
  const root = Tag("div", { style: "display:contents" }, [anchor])
  let currentView = null

  Watch(
    () => !!(isFunc(cond) ? cond() : cond),
    show => {
      if (currentView) {
        currentView.destroy()
        currentView = null
      }

      const content = show ? ifYes : ifNot
      if (content) {
        currentView = Render(() => isFunc(content) ? content() : content)
        root.insertBefore(currentView.container, anchor)
      }
    }
  )

  onUnmount(() => currentView?.destroy())
  return root
}

const For = (src, itemFn, keyFn) => {
  const anchor = doc.createTextNode("")
  const root = Tag("div", { style: "display:contents" }, [anchor])
  let cache = new Map()
  Watch(() => (isFunc(src) ? src() : src) || [], items => {
    const nextCache = new Map()
    const nextOrder = []
    const newItems = items || []
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i]
      const key = keyFn ? keyFn(item, i) : (item?.id ?? i)
      let view = cache.get(key)
      if (!view) view = Render(() => itemFn(item, i))
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

const Router = routes => {
  const getHash = () => window.location.hash.slice(1) || "/"
  const path = $(getHash())
  const handler = () => path(getHash())
  window.addEventListener("hashchange", handler)
  onUnmount(() => window.removeEventListener("hashchange", handler))
  const hook = Tag("div", { class: "router-hook" })
  let currentView = null
  Watch([path], () => {
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
      Router.params(params)
      currentView = Render(() => isFunc(route.component) ? route.component(params) : route.component)
      hook.replaceChildren(currentView.container)
    }
  })
  return hook
}
Router.params = $({})
Router.to = p => window.location.hash = p.replace(/^#?\/?/, "#/")
Router.back = () => window.history.back()
Router.path = () => window.location.hash.replace(/^#/, "") || "/"

const Mount = (comp, target) => {
  const t = typeof target === "string" ? doc.querySelector(target) : target
  if (!t) return
  if (MOUNTED_NODES.has(t)) MOUNTED_NODES.get(t).destroy()
  const inst = Render(isFunc(comp) ? comp : () => comp)
  t.replaceChildren(inst.container)
  MOUNTED_NODES.set(t, inst)
  return inst
}

const SigPro = Object.freeze({ $, Watch, Tag, Render, If, For, Router, Mount, onMount, onUnmount, set })

if (typeof window !== "undefined") {
  Object.assign(window, SigPro)
  "div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer ul ol li a em strong pre code form label input textarea select button img svg"
    .split(" ").forEach(t => window[t[0].toUpperCase() + t.slice(1)] = (p, c) => SigPro.Tag(t, p, c))
}

export { $, Watch, Tag, Render, If, For, Router, Mount, onMount, onUnmount, set }
export default SigPro