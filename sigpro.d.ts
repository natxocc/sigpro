/**
 * SigPro 1.2.20
 * A minimalistic reactive library with fine-grained reactivity,
 * direct DOM updates, and built-in component helpers.
 */

// ============================================================================
// Core Reactivity
// ============================================================================

/**
 * Creates a reactive signal. When a function is passed, it becomes a computed signal.
 * If a `localStorageKey` is provided, the value persists.
 *
 * @param value - Initial value or computation function
 * @param localStorageKey - Optional key for persistence
 * @returns A getter/setter function
 */
export function $<T>(value: T, localStorageKey?: string): Signal<T>;
export function $<T>(computation: () => T): Signal<T>;

export interface Signal<T> {
  (): T;
  (value: T | ((prev: T) => T)): void;
}

/**
 * Creates a deep reactive proxy for objects and arrays.
 * Tracks property access and mutations automatically.
 *
 * @param target - Object or array to make reactive
 * @returns A reactive proxy
 */
export function $$<T extends object>(target: T): DeepReactive<T>;

export type DeepReactive<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object ? DeepReactive<T[K]> : T[K];
    }
  : T;

/**
 * Watches reactive sources and runs a callback.
 *
 * @example
 * // Auto-track mode
 * watch(() => {
 *   console.log(count());
 * });
 *
 * @example
 * // Explicit sources
 * watch([count, name], ([c, n]) => {
 *   console.log(c, n);
 * });
 *
 * @returns A function to stop the watcher.
 */
export function watch(fn: () => void): () => void;
export function watch<T>(
  sources: Array<Signal<any>> | (() => T),
  callback: (values: T | any[]) => void
): () => void;

/**
 * Batches multiple reactive updates into a single flush.
 */
export function batch<T>(fn: () => T): T;

// ============================================================================
// DOM Creation
// ============================================================================

/**
 * Hyperscript function to create DOM elements or components.
 *
 * @param tag - HTML/SVG tag name or component function
 * @param props - Optional properties/attributes
 * @param children - Child nodes or reactive functions
 * @returns DOM node or array of nodes
 */
export function h(
  tag: string | ((props: any, ctx: ComponentContext) => any),
  props?: any,
  children?: any
): Node;

export interface ComponentContext {
  children: any;
  emit: (event: string, ...args: any[]) => void;
}

/**
 * Conditionally renders content.
 *
 * @param condition - Boolean, signal, or function returning boolean
 * @param thenBranch - Content when truthy (Node or function)
 * @param elseBranch - Optional content when falsy
 * @returns A placeholder element that updates reactively
 */
export function when(
  condition: boolean | (() => boolean) | Signal<boolean>,
  thenBranch: any | (() => any),
  elseBranch?: any | (() => any)
): HTMLElement;

/**
 * Keyed list renderer. Uses `item?.id` by default or a custom key field.
 *
 * @param src - Array, signal, or function returning array
 * @param itemFn - Render function (item, index) => Node
 * @param keyField - Optional property name for unique key (e.g., "id")
 * @returns A container element with reactive list
 */
export function each<T>(
  src: T[] | (() => T[]) | Signal<T[]>,
  itemFn: (item: T, index: number) => any,
  keyField?: keyof T
): HTMLElement;

/**
 * Simple animation helper for enter transitions.
 *
 * @param options - Animation settings
 * @param child - Node or function returning node
 * @returns The animated node
 */
export function fx(
  options: {
    name?: string;
    duration?: number;
    scale?: boolean;
    slide?: boolean;
    rotate?: boolean;
    blur?: boolean;
  },
  child: Node | (() => Node)
): Node;

// ============================================================================
// Router
// ============================================================================

/**
 * Hash-based router.
 *
 * @param routes - Array of route definitions
 * @returns A container that renders the current route
 */
export function router(routes: RouteDefinition[]): HTMLElement;

export interface RouteDefinition {
  path: string; // e.g., "/", "/user/:id", "*"
  component: any | ((params: Record<string, string>) => any);
}

export namespace router {
  /** Reactive params signal */
  export const params: Signal<Record<string, string>>;

  /** Navigate to path */
  export function to(path: string): void;

  /** Go back in history */
  export function back(): void;

  /** Current path without hash */
  export function path(): string;
}

// ============================================================================
// HTTP Requests
// ============================================================================

export function req(config: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
}): {
  run: (body?: any) => Promise<any>;
  abort: () => void;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  data: Signal<any | null>;
};

// ============================================================================
// Mount API
// ============================================================================

export interface RuntimeInstance {
  _isRuntime: true;
  container: HTMLElement;
  destroy: () => void;
}

/**
 * Mounts a component to a DOM target.
 *
 * @param component - Component function or node
 * @param target - CSS selector or DOM element
 * @returns Runtime instance
 */
export function mount(
  component: (() => any) | Node,
  target: string | HTMLElement
): RuntimeInstance | undefined;

// ============================================================================
// Tag Helpers (globally available, lowercase)
// ============================================================================

// All standard HTML tags are available as global functions.
// They follow the same signature as `h` but with predefined tag names.
// Examples:
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

export type TagHelper = (
  props?: any,
  children?: any
) => HTMLElement | SVGElement | Text;

// ============================================================================
// Default Export
// ============================================================================

declare const SigPro: {
  $: typeof $;
  $$: typeof $$;
  watch: typeof watch;
  h: typeof h;
  when: typeof when;
  each: typeof each;
  fx: typeof fx;
  router: typeof router;
  req: typeof req;
  mount: typeof mount;
  batch: typeof batch;
};

export default SigPro;

// ============================================================================
// Global augmentation for browser environments
// ============================================================================

declare global {
  interface Window {
    $: typeof $;
    $$: typeof $$;
    watch: typeof watch;
    h: typeof h;
    when: typeof when;
    each: typeof each;
    fx: typeof fx;
    router: typeof router;
    req: typeof req;
    mount: typeof mount;
    batch: typeof batch;
    SigPro: typeof SigPro;

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