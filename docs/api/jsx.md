# Hyperscript & Tag Helpers & JSX Style

SigPro provides two complementary ways to create DOM elements:

1. **The `h` function** – the low‑level DOM builder.
2. **Global Tag Helpers** (e.g., `div()`, `button()`, `span()`) – a convenient DSL built on top of `h`.

Both are reactive, auto‑cleanup, and support SVG, events, two‑way binding, and dynamic children.

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
