// sigpro 1.2.0 (Micro-Optimizado)
const isFunc = f => typeof f === "function"
const isObj = o => o && typeof o === "object"
const doc = typeof document !== "undefined" ? document : null
const ensureNode = n => n?._isRuntime ? n.container : (n instanceof Node ? n : doc.createTextNode(n == null ? "" : String(n)))

let activeEffect = null, activeOwner = null, isFlushing = false, batchDepth = 0
const effectQueue = new Set(), proxyCache = new WeakMap(), ITER = Symbol(), MOUNTED_NODES = new WeakMap()

const dispose = eff => {
  if (!eff || eff._disposed) return
  eff._disposed = true
  const stack = [eff]
  while (stack.length) {
    const e = stack.pop()
    e._cleanups?.forEach(fn => fn()); e._cleanups?.clear()
    e._children?.forEach(c => stack.push(c)); e._children?.clear()
    e._deps?.forEach(d => d.delete(e)); e._deps?.clear()
  }
}

const onMount = fn => activeOwner && (activeOwner._mounts ||= []).push(fn)
const onUnmount = fn => activeOwner && (activeOwner._cleanups ||= new Set()).add(fn)

const untrack = fn => {
  const p = activeEffect
  activeEffect = null
  try { return fn() } finally { activeEffect = p }
}

const createEffect = (fn, isComputed = false) => {
  const effect = () => {
    if (effect._disposed) return
    effect._deps?.forEach(s => s.delete(effect))
    effect._cleanups?.forEach(c => c()); effect._cleanups?.clear()
    
    const prevEff = activeEffect, prevOwn = activeOwner
    activeEffect = activeOwner = effect
    try { return effect._result = fn() } 
    catch (e) { console.error("[SigPro]", e) } 
    finally { activeEffect = prevEff; activeOwner = prevOwn }
  }
  Object.assign(effect, { _disposed: false, _isComputed: isComputed, _mounts: [], _depth: activeEffect ? activeEffect._depth + 1 : 0 })
  activeOwner && (activeOwner._children ||= new Set()).add(effect)
  return effect
}

const flush = () => {
  if (isFlushing) return
  isFlushing = true
  Array.from(effectQueue).sort((a, b) => a._depth - b._depth).forEach(e => !e._disposed && e())
  effectQueue.clear()
  isFlushing = false
}

const Batch = fn => {
  batchDepth++
  try { return fn() } finally { !--batchDepth && effectQueue.size && !isFlushing && flush() }
}

const trackUpdate = (subs, trigger = false) => {
  if (!trigger && activeEffect && !activeEffect._disposed) {
    subs.add(activeEffect); (activeEffect._deps ||= new Set()).add(subs)
  } else if (trigger) {
    let hasQ = false
    subs.forEach(e => {
      if (e === activeEffect || e._disposed) return
      if (e._isComputed) { e._dirty = true; e._subs && trackUpdate(e._subs, true) } 
      else { effectQueue.add(e); hasQ = true }
    })
    hasQ && !isFlushing && !batchDepth && queueMicrotask(flush)
  }
}

const $ = (val, key = null) => {
  const subs = new Set()
  if (isFunc(val)) {
    let cache, dirty = true
    const computed = () => {
      if (dirty) {
        const prev = activeEffect; activeEffect = computed
        try {
          const next = val()
          if (!Object.is(cache, next)) { cache = next; dirty = false; trackUpdate(subs, true) }
        } finally { activeEffect = prev }
      }
      return trackUpdate(subs), cache
    }
    Object.assign(computed, {
      _isComputed: true, _subs: subs, _dirty: true, _disposed: false,
      markDirty: () => dirty = true,
      stop: () => { computed._disposed = true; computed._deps?.forEach(d => d.delete(computed)); computed._deps?.clear(); subs.clear() }
    })
    return onUnmount(computed.stop), computed
  }
  
  if (key) try { val = JSON.parse(localStorage.getItem(key)) ?? val } catch (e) {}
  return (...args) => {
    if (args.length) {
      const next = isFunc(args[0]) ? args[0](val) : args[0]
      if (!Object.is(val, next)) {
        val = next; key && localStorage.setItem(key, JSON.stringify(val))
        trackUpdate(subs, true)
      }
    }
    return trackUpdate(subs), val
  }
}

const $$ = target => {
  if (!isObj(target)) return target
  let p = proxyCache.get(target)
  if (p) return p

  const subsMap = new Map()
  const getSubs = k => subsMap.get(k) || (subsMap.set(k, p = new Set()), p)

  p = new Proxy(target, {
    get: (t, k) => (trackUpdate(getSubs(k)), $$(t[k])),
    set: (t, k, v) => {
      if (!Object.is(t[k], v)) {
        const isNew = !(k in t); t[k] = v
        trackUpdate(getSubs(k), true)
        isNew && trackUpdate(getSubs(ITER), true)
      }
      return true
    },
    deleteProperty: (t, k) => Reflect.deleteProperty(t, k) && (trackUpdate(getSubs(k), true), trackUpdate(getSubs(ITER), true), true),
    ownKeys: t => (trackUpdate(getSubs(ITER)), Reflect.ownKeys(t))
  })
  
  proxyCache.set(target, p)
  return p
}

const Watch = (sources, cb) => {
  const effect = createEffect(cb === undefined ? sources : () => untrack(() => cb(Array.isArray(sources) ? sources.map(s => s()) : sources())))
  return effect(), () => dispose(effect)
}

const cleanupNode = node => {
  node._cleanups?.forEach(fn => fn()); node._cleanups?.clear()
  node._ownerEffect && dispose(node._ownerEffect)
  node.childNodes?.forEach(cleanupNode)
}

const DANGEROUS_PROTOCOL = /^\s*(javascript|data|vbscript):/i
const validateAttr = (k, v) => v == null || v === false ? null : (k === 'src' || k === 'href' || k.startsWith('on')) && DANGEROUS_PROTOCOL.test(String(v)) ? '#' : v

const Tag = (tag, props = {}, children = []) => {
  if (props instanceof Node || Array.isArray(props) || !isObj(props)) [children, props] = [props, {}]
  
  if (isFunc(tag)) {
    const effect = createEffect(() => tag(props, { children, emit: (ev, ...args) => props[`on${ev[0].toUpperCase()}${ev.slice(1)}`]?.(...args) }))
    const res = effect()
    if (res == null) return null
    const node = res instanceof Node || (Array.isArray(res) && res.every(n => n instanceof Node)) ? res : doc.createTextNode(String(res))
    const attach = n => isObj(n) && !n._isRuntime && Object.assign(n, { _mounts: effect._mounts || [], _cleanups: effect._cleanups || new Set(), _ownerEffect: effect })
    return Array.isArray(node) ? node.forEach(attach) : attach(node), node
  }

  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag)
  const el = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", tag) : doc.createElement(tag)
  el._cleanups = new Set()

  for (let k in props) {
    if (!props.hasOwnProperty(k)) continue
    let v = props[k]
    if (k === "ref") { isFunc(v) ? v(el) : (v.current = el); continue }
    if (k.startsWith("on")) {
      const ev = k.slice(2).toLowerCase()
      el.addEventListener(ev, v)
      const off = () => el.removeEventListener(ev, v)
      el._cleanups.add(off); onUnmount(off)
    } else if (isFunc(v)) {
      const effect = createEffect(() => {
        const val = validateAttr(k, v())
        if (k === "class") el.className = val || ""
        else if (val == null) el.removeAttribute(k)
        else if (k in el && !isSVG) el[k] = val
        else el.setAttribute(k, val === true ? "" : val)
      })
      effect(); el._cleanups.add(() => dispose(effect)); onUnmount(() => dispose(effect))
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (k === "value" || k === "checked")) {
        el.addEventListener(k === "checked" ? "change" : "input", ev => v(ev.target[k]))
      }
    } else {
      const val = validateAttr(k, v)
      if (val != null) k in el && !isSVG ? el[k] = val : el.setAttribute(k, val === true ? "" : val)
    }
  }

  const append = c => {
    if (Array.isArray(c)) return c.forEach(append)
    if (isFunc(c)) {
      const anchor = doc.createTextNode(""); el.appendChild(anchor)
      let currentNodes = []
      const effect = createEffect(() => {
        const res = c(), next = (Array.isArray(res) ? res : [res]).map(ensureNode)
        currentNodes.forEach(n => { n._isRuntime ? n.destroy() : cleanupNode(n); n.parentNode?.remove() })
        let ref = anchor
        for (let i = next.length - 1; i >= 0; i--) {
          const node = next[i]
          if (node.parentNode !== ref.parentNode) ref.parentNode?.insertBefore(node, ref)
          node._mounts?.forEach(fn => fn()); ref = node
        }
        currentNodes = next
      })
      effect(); el._cleanups.add(() => dispose(effect)); onUnmount(() => dispose(effect))
    } else {
      const node = ensureNode(c); el.appendChild(node); node._mounts?.forEach(fn => fn())
    }
  }
  return append(children), el
}

const Render = renderFn => {
  const cleanups = new Set(), mounts = [], prevOwn = activeOwner, prevEff = activeEffect
  const container = doc.createElement("div")
  Object.assign(container.style, { display: "contents" })
  container.setAttribute("role", "presentation")
  activeOwner = { _cleanups: cleanups, _mounts: mounts }; activeEffect = null

  const process = r => {
    if (!r) return
    if (r._isRuntime) { cleanups.add(r.destroy); container.appendChild(r.container) } 
    else if (Array.isArray(r)) r.forEach(process)
    else container.appendChild(r instanceof Node ? r : doc.createTextNode(String(r)))
  }

  try { process(renderFn({ onCleanup: fn => cleanups.add(fn) })) } 
  finally { activeOwner = prevOwn; activeEffect = prevEff }

  mounts.forEach(fn => fn())
  return { _isRuntime: true, container, destroy: () => (cleanups.forEach(fn => fn()), cleanupNode(container), container.remove()) }
}

const If = (cond, ifYes, ifNot = null) => {
  const anchor = doc.createTextNode(""), root = Tag("div", { style: "display:contents" }, [anchor])
  let view = null
  Watch(() => !!(isFunc(cond) ? cond() : cond), show => {
    view?.destroy()
    const content = show ? ifYes : ifNot
    if (content) {
      view = Render(() => isFunc(content) ? content() : content)
      root.insertBefore(view.container, anchor)
    } else view = null
  })
  return onUnmount(() => view?.destroy()), root
}

const For = (src, itemFn, keyFn) => {
  const anchor = doc.createTextNode(""), root = Tag("div", { style: "display:contents" }, [anchor])
  let cache = new Map()
  Watch(() => (isFunc(src) ? src() : src) || [], items => {
    const nextCache = new Map(), nextOrder = []
    ;(items || []).forEach((item, i) => {
      const key = keyFn ? keyFn(item, i) : (item?.id ?? i)
      let view = cache.get(key) || Render(() => itemFn(item, i))
      cache.delete(key); nextCache.set(key, view); nextOrder.push(view)
    })
    cache.forEach(view => view.destroy())
    let lastRef = anchor
    for (let i = nextOrder.length - 1; i >= 0; i--) {
      const node = nextOrder[i].container
      if (node.nextSibling !== lastRef) root.insertBefore(node, lastRef)
      lastRef = node
    }
    cache = nextCache
  })
  return root
}

const Router = routes => {
  const getHash = () => window.location.hash.slice(1) || "/"
  const path = $(getHash()), handler = () => path(getHash())
  window.addEventListener("hashchange", handler)
  onUnmount(() => window.removeEventListener("hashchange", handler))
  
  const hook = Tag("div", { class: "router-hook" })
  let view = null
  Watch([path], () => {
    const cur = path()
    const route = routes.find(r => {
      const p1 = r.path.split("/").filter(Boolean), p2 = cur.split("/").filter(Boolean)
      return p1.length === p2.length && p1.every((p, i) => p[0] === ":" || p === p2[i])
    }) || routes.find(r => r.path === "*")
    
    if (route) {
      view?.destroy()
      const params = {}
      route.path.split("/").filter(Boolean).forEach((p, i) => p[0] === ":" && (params[p.slice(1)] = cur.split("/").filter(Boolean)[i]))
      Router.params(params)
      view = Render(() => isFunc(route.component) ? route.component(params) : route.component)
      hook.replaceChildren(view.container)
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
  t.replaceChildren(inst.container); MOUNTED_NODES.set(t, inst)
  return inst
}

const SigPro = Object.freeze({ $, $$, Watch, Tag, Render, If, For, Router, Mount, onMount, onUnmount, Batch })

if (typeof window !== "undefined") {
  Object.assign(window, SigPro)
  "div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer ul ol li a em strong pre code form label input textarea select button img svg"
    .split(" ").forEach(t => window[t[0].toUpperCase() + t.slice(1)] = (p, c) => SigPro.Tag(t, p, c))
}

export { $, $$, Watch, Tag, Render, If, For, Router, Mount, onMount, onUnmount, Batch }
export default SigPro