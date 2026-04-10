// ============================================================
// SIGPRO CORE · Simple, Fast, Memory‑Safe
// ============================================================
let currentContext = null

const getContext = () => currentContext
const runInContext = (ctx, fn) => {
  const prev = currentContext
  currentContext = ctx
  try { return fn() }
  finally { currentContext = prev }
}

const onCleanup = (fn) => {
  const ctx = getContext()
  if (!ctx) throw new Error('onCleanup must be called within a reactive root')
  ctx.cleanups.add(fn)
}

const onMount = (fn) => {
  const ctx = getContext()
  if (!ctx) throw new Error('onMount must be called within a reactive root')
  queueMicrotask(() => runInContext(ctx, fn))
}

const createRoot = (fn) => {
  const ctx = { cleanups: new Set(), parent: currentContext }
  return runInContext(ctx, () => {
    const result = fn(ctx)
    const destroy = () => { ctx.cleanups.forEach(c => c()); ctx.cleanups.clear() }
    if (result instanceof Node) result._destroy = destroy
    return result
  })
}

const createComponent = (fn) => (...args) => {
  const parent = getContext()
  const ctx = { cleanups: new Set(), parent }
  if (parent) parent.cleanups.add(() => { ctx.cleanups.forEach(c => c()); ctx.cleanups.clear() })
  return runInContext(ctx, () => fn(...args))
}

const createSignal = (initialValue) => {
  const subscribers = new Set()
  let value = initialValue
  const signal = (...args) => {
    if (args.length === 0) {
      const ctx = getContext()
      if (ctx?.activeEffect) {
        subscribers.add(ctx.activeEffect)
        ctx.activeEffect.deps.add(subscribers)
      }
      return value
    }
    const next = typeof args[0] === 'function' ? args[0](value) : args[0]
    if (!Object.is(value, next)) {
      value = next
      ;[...subscribers].forEach(e => e.run())
    }
    return value
  }
  return signal
}

const createEffect = (fn) => {
  const ctx = getContext()
  if (!ctx) throw new Error('createEffect must be called within a reactive root')
  const effect = {
    deps: new Set(),
    run: () => {
      effect.deps.forEach(d => d.delete(effect))
      effect.deps.clear()
      const prev = ctx.activeEffect
      ctx.activeEffect = effect
      try { fn() }
      finally { ctx.activeEffect = prev }
    }
  }
  onCleanup(() => {
    effect.deps.forEach(d => d.delete(effect))
    effect.deps.clear()
  })
  effect.run()
}

const mount = (component, selector) => {
  const root = document.querySelector(selector)
  if (!root) throw new Error(`Selector "${selector}" not found`)
  if (root._destroy) root._destroy()
  root.innerHTML = ''
  const app = createRoot(component)
  root.appendChild(app)
  root._destroy = app._destroy
  return app
}

// Helper para crear elementos (con soporte SVG)
const h = (tag, props, ...children) => {
  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/i.test(tag)
  const el = isSVG
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag)

  if (props) {
    Object.entries(props).forEach(([k, v]) => {
      if (k.startsWith('on')) {
        const event = k.slice(2).toLowerCase()
        el.addEventListener(event, v)
        onCleanup(() => el.removeEventListener(event, v))
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(el.style, v)
      } else {
        el.setAttribute(k, v)
      }
    })
  }

  children.flat().forEach(c => {
    if (c instanceof Node) el.appendChild(c)
    else el.appendChild(document.createTextNode(String(c ?? '')))
  })
  return el
}

// ===== IF / FOR / ROUTER (API IDÉNTICA A B) =====
const If = createComponent((cond, thenFn) => {
  const anchor = document.createTextNode('')
  const container = h('div', { style: 'display:contents' }, anchor)
  let current = null
  createEffect(() => {
    const show = !!cond()
    if (show && !current) {
      current = createRoot(() => thenFn())
      container.insertBefore(current, anchor)
    } else if (!show && current) {
      if (current._destroy) current._destroy()
      else current.remove()
      current = null
    }
  })
  onCleanup(() => current?._destroy?.())
  return container
})

const For = createComponent((source, itemFn) => {
  const container = h('div', { style: 'display:contents' })
  const marker = document.createTextNode('')
  container.appendChild(marker)
  let cache = new Map()
  createEffect(() => {
    const items = source() || []
    const newCache = new Map()
    const order = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const key = (item && typeof item === 'object' && 'id' in item) ? item.id : i
      let view = cache.get(key)
      if (!view) view = createRoot(() => itemFn(item, i))
      newCache.set(key, view)
      order.push(key)
      cache.delete(key)
    }
    cache.forEach(v => v._destroy ? v._destroy() : v.remove?.())
    cache = newCache
    let anchor = marker
    for (let i = order.length - 1; i >= 0; i--) {
      const view = newCache.get(order[i])
      if (view instanceof Node && view.nextSibling !== anchor)
        container.insertBefore(view, anchor)
      anchor = view
    }
  })
  onCleanup(() => cache.forEach(v => v._destroy ? v._destroy() : v.remove?.()))
  return container
})

const Router = createComponent(({ routes }) => {
  const getHash = () => window.location.hash.slice(1) || '/'
  const path = createSignal(getHash())
  const handler = () => path(getHash())
  window.addEventListener('hashchange', handler)
  onCleanup(() => window.removeEventListener('hashchange', handler))
  const outlet = h('div', {})
  let currentView = null
  createEffect(() => {
    const cur = path()
    const match = routes.find(r => {
      const rParts = r.path.split('/').filter(Boolean)
      const pParts = cur.split('/').filter(Boolean)
      return rParts.length === pParts.length && rParts.every((p, i) => p.startsWith(':') || p === pParts[i])
    }) || routes.find(r => r.path === '*')
    if (match) {
      if (currentView?._destroy) currentView._destroy()
      else if (currentView) currentView.remove()
      const params = {}
      match.path.split('/').filter(Boolean).forEach((p, i) => {
        if (p.startsWith(':')) params[p.slice(1)] = cur.split('/').filter(Boolean)[i]
      })
      currentView = createRoot(() => match.component(params))
      outlet.appendChild(currentView)
    }
  })
  onCleanup(() => currentView?._destroy?.())
  return outlet
})
Router.to = (path) => window.location.hash = path.replace(/^#?\/?/, '#/')
Router.back = () => window.history.back()
Router.path = () => window.location.hash.slice(1) || '/'

// ===== API PÚBLICA =====
const SigPro = {
  createRoot, createComponent, createSignal, createEffect,
  onCleanup, onMount, mount, h,
  If, For, Router
}

// ===== EXPOSICIÓN GLOBAL (OPCIONAL, COMO EN B) =====
if (typeof window !== 'undefined') {
  Object.assign(window, SigPro)
  const tags = 'div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer ul ol li a em strong pre code form label input textarea select button img svg'.split(' ')
  tags.forEach(t => {
    const helper = t[0].toUpperCase() + t.slice(1)
    window[helper] = (props, ...children) => h(t, props, children)
  })
}

export {
  createRoot, createComponent, createSignal, createEffect,
  onCleanup, onMount, mount, h,
  If, For, Router
}
export default SigPro