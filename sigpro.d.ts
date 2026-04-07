// sigpro.d.ts

declare const SIG_BRAND: unique symbol;

export interface Signal<T = any> {
  readonly [SIG_BRAND]: true;
  (): T;
  (value: T): T;
  (updater: (prev: T) => T): T;
}

export interface Computed<T = any> {
  readonly [SIG_BRAND]: true;
  (): T;
}

export interface RuntimeInstance {
  readonly _isRuntime: true;
  readonly container: HTMLElement;
  destroy(): void;
}

export interface TransitionOptions {
  on?: (el: HTMLElement) => void;
  off?: (el: HTMLElement, destroy: () => void) => void;
}

export interface Route {
  path: string;
  component: (params: Record<string, string>) => any;
}

export interface RenderContext {
  onCleanup: (fn: () => void) => void;
}

export interface TagProps extends Record<string, any> {
  ref?: ((el: HTMLElement) => void) | { current: HTMLElement | null };
  class?: string | (() => string);
  style?: string | (() => string);
}

export type ReactiveObject<T extends object> = {
  [K in keyof T]: T[K] extends object ? ReactiveObject<T[K]> : T[K];
};

export function $<T>(val: T, key?: string | null): Signal<T>;
export function $<T>(val: () => T): Computed<T>;

export function $$<T>(fn: () => T): Computed<T>;

export function $_<T extends object>(obj: T): ReactiveObject<T>;

export function untrack<T>(fn: () => T): T;

export function Watch(cb: () => void): () => void;
export function Watch(cb: () => () => void): () => void;

export function Render<T>(fn: (ctx: RenderContext) => T): RuntimeInstance;

export function Tag(tag: string, props?: TagProps | null, children?: any[]): HTMLElement;
export function Tag(tag: string, children?: any[]): HTMLElement;

export function If(
  cond: boolean | (() => boolean),
  a: any | (() => any),
  b?: any | (() => any) | null,
  options?: TransitionOptions
): HTMLElement;

export function For<T>(
  source: T[] | (() => T[]),
  renderFn: (item: T, index: number) => any,
  keyFn?: (item: T, index: number) => any,
  tag?: string,
  props?: TagProps
): HTMLElement;

export function Router(routes: Route[]): HTMLElement;

export namespace Router {
  const params: Signal<Record<string, string>>;
  function to(path: string): void;
  function back(): void;
  function path(): string;
}

export function Mount(
  component: (() => any) | any,
  target: string | HTMLElement
): RuntimeInstance;

export function Share<T>(key: string, value: T): void;

export function Use<T>(key: string, defaultValue?: T): T | undefined;

// Funciones JSX (etiquetas globales)
export const Div: (props?: TagProps, children?: any[]) => HTMLElement;
export const Span: (props?: TagProps, children?: any[]) => HTMLElement;
export const P: (props?: TagProps, children?: any[]) => HTMLElement;
export const H1: (props?: TagProps, children?: any[]) => HTMLElement;
export const H2: (props?: TagProps, children?: any[]) => HTMLElement;
export const H3: (props?: TagProps, children?: any[]) => HTMLElement;
export const H4: (props?: TagProps, children?: any[]) => HTMLElement;
export const H5: (props?: TagProps, children?: any[]) => HTMLElement;
export const H6: (props?: TagProps, children?: any[]) => HTMLElement;
export const Button: (props?: TagProps, children?: any[]) => HTMLElement;
export const A: (props?: TagProps, children?: any[]) => HTMLElement;
export const Img: (props?: TagProps, children?: any[]) => HTMLElement;
export const Input: (props?: TagProps, children?: any[]) => HTMLElement;
export const Textarea: (props?: TagProps, children?: any[]) => HTMLElement;
export const Select: (props?: TagProps, children?: any[]) => HTMLElement;
export const Option: (props?: TagProps, children?: any[]) => HTMLElement;
export const Form: (props?: TagProps, children?: any[]) => HTMLElement;
export const Label: (props?: TagProps, children?: any[]) => HTMLElement;
export const Ul: (props?: TagProps, children?: any[]) => HTMLElement;
export const Ol: (props?: TagProps, children?: any[]) => HTMLElement;
export const Li: (props?: TagProps, children?: any[]) => HTMLElement;
export const Table: (props?: TagProps, children?: any[]) => HTMLElement;
export const Tr: (props?: TagProps, children?: any[]) => HTMLElement;
export const Td: (props?: TagProps, children?: any[]) => HTMLElement;
export const Th: (props?: TagProps, children?: any[]) => HTMLElement;
export const Section: (props?: TagProps, children?: any[]) => HTMLElement;
export const Article: (props?: TagProps, children?: any[]) => HTMLElement;
export const Aside: (props?: TagProps, children?: any[]) => HTMLElement;
export const Nav: (props?: TagProps, children?: any[]) => HTMLElement;
export const Header: (props?: TagProps, children?: any[]) => HTMLElement;
export const Footer: (props?: TagProps, children?: any[]) => HTMLElement;
export const Main: (props?: TagProps, children?: any[]) => HTMLElement;

export interface SigProAPI {
  $: typeof $;
  $$: typeof $$;
  $_: typeof $_;
  untrack: typeof untrack;
  Render: typeof Render;
  Watch: typeof Watch;
  Tag: typeof Tag;
  If: typeof If;
  For: typeof For;
  Router: typeof Router;
  Mount: typeof Mount;
  Share: typeof Share;
  Use: typeof Use;
}

declare const SigPro: SigProAPI;
export default SigPro;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: TagProps;
      span: TagProps;
      p: TagProps;
      h1: TagProps;
      h2: TagProps;
      h3: TagProps;
      h4: TagProps;
      h5: TagProps;
      h6: TagProps;
      button: TagProps;
      a: TagProps;
      img: TagProps;
      input: TagProps;
      textarea: TagProps;
      select: TagProps;
      option: TagProps;
      form: TagProps;
      label: TagProps;
      ul: TagProps;
      ol: TagProps;
      li: TagProps;
      table: TagProps;
      tr: TagProps;
      td: TagProps;
      th: TagProps;
      section: TagProps;
      article: TagProps;
      aside: TagProps;
      nav: TagProps;
      header: TagProps;
      footer: TagProps;
      main: TagProps;
    }
    interface Element extends HTMLElement {}
  }
}