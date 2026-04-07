/*
 *  Sigwork - [Sig]nal-based Frontend Frame[work]
 *  Copyright (c) 2026 Murillo Brandão <@murillobrand>
 *  TypeScript version
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

type CleanupFn = () => void;
type EffectFn = {
    (): void;
    e: Set<Set<EffectFn>>;
    c?: EffectFn[];
};

type Context = {
    m: CleanupFn[];
    u: CleanupFn[];
    p: Record<string | symbol, any>;
};

type Signal<T> = {
    get value(): T;
    set value(newValue: T);
};

type ReadonlySignal<T> = {
    get value(): T;
};

type Component<P = Record<string, any>> = (
    props: P,
    context: {
        children?: any[];
        emit: (event: string, ...args: any[]) => any;
    }
) => Node | (() => Node) | null;

type TransitionClasses = [string, string, string];

type TransitionConfig = {
    enter?: TransitionClasses;
    idle?: string;
    leave?: TransitionClasses;
};

type ElementWithLifecycle = Node & {
    $c?: Context;
    $s?: CleanupFn;
    $l?: (done: CleanupFn) => void;
};

// ============================================================================
// Helpers
// ============================================================================

const isFn = (v: unknown): v is Function => typeof v === 'function';
const isNode = (v: unknown): v is Node => v instanceof Node;

// ============================================================================
// Signals System
// ============================================================================

/*----- Schedule System -----*/
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
    queue.add(fn);
    if (!isScheduled) {
        queueMicrotask(tick);
        isScheduled = true;
    }
};

/*----- Effects -----*/
let activeEffect: EffectFn | null = null;

export const effect = (fn: () => any, isScope: boolean = false): CleanupFn => {
    let cleanup: CleanupFn | null = null;
    
    const run = () => {
        stop();
        const prev = activeEffect;
        activeEffect = run;
        const result = fn();
        if (isFn(result)) cleanup = result;
        activeEffect = prev;
    };
    
    const stop = () => {
        run.e.forEach(subs => subs.delete(run));
        run.e.clear();
        if (cleanup) cleanup();
        run.c?.forEach(f => f());
    };
    
    (run as EffectFn).e = new Set();
    if (isScope) (run as EffectFn).c = [];
    
    run();
    
    if (activeEffect?.c) {
        activeEffect.c.push(stop);
    }
    
    return stop;
};

export const scope = (fn: () => any): CleanupFn => effect(fn, true);

const track = (subs: Set<EffectFn>): void => {
    if (activeEffect && !activeEffect.c) {
        subs.add(activeEffect);
        activeEffect.e.add(subs);
    }
};

/*----- Signals -----*/
export function signal<T>(): Signal<T | undefined>;
export function signal<T>(initial: T): Signal<T>;
export function signal<T>(initial?: T): Signal<T | undefined> {
    let value = initial;
    const subs = new Set<EffectFn>();
    
    return {
        get value() {
            track(subs);
            return value;
        },
        set value(newValue: T | undefined) {
            if (newValue === value) return;
            value = newValue;
            subs.forEach(fn => schedule(fn));
        }
    };
}

export const untrack = <T>(fn: () => T): T => {
    const prev = activeEffect;
    activeEffect = null;
    const result = fn();
    activeEffect = prev;
    return result;
};

export const computed = <T>(fn: () => T): ReadonlySignal<T> => {
    const sig = signal<T>();
    effect(() => {
        sig.value = fn();
    });
    return {
        get value() {
            return sig.value;
        }
    };
};

const reactiveCache = new WeakMap<object, object>();

export const reactive = <T extends object>(obj: T): T => {
    if (reactiveCache.has(obj)) {
        return reactiveCache.get(obj) as T;
    }
    
    const subs: Record<string | symbol, Set<EffectFn>> = {};
    
    const proxy = new Proxy(obj, {
        get(target, key: string | symbol, receiver) {
            track(subs[key] ??= new Set());
            const val = Reflect.get(target, key, receiver);
            return (val && typeof val === 'object') ? reactive(val) : val;
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
};

type WatchSource<T> = (() => T) | { value: T };

export const watch = <T>(
    source: WatchSource<T>,
    callback: (newValue: T, oldValue: T) => any
): CleanupFn => {
    let first = true;
    let oldValue: T;
    
    return effect(() => {
        const newValue = isFn(source) ? source() : source.value;
        if (!first) {
            untrack(() => callback(newValue, oldValue));
        } else {
            first = false;
        }
        oldValue = newValue;
    });
};

// ============================================================================
// Rendering System
// ============================================================================

// Component management
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

// Rendering
type HFunction = {
    <P extends Record<string, any>>(
        tag: string,
        props?: P | null,
        ...children: any[]
    ): ElementWithLifecycle;
    
    <P extends Record<string, any>>(
        tag: Component<P>,
        props?: P | null,
        ...children: any[]
    ): Node | (() => Node) | null;
};

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

export const h: HFunction = (tag: any, props?: any, ...children: any[]): any => {
    props = props || {};
    children = children.flat(Infinity);
    
    // Component handling
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
    
    // Handle fragments (null tag)
    if (!tag) return () => children;
    
    // Normal element handling
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

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Built-in Components
// ============================================================================

type ComponentProps = {
    is: string | Component | (() => string | Component);
    [key: string]: any;
};

export const Component = (
    { is, ...props }: ComponentProps,
    { children }: { children: any[] }
): (() => any) => {
    return () => h(
        isFn(is) ? is() : is,
        props,
        children
    );
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

// ============================================================================
// App Creation
// ============================================================================

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

// ============================================================================
// Re-exports
// ============================================================================

export type { Signal, ReadonlySignal, Component, CleanupFn };