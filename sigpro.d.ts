/**
 * SigPro 1.2.12
 * A minimalistic reactive UI library with fine-grained reactivity,
 * deep reactive proxies, and intuitive component composition.
 */

// ============================================================================
// Core Reactivity
// ============================================================================

/**
 * A reactive signal that holds a value and automatically tracks dependencies.
 * Signals are the foundation of SigPro's reactivity system.
 *
 * @typeParam T - The type of the value stored in the signal
 *
 * @example
 * // Basic usage
 * const count = $(0)
 * console.log(count()) // 0
 * count(5)
 * console.log(count()) // 5
 * count(c => c + 1)
 *
 * @example
 * // Computed signal
 * const double = $(() => count() * 2)
 *
 * @example
 * // Persistent signal (synced with localStorage)
 * const name = $("Guest", "user-name")
 */
export function $<T>(value: T, persistentKey?: string): Signal<T>

/**
 * A deeply reactive proxy that wraps an object or array, tracking property access
 * and mutations with fine-grained precision. Only effects that depend on changed
 * properties will re-run.
 *
 * @typeParam T - The type of the object/array being wrapped
 *
 * @example
 * const state = $$({ user: { name: 'Ana', age: 30 }, items: [1, 2, 3] })
 *
 * // Reading a property (reactive)
 * Watch(() => console.log(state.user.name)) // logs 'Ana'
 *
 * // Mutating a property (triggers dependent effects)
 * state.user.name = 'María'
 *
 * // Adding/deleting properties also notifies iteration dependencies
 * state.newProp = true
 * delete state.items
 *
 * // Arrays work with iteration tracking
 * Object.keys(state) // tracked via internal symbol
 */
export function $$<T extends object>(target: T): DeepReactive<T>

/**
 * A reactive signal type. Calling the signal returns its current value.
 * Passing an argument updates the value.
 *
 * @typeParam T - The type of the value
 */
export type Signal<T> = {
  (): T
  (value: T | ((prev: T) => T)): void

  // Internal properties (not meant for direct use)
  _isComputed?: boolean
  _subs?: Set<Effect>
  _dirty?: boolean
  _deps?: Set<Set<Effect>>
  _disposed?: boolean
  markDirty?: () => void
  stop?: () => void
}

/**
 * A deeply reactive object where all property access and mutations are tracked.
 * Works recursively on nested objects and arrays.
 */
export type DeepReactive<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object ? DeepReactive<T[K]> : T[K]
    } & {
      [Symbol.iterator]?: T extends Iterable<infer U>
        ? () => Iterator<DeepReactive<U>>
        : never
    }
  : T

/**
 * Internal effect representation.
 */
interface Effect {
  (): any
  _deps: Set<Set<Effect>> | null
  _cleanups: Set<() => void> | null
  _children: Set<Effect> | null
  _disposed: boolean
  _isComputed: boolean
  _depth: number
  _mounts: Array<() => void>
  _parent: Effect | null
  _result?: any
  _dirty?: boolean
  _subs?: Set<Effect>
}

// ============================================================================
// Effects and Watching
// ============================================================================

/**
 * Creates a reactive effect that tracks signal dependencies and re-runs when they change.
 * Returns a cleanup function to stop the effect.
 *
 * @param sources - A signal, array of signals, or a function that reads from signals
 * @param callback - Optional callback that receives the current values
 * @returns A cleanup function that stops the effect
 *
 * @example
 * // Auto-tracking with a function
 * const stop = Watch(() => {
 *   console.log(`Count is: ${count()}`)
 * })
 *
 * @example
 * // Explicit sources with callback
 * Watch([count, name], ([c, n]) => {
 *   console.log(`Count: ${c}, Name: ${n}`)
 * })
 *
 * @example
 * // Cleanup
 * stop() // or call the returned function
 */
export function Watch(
  sources: (() => void) | Signal<any> | Array<Signal<any>>
): () => void
export function Watch<T>(
  sources: Signal<T> | Array<Signal<any>>,
  callback: (values: T | any[]) => void
): () => void

/**
 * Batches multiple signal updates into a single reactive update cycle.
 * Use this when performing many updates in sequence to avoid unnecessary re-renders.
 *
 * @param fn - Function containing batched updates
 * @returns The return value of the batched function
 *
 * @example
 * Batch(() => {
 *   for (let i = 0; i < 1000; i++) {
 *     items(prev => [...prev, i])
 *   }
 * })
 * // Effects will run only once after the batch completes
 */
export function Batch<T>(fn: () => T): T

/**
 * Registers a callback to run when the current component mounts.
 * Must be called within a component function or Render context.
 *
 * @param fn - Function to execute on mount
 *
 * @example
 * const MyComponent = () => {
 *   onMount(() => console.log('Component mounted'))
 *   return Div("Hello")
 * }
 */
export function onMount(fn: () => void): void

/**
 * Registers a callback to run when the current component unmounts.
 * Useful for cleanup (event listeners, intervals, etc.).
 * Must be called within a component function or Render context.
 *
 * @param fn - Function to execute on unmount
 *
 * @example
 * const MyComponent = () => {
 *   onUnmount(() => console.log('Component unmounted'))
 *   return Div("Hello")
 * }
 */
export function onUnmount(fn: () => void): void

// ============================================================================
// Component & Rendering
// ============================================================================

/**
 * Creates a DOM element or component. The Swiss Army knife of SigPro templating.
 *
 * @param tag - HTML tag name, SVG tag name, or a component function
 * @param props - Element properties/attributes (optional)
 * @param children - Child elements (optional)
 * @returns A DOM Node or DocumentFragment
 *
 * @example
 * // HTML element
 * Tag("div", { class: "container" }, [
 *   Tag("h1", "Hello World"),
 *   Tag("button", { onclick: () => alert('clicked') }, "Click me")
 * ])
 *
 * @example
 * // Component
 * const Greeting = ({ name }) => Tag("p", `Hello, ${name}`)
 * Tag(Greeting, { name: "Ana" })
 *
 * @example
 * // Reactive attributes
 * Tag("div", { class: () => isActive() ? "active" : "" })
 *
 * @example
 * // SVG
 * Tag("svg", { width: 100, height: 100 }, [
 *   Tag("circle", { cx: 50, cy: 50, r: 40, fill: "red" })
 * ])
 */
export function Tag(
  tag: string | ((props: any, ctx: ComponentContext) => any),
  props?: Record<string, any> | Node | Array<any>,
  children?: any
): Node

/**
 * Context object passed to component functions.
 */
export interface ComponentContext {
  /** Child elements passed to the component */
  children: any
  /** Emit an event to the parent component */
  emit: (event: string, ...args: any[]) => void
}

/**
 * Renders a component or template function and returns a runtime instance
 * that can be mounted and destroyed.
 *
 * @param renderFn - Function that returns DOM nodes or components
 * @returns A runtime instance with container and destroy method
 *
 * @example
 * const app = Render(() => Div({ class: "app" }, "Hello"))
 * document.body.appendChild(app.container)
 *
 * // Later: app.destroy()
 */
export function Render(
  renderFn: (ctx: { onCleanup: (fn: () => void) => void }) => any
): RuntimeInstance

/**
 * A runtime instance returned by Render.
 */
export interface RuntimeInstance {
  _isRuntime: true
  /** The container element that holds the rendered content */
  container: HTMLDivElement
  /** Destroys the instance and cleans up all reactive effects */
  destroy: () => void
}

/**
 * Mounts a component to a DOM element.
 *
 * @param component - Component function or element to mount
 * @param target - CSS selector string or DOM element
 * @returns The runtime instance, or undefined if target not found
 *
 * @example
 * // Mount to element with ID 'app'
 * Mount(() => Div("Hello SigPro"), "#app")
 *
 * @example
 * // Mount to existing element
 * Mount(MyComponent, document.body)
 */
export function Mount(
  component: (() => any) | any,
  target: string | Element
): RuntimeInstance | undefined

// ============================================================================
// Control Flow Components
// ============================================================================

/**
 * Conditionally renders content based on a reactive condition.
 *
 * @param cond - Boolean value or signal returning boolean
 * @param ifYes - Content to render when condition is true
 * @param ifNot - Content to render when condition is false (optional)
 * @returns A container element that manages the conditional content
 *
 * @example
 * If($show,
 *   () => Div("Visible content"),
 *   () => Div("Hidden state placeholder")
 * )
 */
export function If(
  cond: boolean | (() => boolean) | Signal<boolean>,
  ifYes: any | (() => any),
  ifNot?: any | (() => any)
): HTMLDivElement

/**
 * Renders a list of items efficiently, updating only changed items.
 *
 * @param src - Array or signal returning array of items
 * @param itemFn - Function that renders each item
 * @param keyFn - Optional function to generate stable keys for items
 * @returns A container element that manages the list
 *
 * @example
 * const items = $([1, 2, 3])
 * For(items, (item, index) => Li(`Item ${item}`), item => item)
 */
export function For<T>(
  src: T[] | (() => T[]) | Signal<T[]>,
  itemFn: (item: T, index: number) => any,
  keyFn?: (item: T, index: number) => string | number
): HTMLDivElement

/**
 * Conditionally renders content with CSS transition animations.
 *
 * @param show - Reactive signal or boolean that controls visibility
 * @param render - Function that returns the content to render when visible
 * @param options - Animation configuration (optional)
 * @param options.enter - CSS class for enter transition start
 * @param options.leave - CSS class for leave transition start
 * @returns A container element that manages the animated content
 *
 * @example
 * Anim(isOpen,
 *   () => Div({ class: "modal" }, "Modal content"),
 *   {
 *     enter: "fade-enter",
 *     leave: "fade-leave"
 *   }
 * )
 */
export function Anim(
  show: boolean | Signal<boolean> | (() => boolean),
  render: () => any,
  options?: { enter?: string; leave?: string }
): HTMLDivElement

// ============================================================================
// Router
// ============================================================================

/**
 * Hash-based router component for single-page applications.
 *
 * @param routes - Array of route definitions
 * @returns A router container element
 *
 * @example
 * Router([
 *   { path: "/", component: HomePage },
 *   { path: "/about", component: AboutPage },
 *   { path: "/user/:id", component: UserPage },
 *   { path: "*", component: NotFoundPage }
 * ])
 */
export function Router(routes: RouteDefinition[]): HTMLDivElement

export namespace Router {
  /**
   * Reactive signal containing current route parameters.
   * @example
   * const params = Router.params()
   * console.log(params.id) // from "/user/:id"
   */
  export const params: Signal<Record<string, string>>

  /**
   * Navigate to a path.
   * @example
   * Router.to("/about")
   */
  export function to(path: string): void

  /**
   * Go back in browser history.
   */
  export function back(): void

  /**
   * Get the current path.
   */
  export function path(): string
}

/**
 * Route definition for the Router.
 */
export interface RouteDefinition {
  /** Path pattern with optional :param placeholders. "*" for catch-all. */
  path: string
  /** Component to render when route matches */
  component: any | ((params: Record<string, string>) => any)
}

// ============================================================================
// HTML Tag Helpers
// ============================================================================

/**
 * Convenience functions for creating HTML elements.
 * Available globally when the library is loaded in a browser.
 *
 * @example
 * Div({ class: "container" }, [
 *   H1("Title"),
 *   P("Paragraph text"),
 *   Button({ onclick: handleClick }, "Click me")
 * ])
 */

/** Creates a `<div>` element */
export function Div(
  props?: Record<string, any>,
  ...children: any[]
): HTMLDivElement

/** Creates a `<span>` element */
export function Span(
  props?: Record<string, any>,
  ...children: any[]
): HTMLSpanElement

/** Creates a `<p>` element */
export function P(
  props?: Record<string, any>,
  ...children: any[]
): HTMLParagraphElement

/** Creates an `<h1>` element */
export function H1(
  props?: Record<string, any>,
  ...children: any[]
): HTMLHeadingElement

/** Creates an `<h2>` element */
export function H2(
  props?: Record<string, any>,
  ...children: any[]
): HTMLHeadingElement

/** Creates an `<h3>` element */
export function H3(
  props?: Record<string, any>,
  ...children: any[]
): HTMLHeadingElement

/** Creates an `<h4>` element */
export function H4(
  props?: Record<string, any>,
  ...children: any[]
): HTMLHeadingElement

/** Creates an `<h5>` element */
export function H5(
  props?: Record<string, any>,
  ...children: any[]
): HTMLHeadingElement

/** Creates an `<h6>` element */
export function H6(
  props?: Record<string, any>,
  ...children: any[]
): HTMLHeadingElement

/** Creates a `<br>` element */
export function Br(props?: Record<string, any>): HTMLBRElement

/** Creates an `<hr>` element */
export function Hr(props?: Record<string, any>): HTMLHRElement

/** Creates a `<section>` element */
export function Section(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates an `<article>` element */
export function Article(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates an `<aside>` element */
export function Aside(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates a `<nav>` element */
export function Nav(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates a `<main>` element */
export function Main(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates a `<header>` element */
export function Header(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates a `<footer>` element */
export function Footer(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates a `<ul>` element */
export function Ul(
  props?: Record<string, any>,
  ...children: any[]
): HTMLUListElement

/** Creates an `<ol>` element */
export function Ol(
  props?: Record<string, any>,
  ...children: any[]
): HTMLOListElement

/** Creates a `<li>` element */
export function Li(
  props?: Record<string, any>,
  ...children: any[]
): HTMLLIElement

/** Creates an `<a>` element */
export function A(
  props?: Record<string, any>,
  ...children: any[]
): HTMLAnchorElement

/** Creates an `<em>` element */
export function Em(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates a `<strong>` element */
export function Strong(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates a `<pre>` element */
export function Pre(
  props?: Record<string, any>,
  ...children: any[]
): HTMLPreElement

/** Creates a `<code>` element */
export function Code(
  props?: Record<string, any>,
  ...children: any[]
): HTMLElement

/** Creates a `<form>` element */
export function Form(
  props?: Record<string, any>,
  ...children: any[]
): HTMLFormElement

/** Creates a `<label>` element */
export function Label(
  props?: Record<string, any>,
  ...children: any[]
): HTMLLabelElement

/** Creates an `<input>` element */
export function Input(props?: Record<string, any>): HTMLInputElement

/** Creates a `<textarea>` element */
export function Textarea(props?: Record<string, any>): HTMLTextAreaElement

/** Creates a `<select>` element */
export function Select(
  props?: Record<string, any>,
  ...children: any[]
): HTMLSelectElement

/** Creates a `<button>` element */
export function Button(
  props?: Record<string, any>,
  ...children: any[]
): HTMLButtonElement

/** Creates an `<img>` element */
export function Img(props?: Record<string, any>): HTMLImageElement

/** Creates an `<svg>` element */
export function Svg(
  props?: Record<string, any>,
  ...children: any[]
): SVGSVGElement

// ============================================================================
// Default Export
// ============================================================================

declare const SigPro: {
  $: typeof $
  $$: typeof $$
  Watch: typeof Watch
  Tag: typeof Tag
  Render: typeof Render
  If: typeof If
  For: typeof For
  Router: typeof Router
  Mount: typeof Mount
  onMount: typeof onMount
  onUnmount: typeof onUnmount
  Anim: typeof Anim
  Batch: typeof Batch
}

export default SigPro

// Global augmentation for browser environments
declare global {
  interface Window {
    $: typeof $
    $$: typeof $$
    Watch: typeof Watch
    Tag: typeof Tag
    Render: typeof Render
    If: typeof If
    For: typeof For
    Router: typeof Router
    Mount: typeof Mount
    onMount: typeof onMount
    onUnmount: typeof onUnmount
    Anim: typeof Anim
    Batch: typeof Batch
    SigPro: typeof SigPro

    // Tag helpers
    Div: typeof Div
    Span: typeof Span
    P: typeof P
    H1: typeof H1
    H2: typeof H2
    H3: typeof H3
    H4: typeof H4
    H5: typeof H5
    H6: typeof H6
    Br: typeof Br
    Hr: typeof Hr
    Section: typeof Section
    Article: typeof Article
    Aside: typeof Aside
    Nav: typeof Nav
    Main: typeof Main
    Header: typeof Header
    Footer: typeof Footer
    Ul: typeof Ul
    Ol: typeof Ol
    Li: typeof Li
    A: typeof A
    Em: typeof Em
    Strong: typeof Strong
    Pre: typeof Pre
    Code: typeof Code
    Form: typeof Form
    Label: typeof Label
    Input: typeof Input
    Textarea: typeof Textarea
    Select: typeof Select
    Button: typeof Button
    Img: typeof Img
    Svg: typeof Svg
  }
}