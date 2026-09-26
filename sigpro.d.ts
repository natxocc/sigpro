/**
 * SigPro — Type Definitions
 *
 * A minimal reactive library built on an alien-signals-class push-pull core
 * with a thin, direct-to-DOM rendering layer.
 *
 * - Explicit API: `signal()`, `computed()`, `effect()`
 * - Lazy computeds with checkDirty verification
 * - Atomic updates: no virtual DOM, no diffing
 * - Built-in: hash router, i18n, localStorage signals, DI, fetch helper
 */

// ============================================================================
// Core Reactivity
// ============================================================================

/**
 * A reactive signal. Call with no args to read, with a value or an updater
 * function to write.
 *
 * @example
 * const count = signal(0);
 * count();          // read → 0
 * count(1);         // write
 * count(c => c + 1);// updater
 */
export interface Signal<T> {
  (): T;
  (value: T | ((prev: T) => T)): void;
}

/**
 * Creates a reactive signal with an initial value.
 */
export function signal<T>(initialValue: T): Signal<T>;

/**
 * A read-only derived value. Call with no args to read.
 */
export type ReadonlySignal<T> = () => T;

/**
 * Creates a derived value computed lazily from dependencies.
 * Recomputed on read only when dependencies have actually changed.
 */
export function computed<T>(getter: (oldValue?: T) => T): ReadonlySignal<T>;

/**
 * Runs `fn` reactively. Re-executes when its tracked dependencies change.
 * `fn` may return a cleanup function, run before the next re-execution and
 * on stop.
 *
 * @returns A function that stops the effect.
 */
export function effect(fn: () => void | (() => void)): () => void;

/**
 * Creates a scope that groups child effects. Does not track dependencies
 * and does not re-execute. Returns a function that disposes all effects
 * created inside.
 */
export function effectScope(fn: () => void): () => void;

/**
 * Runs `fn` without tracking signal reads as dependencies.
 */
export function untrack<T>(fn: () => T): T;

/**
 * Batches multiple signal writes into a single flush.
 */
export function batch<T>(fn: () => T): T;

/**
 * Watches a signal or getter and calls `cb` when the value changes.
 * Skips the initial run by default. Set `immediate` to call once on setup.
 *
 * @returns A function that stops the watcher.
 */
export function watch<T>(
  source: Signal<T> | ReadonlySignal<T>,
  cb: (value: T, oldValue: T | undefined) => void,
  options?: { immediate?: boolean }
): () => void;

/**
 * Creates a signal persisted to `localStorage` under `key`.
 * The value is JSON-serialized. Falls back to `initial` if unavailable
 * or if the stored value cannot be parsed.
 */
export function local<T>(key: string, initial: T): Signal<T>;

// ============================================================================
// Dependency Injection
// ============================================================================

/**
 * Provides a value in the current effect/scope context.
 * Only visible to descendants.
 */
export function provide<T = any>(key: string | symbol, value: T): void;

/**
 * Injects the nearest value for `key` from an ancestor context.
 * Returns `fallback` if not found.
 */
export function inject<T = any>(key: string | symbol, fallback?: T): T | undefined;

// ============================================================================
// DOM Creation
// ============================================================================

/**
 * A prop value may be static or a reactive getter.
 */
export type PropValue<T = any> = T | (() => T);

/**
 * Props accepted by `h` and all tag helpers.
 *
 * Special props:
 * - `ref`: function `(el) => void` or object with `.current`
 * - `html`: sets `innerHTML` reactively (skips `children` if present)
 * - `on*`: DOM event listeners (case-insensitive: `onclick`, `onInput`)
 * - any other: assigned to the element (property if it exists, otherwise attribute)
 */
export type Props = {
  ref?: ((el: Element) => void) | { current: Element | null };
  html?: PropValue<string | null | undefined>;
  class?: PropValue<string | null | undefined>;
  className?: PropValue<string | null | undefined>;
  style?: PropValue<string | null | undefined>;
  [key: string]: PropValue<any>;
};

/**
 * Any value accepted as a child: nodes, strings, numbers, arrays, or
 * reactive getter functions returning any of these.
 */
export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => Child | Child[])
  | Child[];

/**
 * Creates a DOM element from a tag name, or renders a component.
 *
 * - `tag` as string → creates HTML or SVG element (auto-detected).
 * - `tag` as function → treated as a component: `(props, children[]) => Node | Node[]`.
 * - First argument may be children if it is not a plain object.
 * - Multiple children may be passed variadically.
 */
export function h(
  tag: string,
  props?: Props | Child | null,
  ...children: Child[]
): Element | SVGElement;

export function h<P extends object>(
  tag: (props: P, children: Child[]) => Node | Node[] | null,
  props?: P | null,
  ...children: Child[]
): Node | Node[] | null;

/**
 * Registers all standard HTML tag names as globals (`div`, `span`, `button`,
 * `input`, `textarea`, `svg`, etc.).
 *
 * Must be called once at startup. Defaults to `window`.
 */
export function exposeTags(target?: any): void;

// ============================================================================
// Mount / Unmount
// ============================================================================

/**
 * Mounts a component into a DOM target.
 *
 * @param component - Component function or node.
 * @param target    - CSS selector or DOM element.
 * @returns A function that stops the app scope and clears the target.
 */
export function mount(
  component: (props?: any) => Node | Node[] | null,
  target: string | Element
): () => void;

/**
 * Recursively disposes scopes and removes tracked event listeners on a node
 * and its descendants, then detaches it from the DOM.
 *
 * Only needed when working with nodes created outside `h()`.
 */
export function unmount(node: Node): void;

// ============================================================================
// Router
// ============================================================================

export interface RouteDefinition {
  /** Path pattern: `/`, `/user/:id`, `/blog/*`, or `*` for fallback. */
  path: string;
  /** Component function receiving route params, or a static node. */
  component: ((params: Record<string, string>) => Node | Node[] | null) | Node;
}

export interface RouterFn {
  (): HTMLElement;
  /** Navigate to a path (updates `window.location.hash`). */
  to(path: string): void;
  /** Go back in browser history. */
  back(): void;
  /** Returns the current path (without leading `#`). */
  path(): string;
}

/**
 * Creates a hash-based router. Returns a component that renders the
 * matched route and re-renders on navigation.
 */
export function router(routes: RouteDefinition[]): RouterFn;

/** Current path as a reactive signal (without leading `#`). */
export const currentPath: Signal<string>;

/** Current route params as a reactive signal. */
export const routerParams: Signal<Record<string, string>>;

// ============================================================================
// i18n
// ============================================================================

/** Active locale. Reactive. */
export const currentLocale: Signal<string>;

/**
 * Registers translations for one or more locales.
 *
 * @example
 * addLang({ en: { hello: "Hello" }, es: { hello: "Hola" } });
 */
export function addLang(translations: Record<string, Record<string, string>>): void;

/** Sets the active locale if it has been registered. */
export function setLocale(locale: string): void;

/** Reactive translation getter for a key. */
export function t(key: string): () => string;

/** Imperative translation read for a key. */
export function tt(key: string): string;

// ============================================================================
// HTTP Helper
// ============================================================================

/**
 * JSON fetch helper. POSTs when `data` is provided, GETs otherwise.
 * Calls `loading(true/false)` around the request if provided.
 * Pass an `AbortSignal` to cancel.
 */
export function db<T = any>(
  url: string,
  data?: any | null,
  loading?: ((loading: boolean) => void) | null,
  signal?: AbortSignal | null
): Promise<T>;

// ============================================================================
// Tag Helpers (registered by `exposeTags`)
// ============================================================================

/**
 * A tag helper: `div(props?, ...children)`.
 * Available on `window` after calling `exposeTags()`.
 */
export type TagHelper = (props?: Props | Child | null, ...children: Child[]) => Element;

export const a: TagHelper;
export const abbr: TagHelper;
export const article: TagHelper;
export const aside: TagHelper;
export const audio: TagHelper;
export const b: TagHelper;
export const blockquote: TagHelper;
export const br: TagHelper;
export const button: TagHelper;
export const canvas: TagHelper;
export const caption: TagHelper;
export const cite: TagHelper;
export const code: TagHelper;
export const col: TagHelper;
export const colgroup: TagHelper;
export const datalist: TagHelper;
export const dd: TagHelper;
export const del: TagHelper;
export const details: TagHelper;
export const dfn: TagHelper;
export const dialog: TagHelper;
export const div: TagHelper;
export const dl: TagHelper;
export const dt: TagHelper;
export const em: TagHelper;
export const embed: TagHelper;
export const fieldset: TagHelper;
export const figcaption: TagHelper;
export const figure: TagHelper;
export const footer: TagHelper;
export const form: TagHelper;
export const h1: TagHelper;
export const h2: TagHelper;
export const h3: TagHelper;
export const h4: TagHelper;
export const h5: TagHelper;
export const h6: TagHelper;
export const header: TagHelper;
export const hr: TagHelper;
export const i: TagHelper;
export const iframe: TagHelper;
export const img: TagHelper;
export const input: TagHelper;
export const ins: TagHelper;
export const kbd: TagHelper;
export const label: TagHelper;
export const legend: TagHelper;
export const li: TagHelper;
export const main: TagHelper;
export const mark: TagHelper;
export const meter: TagHelper;
export const nav: TagHelper;
export const object: TagHelper;
export const ol: TagHelper;
export const optgroup: TagHelper;
export const option: TagHelper;
export const output: TagHelper;
export const p: TagHelper;
export const picture: TagHelper;
export const pre: TagHelper;
export const progress: TagHelper;
export const section: TagHelper;
export const select: TagHelper;
export const slot: TagHelper;
export const small: TagHelper;
export const source: TagHelper;
export const span: TagHelper;
export const strong: TagHelper;
export const sub: TagHelper;
export const summary: TagHelper;
export const sup: TagHelper;
export const svg: TagHelper;
export const table: TagHelper;
export const tbody: TagHelper;
export const td: TagHelper;
export const template: TagHelper;
export const textarea: TagHelper;
export const tfoot: TagHelper;
export const th: TagHelper;
export const thead: TagHelper;
export const time: TagHelper;
export const tr: TagHelper;
export const u: TagHelper;
export const ul: TagHelper;
export const video: TagHelper;

// ============================================================================
// Aggregate Export
// ============================================================================

declare const SigPro: {
  signal: typeof signal;
  computed: typeof computed;
  effect: typeof effect;
  effectScope: typeof effectScope;
  untrack: typeof untrack;
  batch: typeof batch;
  watch: typeof watch;
  local: typeof local;
  provide: typeof provide;
  inject: typeof inject;
  h: typeof h;
  mount: typeof mount;
  unmount: typeof unmount;
  exposeTags: typeof exposeTags;
  router: typeof router;
  currentPath: typeof currentPath;
  routerParams: typeof routerParams;
  currentLocale: typeof currentLocale;
  addLang: typeof addLang;
  setLocale: typeof setLocale;
  t: typeof t;
  tt: typeof tt;
  db: typeof db;
};

export default SigPro;

// ============================================================================
// Global augmentation for browser environments
// ============================================================================

declare global {
  interface Window {
    SigPro: typeof SigPro;

    signal: typeof signal;
    computed: typeof computed;
    effect: typeof effect;
    effectScope: typeof effectScope;
    untrack: typeof untrack;
    batch: typeof batch;
    watch: typeof watch;
    local: typeof local;
    provide: typeof provide;
    inject: typeof inject;
    h: typeof h;
    mount: typeof mount;
    unmount: typeof unmount;
    exposeTags: typeof exposeTags;
    router: typeof router;
    currentPath: typeof currentPath;
    routerParams: typeof routerParams;
    currentLocale: typeof currentLocale;
    addLang: typeof addLang;
    setLocale: typeof setLocale;
    t: typeof t;
    tt: typeof tt;
    db: typeof db;

    // Tag helpers (lowercase)
    a: TagHelper;
    abbr: TagHelper;
    article: TagHelper;
    aside: TagHelper;
    audio: TagHelper;
    b: TagHelper;
    blockquote: TagHelper;
    br: TagHelper;
    button: TagHelper;
    canvas: TagHelper;
    caption: TagHelper;
    cite: TagHelper;
    code: TagHelper;
    col: TagHelper;
    colgroup: TagHelper;
    datalist: TagHelper;
    dd: TagHelper;
    del: TagHelper;
    details: TagHelper;
    dfn: TagHelper;
    dialog: TagHelper;
    div: TagHelper;
    dl: TagHelper;
    dt: TagHelper;
    em: TagHelper;
    embed: TagHelper;
    fieldset: TagHelper;
    figcaption: TagHelper;
    figure: TagHelper;
    footer: TagHelper;
    form: TagHelper;
    h1: TagHelper;
    h2: TagHelper;
    h3: TagHelper;
    h4: TagHelper;
    h5: TagHelper;
    h6: TagHelper;
    header: TagHelper;
    hr: TagHelper;
    i: TagHelper;
    iframe: TagHelper;
    img: TagHelper;
    input: TagHelper;
    ins: TagHelper;
    kbd: TagHelper;
    label: TagHelper;
    legend: TagHelper;
    li: TagHelper;
    main: TagHelper;
    mark: TagHelper;
    meter: TagHelper;
    nav: TagHelper;
    object: TagHelper;
    ol: TagHelper;
    optgroup: TagHelper;
    option: TagHelper;
    output: TagHelper;
    p: TagHelper;
    picture: TagHelper;
    pre: TagHelper;
    progress: TagHelper;
    section: TagHelper;
    select: TagHelper;
    slot: TagHelper;
    small: TagHelper;
    source: TagHelper;
    span: TagHelper;
    strong: TagHelper;
    sub: TagHelper;
    summary: TagHelper;
    sup: TagHelper;
    svg: TagHelper;
    table: TagHelper;
    tbody: TagHelper;
    td: TagHelper;
    template: TagHelper;
    textarea: TagHelper;
    tfoot: TagHelper;
    th: TagHelper;
    thead: TagHelper;
    time: TagHelper;
    tr: TagHelper;
    u: TagHelper;
    ul: TagHelper;
    video: TagHelper;
  }
}