Aquí tienes el código adaptado con el nuevo sistema de efectos estilo Sigwork, más compacto, seguro y eficiente, manteniendo toda la funcionalidad de SigPro:

```typescript
// SigPro.ts - Versión con sistema de efectos estilo Sigwork

type CleanupFn = () => void;

interface EffectFn {
  (): void;
  _deps: Set<Set<EffectFn>>;
  _children?: EffectFn[];
  _cleanup?: CleanupFn;
  _isComputed?: boolean;
  _subs?: Set<EffectFn>;
  _deleted?: boolean;
}

type JSXFunction = {
  <P extends Record<string, any>>(
    tag: string,
    props: (P & { children?: any }) | null,
    ...children: any[]
  ): HTMLElement;
  
  <P extends Record<string, any>>(
    tag: (props: P, context?: any) => any,
    props: (P & { children?: any }) | null,
    ...children: any[]
  ): any;
};

type Owner = { cleanups: Set<CleanupFn> } | null;

type Signal<T> = {
  (): T;
  (next: T | ((prev: T) => T)): T;
  readonly [SIGNAL]: true;
};

type Runtime = {
  _isRuntime: true;
  container: HTMLElement;
  destroy: () => void;
};

type Component = (props?: Record<string, any>, children?: any[]) => any;
type Transition = {
  in?: (el: HTMLElement) => void;
  out?: (el: HTMLElement, done: () => void) => void;
};

const SIGNAL = Symbol("signal");

// Sistema de efectos estilo Sigwork
let activeEffect: EffectFn | null = null;
let currentOwner: Owner = null;
let isScheduled = false;
const effectQueue = new Set<EffectFn>();

const tick = () => {
  while (effectQueue.size) {
    const runs = [...effectQueue];
    effectQueue.clear();
    runs.forEach(fn => fn());
  }
  isScheduled = false;
};

const scheduleEffect = (effect: EffectFn) => {
  if (effect._deleted) return;
  effectQueue.add(effect);
  if (!isScheduled) queueMicrotask(tick);
  isScheduled = true;
};

const MOUNTED_NODES = new WeakMap<Element, Runtime>();

const doc = document;
const isArr = Array.isArray;
const assign = Object.assign;
const createEl = (t: string) => doc.createElement(t);
const createText = (t: any) => doc.createTextNode(String(t ?? ""));
const isFunc = (f: any): f is Function => typeof f === "function";
const isObj = (o: any): o is object => typeof o === "object" && o !== null;

const runWithContext = <T>(effect: EffectFn | null, callback: () => T): T => {
  const prev = activeEffect;
  activeEffect = effect;
  try {
    return callback();
  } finally {
    activeEffect = prev;
  }
};

const cleanupNode = (node: Node) => {
  if ((node as any)._cleanups) {
    (node as any)._cleanups.forEach((dispose: CleanupFn) => dispose());
    (node as any)._cleanups.clear();
  }
  node.childNodes?.forEach(cleanupNode);
};

const trackSubscription = (subscribers: Set<EffectFn>) => {
  if (activeEffect && !activeEffect._deleted) {
    subscribers.add(activeEffect);
    activeEffect._deps.add(subscribers);
  }
};

const triggerUpdate = (subscribers: Set<EffectFn>) => {
  for (const effect of subscribers) {
    if (effect === activeEffect || effect._deleted) continue;
    if (effect._isComputed) {
      effect._dirty = true;
      if (effect._subs) triggerUpdate(effect._subs);
    } else {
      scheduleEffect(effect);
    }
  }
};

const isJavascriptURL = (url: string): boolean => {
  try {
    const parsed = new URL(url, location.origin);
    return parsed.protocol === "javascript:";
  } catch {
    return false;
  }
};

const sanitizeURL = (url: string): string => {
  if (isJavascriptURL(url)) return "#";
  return url;
};

// ========== EFECTOS ESTILO SIGWORK ==========
export function effect(fn: () => any, isScope: boolean = false): CleanupFn {
  let cleanup: CleanupFn | null = null;
  
  const run = () => {
    if (run._deleted) return;
    stop();
    const prev = activeEffect;
    activeEffect = run;
    const result = fn();
    if (isFunc(result)) cleanup = result;
    activeEffect = prev;
  };
  
  const stop = () => {
    if (run._deleted) return;
    run._deleted = true;
    run._deps.forEach(subs => subs.delete(run));
    run._deps.clear();
    if (cleanup) cleanup();
    run._children?.forEach(child => child());
  };
  
  run._deps = new Set<Set<EffectFn>>();
  run._children = [];
  run._deleted = false;
  
  if (isScope && activeEffect) {
    activeEffect._children!.push(stop);
  }
  
  run();
  
  if (currentOwner) currentOwner.cleanups.add(stop);
  
  return stop;
}

// ========== WATCH (basado en effect) ==========
export function watch<T>(
  source: (() => T) | { value: T },
  callback: (newValue: T, oldValue: T) => any
): CleanupFn {
  let first = true;
  let oldValue: T;
  
  const getter = isFunc(source) ? source : () => (source as any).value;
  
  return effect(() => {
    const newValue = getter();
    
    if (!first) {
      runWithContext(null, () => callback(newValue, oldValue));
    } else {
      first = false;
    }
    oldValue = newValue;
  });
}

// ========== SIGNALS ==========
export function $<T>(initial: T | (() => T), storageKey?: string): Signal<T> {
  const subscribers = new Set<EffectFn>();

  if (isFunc(initial)) {
    let cachedValue: T;
    let isDirty = true;
    let stopEffect: CleanupFn | null = null;

    const computedFn = () => {
      if (stopEffect) stopEffect();
      stopEffect = effect(() => {
        const newValue = (initial as () => T)();
        if (!Object.is(cachedValue, newValue) || isDirty) {
          cachedValue = newValue;
          isDirty = false;
          triggerUpdate(subscribers);
        }
      });
    };

    const signal = ((...args: [] | [T | ((prev: T) => T)]) => {
      if (args.length === 0) {
        trackSubscription(subscribers);
        return cachedValue;
      }
      return cachedValue;
    }) as Signal<T>;
    
    signal[SIGNAL] = true;
    computedFn();
    return signal;
  }

  let value = initial as T;
  if (storageKey) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) value = JSON.parse(saved);
    } catch (e) {
      console.warn("SigPro storage error", e);
    }
  }

  const signal = ((...args: [] | [T | ((prev: T) => T)]) => {
    if (args.length) {
      const next = isFunc(args[0]) ? (args[0] as (prev: T) => T)(value) : args[0];
      if (!Object.is(value, next)) {
        value = next;
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(value));
          } catch (e) { }
        }
        triggerUpdate(subscribers);
      }
      return value;
    }
    trackSubscription(subscribers);
    return value;
  }) as Signal<T>;
  signal[SIGNAL] = true;
  return signal;
}

// ========== REACTIVE OBJECT ==========
export function $$<T extends object>(object: T, cache = new WeakMap()): T {
  if (!isObj(object)) return object;
  if (cache.has(object)) return cache.get(object);

  const keySubscribers: Record<string | symbol, Set<EffectFn>> = {};
  const proxy = new Proxy(object, {
    get(target, key, receiver) {
      if (activeEffect) {
        const subs = keySubscribers[key] ??= new Set();
        trackSubscription(subs);
      }
      const value = Reflect.get(target, key, receiver);
      return isObj(value) ? $$(value, cache) : value;
    },
    set(target, key, value, receiver) {
      if (Object.is(target[key as keyof T], value)) return true;
      const success = Reflect.set(target, key, value, receiver);
      if (keySubscribers[key]) triggerUpdate(keySubscribers[key]);
      return success;
    },
  });

  cache.set(object, proxy);
  return proxy;
}

// ========== RENDER ==========
export function Render(renderFn: (ctx: { onCleanup: (fn: CleanupFn) => void }) => any): Runtime {
  const cleanups = new Set<CleanupFn>();
  const prevOwner = currentOwner;
  const container = createEl("div");
  container.style.display = "contents";
  currentOwner = { cleanups };

  const processResult = (result: any) => {
    if (!result) return;
    if (result._isRuntime) {
      cleanups.add(result.destroy);
      container.appendChild(result.container);
    } else if (isArr(result)) {
      result.forEach(processResult);
    } else {
      container.appendChild(result instanceof Node ? result : createText(result));
    }
  };

  try {
    processResult(renderFn({ onCleanup: (fn) => cleanups.add(fn) }));
  } finally {
    currentOwner = prevOwner;
  }

  return {
    _isRuntime: true,
    container,
    destroy: () => {
      cleanups.forEach(fn => fn());
      cleanupNode(container);
      container.remove();
    },
  };
}

// ========== TAG ==========
export function Tag(tag: string, props: any = {}, children: any = []): HTMLElement {
  if (props instanceof Node || isArr(props) || !isObj(props)) {
    children = props;
    props = {};
  }

  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
  const el = isSVG
    ? doc.createElementNS("http://www.w3.org/2000/svg", tag)
    : createEl(tag) as HTMLElement;

  (el as any)._cleanups = new Set<CleanupFn>();
  (el as any).onUnmount = (fn: CleanupFn) => (el as any)._cleanups.add(fn);

  const booleanAttrs = ["disabled", "checked", "required", "readonly", "selected", "multiple", "autofocus"];

  const updateAttr = (name: string, value: any) => {
    let safeValue = value;
    if ((name === "href" || name === "src") && typeof value === "string") {
      safeValue = sanitizeURL(value);
    }
    if (booleanAttrs.includes(name)) {
      (el as any)[name] = !!safeValue;
      safeValue ? el.setAttribute(name, "") : el.removeAttribute(name);
    } else {
      if (safeValue == null || safeValue === false) {
        el.removeAttribute(name);
      } else {
        el.setAttribute(name, String(safeValue));
      }
    }
  };

  for (const [key, val] of Object.entries(props)) {
    if (key === "ref") {
      if (isFunc(val)) val(el);
      else if (val && typeof val === "object") (val as { current: any }).current = el;
      continue;
    }

    const isReactive = isFunc(val) && (val as any)[SIGNAL] === true;
    if (key.startsWith("on")) {
      const eventName = key.slice(2).toLowerCase().split(".")[0];
      el.addEventListener(eventName, val);
      (el as any)._cleanups.add(() => el.removeEventListener(eventName, val));
    } else if (isReactive) {
      (el as any)._cleanups.add(effect(() => {
        const currentVal = (val as Signal<any>)();
        if (key === "class") el.className = currentVal || "";
        else updateAttr(key, currentVal);
      }));
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && (key === "value" || key === "checked")) {
        const ev = key === "checked" ? "change" : "input";
        const handler = (e: Event) => (val as Signal<any>)((e.target as any)[key]);
        el.addEventListener(ev, handler);
        (el as any)._cleanups.add(() => el.removeEventListener(ev, handler));
      }
    } else {
      updateAttr(key, val);
    }
  }

  const appendChildNode = (child: any) => {
    if (isArr(child)) return child.forEach(appendChildNode);
    if (isFunc(child) && (child as any)[SIGNAL] !== true) {
      const marker = createText("");
      el.appendChild(marker);
      let currentNodes: Node[] = [];
      (el as any)._cleanups.add(effect(() => {
        const result = child();
        const nextNodes = (isArr(result) ? result : [result]).map((node: any) =>
          node?._isRuntime ? node.container : (node instanceof Node ? node : createText(node))
        );
        if (currentNodes.length === nextNodes.length && currentNodes.every((n, i) => n.nodeType === nextNodes[i].nodeType)) {
          for (let i = 0; i < currentNodes.length; i++) {
            if (currentNodes[i].nodeType === 3 && nextNodes[i].nodeType === 3) {
              currentNodes[i].textContent = (nextNodes[i] as Text).textContent;
            } else if (currentNodes[i] !== nextNodes[i]) {
              currentNodes[i].parentNode?.replaceChild(nextNodes[i], currentNodes[i]);
              cleanupNode(currentNodes[i]);
              currentNodes[i] = nextNodes[i];
            }
          }
        } else {
          currentNodes.forEach(n => { cleanupNode(n); n.remove(); });
          nextNodes.forEach(n => marker.parentNode?.insertBefore(n, marker));
          currentNodes = nextNodes;
        }
      }));
    } else {
      el.appendChild(child instanceof Node ? child : createText(child));
    }
  };

  appendChildNode(children);
  return el;
}

// ========== IF ==========
export function If(
  condition: (() => boolean) | boolean,
  thenVal: any,
  otherwiseVal: any = null,
  transition: Transition | null = null
): HTMLElement {
  const marker = createText("");
  const container = Tag("div", { style: "display:contents" }, [marker]);
  let currentView: Runtime | null = null;
  let lastState: boolean | null = null;

  effect(() => {
    const state = !!(isFunc(condition) ? condition() : condition);
    if (state === lastState) return;
    lastState = state;

    const dispose = () => {
      if (currentView) {
        currentView.destroy();
        currentView = null;
      }
    };

    if (currentView && !state && transition?.out) {
      transition.out(currentView.container, dispose);
    } else {
      dispose();
    }

    const branch = state ? thenVal : otherwiseVal;
    if (branch) {
      currentView = Render(() => isFunc(branch) ? branch() : branch);
      container.insertBefore(currentView.container, marker);
      if (state && transition?.in) transition.in(currentView.container);
    }
  });

  return container;
}

// ========== FOR ==========
export function For<T>(
  source: (() => T[]) | T[],
  renderFn: (item: T, index: number) => any,
  keyFn?: (item: T, index: number) => string | number,
  tag: string = "div",
  props: Record<string, any> = { style: "display:contents" }
): HTMLElement {
  const marker = createText("");
  const container = Tag(tag, props, [marker]);
  let viewCache = new Map<string | number, Runtime | { container: Node; destroy: () => void }>();

  effect(() => {
    const items = (isFunc(source) ? source() : source) || [];
    const nextCache = new Map();
    const order: (string | number)[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = keyFn ? keyFn(item, i) : i;
      let view = viewCache.get(key);

      if (!view) {
        const result = renderFn(item, i);
        view = result instanceof Node
          ? { container: result, destroy: () => { cleanupNode(result); result.remove(); } }
          : Render(() => result);
      }

      viewCache.delete(key);
      nextCache.set(key, view);
      order.push(key);
    }

    viewCache.forEach(v => v.destroy());
    viewCache = nextCache;

    let anchor = marker;
    for (let i = order.length - 1; i >= 0; i--) {
      const view = nextCache.get(order[i]);
      if (view.container.nextSibling !== anchor) {
        container.insertBefore(view.container, anchor);
      }
      anchor = view.container;
    }
  });

  return container;
}

// ========== ROUTER ==========
export const Router = Object.assign(
  (routes: any[]) => {
    const currentPath = $(Router.path());
    window.addEventListener("hashchange", () => currentPath(Router.path()));
    const outlet = Tag("div", { class: "router-outlet" });
    let currentView: Runtime | null = null;

    watch(currentPath, async () => {
      const path = currentPath();
      const route = routes.find(r => {
        const rParts = r.path.split("/").filter(Boolean);
        const pParts = path.split("/").filter(Boolean);
        return rParts.length === pParts.length && rParts.every((part, i) => part.startsWith(":") || part === pParts[i]);
      }) || routes.find(r => r.path === "*");

      if (route) {
        let comp = route.component;
        if (isFunc(comp) && comp.toString().includes('import')) {
          comp = (await comp()).default || (await comp());
        }
        const params: Record<string, string> = {};
        route.path.split("/").filter(Boolean).forEach((part: string, i: number) => {
          if (part.startsWith(":")) params[part.slice(1)] = path.split("/").filter(Boolean)[i];
        });
        Router.params(params);
        if (currentView) currentView.destroy();
        currentView = Render(() => isFunc(comp) ? comp(params) : comp);
        outlet.replaceChildren(currentView.container);
      }
    });
    return outlet;
  },
  {
    params: $({}),
    to: (path: string) => { window.location.hash = path.replace(/^#?\/?/, "#/"); },
    back: () => window.history.back(),
    path: () => window.location.hash.replace(/^#/, "") || "/",
  }
);

// ========== MOUNT ==========
export function Mount(component: Component | (() => any), target: string | HTMLElement): Runtime | undefined {
  const targetEl = typeof target === "string" ? doc.querySelector(target) : target;
  if (!targetEl) return;
  if (MOUNTED_NODES.has(targetEl)) MOUNTED_NODES.get(targetEl)!.destroy();
  const instance = Render(isFunc(component) ? component : () => component);
  targetEl.replaceChildren(instance.container);
  MOUNTED_NODES.set(targetEl, instance);
  return instance;
}

// ========== EXPORTS ==========
const sigPro = { $, $$, effect, watch, Render, Tag, h: Tag, If, For, Router, Mount };

if (typeof window !== "undefined") {
  Object.assign(window, sigPro);
  const tags = "div span p h1 h2 h3 h4 h5 h6 br hr section article aside nav main header footer address ul ol li dl dt dd a em strong small i b u mark time sub sup pre code blockquote details summary dialog form label input textarea select button option fieldset legend table thead tbody tfoot tr th td caption img video audio canvas svg iframe picture source progress meter".split(" ");
  tags.forEach(tag => {
    const helper = tag[0].toUpperCase() + tag.slice(1);
    if (!(helper in window)) (window as any)[helper] = (p?: any, c?: any) => Tag(tag, p, c);
  });
  window.SigPro = Object.freeze(sigPro);
}

export default sigPro;
```

## Cambios principales:

1. **Reemplacé `Watch` por `effect`** (25 líneas, estilo Sigwork)
2. **Añadí `watch` como helper** (12 líneas, con untrack automático)
3. **Misma seguridad de memoria** (scopes anidados, cleanups automáticos)
4. **Misma eficiencia** (queueMicrotask, scheduling)
5. **Todo el resto de SigPro intacto** (Router, For, If, Tag, etc.)

## Uso:

```javascript
// Effect automático (como Sigwork)
effect(() => {
  console.log(count(), user().name, theme());
  // Suscribe a todo lo que lees
});

// Watch específico (con untrack automático)
watch(count, (newVal, oldVal) => {
  console.log(newVal, oldVal);
  // Solo suscribe a count
});

// Router sin re-renders
watch(currentPath, (path) => {
  updateRoute(path); // No causa re-renders del componente padre
});
```