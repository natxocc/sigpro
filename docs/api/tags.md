# Global Tag Helpers

In **SigPro**, you don't need to manually type `h('div', ...)` for every element. To keep your code declarative and readable, the engine provides **helper functions** for all standard HTML5 tags.

## 1. How it Works

SigPro creates a wrapper function for each standard HTML tag.  
- **Under the hood:** `h('button', { onclick: ... }, 'Click')`  
- **SigPro Style:** `button({ onclick: ... }, 'Click')`

> **Note:** All tag helpers are **lowercase** (e.g., `div`, `span`, `button`) and can be used directly once globally enabled.

---

## 2. Activating the Tag Helpers

Depending on how you load SigPro, the activation varies:

### A. Classic IIFE – Automatic Global Helpers  
When you use the **IIFE bundle** (`sigpro.js` or `sigpro.min.js`) with a traditional `<script>` tag (no `type="module"`), **all tag helpers, signals, and XSS protection are automatically installed on `window`**. No extra steps needed.

```html
<script src="https://cdn.jsdelivr.net/npm/sigpro@latest/dist/sigpro.min.js"></script>
<script>
  // div, span, button, $, h, mount, router... are already global
  const App = () => div({ class: "card" }, "Hello");
  mount(App, '#app');
</script>
```

### B. ESM (Modern JavaScript) – Explicit Activation  
When you import the **ES module** (`import { ... } from 'sigpro'`), the core **does not** add helpers to `window` by default. To enable global tags, import the dedicated side‑effect module:

```js
import { sigpro } from 'sigpro';
sigpro(); // tags helpers available in global also core functions

// Now you can use helpers globally
const App = () => div({ class: "app" }, "Ready!");
```

> **Important:** The tag helpers are **not** exported as individual named exports from the core (`sigpro`). They become available as global functions (`window.div`, etc.) after the side‑effect runs.  
> If you prefer to avoid globals, you can always use `h('div', ...)` directly—it’s perfectly fine.

---

## 3. The Complete List of Tag Helpers

All helpers are **lowercase** and follow HTML5 tag names.

| Category | Available functions |
| :--- | :--- |
| **Structure** | `div`, `span`, `p`, `section`, `nav`, `main`, `header`, `footer`, `article`, `aside` |
| **Typography** | `h1`…`h6`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `strong`, `em`, `code`, `pre`, `small`, `b`, `u`, `mark` |
| **Interactive** | `button`, `a`, `label`, `br`, `hr`, `details`, `summary`, `dialog` |
| **Forms** | `form`, `input`, `select`, `option`, `textarea`, `fieldset`, `legend` |
| **Tables** | `table`, `thead`, `tbody`, `tr`, `th`, `td`, `tfoot`, `caption` |
| **Media** | `img`, `canvas`, `video`, `audio`, `svg`, `iframe`, `picture`, `source` |

Full list: `a`, `abbr`, `article`, `aside`, `audio`, `b`, `blockquote`, `br`, `button`, `canvas`, `caption`, `cite`, `code`, `col`, `colgroup`, `datalist`, `dd`, `del`, `details`, `dfn`, `dialog`, `div`, `dl`, `dt`, `em`, `embed`, `fieldset`, `figcaption`, `figure`, `footer`, `form`, `h1`…`h6`, `header`, `hr`, `i`, `iframe`, `img`, `input`, `ins`, `kbd`, `label`, `legend`, `li`, `main`, `mark`, `meter`, `nav`, `object`, `ol`, `optgroup`, `option`, `output`, `p`, `picture`, `pre`, `progress`, `section`, `select`, `slot`, `small`, `source`, `span`, `strong`, `sub`, `summary`, `sup`, `svg`, `table`, `tbody`, `td`, `template`, `textarea`, `tfoot`, `th`, `thead`, `time`, `tr`, `u`, `ul`, `video`.

---

## 4. Usage Patterns

### A. Attributes + Children

```javascript
div({ class: 'container', id: 'main' }, [
  h1("Welcome to SigPro"),
  p("The zero‑VDOM framework.")
]);
```

### B. Children Only

If you don't need attributes, pass the content directly as the first argument.

```javascript
section([
  h2("Clean Syntax"),
  button("I have no props!")
]);
```

---

## 5. Reactive Power

These helpers are natively wired into SigPro's reactivity system.

### Reactive Attributes (One‑Way)

Pass a **function** that returns the value. SigPro creates an internal effect to keep the DOM in sync.

```javascript
const theme = $("light");

div({ 
  class: () => `app-box ${theme()}` 
}, "Themeable Box");
```

### Two‑Way Binding (Automatic)

Assign a **signal** directly to `value` or `checked` on form inputs – SigPro automatically bridges the signal and the input element bidirectionally.

```javascript
const search = $("");

input({ 
  type: "text", 
  placeholder: "Search...",
  value: search 
});
```

> **Pro Tip:** To make an input **read‑only** but still reactive, wrap the signal in a function: `value: () => search()` – this prevents backward synchronization.

### Dynamic Children

You can pass a **function as a child** – it will be re‑executed whenever any signal inside changes, and the DOM will be patched surgically.

```javascript
const count = $(0);

div([
  p(() => `Count is ${count()}`),
  button({ onClick: () => count(count() + 1) }, "Increment")
]);
```

---

## 6. Custom Components with `h()` or Tag Helpers

While the tag helpers cover all standard HTML tags, you can create reusable components using them directly.

### Basic Component

```javascript
const UserCard = (props, children) => 
  div({ class: 'card p-4', 'data-id': props.id }, children);

UserCard({ id: 123 }, [h3("John Doe"), p("john@example.com")]);
```

### Reactive Component

```javascript
const Counter = () => {
  const count = $(0);
  return div({ class: 'flex gap-2' }, [
    button({ onClick: () => count(count() - 1) }, '-'),
    span(() => count()),
    button({ onClick: () => count(count() + 1) }, '+')
  ]);
};
```

### Manual Cleanup for External Resources

Only needed for intervals, sockets, third‑party libraries:

```javascript
const Timer = () => {
  const time = $(new Date().toLocaleTimeString());
  const el = span(() => time());
  
  const interval = setInterval(() => time(new Date().toLocaleTimeString()), 1000);
  onUnmount(() => clearInterval(interval));
  
  return el;
};
```

---

## 7. Comparison with `h()`

| Use case | Recommendation |
| :--- | :--- |
| Standard tags (`div`, `span`, `button`) | Use tag helpers: `div()`, `span()`, `button()` |
| Dynamic tag names (unknown at write time) | Use `h(tagName, props, children)` |
| Components returning a single node | Any function that returns a node (using helpers or `h`) |

> **Auto‑cleanup:** All tag helpers and `h` automatically dispose effects, event listeners, and nested components when removed from the DOM.

---

## 8. Complete Example

### ESM (modern projects)

```javascript
import { sigpro } from 'sigpro';
sigpro(); // tags helpers available in global also core functions

const nameSignal = $('');

const App = () =>
  div({ class: "app" }, [
    h1("Welcome"),
    input({ 
      placeholder: "Your name", 
      value: nameSignal
    }),
    p(() => `Hello, ${nameSignal() || "stranger"}!`),
    button({ onClick: () => alert("Clicked") }, "Click me")
  ]);

mount(App, '#app');
```

### Classic IIFE (auto‑global)

```html
<script src="https://cdn.jsdelivr.net/npm/sigpro@1.2.23/dist/sigpro.min.js"></script>
<script>
  const nameSignal = $('');
  const App = () => div({ class: "app" }, [
    h1("Welcome"),
    input({ placeholder: "Your name", value: nameSignal }),
    p(() => `Hello, ${nameSignal() || "stranger"}!`),
    button({ onClick: () => alert("Clicked") }, "Click me")
  ]);
  mount(App, '#app');
</script>
```

