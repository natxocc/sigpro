// SigPro.ts - Versión simplificada (sin If/For) y tipada

type EffectFn = {
  (): void;
  _deps: Set<Set<EffectFn>>;
  _deleted?: boolean;
  _isComputed?: boolean;
  _subs?: Set<EffectFn>;
  depth?: number;
  stop?: () => void;
  _cleanups?: Set<() => void>;
};

type Owner = { cleanups: Set<() => void> } | null;

type Signal<T> = {
  (): T;
  (next: T | ((prev: T) => T)): T;
  _isSignal?: boolean;
};

type ComputedSignal<T> = Signal<T> & { stop: () => void };

type Runtime = {
  _isRuntime: true;
  container: HTMLElement;
  destroy: () => void;
};

type Component = (props?: Record<string, any>, children?: any[]) => any;

type TagFunction = (props?: any, children?: any) => HTMLElement;

// --- Estado interno ---
let activeEffect: EffectFn | null = null;
let currentOwner: Owner = null;
const effectQueue = new Set<EffectFn>();
let isFlushing = false;
const MOUNTED_NODES = new WeakMap<Element, Runtime>();

// --- Helpers ---
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
    (node as any)._cleanups.forEach((dispose: () => void) => dispose());
    (node as any)._cleanups.clear();
  }
  node.childNodes?.forEach(cleanupNode);
};

const flushEffects = () => {
  if (isFlushing) return;
  isFlushing = true;
  while (effectQueue.size) {
    const sorted = Array.from(effectQueue).sort((a, b) => (a.depth || 0) - (b.depth || 0));
    effectQueue.clear();
    for (const eff of sorted) {
      if (!eff._deleted) eff();
    }
  }
  isFlushing = false;
};

const trackSubscription = (subscribers: Set<EffectFn>) => {
  if (activeEffect && !activeEffect._deleted) {
    subscribers.add(activeEffect);
    activeEffect._deps.add(subscribers);
  }
};

const triggerUpdate = (subscribers: Set<EffectFn>) => {
  subscribers.forEach(effect => {
    if (effect === activeEffect || effect._deleted) return;
    if (effect._isComputed) {
      (effect as any).markDirty?.();
      if (effect._subs) triggerUpdate(effect._subs);
    } else {
      effectQueue.add(effect);
    }
  });
  if (!isFlushing) queueMicrotask(flushEffects);
};

// --- API pública ---

/**
 * Crea una señal reactiva o un valor computado.
 * @param initial - Valor inicial o función computada
 * @param storageKey - Opcional, persistencia en localStorage
 */
export function $<T>(initial: T | (() => T), storageKey?: string): Signal<T> {
  const subscribers = new Set<EffectFn>();

  if (isFunc(initial)) {
    // Computado
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
    }) as EffectFn & { markDirty: () => void; stop: () => void };

    assign(effect, {
      _deps: new Set<Set<EffectFn>>(),
      _isComputed: true,
      _subs: subscribers,
      _deleted: false,
      markDirty: () => { isDirty = true; },
      stop: () => {
        effect._deleted = true;
        effect._deps.forEach(dep => dep.delete(effect));
        subscribers.clear();
      }
    });

    if (currentOwner) currentOwner.cleanups.add(effect.stop);

    const signal = ((...args: [] | [T | ((prev: T) => T)]) => {
      if (args.length === 0) {
        if (isDirty) effect();
        trackSubscription(subscribers);
        return cachedValue;
      } else {
        // Los computados no tienen setter
        return cachedValue;
      }
    }) as Signal<T>;
    signal._isSignal = true;
    return signal;
  }

  // Señal normal
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
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(value));
        triggerUpdate(subscribers);
      }
    }
    trackSubscription(subscribers);
    return value;
  }) as Signal<T>;
  signal._isSignal = true;
  return signal;
}

/**
 * Convierte un objeto en un proxy reactivo profundo.
 */
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
    }
  });

  cache.set(object, proxy);
  return proxy;
}

/**
 * Ejecuta un efecto que se re-ejecuta cuando sus dependencias cambian.
 * @param target - Función o array de señales/dependencias
 * @param callback - Si target es array, callback a ejecutar
 */
export function Watch(target: (() => any) | any[], callback?: () => void): () => void {
  const isExplicit = isArr(target);
  const cb = isExplicit ? callback! : (target as () => void);
  if (!isFunc(cb)) return () => {};

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
  }) as EffectFn & { _cleanups?: Set<() => void>; stop: () => void };

  assign(runner, {
    _deps: new Set<Set<EffectFn>>(),
    _cleanups: new Set<() => void>(),
    _deleted: false,
    stop: () => {
      if (runner._deleted) return;
      runner._deleted = true;
      effectQueue.delete(runner);
      runner._deps.forEach(dep => dep.delete(runner));
      runner._cleanups?.forEach(clean => clean());
      if (owner) owner.cleanups.delete(runner.stop);
    }
  });

  if (owner) owner.cleanups.add(runner.stop);
  runner();
  return runner.stop;
}

/**
 * Renderiza un componente reactivo con ciclo de vida.
 */
export function Render(renderFn: (ctx: { onCleanup: (fn: () => void) => void }) => any): Runtime {
  const cleanups = new Set<() => void>();
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
    }
  };
}

/**
 * Crea un elemento DOM con atributos e hijos reactivos.
 */
export function Tag(tag: string, props: any = {}, children: any = []): HTMLElement {
  if (props instanceof Node || isArr(props) || !isObj(props)) {
    children = props;
    props = {};
  }

  const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
  const el = isSVG
    ? doc.createElementNS("http://www.w3.org/2000/svg", tag)
    : createEl(tag) as HTMLElement;

  (el as any)._cleanups = new Set<() => void>();
  (el as any).onUnmount = (fn: () => void) => (el as any)._cleanups.add(fn);

  const booleanAttrs = ["disabled", "checked", "required", "readonly", "selected", "multiple", "autofocus"];

  const updateAttr = (name: string, value: any) => {
    const safe = (name === 'src' || name === 'href') && String(value).includes('javascript:') ? '#' : value;
    if (booleanAttrs.includes(name)) {
      (el as any)[name] = !!safe;
      safe ? el.setAttribute(name, "") : el.removeAttribute(name);
    } else {
      safe == null ? el.removeAttribute(name) : el.setAttribute(name, String(safe));
    }
  };

  for (const [key, val] of Object.entries(props)) {
    if (key === "ref") {
      if (isFunc(val)) val(el);
      else if (val && typeof val === "object") (val as { current: any }).current = el;
      continue;
    }

    const isReactive = isFunc(val) && (val as any)._isSignal === true;
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
    if (isFunc(child) && (child as any)._isSignal !== true) {
      const marker = createText("");
      el.appendChild(marker);
      let currentNodes: Node[] = [];
      (el as any)._cleanups.add(Watch(() => {
        const result = child();
        const nextNodes = (isArr(result) ? result : [result]).map((node: any) =>
          node?._isRuntime ? node.container : (node instanceof Node ? node : createText(node))
        );
        currentNodes.forEach(n => { cleanupNode(n); n.remove(); });
        nextNodes.forEach(n => marker.parentNode?.insertBefore(n, marker));
        currentNodes = nextNodes;
      }));
    } else {
      el.appendChild(child instanceof Node ? child : createText(child));
    }
  };

  appendChildNode(children);
  return el;
}

// --- Router simple ---
export const Router = {
  params: $({} as Record<string, string>),
  to: (path: string) => { window.location.hash = path.replace(/^#?\/?/, "#/"); },
  back: () => window.history.back(),
  path: () => window.location.hash.replace(/^#/, "") || "/",
  outlet: (routes: Array<{ path: string; component: Component }>) => {
    const currentPath = $(Router.path());
    window.addEventListener("hashchange", () => currentPath(Router.path()));
    const outlet = Tag("div", { class: "router-outlet" });
    let currentView: Runtime | null = null;

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
          comp = (await (comp as any)()).default || (await (comp as any)());
        }
        const params: Record<string, string> = {};
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
  }
};

/**
 * Monta un componente en el DOM, limpiando montajes previos.
 */
export function Mount(component: Component | (() => any), target: string | HTMLElement): Runtime | undefined {
  const targetEl = typeof target === "string" ? doc.querySelector(target) : target;
  if (!targetEl) return;
  if (MOUNTED_NODES.has(targetEl)) MOUNTED_NODES.get(targetEl)!.destroy();
  const instance = Render(isFunc(component) ? component : () => component);
  targetEl.replaceChildren(instance.container);
  MOUNTED_NODES.set(targetEl, instance);
  return instance;
}

// --- Registro automático de tags JSX y exportación global ---
const sigPro = { $, $$, Render, Watch, Tag, Router, Mount };
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