// sigpro.d.ts

export declare module 'sigpro' {
  type Signal<T> = {
    (): T;
    (value: T | ((prev: T) => T)): void;
  };

  type ComputedSignal<T> = {
    (): T;
  };

  type ReactiveObject<T extends object> = T;

  type DeepReactive<T> = T extends object
    ? { [K in keyof T]: DeepReactive<T[K]> }
    : T;

  type Unsubscribe = () => void;

  type CleanupFn = () => void;

  type ViewInstance = {
    _isRuntime: true;
    container: HTMLDivElement;
    destroy: () => void;
  };

  type ComponentFunction<P = {}> = (props?: P) => HTMLElement | ViewInstance | string | null;
  type ComponentChild = HTMLElement | ViewInstance | string | number | boolean | null | undefined;
  type ComponentChildren = ComponentChild | ComponentChild[];

  interface BaseProps {
    class?: string | (() => string);
    style?: string | Record<string, string> | (() => string | Record<string, string>);
    id?: string | (() => string);
    ref?: ((el: HTMLElement) => void) | { current: HTMLElement | null };
  }

  interface EventProps {
    onclick?: (event: MouseEvent) => void;
    oninput?: (event: Event) => void;
    onchange?: (event: Event) => void;
    onblur?: (event: FocusEvent) => void;
    onfocus?: (event: FocusEvent) => void;
    onkeydown?: (event: KeyboardEvent) => void;
    onkeyup?: (event: KeyboardEvent) => void;
    onmouseenter?: (event: MouseEvent) => void;
    onmouseleave?: (event: MouseEvent) => void;
    onsubmit?: (event: Event) => void;
    [key: `on${string}`]: ((event: any) => void) | undefined;
  }

  interface HtmlProps extends BaseProps, EventProps {
    [key: string]: any;
  }

  interface Route {
    path: string;
    component: ComponentFunction | (() => Promise<ComponentFunction>);
  }

  interface RouterOutlet extends HTMLElement {
    params: Signal<Record<string, string>>;
    to: (path: string) => void;
    back: () => void;
    path: () => string;
  }

  function $<T>(initial: T, key?: string): Signal<T>;
  function $<T>(computed: () => T): ComputedSignal<T>;
  function $$<T extends object>(obj: T): T;

  function $watch(
    target: () => any,
    fn?: never
  ): Unsubscribe;
  function $watch(
    target: Array<() => any>,
    fn: () => void
  ): Unsubscribe;

  function $html(
    tag: string,
    props?: HtmlProps | ComponentChildren,
    content?: ComponentChildren
  ): HTMLElement;

  interface Transition {
    in: (el: HTMLElement) => void;
    out: (el: HTMLElement, done: () => void) => void;
  }

  function $if(
    condition: boolean | (() => boolean),
    thenVal: ComponentFunction | ComponentChild,
    otherwiseVal?: ComponentFunction | ComponentChild,
    transition?: Transition
  ): HTMLDivElement;

  namespace $if {
    function not(
      condition: boolean | (() => boolean),
      thenVal: ComponentFunction | ComponentChild,
      otherwiseVal?: ComponentFunction | ComponentChild
    ): HTMLDivElement;
  }

  function $for<T>(
    source: T[] | (() => T[]),
    render: (item: T, index: number) => ComponentChild,
    keyFn?: (item: T, index: number) => string | number,
    tag?: string,
    props?: HtmlProps
  ): HTMLElement;

  function $router(routes: Route[]): RouterOutlet;

  function $mount(
    component: ComponentFunction | HTMLElement,
    target: string | HTMLElement
  ): ViewInstance | undefined;

  const Div: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Span: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const P: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const H1: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const H2: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const H3: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const H4: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const H5: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const H6: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Button: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Input: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Textarea: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Select: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Option: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Label: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Form: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const A: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Img: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Ul: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Ol: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Li: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Nav: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Header: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Footer: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Section: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Article: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Aside: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Main: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Table: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Thead: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Tbody: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Tr: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Th: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;
  const Td: (props?: HtmlProps | ComponentChildren, content?: ComponentChildren) => HTMLElement;

  const SigPro: {
    $: typeof $;
    $$: typeof $$; 
    $watch: typeof $watch;
    $html: typeof $html;
    $if: typeof $if;
    $for: typeof $for;
    $router: typeof $router;
    $mount: typeof $mount;
  };
}

export declare global {
  const $: typeof import('sigpro').$;
  const $$: typeof import('sigpro').$$;
  const $watch: typeof import('sigpro').$watch;
  const $html: typeof import('sigpro').$html;
  const $if: typeof import('sigpro').$if;
  const $for: typeof import('sigpro').$for;
  const $router: typeof import('sigpro').$router;
  const $mount: typeof import('sigpro').$mount;
  
  const Div: typeof import('sigpro').Div;
  const Span: typeof import('sigpro').Span;
  const P: typeof import('sigpro').P;
  const H1: typeof import('sigpro').H1;
  const H2: typeof import('sigpro').H2;
  const H3: typeof import('sigpro').H3;
  const H4: typeof import('sigpro').H4;
  const H5: typeof import('sigpro').H5;
  const H6: typeof import('sigpro').H6;
  const Button: typeof import('sigpro').Button;
  const Input: typeof import('sigpro').Input;
  const Textarea: typeof import('sigpro').Textarea;
  const Select: typeof import('sigpro').Select;
  const Option: typeof import('sigpro').Option;
  const Label: typeof import('sigpro').Label;
  const Form: typeof import('sigpro').Form;
  const A: typeof import('sigpro').A;
  const Img: typeof import('sigpro').Img;
  const Ul: typeof import('sigpro').Ul;
  const Ol: typeof import('sigpro').Ol;
  const Li: typeof import('sigpro').Li;
  const Nav: typeof import('sigpro').Nav;
  const Header: typeof import('sigpro').Header;
  const Footer: typeof import('sigpro').Footer;
  const Section: typeof import('sigpro').Section;
  const Article: typeof import('sigpro').Article;
  const Aside: typeof import('sigpro').Aside;
  const Main: typeof import('sigpro').Main;
  const Table: typeof import('sigpro').Table;
  const Thead: typeof import('sigpro').Thead;
  const Tbody: typeof import('sigpro').Tbody;
  const Tr: typeof import('sigpro').Tr;
  const Th: typeof import('sigpro').Th;
  const Td: typeof import('sigpro').Td;
  
  interface Window {
    $: typeof $;
    $$: typeof $$;
    $watch: typeof $watch;
    $html: typeof $html;
    $if: typeof $if;
    $for: typeof $for;
    $router: typeof $router;
    $mount: typeof $mount;
    SigPro: typeof import('sigpro').default;
    Div: typeof Div;
    Span: typeof Span;
    P: typeof P;
    H1: typeof H1;
    H2: typeof H2;
    H3: typeof H3;
    H4: typeof H4;
    H5: typeof H5;
    H6: typeof H6;
    Button: typeof Button;
    Input: typeof Input;
    Textarea: typeof Textarea;
    Select: typeof Select;
    Option: typeof Option;
    Label: typeof Label;
    Form: typeof Form;
    A: typeof A;
    Img: typeof Img;
    Ul: typeof Ul;
    Ol: typeof Ol;
    Li: typeof Li;
    Nav: typeof Nav;
    Header: typeof Header;
    Footer: typeof Footer;
    Section: typeof Section;
    Article: typeof Article;
    Aside: typeof Aside;
    Main: typeof Main;
    Table: typeof Table;
    Thead: typeof Thead;
    Tbody: typeof Tbody;
    Tr: typeof Tr;
    Th: typeof Th;
    Td: typeof Td;
  }
}