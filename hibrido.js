type EffectFn = () => void;
type CleanupFn = () => void;

let currentEffect: EffectFn | null = null;
const effectStack: EffectFn[] = [];

let pendingBatch = false;
const batchQueue = new Set < EffectFn > ();

function flushBatch() {
    const effects = Array.from(batchQueue);
    batchQueue.clear();
    pendingBatch = false;
    effects.forEach(e => e());
}

function scheduleEffect(effect: EffectFn) {
    batchQueue.add(effect);
    if (!pendingBatch) {
        pendingBatch = true;
        queueMicrotask(flushBatch);
    }
}

function cleanupEffect(effect: EffectFn & { deps: Set<Set<EffectFn>> }) {
    effect.deps.forEach(dep => dep.delete(effect));
    effect.deps.clear();
}

export interface Signal<T> {
    (): T;
    (value: T | ((prev: T) => T)): T;
    _subs: Set<EffectFn & { deps: Set<Set<EffectFn>> }>;
    _value: T;
    _storageKey?: string;
}

function isFunction<T>(v: any): v is (...args: any[]) => T {
    return typeof v === 'function';
}

export function $<T>(initialValue: T, storageKey?: string): Signal<T> {
    let value: T = initialValue;
    const subs = new Set < EffectFn & { deps: Set < Set < EffectFn >> } > ();

    if (storageKey) {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved !== null) value = JSON.parse(saved);
        } catch (e) { console.warn("Storage error", e); }
    }

    const signal = ((arg?: T | ((prev: T) => T)): T => {
        if (arguments.length === 0) {
            if (currentEffect) {
                subs.add(currentEffect as any);
                (currentEffect as any).deps.add(subs);
            }
            return value;
        } else {
            const next = isFunction(arg) ? (arg as (prev: T) => T)(value) : arg;
            if (Object.is(value, next)) return value;
            value = next as T;
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(value));
            for (const eff of Array.from(subs)) {
                if (eff && !eff._deleted) scheduleEffect(eff);
            }
            return value;
        }
    }) as Signal<T>;
    signal._subs = subs;
    signal._value = initialValue;
    if (storageKey) signal._storageKey = storageKey;
    return signal;
}

export function Watch(effectFn: () => void, deps?: Array<() => any>): () => void {
    const runner = (() => {
        if (runner._deleted) return;
        cleanupEffect(runner);
        effectStack.push(runner);
        const prev = currentEffect;
        currentEffect = runner;
        try {
            effectFn();
        } finally {
            currentEffect = prev;
            effectStack.pop();
        }
    }) as EffectFn & { deps: Set<Set<EffectFn>>; _deleted?: boolean; _cleanups?: Set<() => void> };

    runner.deps = new Set();
    runner._deleted = false;

    runner();

    return () => {
        runner._deleted = true;
        cleanupEffect(runner);
        if (runner._cleanups) runner._cleanups.forEach(fn => fn());
    };
}

export function computed<T>(fn: () => T): Signal<T> {
    const sig = $(undefined as T);
    let isDirty = true;
    let cached: T;
    const stop = Watch(() => {
        const newVal = fn();
        if (isDirty || !Object.is(cached, newVal)) {
            cached = newVal;
            isDirty = false;
            sig(cached);
        }
    });
    (sig as any)._stop = stop;
    return sig;
}

const proxyCache = new WeakMap < object, any> ();

export function $$<T extends object>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (proxyCache.has(obj)) return proxyCache.get(obj);

    const listeners = new Map < string | symbol, Set<EffectFn & { deps: Set < Set < EffectFn >> } >> ();

    const proxy = new Proxy(obj, {
        get(target, p, receiver) {
            if (currentEffect) {
                let set = listeners.get(p);
                if (!set) {
                    set = new Set();
                    listeners.set(p, set);
                }
                set.add(currentEffect as any);
                (currentEffect as any).deps.add(set);
            }
            const val = Reflect.get(target, p, receiver);
            if (typeof val === 'object' && val !== null) return $$(val);
            return val;
        },
        set(target, p, value, receiver) {
            const old = Reflect.get(target, p, receiver);
            if (Object.is(old, value)) return true;
            const res = Reflect.set(target, p, value, receiver);
            const set = listeners.get(p);
            if (set) {
                for (const eff of Array.from(set)) {
                    if (!eff._deleted) scheduleEffect(eff);
                }
            }
            return res;
        },
        deleteProperty(target, p) {
            const had = Reflect.has(target, p);
            const res = Reflect.deleteProperty(target, p);
            if (had && res) {
                const set = listeners.get(p);
                if (set) {
                    for (const eff of Array.from(set)) scheduleEffect(eff);
                }
            }
            return res;
        }
    });
    proxyCache.set(obj, proxy);
    return proxy;
}

let currentOwner: { cleanups: Set<CleanupFn> } | null = null;

function runWithOwner<T>(owner: { cleanups: Set<CleanupFn> }, fn: () => T): T {
    const prev = currentOwner;
    currentOwner = owner;
    try {
        return fn();
    } finally {
        currentOwner = prev;
    }
}

function addCleanup(fn: CleanupFn) {
    if (currentOwner) currentOwner.cleanups.add(fn);
}

export interface Runtime {
    container: HTMLElement | DocumentFragment;
    destroy: () => void;
}

export function Render(renderFn: (ctx: { onCleanup: (fn: CleanupFn) => void }) => any): Runtime {
    const cleanups = new Set < CleanupFn > ();
    const container = document.createElement('div');
    container.style.display = 'contents';
    let currentNodes: Node[] = [];

    const processResult = (result: any): Node[] => {
        if (result == null) return [];
        if (Array.isArray(result)) {
            return result.flatMap(processResult);
        }
        if (result._isRuntime) {
            cleanups.add(result.destroy);
            return [result.container];
        }
        if (result instanceof Node) return [result];
        return [document.createTextNode(String(result))];
    };

    const render = () => {
        for (const node of currentNodes) {
            cleanupNode(node);
            node.remove();
        }
        currentNodes = [];
        let result: any;
        runWithOwner({ cleanups }, () => {
            result = renderFn({ onCleanup: addCleanup });
        });
        currentNodes = processResult(result);
        container.append(...currentNodes);
    };

    render();

    return {
        _isRuntime: true,
        container,
        destroy: () => {
            cleanups.forEach(fn => fn());
            for (const node of currentNodes) cleanupNode(node);
            container.remove();
        }
    };
}

function cleanupNode(node: Node) {
    if ((node as any)._cleanups) {
        (node as any)._cleanups.forEach((fn: CleanupFn) => fn());
        (node as any)._cleanups.clear();
    }
    node.childNodes.forEach(child => cleanupNode(child));
}

const booleanAttributes = new Set(["disabled", "checked", "required", "readonly", "selected", "multiple", "autofocus"]);

function sanitizeURL(url: string): string {
    const s = String(url).toLowerCase();
    if (s.includes('javascript:')) return '#';
    return url;
}

export function Tag(tag: string, propsOrChildren?: any, children?: any): HTMLElement {
    let props: Record<string, any> = {};
    let childArray: any[] = [];

    if (propsOrChildren === undefined || propsOrChildren instanceof Node || Array.isArray(propsOrChildren) || typeof propsOrChildren !== 'object') {
        childArray = propsOrChildren ?? [];
    } else {
        props = propsOrChildren;
        childArray = children ?? [];
    }

    const isSVG = /^(svg|path|circle|rect|line|polyline|polygon|g|defs|text|tspan|use)$/.test(tag);
    const el = isSVG
        ? document.createElementNS("http://www.w3.org/2000/svg", tag)
        : document.createElement(tag);

    const cleanups = new Set < CleanupFn > ();
    (el as any)._cleanups = cleanups;

    const updateAttribute = (name: string, value: any) => {
        if (name === 'href' || name === 'src') {
            value = sanitizeURL(value);
        }
        if (booleanAttributes.has(name)) {
            const bool = !!value;
            if (bool) el.setAttribute(name, '');
            else el.removeAttribute(name);
            (el as any)[name] = bool;
        } else if (value === undefined || value === null) {
            el.removeAttribute(name);
        } else {
            el.setAttribute(name, String(value));
        }
    };

    for (const [key, val] of Object.entries(props)) {
        if (key === 'ref') {
            if (typeof val === 'function') val(el);
            else if (val && typeof val === 'object') val.current = el;
            continue;
        }
        if (key.startsWith('on')) {
            const eventName = key.slice(2).toLowerCase();
            const handler = val;
            el.addEventListener(eventName, handler);
            cleanups.add(() => el.removeEventListener(eventName, handler));
            continue;
        }
        if ((tag === 'input' || tag === 'textarea' || tag === 'select') &&
            (key === 'value' || key === 'checked') &&
            typeof val === 'function' && (val as any)._subs) {
            const eventType = key === 'checked' ? 'change' : 'input';
            const handler = (e: Event) => {
                const target = e.target as HTMLInputElement;
                const newValue = key === 'checked' ? target.checked : target.value;
                (val as Signal<any>)(newValue);
            };
            el.addEventListener(eventType, handler);
            cleanups.add(() => el.removeEventListener(eventType, handler));
        }
        if (typeof val === 'function' && !(val as any)._isSignal) {
            if ((val as any)._subs) {
                const dispose = Watch(() => {
                    const current = val();
                    if (key === 'class') {
                        el.className = current || '';
                    } else if (key === 'style' && typeof current === 'object') {
                        Object.assign(el.style, current);
                    } else {
                        updateAttribute(key, current);
                    }
                });
                cleanups.add(dispose);
                const init = val();
                if (key === 'class') el.className = init || '';
                else if (key === 'style' && typeof init === 'object') Object.assign(el.style, init);
                else updateAttribute(key, init);
            } else {
                updateAttribute(key, val);
            }
        } else {
            updateAttribute(key, val);
        }
    }

    const appendChildNode = (child: any) => {
        if (child == null || child === false || child === true) return;
        if (Array.isArray(child)) {
            child.forEach(appendChildNode);
            return;
        }
        if (typeof child === 'function' && (child as any)._subs) {
            const marker = document.createComment('sig');
            el.appendChild(marker);
            let currentNodes: Node[] = [];
            const dispose = Watch(() => {
                const value = child();
                const newNodes: Node[] = [];
                const process = (v: any) => {
                    if (v == null) return;
                    if (Array.isArray(v)) v.forEach(process);
                    else if (v._isRuntime) {
                        newNodes.push(v.container);
                        cleanups.add(v.destroy);
                    } else if (v instanceof Node) newNodes.push(v);
                    else newNodes.push(document.createTextNode(String(v)));
                };
                process(value);
                for (const n of currentNodes) {
                    cleanupNode(n);
                    n.remove();
                }
                for (const n of newNodes) {
                    marker.parentNode?.insertBefore(n, marker);
                }
                currentNodes = newNodes;
            });
            cleanups.add(dispose);
        } else if (child && child._isRuntime) {
            el.appendChild(child.container);
            cleanups.add(child.destroy);
        } else if (child instanceof Node) {
            el.appendChild(child);
        } else {
            el.appendChild(document.createTextNode(String(child)));
        }
    };

    appendChildNode(childArray);
    return el;
}

export const Router = {
    params: $({} as Record<string, string>),
    currentPath: $('/'),
    routes: [] as Array<{ path: string; component: any }>,

    init(routes: Array<{ path: string; component: any }>) {
        this.routes = routes;
        const update = () => {
            const hash = window.location.hash.slice(1) || '/';
            this.currentPath(hash);
        };
        window.addEventListener('hashchange', update);
        update();
        return this.outlet();
    },

    outlet() {
        const outlet = Tag('div');
        let currentView: Runtime | null = null;
        Watch(() => {
            const path = this.currentPath();
            const route = this.routes.find(r => {
                const parts = r.path.split('/').filter(Boolean);
                const pathParts = path.split('/').filter(Boolean);
                if (parts.length !== pathParts.length) return false;
                return parts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
            }) || this.routes.find(r => r.path === '*');
            if (route) {
                const params: Record<string, string> = {};
                const parts = route.path.split('/').filter(Boolean);
                const pathParts = path.split('/').filter(Boolean);
                parts.forEach((part, i) => {
                    if (part.startsWith(':')) params[part.slice(1)] = pathParts[i];
                });
                this.params(params);
                let Comp = route.component;
                if (typeof Comp === 'function' && Comp.toString().includes('import')) {
                    Comp = () => import(/* @vite-ignore */ route.component).then(m => m.default);
                }
                const view = Render(() => {
                    const C = typeof Comp === 'function' ? Comp : () => Comp;
                    return C(params);
                });
                if (currentView) currentView.destroy();
                currentView = view;
                outlet.innerHTML = '';
                outlet.appendChild(view.container);
            }
        });
        return outlet;
    },

    to(path: string) {
        window.location.hash = path.startsWith('#') ? path : '#' + path;
    },
    back() { window.history.back(); },
    path() { return window.location.hash.slice(1) || '/'; }
};

const mounted = new WeakMap < HTMLElement, Runtime> ();

export function Mount(component: (() => any) | any, target: string | HTMLElement): Runtime {
    const targetEl = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetEl) throw new Error('Target not found');
    const prev = mounted.get(targetEl);
    if (prev) prev.destroy();
    const instance = Render(typeof component === 'function' ? component : () => component);
    targetEl.replaceChildren(instance.container);
    mounted.set(targetEl, instance);
    return instance;
}

if (typeof window !== 'undefined') {
    (window as any).$ = $;
    (window as any).Watch = Watch;
    (window as any).$$ = $$;
    (window as any).Render = Render;
    (window as any).Tag = Tag;
    (window as any).Mount = Mount;
    (window as any).Router = Router;
}

export { $ as signal, Watch as effect, $$ as reactive, Render, Tag, Mount, Router };