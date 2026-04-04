# JSX with SigPro

SigPro works seamlessly with JSX.

## Configuration

### TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "$html",
    "jsxFragmentFactory": "Fragment"
  }
}
```

### Vite

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxFactory: '$html',
    jsxFragmentFactory: 'Fragment'
  }
})
```

### Babel

```js
// babel.config.js
export default {
  plugins: [
    ['@babel/plugin-transform-react-jsx', {
      pragma: '$html',
      pragmaFrag: 'Fragment'
    }]
  ]
}
```

## Usage Example

```jsx
// App.jsx
import { $, $mount, Fragment } from 'sigpro';

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

$mount(App, '#app');
```

## What Gets Compiled

Your JSX:
```jsx
<div class="container">
  <Button>Click</Button>
</div>
```

Compiles to:
```javascript
$html('div', { class: "container" },
  $html(Button, {}, "Click")
)
```

## Without Build Step (CDN)

SigPro automatically injects `Div()`, `Button()`, `Span()`, and all other HTML tag helpers globally when loaded via CDN. `Fragment` is also available.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/sigpro"></script>
</head>
<body>
  <div id="app"></div>

  <script>
    const { $, $mount, Fragment } = SigPro;

    const App = () => {
      const count = $(0);

      return Div({ class: "container p-8" }, [
        H1({ class: "text-2xl font-bold" }, "SigPro Demo"),
        Button({ 
          class: "btn-primary",
          onclick: () => count(count() + 1) 
        }, () => `Clicks: ${count()}`),
        Fragment({}, [
          P({}, "Multiple elements"),
          P({}, "Without wrapper")
        ])
      ]);
    };

    $mount(App, '#app');
  </script>
</body>
</html>
```

## Template Literals Alternative (htm)

For a JSX-like syntax without a build step, use `htm`:

```javascript
import { $, $mount } from 'https://unpkg.com/sigpro';
import htm from 'https://esm.sh/htm';

const html = htm.bind($html);

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

$mount(App, '#app');
```

## Summary

| Method | Build Step | Syntax |
|--------|------------|--------|
| JSX | Required | `<div>...</div>` |
| CDN (Tag Helpers) | Optional | `Div({}, ...)` |
| htm | Optional | `` html`<div>...</div>` `` |

> [!TIP]
> **Recommendation:** Use JSX for large projects, CDN tag helpers (`Div()`, `Button()`) for simple projects, or htm for buildless projects that want HTML-like syntax.
