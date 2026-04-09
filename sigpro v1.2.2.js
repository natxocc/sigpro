/**
 * SigPro v1.2.2 - ESM version with improved XSS blocking
 */

// DOM reference
const documentReference = typeof document !== "undefined" ? document : null

// Type checking helpers
const isArray = Array.isArray
const objectAssign = Object.assign
const isFunction = (value) => typeof value === "function"
const isObject = (value) => value && typeof value === "object"

// Convert any value to a DOM node
const ensureNode = (nodeOrValue) => {
  if (nodeOrValue && nodeOrValue._isRuntime) {
    return nodeOrValue.container
  }
  if (nodeOrValue instanceof Node) {
    return nodeOrValue
  }
  return documentReference.createTextNode(nodeOrValue ?? "")
}

// --- REACTIVITY CORE ---
let currentActiveEffect = null
let currentOwnerEffect = null
let isFlushingEffects = false
const effectQueue = new Set()
const mountedNodesRegistry = new WeakMap()

// Dispose an effect and its entire tree
const disposeEffect = (effect) => {
  if (!effect || effect._disposed) {
    return
  }
  effect._disposed = true
  const stack = [effect]
  while (stack.length) {
    const currentEffect = stack.pop()
    if (currentEffect._cleanups) {
      for (const cleanupFunction of currentEffect._cleanups) {
        cleanupFunction()
      }
      currentEffect._cleanups.clear()
    }
    if (currentEffect._children) {
      for (const childEffect of currentEffect._children) {
        stack.push(childEffect)
      }
      currentEffect._children.clear()
    }
    if (currentEffect._deps) {
      for (const dependencySet of currentEffect._deps) {
        dependencySet.delete(currentEffect)
      }
      currentEffect._deps.clear()
    }
  }
}

// Create a reactive effect
const createReactiveEffect = (effectFunction, isComputed = false) => {
  const reactiveEffect = () => {
    if (reactiveEffect._disposed) {
      return
    }
    if (reactiveEffect._deps) {
      for (const dependencySet of reactiveEffect._deps) {
        dependencySet.delete(reactiveEffect)
      }
      reactiveEffect._deps.clear()
    }
    if (reactiveEffect._cleanups) {
      for (const cleanupFunction of reactiveEffect._cleanups) {
        cleanupFunction()
      }
      reactiveEffect._cleanups.clear()
    }
    const previousActiveEffect = currentActiveEffect
    const previousOwnerEffect = currentOwnerEffect
    currentActiveEffect = reactiveEffect
    currentOwnerEffect = reactiveEffect
    try {
      return effectFunction()
    } finally {
      currentActiveEffect = previousActiveEffect
      currentOwnerEffect = previousOwnerEffect
    }
  }
  objectAssign(reactiveEffect, {
    _deps: null,
    _cleanups: null,
    _children: null,
    _disposed: false,
    _isComputed: isComputed,
    _depth: currentActiveEffect ? currentActiveEffect._depth + 1 : 0,
    _provisions: currentOwnerEffect ? currentOwnerEffect._provisions : {}
  })
  if (currentOwnerEffect) {
    if (!currentOwnerEffect._children) {
      currentOwnerEffect._children = new Set()
    }
    currentOwnerEffect._children.add(reactiveEffect)
  }
  return reactiveEffect
}

// --- LIFECYCLE AND CONTEXT ---
const onUnmount = (cleanupFunction) => {
  if (currentOwnerEffect) {
    if (!currentOwnerEffect._cleanups) {
      currentOwnerEffect._cleanups = new Set()
    }
    currentOwnerEffect._cleanups.add(cleanupFunction)
  }
}

const onMount = (mountFunction) => {
  if (currentOwnerEffect) {
    if (!currentOwnerEffect._mounts) {
      currentOwnerEffect._mounts = []
    }
    currentOwnerEffect._mounts.push(mountFunction)
  }
}

const provide = (key, value) => {
  if (currentOwnerEffect) {
    currentOwnerEffect._provisions = {
      ...currentOwnerEffect._provisions,
      [key]: value
    }
  }
}

const inject = (key, fallbackValue) => {
  if (currentOwnerEffect && currentOwnerEffect._provisions[key]) {
    return currentOwnerEffect._provisions[key]
  }
  return fallbackValue
}

// --- SCHEDULER ---
const flushEffectQueue = () => {
  if (isFlushingEffects) {
    return
  }
  isFlushingEffects = true
  const sortedEffects = Array.from(effectQueue).sort((effectA, effectB) => effectA._depth - effectB._depth)
  effectQueue.clear()
  for (let index = 0; index < sortedEffects.length; index++) {
    const effect = sortedEffects[index]
    if (!effect._disposed) {
      effect()
    }
  }
  isFlushingEffects = false
}

const trackAndTrigger = (subscriberSet, shouldTrigger = false) => {
  if (!shouldTrigger && currentActiveEffect && !currentActiveEffect._disposed) {
    subscriberSet.add(currentActiveEffect)
    if (!currentActiveEffect._deps) {
      currentActiveEffect._deps = new Set()
    }
    currentActiveEffect._deps.add(subscriberSet)
  } else if (shouldTrigger) {
    let hasEffectsToQueue = false
    for (const effect of subscriberSet) {
      if (effect === currentActiveEffect || effect._disposed) {
        continue
      }
      if (effect._isComputed) {
        effect._dirty = true
        if (effect._subs) {
          trackAndTrigger(effect._subs, true)
        }
      } else {
        effectQueue.add(effect)
        hasEffectsToQueue = true
      }
    }
    if (hasEffectsToQueue && !isFlushingEffects) {
      queueMicrotask(flushEffectQueue)
    }
  }
}

// --- SIGNALS AND COMPUTED ---
const $ = (initialValue, storageKey = null) => {
  const subscribers = new Set()
  // Computed case
  if (isFunction(initialValue)) {
    let cachedValue = undefined
    let isDirty = true
    const computedEffect = () => {
      if (isDirty) {
        const previousActiveEffect = currentActiveEffect
        currentActiveEffect = computedEffect
        try {
          const newValue = initialValue()
          if (!Object.is(cachedValue, newValue)) {
            cachedValue = newValue
            isDirty = false
            trackAndTrigger(subscribers, true)
          }
        } finally {
          currentActiveEffect = previousActiveEffect
        }
      }
      trackAndTrigger(subscribers)
      return cachedValue
    }
    objectAssign(computedEffect, {
      _isComputed: true,
      _subs: subscribers,
      _dirty: true,
      _deps: null,
      _disposed: false,
      stop: () => {
        computedEffect._disposed = true
        if (computedEffect._deps) {
          for (const dependencySet of computedEffect._deps) {
            dependencySet.delete(computedEffect)
          }
        }
        subscribers.clear()
      }
    })
    onUnmount(computedEffect.stop)
    return computedEffect
  }
  // Persistent $case
  let currentValue = initialValue
  if (storageKey) {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) {
        currentValue = JSON.parse(stored)
      }
    } catch (error) {
      // ignore parse errors
    }
  }
  // Signal function
  const signalFunction = (...argumentsList) => {
    if (argumentsList.length) {
      const nextValue = isFunction(argumentsList[0]) ? argumentsList[0](currentValue) : argumentsList[0]
      if (!Object.is(currentValue, nextValue)) {
        currentValue = nextValue
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(currentValue))
        }
        trackAndTrigger(subscribers, true)
      }
    }
    trackAndTrigger(subscribers)
    return currentValue
  }
  return signalFunction
}

// --- DOM UTILITIES WITH XSS PROTECTION ---
const setAttributeWithSecurity = (element, attributeName, attributeValue, isSvgElement) => {
  let safeValue = attributeValue
  if (attributeName === "src" || attributeName === "href") {
    const stringValue = String(attributeValue).toLowerCase()
    if (stringValue.startsWith("javascript:") || stringValue.startsWith("data:text/html")) {
      safeValue = "#"
    }
  }
  if (attributeName === "class" || attributeName === "className") {
    element.className = safeValue || ""
  } else if (safeValue == null || safeValue === false) {
    element.removeAttribute(attributeName)
  } else if (attributeName in element && !isSvgElement) {
    element[attributeName] = safeValue
  } else {
    element.setAttribute(attributeName, safeValue === true ? "" : safeValue)
  }
}

// --- VIRTUAL DOM / TAG CREATION ---
const Tag = (tagName, properties = {}, childrenList = []) => {
  // Overload: if properties is not an object, treat as children
  if (properties instanceof Node || isArray(properties) || !isObject(properties)) {
    childrenList = properties
    properties = {}
  }
  const isSvgElement = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tagName)
  const element = isSvgElement
    ? documentReference.createElementNS("http://www.w3.org/2000/svg", tagName)
    : documentReference.createElement(tagName)

  for (const [propertyName, propertyValue] of Object.entries(properties)) {
    if (propertyName === "ref") {
      if (isFunction(propertyValue)) {
        propertyValue(element)
      } else if (propertyValue && "current" in propertyValue) {
        propertyValue.current = element
      }
      continue
    }
    if (propertyName.startsWith("on")) {
      const eventName = propertyName.slice(2).toLowerCase()
      element.addEventListener(eventName, propertyValue)
      onUnmount(() => element.removeEventListener(eventName, propertyValue))
      continue
    }
    if (isFunction(propertyValue)) {
      const effect = createReactiveEffect(() => setAttributeWithSecurity(element, propertyName, propertyValue(), isSvgElement))
      effect()
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName) && (propertyName === "value" || propertyName === "checked")) {
        const inputEventName = propertyName === "checked" ? "change" : "input"
        element.addEventListener(inputEventName, (event) => propertyValue(event.target[propertyName]))
      }
    } else {
      setAttributeWithSecurity(element, propertyName, propertyValue, isSvgElement)
    }
  }

  const appendChildNode = (childNodeOrFunction) => {
    if (isArray(childNodeOrFunction)) {
      for (const nestedChild of childNodeOrFunction) {
        appendChildNode(nestedChild)
      }
      return
    }
    if (isFunction(childNodeOrFunction)) {
      const anchorNode = documentReference.createTextNode("")
      element.appendChild(anchorNode)
      let currentNodes = []
      const effect = createReactiveEffect(() => {
        const result = childNodeOrFunction()
        const nextNodes = (isArray(result) ? result : [result]).map(ensureNode)
        for (let index = 0; index < currentNodes.length; index++) {
          const existingNode = currentNodes[index]
          if (existingNode._isRuntime) {
            existingNode.destroy()
          } else {
            existingNode.remove()
          }
        }
        let referenceNode = anchorNode
        for (let index = nextNodes.length - 1; index >= 0; index--) {
          const newNode = nextNodes[index]
          element.insertBefore(newNode, referenceNode)
          referenceNode = newNode
        }
        currentNodes = nextNodes
      })
      effect()
      return
    }
    element.appendChild(ensureNode(childNodeOrFunction))
  }
  appendChildNode(childrenList)
  return element
}

// --- REACTIVE RENDER CONTAINER ---
const Render = (renderFunction) => {
  const container = documentReference.createElement("div")
  container.style.display = "contents"
  const effect = createReactiveEffect(() => {
    const result = renderFunction()
    const nodes = (isArray(result) ? result : [result]).map(ensureNode)
    for (const node of nodes) {
      container.appendChild(node)
    }
  })
  effect()
  if (effect._mounts) {
    for (const mountFunction of effect._mounts) {
      mountFunction()
    }
  }
  return {
    _isRuntime: true,
    container: container,
    destroy: () => {
      disposeEffect(effect)
      container.remove()
    }
  }
}

// --- CONTROL FLOW COMPONENTS ---
const For = (source, itemRenderer, keyExtractor) => {
  const anchorNode = documentReference.createTextNode("")
  const rootContainer = Tag("div", { style: "display:contents" }, [anchorNode])
  let itemCache = new Map()
  createReactiveEffect(() => {
    const items = (isFunction(source) ? source() : source) || []
    const nextCache = new Map()
    const order = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index]
      const cacheKey = keyExtractor ? keyExtractor(item, index) : index
      let cachedItem = itemCache.get(cacheKey)
      if (!cachedItem) {
        cachedItem = Render(() => itemRenderer(item, index))
      }
      nextCache.set(cacheKey, cachedItem)
      order.push(cacheKey)
      itemCache.delete(cacheKey)
    }
    for (const oldItem of itemCache.values()) {
      oldItem.destroy()
    }
    itemCache = nextCache
    let referenceNode = anchorNode
    for (let index = order.length - 1; index >= 0; index--) {
      const key = order[index]
      const view = nextCache.get(key)
      if (view.container.nextSibling !== referenceNode) {
        rootContainer.insertBefore(view.container, referenceNode)
      }
      referenceNode = view.container
    }
  })
  return rootContainer
}

const If = (condition, trueBranch, falseBranch = null) => {
  const anchorNode = documentReference.createTextNode("")
  const rootContainer = Tag("div", { style: "display:contents" }, [anchorNode])
  let currentView = null
  let lastCondition = null
  createReactiveEffect(() => {
    const conditionResult = !!(isFunction(condition) ? condition() : condition)
    if (conditionResult === lastCondition) {
      return
    }
    lastCondition = conditionResult
    if (currentView) {
      currentView.destroy()
      currentView = null
    }
    const content = conditionResult ? trueBranch : falseBranch
    if (content) {
      currentView = Render(() => isFunction(content) ? content() : content)
      rootContainer.insertBefore(currentView.container, anchorNode)
    }
  })
  return rootContainer
}

// --- ROUTER ---
const getCurrentHashPath = () => {
  return window.location.hash.slice(1) || "/"
}
const currentRoutePath = $(getCurrentHashPath())
window.addEventListener("hashchange", () => currentRoutePath(getCurrentHashPath()))

const Router = (routesDefinition) => {
  const outletElement = Tag("div", { class: "router-outlet" })
  let currentView = null
  createReactiveEffect(() => {
    const path = currentRoutePath()
    const pathSegments = path.split("/").filter(Boolean)
    const matchedRoute = routesDefinition.find(route => {
      const routeSegments = route.path.split("/").filter(Boolean)
      return routeSegments.length === pathSegments.length && routeSegments.every((segment, index) => segment[0] === ":" || segment === pathSegments[index])
    }) || routesDefinition.find(route => route.path === "*")
    if (matchedRoute) {
      if (currentView) {
        currentView.destroy()
      }
      const routeParams = {}
      matchedRoute.path.split("/").filter(Boolean).forEach((segment, index) => {
        if (segment[0] === ":") {
          routeParams[segment.slice(1)] = pathSegments[index]
        }
      })
      Router.params(routeParams)
      const componentToRender = isFunction(matchedRoute.component) ? matchedRoute.component(routeParams) : matchedRoute.component
      currentView = Render(() => componentToRender)
      outletElement.replaceChildren(currentView.container)
    }
  })
  return outletElement
}

Router.params = $({})
Router.to = (targetPath) => window.location.hash = targetPath.replace(/^#?\/?/, "#/")
Router.back = () => window.history.back()

// --- MOUNT APPLICATION ---
const Mount = (component, targetSelector) => {
  const targetElement = typeof targetSelector === "string" ? documentReference.querySelector(targetSelector) : targetSelector
  if (!targetElement) {
    return
  }
  const existingInstance = mountedNodesRegistry.get(targetElement)
  if (existingInstance) {
    existingInstance.destroy()
  }
  const instance = Render(isFunction(component) ? component : () => component)
  targetElement.replaceChildren(instance.container)
  mountedNodesRegistry.set(targetElement, instance)
  return instance
}

// --- WATCH UTILITY ---
const Watch = (sources, callback) => {
  const isArraySource = isArray(sources)
  const effect = createReactiveEffect(() => {
    if (isArraySource) {
      const previousActive = currentActiveEffect
      currentActiveEffect = null
      callback()
      for (const dependency of sources) {
        if (isFunction(dependency)) {
          dependency()
        }
      }
      currentActiveEffect = previousActive
    } else {
      callback()
    }
  })
  effect()
  return () => disposeEffect(effect)
}

// --- UNTRACK ---
const untrack = (untrackedFunction) => {
  const previousActiveEffect = currentActiveEffect
  currentActiveEffect = null
  try {
    return untrackedFunction()
  } finally {
    currentActiveEffect = previousActiveEffect
  }
}

// --- EXPORTS (ESM) ---
export { $, Watch, Tag, Render, If, For, Mount, onMount, onUnmount, provide, inject, Router, untrack }

// Default export with all public members
export default { $, Watch, Tag, Render, If, For, Mount, onMount, onUnmount, provide, inject, Router, untrack }