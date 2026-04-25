Aquí tienes el archivo `h.md` actualizado, que ahora incluye:

- La función `h` (hyperscript)
- Los helpers globales de etiquetas (lowercase)
- Una nueva sección sobre **JSX con SigPro** (configuración, ejemplos y alternativas como `htm`).

El documento está en inglés, como los originales, y listo para integrarse en tu documentación.

---

```markdown
# Hyperscript & Tag Helpers

SigPro provides two complementary ways to create DOM elements:

1. **The `h` function** – the low‑level DOM builder.
2. **Global Tag Helpers** (e.g., `div()`, `button()`, `span()`) – a convenient DSL built on top of `h`.

Both are reactive, auto‑cleanup, and support SVG, events, two‑way binding, and dynamic children.

---

## `h( )` – Hyperscript Function

The `h` function is the **core DOM builder** of SigPro. Use it directly when you need a dynamic tag name or prefer an explicit style.

### Function Signature

```typescript
h(
  tag: string | Function,
  props?: object | Node | any[],
  children?: any
): Node
```

| Parameter | Type | Description |
| :--- | :--- | :--- |
| **`tag`** | `string` or `Function` | HTML tag name (e.g., `"div"`) or a component function. |
| **`props`** | `object` | Optional. Attributes, event handlers, refs, etc. |
| **`children`** | `any` | Optional. Text, nodes, arrays, or reactive functions. |

**Returns:** A DOM node (or array of nodes when the tag is a component that returns an array).

### Usage Examples

```js
// Basic element
h('div', {}, 'Hello world');

// With attributes and events
h('button', { class: 'btn', onclick: () => alert('clicked') }, 'Click me');

// Nested children
h('div', { class: 'container' }, [
  h('h1', {}, 'Title'),
  h('p', {}, 'Paragraph')
]);

// Reactive child (function)
const count = $(0);
h('div', {}, [
  h('p', {}, () => `Count: ${count()}`),
  h('button', { onclick: () => count(count() + 1) }, '+1')
]);

// Reactive attribute
const theme = $('dark');
h('div', { class: () => `box ${theme()}` }, 'Themed box');

// Two-way binding on input
const name = $('');
h('input', { type: 'text', value: name, placeholder: 'Your name' });
h('p', {}, () => `Hello, ${name()}`);

// Component as tag
const Button = (props, { children }) =>
  h('button', { class: 'btn', onclick: props.onClick }, children);

h(Button, { onClick: () => alert('clicked') }, 'Click me');

// SVG (auto-namespace)
h('svg', { width: 100, height: 100 }, [
  h('circle', { cx: 50, cy: 50, r: 40, fill: 'red' })
]);
```

### Special Props

| Prop | Behaviour |
| :--- | :--- |
| **`ref`** | `ref: (el) => ...` or `ref: { current: null }` – direct DOM node access. |
| **`onEvent`** | Any prop starting with `on` (e.g., `onClick`) is an event listener – auto‑removed on cleanup. |
| **`value` / `checked`** | When a signal is passed, creates two‑way binding for form elements. |
| **`class`** | Use `class` (not `className`). Accepts a string or reactive function. |

---

## Global Tag Helpers (Lowercase)

When you import SigPro (either via `import 'sigpro'` or the CDN), it automatically injects a helper function for **every standard HTML tag** directly onto `window`. These helpers are **lowercase** and work exactly like `h`, but with a cleaner syntax.

### Available Helpers

All standard HTML5 tags: `div`, `span`, `p`, `section`, `nav`, `header`, `footer`, `h1`…`h6`, `ul`, `ol`, `li`, `button`, `a`, `input`, `form`, `table`, `svg`, `circle`, etc.

### Usage Examples

```js
// Instead of h('div', ...)
div({ class: 'container' }, 'Content');

// Children only (skip props)
section([
  h2('Title'),
  p('Paragraph')
]);

// Reactive attribute
const theme = $('light');
div({ class: () => `app-${theme()}` }, 'Themed');

// Two-way binding
const search = $('');
input({ type: 'text', value: search, placeholder: 'Search...' });
p(() => `You typed: ${search()}`);

// Dynamic children
const count = $(0);
div([
  p(() => `Count: ${count()}`),
  button({ onClick: () => count(count() + 1) }, '+1')
]);
```

### Complete Example

```js
const App = () =>
  div({ class: 'app' }, [
    h1('Welcome'),
    input({ value: name, placeholder: 'Your name' }),
    p(() => `Hello, ${name() || 'stranger'}!`),
    button({ onClick: () => alert('Hi') }, 'Click me')
  ]);

mount(App, '#app');
```

---

## JSX with SigPro

SigPro works seamlessly with JSX. You can use JSX as a compile‑time syntax sugar for `h` calls.

### Configuration

#### TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h",
    "jsxFragmentFactory": "Fragment"
  }
}
```

#### Vite

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragmentFactory: 'Fragment'
  }
})
```

#### Babel

```js
// babel.config.js
export default {
  plugins: [
    ['@babel/plugin-transform-react-jsx', {
      pragma: 'h',
      pragmaFrag: 'Fragment'
    }]
  ]
}
```

> **Note:** You need to import `h` and `Fragment` from SigPro in every JSX file, or make them global.

### JSX Example

```jsx
// App.jsx
import { $, h, Fragment, mount } from 'sigpro';

const Button = ({ onClick, children }) => (
  <button class="btn btn-primary" onclick={onClick}>
    {children}
  </button>
);

const App = () => {
  const count = $(0);

  return (
    <div class="container p-8">
      <h1 class="text-2xl font-bold">SigPro with JSX</h1>
      
      <Button onClick={() => count(count() + 1)}>
        Clicks: {() => count()}
      </Button>

      <Fragment>
        <p>Multiple elements</p>
        <p>Without extra wrapper</p>
      </Fragment>
    </div>
  );
};

mount(App, '#app');
```

### What Gets Compiled

Your JSX:
```jsx
<div class="container">
  <Button>Click</Button>
</div>
```

Compiles to:
```js
h('div', { class: "container" },
  h(Button, {}, "Click")
)
```

---

## Without a Build Step (CDN + Tag Helpers)

If you don’t want to configure a JSX compiler, you can use the global tag helpers directly. They are available after loading SigPro via CDN.

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import 'https://cdn.jsdelivr.net/npm/sigpro@1.2.18/+esm';
    // Now $, $$, watch, h, mount, div, button, etc. are global

    const count = $(0);
    const App = () =>
      div({ class: 'container' }, [
        h1(() => `Count: ${count()}`),
        button({ onClick: () => count(count() + 1) }, 'Increment')
      ]);

    mount(App, '#app');
  </script>
</head>
<body>
  <div id="app"></div>
</body>
</html>
```

---

## Template Literals Alternative (`htm`)

For a JSX‑like syntax without a build step, you can combine SigPro with [`htm`](https://github.com/developit/htm).

```js
import { $, h, mount } from 'https://cdn.jsdelivr.net/npm/sigpro@1.2.18/+esm';
import htm from 'https://esm.sh/htm';

const html = htm.bind(h); // bind to SigPro's h function

const App = () => {
  const count = $(0);
  
  return html`
    <div class="container">
      <h1>SigPro Demo</h1>
      <button onclick=${() => count(count() + 1)}>
        Clicks: ${() => count()}
      </button>
    </div>
  `;
};

mount(App, '#app');
```

---

## Summary Comparison

| Method | Build Step | Syntax | Recommended for |
| :--- | :--- | :--- | :--- |
| **`h` function** | Optional | `h('div', ...)` | Dynamic tag names, low‑level control |
| **Tag Helpers** | Optional | `div(...)` | Most cases – clean, simple, no build step |
| **JSX** | Required | `<div>...</div>` | Large projects, teams familiar with React syntax |
| **`htm`** | Optional | `` html`<div>...</div>` `` | Buildless but HTML‑like syntax |

> **Tip:** All approaches are fully reactive, support two‑way binding, events, SVG, and automatic cleanup. Choose the one that fits your workflow.
```

```