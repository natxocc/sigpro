/**
 * SigPro — Type Definitions
 *
 * Minimal reactive library: alien-signals-class push-pull core + direct-to-DOM
 * rendering. No VDOM, no diffing, no build step.
 */

// ============================================================================
// Core Reactivity
// ============================================================================

/**
 * A reactive signal. Call with no args to read, with a value to write.
 */
export interface Signal<T> {
  (): T;
  (value: T): void;
}

export function signal<T>(initialValue: T): Signal<T>;

/** A read-only derived value. Call with no args to read. */
export type ReadonlySignal<T> = () => T;

export function computed<T>(getter: (oldValue?: T) => T): ReadonlySignal<T>;

/**
 * Runs `fn` reactively. Re-executes when tracked deps change. `fn` may
 * return a cleanup function, run before the next re-execution and on stop.
 */
export function effect(fn: () => void | (() => void)): () => void;

/**
 * Runs `fn` once when the effect is created. `fn` may return a cleanup
 * that runs on parent unmount. Returns the effect disposer.
 */
export function onMount(fn: () => void | (() => void)): () => void;

/**
 * Sets a global error handler. Called when an `effect` or component throws.
 * `where` is the throwing function (for debugging).
 */
export function onError(handler: (err: unknown, where: unknown) => void): void;

/** Runs `fn` without tracking reads as dependencies. */
export function untrack<T>(fn: () => T): T;

/** Batches multiple signal writes into a single flush. */
export function batch<T>(fn: () => T): T;

/**
 * Watches a signal/getter and calls `cb` when the value changes. Skips the
 * initial run by default; pass `{ immediate: true }` to fire once on setup.
 */
export function watch<T>(
  source: Signal<T> | ReadonlySignal<T>,
  cb: (value: T, oldValue: T | undefined) => void,
  options?: { immediate?: boolean }
): () => void;

/**
 * Signal persisted to `localStorage` under `key` (JSON-serialized).
 * Falls back to `initial` if unavailable or unparseable.
 */
export function local<T>(key: string, initial: T): Signal<T>;

// ============================================================================
// DOM Creation
// ============================================================================

/** Static value or reactive getter. */
export type PropValue<T = any> = T | (() => T);

/**
 * Props accepted by `h` and tag helpers.
 *
 * Special keys:
 * - `ref`: function or `{ current }` object
 * - `on*`: DOM event listeners (e.g. `onclick`, `onInput`)
 * - `class` / `className`: element class
 * - `style`: CSS string or object of properties (camelCase keys,
 *   `--custom` keys go through `setProperty`)
 * - anything else: assigned as property if present on the element,
 *   otherwise set as attribute
 *
 * For security, `innerHTML`, `outerHTML` and `srcdoc` are ignored.
 * URL props (`href`, `src`, `action`, `formAction`, `poster`, `data`,
 * `xlink:href`) are restricted to `http(s)`, `mailto`, `tel`, `blob`,
 * and safe `data:image/*` for images.
 */
export type Props = {
  ref?: ((el: Element) => void) | { current: Element | null };
  class?: PropValue<string | null | undefined>;
  className?: PropValue<string | null | undefined>;
  style?: PropValue<
    string | Record<string, string | number | null | false> | null | undefined
  >;
  [key: string]: PropValue<any>;
};

/** Any valid child: node, primitive, array, or a reactive getter. */
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
 * Creates an HTML/SVG element (tag: string) or renders a component
 * (tag: function). The first arg after `tag` may be children when it is not
 * a plain object.
 */
export function h(
  tag: string,
  props?: Props | Child | null,
  ...children: Child[]
): Element;

export function h<P extends object>(
  tag: (props: P, children: Child[]) => Node | Node[] | null,
  props?: P | null,
  ...children: Child[]
): Node | Node[] | null;

/**
 * Registers all standard HTML tag names as globals on `target` (default
 * `window`). Call once at startup.
 */
export function exposeTags(target?: any): void;

// ============================================================================
// Mount / Unmount
// ============================================================================

/**
 * Mounts a component or node into a target. Returns a disposer that stops
 * the app scope and clears the target.
 */
export function mount(
  component: ((props?: any) => Node | Node[] | null) | Node | string,
  target: string | Element
): () => void;

/**
 * Recursively disposes scopes, removes tracked event listeners, and detaches
 * the node. Only needed for nodes created outside `h()`.
 */
export function unmount(node: Node): void;

/**
 * Recursively disposes scopes, removes tracked listeners, and clears
 * `_cln` / `_stopScope` on the node and its descendants.
 */
export function cleanupNode(node: Node): void;

// ============================================================================
// Router (sigpro/router)
// ============================================================================

export interface RouteDefinition {
  /** `/`, `/user/:id`, or `*` for fallback. */
  path: string;
  component:
    | ((params: Record<string, string>) => Node | Node[] | null)
    | Node;
}

export interface RouterFn {
  (): HTMLElement;
  /** Navigate to a path (updates `window.location.hash`). */
  to(path: string): void;
  /** Go back in browser history. */
  back(): void;
  /** Current path (without leading `#`). */
  path(): string;
}

/** Creates a hash-based router component. */
export function router(routes: RouteDefinition[]): RouterFn;

/** Current path as a reactive signal (without leading `#`). */
export const currentPath: Signal<string>;

/** Current route params as a reactive signal. */
export const routerParams: Signal<Record<string, string>>;

/** Increments on HMR page registration; read to force route refresh. */
export const hmrTick: Signal<number>;

const hmrRegistry: Map<string, any>;
export { hmrRegistry };

// ============================================================================
// i18n (sigpro/lang)
// ============================================================================

/** Active locale. Reactive. */
export const currentLocale: Signal<string>;

/**
 * Registers translations for one or more locales.
 *
 * @example
 * addLang({ en: { hello: "Hello" }, es: { hello: "Hola" } });
 */
export function addLang(obj: Record<string, Record<string, string>>): void;

/** Sets the active locale if it has been registered. */
export function setLocale(locale: string): void;

/** Reactive translation getter for a key. */
export function t(key: string): () => string;

// ============================================================================
// HTTP Helper (sigpro/http)
// ============================================================================

/**
 * Fetch helper. POSTs when `data` is provided, GETs otherwise. Calls
 * `loading(true/false)` around the request. Pass `abortSignal` to cancel.
 *
 * `data` may be:
 * - a plain object/array/primitive → sent as JSON
 * - `FormData` → sent as multipart/form-data (browser sets Content-Type)
 * - `Blob` / `File` → sent as binary (browser sets Content-Type)
 * - `URLSearchParams` → sent as application/x-www-form-urlencoded
 *
 * On non-2xx responses the returned Error has `status` and `statusText`.
 * Returns `null` for 204/205 responses. Parses the response as JSON.
 */
export function db<T = any>(
  url: string,
  data?: any | null,
  loading?: ((loading: boolean) => void) | null,
  abortSignal?: AbortSignal | null
): Promise<T>;

// ============================================================================
// Tag Helper shape (for Window augmentation)
// ============================================================================

export type TagHelper = (
  props?: Props | Child | null,
  ...children: Child[]
) => Element;

// ============================================================================
// Aggregate Export
// ============================================================================

declare const SigPro: {
  signal: typeof signal;
  computed: typeof computed;
  effect: typeof effect;
  untrack: typeof untrack;
  batch: typeof batch;
  watch: typeof watch;
  local: typeof local;
  h: typeof h;
  mount: typeof mount;
  unmount: typeof unmount;
  onMount: typeof onMount;
  onError: typeof onError;
  cleanupNode: typeof cleanupNode;
  exposeTags: typeof exposeTags;
  router: typeof router;
  currentPath: typeof currentPath;
  routerParams: typeof routerParams;
  hmrTick: typeof hmrTick;
  currentLocale: typeof currentLocale;
  addLang: typeof addLang;
  setLocale: typeof setLocale;
  t: typeof t;
  db: typeof db;
};

export default SigPro;

// ============================================================================
// Global augmentation
// ============================================================================

declare global {
  interface Window {
    SigPro: typeof SigPro;

    signal: typeof signal;
    computed: typeof computed;
    effect: typeof effect;
    untrack: typeof untrack;
    batch: typeof batch;
    watch: typeof watch;
    local: typeof local;
    h: typeof h;
    mount: typeof mount;
    unmount: typeof unmount;
    onMount: typeof onMount;
    onError: typeof onError;
    cleanupNode: typeof cleanupNode;
    exposeTags: typeof exposeTags;
    router: typeof router;
    currentPath: typeof currentPath;
    routerParams: typeof routerParams;
    hmrTick: typeof hmrTick;
    currentLocale: typeof currentLocale;
    addLang: typeof addLang;
    setLocale: typeof setLocale;
    t: typeof t;
    db: typeof db;

    a: TagHelper; abbr: TagHelper; article: TagHelper; aside: TagHelper;
    audio: TagHelper; b: TagHelper; blockquote: TagHelper; br: TagHelper;
    button: TagHelper; canvas: TagHelper; caption: TagHelper; cite: TagHelper;
    code: TagHelper; col: TagHelper; colgroup: TagHelper; datalist: TagHelper;
    dd: TagHelper; del: TagHelper; details: TagHelper; dfn: TagHelper;
    dialog: TagHelper; div: TagHelper; dl: TagHelper; dt: TagHelper;
    em: TagHelper; embed: TagHelper; fieldset: TagHelper; figcaption: TagHelper;
    figure: TagHelper; footer: TagHelper; form: TagHelper; h1: TagHelper;
    h2: TagHelper; h3: TagHelper; h4: TagHelper; h5: TagHelper; h6: TagHelper;
    header: TagHelper; hr: TagHelper; i: TagHelper; iframe: TagHelper;
    img: TagHelper; input: TagHelper; ins: TagHelper; kbd: TagHelper;
    label: TagHelper; legend: TagHelper; li: TagHelper; main: TagHelper;
    mark: TagHelper; meter: TagHelper; nav: TagHelper; object: TagHelper;
    ol: TagHelper; optgroup: TagHelper; option: TagHelper; output: TagHelper;
    p: TagHelper; picture: TagHelper; pre: TagHelper; progress: TagHelper;
    section: TagHelper; select: TagHelper; slot: TagHelper; small: TagHelper;
    source: TagHelper; span: TagHelper; strong: TagHelper; sub: TagHelper;
    summary: TagHelper; sup: TagHelper; table: TagHelper;
    tbody: TagHelper; td: TagHelper; template: TagHelper; textarea: TagHelper;
    tfoot: TagHelper; th: TagHelper; thead: TagHelper; time: TagHelper;
    tr: TagHelper; u: TagHelper; ul: TagHelper; video: TagHelper;
  }
}