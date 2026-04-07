type EffectFn = {
    (): void;
    e: Set<Set<EffectFn>>;
    c?: EffectFn[];
    d?: boolean;
};

type Signal<T> = {
    (): T;
    (next: T | ((prev: T) => T)): T;
    react(): T;
};

type CleanupFn = () => void;

let activeEffect: EffectFn | null = null;
let isScheduled = false;
const queue = new Set<EffectFn>();

const tick = (): void => {
    while (queue.size) {
        const runs = [...queue];
        queue.clear();
        runs.forEach(fn => fn());
    }
    isScheduled = false;
};

const schedule = (fn: EffectFn): void => {
    if (fn.d) return;
    queue.add(fn);
    if (!isScheduled) {
        queueMicrotask(tick);
        isScheduled = true;
    }
};

const depend = (subs: Set<EffectFn>): void => {
    if (activeEffect && !activeEffect.c) {
        subs.add(activeEffect);
        activeEffect.e.add(subs);
    }
};

export const effect = (fn: () => any, isScope: boolean = false): CleanupFn => {
    let cleanup: CleanupFn | null = null;
    
    const run = () => {
        if (run.d) return;
        const prev = activeEffect;
        activeEffect = run;
        const result = fn();
        if (typeof result === 'function') cleanup = result;
        activeEffect = prev;
    };
    
    const stop = () => {
        if (run.d) return;
        run.d = true;
        run.e.forEach(subs => subs.delete(run));
        run.e.clear();
        cleanup?.();
        run.c?.forEach(f => f());
    };
    
    run.e = new Set();
    run.d = false;
    if (isScope) run.c = [];
    
    run();
    activeEffect?.c?.push(stop);
    
    return stop;
};

effect.react = <T>(fn: () => T): T => {
    const prev = activeEffect;
    activeEffect = null;
    const result = fn();
    activeEffect = prev;
    return result;
};

export function $<T>(initial: T, storageKey?: string): Signal<T>;
export function $<T>(fn: () => T, storageKey?: string): Signal<T>;
export function $<T>(initial: T | (() => T), storageKey?: string): Signal<T> {
    const isComputed = typeof initial === 'function';
    
    if (!isComputed) {
        let value = initial as T;
        const subs = new Set<EffectFn>();
        
        if (storageKey) {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved !== null) value = JSON.parse(saved);
            } catch { }
        }
        
        const signalFn = ((...args: [] | [T | ((prev: T) => T)]) => {
            if (args.length === 0) {
                return value;
            }
            const next = typeof args[0] === 'function' 
                ? (args[0] as (prev: T) => T)(value) 
                : args[0];
            if (Object.is(value, next)) return value;
            value = next;
            if (storageKey) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(value));
                } catch { }
            }
            subs.forEach(fn => schedule(fn));
            return value;
        }) as Signal<T>;
        
        signalFn.react = () => {
            depend(subs);
            return value;
        };
        
        return signalFn;
    }
    
    let cached: T;
    let dirty = true;
    const subs = new Set<EffectFn>();
    const fn = initial as () => T;
    
    effect(() => {
        const newValue = fn();
        if (!Object.is(cached, newValue) || dirty) {
            cached = newValue;
            dirty = false;
            subs.forEach(fn => schedule(fn));
        }
    });
    
    const computedFn = (() => {
        return cached;
    }) as Signal<T>;
    
    computedFn.react = () => {
        depend(subs);
        return cached;
    };
    
    return computedFn;
}

export const scope = (fn: () => any): CleanupFn => effect(fn, true);

type WatchSource<T> = () => T;

export const watch = <T>(
    source: WatchSource<T>,
    callback: (newValue: T, oldValue: T) => any
): CleanupFn => {
    let first = true;
    let oldValue: T;
    
    return effect(() => {
        const newValue = source();
        if (!first) {
            effect.react(() => callback(newValue, oldValue));
        } else {
            first = false;
        }
        oldValue = newValue;
    });
};

const reactiveCache = new WeakMap<object, object>();

export function $$<T extends object>(obj: T): T {
    if (reactiveCache.has(obj)) {
        return reactiveCache.get(obj) as T;
    }
    
    const subs: Record<string | symbol, Set<EffectFn>> = {};
    
    const proxy = new Proxy(obj, {
        get(target, key: string | symbol, receiver) {
            const subsForKey = subs[key] ??= new Set();
            depend(subsForKey);
            const val = Reflect.get(target, key, receiver);
            return (val && typeof val === 'object') ? $$(val) : val;
        },
        set(target, key: string | symbol, val, receiver) {
            if (Object.is(target[key as keyof T], val)) return true;
            const success = Reflect.set(target, key, val, receiver);
            if (subs[key]) {
                subs[key].forEach(fn => schedule(fn));
                if (!isScheduled) {
                    queueMicrotask(tick);
                    isScheduled = true;
                }
            }
            return success;
        }
    });
    
    reactiveCache.set(obj, proxy);
    return proxy;
}

type Context = {
    m: CleanupFn[];
    u: CleanupFn[];
    p: Record<string | symbol, any>;
};

let context: Context | null = null;

export const onMount = (fn: CleanupFn): void => {
    context?.m.push(fn);
};

export const onUnmount = (fn: CleanupFn): void => {
    context?.u.push(fn);
};

export const provide = (key: string | symbol, value: any): void => {
    if (context) context.p[key] = value;
};

export const inject = (key: string | symbol, defaultValue?: any): any => {
    if (context && key in context.p) return context.p[key];
    return defaultValue;
};

type Component<P = Record<string, any>> = (
    props: P,
    ctx: { children?: any[]; emit: (event: string, ...args: any[]) => any }
) => any;

type ElementWithLifecycle = Node & {
    $c?: Context;
    $s?: CleanupFn;
    $l?: (done: CleanupFn) => void;
};

const isFn = (v: unknown): v is Function => typeof v === 'function';
const isNode = (v: unknown): v is Node => v instanceof Node;

const append = (parent: Node, child: any): void => {
    if (child === null) return;
    
    if (isFn(child)) {
        const anchor = document.createTextNode('');
        parent.appendChild(anchor);
        let nodes: Node[] = [];
        
        effect(() => {
            effect(() => {
                const newNodes = [child()]
                    .flat(Infinity)
                    .map((node: any) => isFn(node) ? node() : node)
                    .flat(Infinity)
                    .filter((node: any) => node !== null)
                    .map((node: any) => isNode(node) ? node : document.createTextNode(String(node)));
                
                const oldNodes = nodes.filter(node => {
                    const keep = newNodes.includes(node);
                    if (!keep) remove(node);
                    return keep;
                });
                
                const oldIdxs = new Map(oldNodes.map((node, i) => [node, i]));
                
                for (let i = newNodes.length - 1, p = oldNodes.length - 1; i >= 0; i--) {
                    const node = newNodes[i];
                    const ref = newNodes[i + 1] || anchor;
                    
                    if (!oldIdxs.has(node)) {
                        anchor.parentNode?.insertBefore(node, ref);
                        (node as ElementWithLifecycle).$c?.m.forEach(fn => fn());
                    } else if (oldNodes[p] !== node) {
                        if (newNodes[i - 1] !== oldNodes[p]) {
                            anchor.parentNode?.insertBefore(oldNodes[p], node);
                            oldNodes[oldIdxs.get(node)!] = oldNodes[p];
                            oldNodes[p] = node;
                            p--;
                        }
                        anchor.parentNode?.insertBefore(node, ref);
                    } else {
                        p--;
                    }
                }
                nodes = newNodes;
            });
        }, true);
    } else if (isNode(child)) {
        parent.appendChild(child);
    } else {
        parent.appendChild(document.createTextNode(String(child)));
    }
};

const remove = (node: Node): void => {
    const el = node as ElementWithLifecycle;
    el.$s?.();
    el.$l?.(() => node.remove());
    if (!el.$l) node.remove();
};

const render = (fn: Function, ...data: any[]): Node => {
    let node: any;
    const stop = effect(() => {
        node = fn(...data);
        if (isFn(node)) node = node();
    }, true);
    if (node) node.$s = stop;
    return node;
};

export const h = (tag: any, props?: any, ...children: any[]): any => {
    props = props || {};
    children = children.flat(Infinity);
    
    if (isFn(tag)) {
        const prev = context;
        context = { m: [], u: [], p: { ...(prev?.p || {}) } };
        let el: any;
        
        const stop = effect(() => {
            el = tag(props, {
                children,
                emit: (evt: string, ...args: any[]) => 
                    props[`on${evt[0].toUpperCase()}${evt.slice(1)}`]?.(...args),
            });
            return () => el.$c.u.forEach((fn: CleanupFn) => fn());
        }, true);
        
        if (isNode(el) || isFn(el)) {
            el.$c = context;
            el.$s = stop;
        }
        
        context = prev;
        return el;
    }
    
    if (!tag) return () => children;
    
    let el: ElementWithLifecycle;
    let is_svg = false;
    
    try {
        el = document.createElement(tag);
        if (el instanceof HTMLUnknownElement) {
            is_svg = true;
            el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        }
    } catch {
        is_svg = true;
        el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    }
    
    for (const key in props) {
        if (key.startsWith('on')) {
            const eventName = key.slice(2).toLowerCase();
            el.addEventListener(eventName, props[key]);
        } else if (key === "ref") {
            if (isFn(props[key])) {
                props[key](el);
            } else {
                props[key].value = el;
            }
        } else if (isFn(props[key])) {
            effect(() => {
                if (key in el && !is_svg) {
                    (el as any)[key] = props[key]();
                } else {
                    el.setAttribute(key, props[key]());
                }
            });
        } else {
            if (key in el && !is_svg) {
                (el as any)[key] = props[key];
            } else {
                el.setAttribute(key, props[key]);
            }
        }
    }
    
    children.forEach((child: any) => append(el, child));
    
    return el;
};

export const If = (
    cond: (() => boolean) | boolean,
    renderFn: any,
    fallback: any = null
): (() => any) => {
    let cached: any;
    let current: boolean | null = null;
    
    return () => {
        const show = isFn(cond) ? cond() : cond;
        if (show !== current) {
            cached = show ? render(renderFn) : (isFn(fallback) ? render(fallback) : fallback);
        }
        current = show;
        return cached;
    };
};

export const For = <T>(
    list: (() => T[]) | T[] | { value: T[] },
    key: string | ((item: T, index: number) => string | number),
    renderFn: (item: T, index: number) => any
): (() => any[]) => {
    let cache = new Map<string | number, any>();
    
    return () => {
        const next = new Map();
        const items = (isFn(list) ? list() : (list as any).value || list) as T[];
        
        const nodes = items.map((item, index) => {
            const idx = isFn(key) ? key(item, index) : key ? (item as any)[key] : index;
            let node = cache.get(idx);
            if (!node) {
                node = render(renderFn, item, index);
            }
            next.set(idx, node);
            return node;
        });
        
        cache = next;
        return nodes;
    };
};

type TransitionClasses = [string, string, string];

type TransitionConfig = {
    enter?: TransitionClasses;
    idle?: string;
    leave?: TransitionClasses;
};

export const Transition = (
    { enter: e, idle, leave: l }: TransitionConfig,
    { children: [c] }: { children: any[] }
): any => {
    const decorate = (el: any): any => {
        if (!isNode(el)) return el;
        
        const addClass = (c?: string) => c && (el as HTMLElement).classList.add(...c.split(' '));
        const removeClass = (c?: string) => c && (el as HTMLElement).classList.remove(...c.split(' '));
        
        if (e) {
            requestAnimationFrame(() => {
                addClass(e[1]);
                requestAnimationFrame(() => {
                    addClass(e[0]);
                    removeClass(e[1]);
                    addClass(e[2]);
                    el.addEventListener('transitionend', () => {
                        removeClass(e[2]);
                        removeClass(e[0]);
                        addClass(idle);
                    }, { once: true });
                });
            });
        }
        
        if (l) {
            (el as ElementWithLifecycle).$l = (done: CleanupFn) => {
                removeClass(idle);
                addClass(l[1]);
                requestAnimationFrame(() => {
                    addClass(l[0]);
                    removeClass(l[1]);
                    addClass(l[2]);
                    el.addEventListener('transitionend', () => {
                        removeClass(l[2]);
                        removeClass(l[0]);
                        done();
                    }, { once: true });
                });
            };
        }
        
        return el;
    };
    
    if (!c) return null;
    if (isFn(c)) {
        return () => decorate(c());
    }
    return decorate(c);
};

type Route = {
    path: string;
    component: Component | (() => Promise<Component>);
};

export const Router = (routes: Route[]) => {
    const getPath = () => window.location.hash.replace(/^#/, "") || "/";
    const currentPath = $(getPath());
    
    const params = $<Record<string, string>>({});
    
    const update = () => {
        currentPath(getPath());
    };
    
    window.addEventListener("hashchange", update);
    
    const outlet = h("div", { class: "router-outlet" });
    let currentView: Node | null = null;
    let currentCleanup: CleanupFn | null = null;
    
    const loadComponent = async (route: Route) => {
        let comp = route.component;
        if (typeof comp === "function" && comp.toString().includes("import")) {
            const mod = await (comp as () => Promise<any>)();
            comp = mod.default || mod;
        }
        return comp as Component;
    };
    
    const matchRoute = (path: string): { route: Route; params: Record<string, string> } | null => {
        for (const route of routes) {
            const routeParts = route.path.split("/").filter(Boolean);
            const pathParts = path.split("/").filter(Boolean);
            if (routeParts.length !== pathParts.length) continue;
            const matchedParams: Record<string, string> = {};
            let match = true;
            for (let i = 0; i < routeParts.length; i++) {
                if (routeParts[i].startsWith(":")) {
                    matchedParams[routeParts[i].slice(1)] = pathParts[i];
                } else if (routeParts[i] !== pathParts[i]) {
                    match = false;
                    break;
                }
            }
            if (match) return { route, params: matchedParams };
        }
        return null;
    };
    
    effect(() => {
        const path = currentPath();
        const matched = matchRoute(path);
        if (!matched) return;
        
        const { route, params: routeParams } = matched;
        params(routeParams);
        
        const load = async () => {
            if (currentCleanup) {
                currentCleanup();
                currentCleanup = null;
            }
            if (currentView && currentView.parentNode) {
                remove(currentView);
                currentView = null;
            }
            const Comp = await loadComponent(route);
            const instance = h(Comp, routeParams);
            if (isNode(instance)) {
                currentView = instance;
                outlet.appendChild(instance);
                if ((instance as ElementWithLifecycle).$c) {
                    currentCleanup = () => {
                        (instance as ElementWithLifecycle).$s?.();
                        if (instance.parentNode) remove(instance);
                    };
                } else {
                    currentCleanup = () => {
                        if (instance.parentNode) remove(instance);
                    };
                }
            }
        };
        load();
    });
    
    return outlet;
};

Router.to = (path: string) => {
    window.location.hash = path.replace(/^#?\/?/, "#/");
};

Router.back = () => {
    window.history.back();
};

Router.params = (() => {
    const p = $<Record<string, string>>({});
    return p;
})();

export const mount = (
    component: Component,
    target: string | HTMLElement,
    props?: Record<string, any>
): CleanupFn => {
    const targetEl = typeof target === "string" ? document.querySelector(target) : target;
    if (!targetEl) throw new Error("Target element not found");
    const el = h(component, props);
    targetEl.appendChild(el);
    (el as ElementWithLifecycle).$c?.m.forEach(fn => fn());
    return () => remove(el);
};

export default (
    target: HTMLElement,
    root: Component,
    props?: Record<string, any>
): CleanupFn => {
    const el = h(root, props);
    target.appendChild(el);
    (el as ElementWithLifecycle).$c?.m.forEach(fn => fn());
    return () => remove(el);
};

export type { Signal, Component, CleanupFn };
