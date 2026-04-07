// SigPro.ts

type CleanupFn = () => void;

interface EffectFn {
  (): void;
  _deps: Set<Set<EffectFn>>;
  _cleanups?: Set<CleanupFn>;
  _deleted?: boolean;
  _isComputed?: boolean;
  _subs?: Set<EffectFn>;
  depth?: number;
  stop?: CleanupFn;
  _dirty?: boolean;
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

let activeEffect: EffectFn | null = null;
let currentOwner: Owner = null;
const effectQueue = new Set<EffectFn>();
let isFlushing = false;
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

const flushEffects = () => {
  if (isFlushing) return;
  isFlushing = true;
  while (effectQueue.size > 0) {
    const sortedEffects = Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0));
    effectQueue.clear();
    for (const effect of sortedEffects) {
      if (!effect._deleted) effect();
    }
  }
  isFlushing = false;
};

const scheduleEffect = (effect: EffectFn) => {
  if (effect._deleted) return;
  effectQueue.add(effect);
  if (!isFlushing) queueMicrotask(flushEffects);
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

export function $<T>(initial: T | (() => T), storageKey?: string): Signal<T> {
  const subscribers = new Set<EffectFn>();

  if (isFunc(initial)) {
    let cachedValue: T;
    let isDirty = true;

    const effect = (() => {
      if (effect._deleted) return;
      effect._deps.forEach(dep => dep.delete(effect));
      effect._deps.clear();

      runWithContext(effect, () => {
        const newValue = (initial as () => T)();
        if (!Object.is(cachedValue, newValue) || isDirty) {
          cachedValue = newValue;
          isDirty = false;
          triggerUpdate(subscribers);
        }
      });
    }) as EffectFn & { stop: CleanupFn };

    assign(effect, {
      _deps: new Set<Set<EffectFn>>(),
      _isComputed: true,
      _subs: subscribers,
      _deleted: false,
      _dirty: false,
      stop: () => {
        effect._deleted = true;
        effect._deps.forEach(dep => dep.delete(effect));
        subscribers.clear();
      },
    });

    if (currentOwner) currentOwner.cleanups.add(effect.stop);

    const signal = ((...args: [] | [T | ((prev: T) => T)]) => {
      if (args.length === 0) {
        if (effect._dirty) effect();
        trackSubscription(subscribers);
        return cachedValue;
      }
      return cachedValue;
    }) as Signal<T>;
    signal[SIGNAL] = true;
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

export function Watch(target: (() => any) | any[], callback?: () => void): CleanupFn {
  const isExplicit = isArr(target);
  const cb = isExplicit ? callback! : (target as () => void);
  if (!isFunc(cb)) return () => { };

  const owner = currentOwner;
  const runner = (() => {
    if (runner._deleted) return;
    runner._deps.forEach(dep => dep.delete(runner));
    runner._deps.clear();
    runner._cleanups?.forEach(clean => clean());
    runner._cleanups?.clear();

    const prevOwner = currentOwner;
    runner.depth = activeEffect ? activeEffect.depth! + 1 : 0;

    runWithContext(runner, () => {
      currentOwner = { cleanups: runner._cleanups ??= new Set() };
      if (isExplicit) {
        runWithContext(null, cb);
        (target as any[]).forEach(dep => isFunc(dep) && dep());
      } else {
        cb();
      }
      currentOwner = prevOwner;
    });
  }) as EffectFn & { _cleanups?: Set<CleanupFn>; stop: CleanupFn };

  assign(runner, {
    _deps: new Set<Set<EffectFn>>(),
    _cleanups: new Set<CleanupFn>(),
    _deleted: false,
    stop: () => {
      if (runner._deleted) return;
      runner._deleted = true;
      effectQueue.delete(runner);
      runner._deps.forEach(dep => dep.delete(runner));
      runner._cleanups?.forEach(clean => clean());
      if (owner) owner.cleanups.delete(runner.stop);
    },
  });

  if (owner) owner.cleanups.add(runner.stop);
  runner();
  return runner.stop;
}

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
      (el as any)._cleanups.add(Watch(() => {
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
      (el as any)._cleanups.add(Watch(() => {
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

  Watch(() => {
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

  Watch(() => {
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

export const Router = Object.assign(
  (routes) => {
    const currentPath = $(Router.path());
    window.addEventListener("hashchange", () => currentPath(Router.path()));
    const outlet = Tag("div", { class: "router-outlet" });
    let currentView = null;

    Watch(currentPath, async () => {
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
        const params = {};
        route.path.split("/").filter(Boolean).forEach((part, i) => {
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
    to: (path) => { window.location.hash = path.replace(/^#?\/?/, "#/"); },
    back: () => window.history.back(),
    path: () => window.location.hash.replace(/^#/, "") || "/",
  }
);

export function Mount(component: Component | (() => any), target: string | HTMLElement): Runtime | undefined {
  const targetEl = typeof target === "string" ? doc.querySelector(target) : target;
  if (!targetEl) return;
  if (MOUNTED_NODES.has(targetEl)) MOUNTED_NODES.get(targetEl)!.destroy();
  const instance = Render(isFunc(component) ? component : () => component);
  targetEl.replaceChildren(instance.container);
  MOUNTED_NODES.set(targetEl, instance);
  return instance;
}

const sigPro = { $, $$, Render, Watch, Tag, h: Tag, If, For, Router, Mount };

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