# Global Tag Helpers

In **SigPro**, you don't need to manually type `h('div', ...)` for every element. To keep your code declarative and readable, the engine provides **helper functions** for all standard HTML5 tags.

## 1. How it Works

SigPro iterates through a list of standard HTML tags and creates a wrapper function for each one.  
- **Under the hood:** `h('button', { onclick: ... }, 'Click')`  
- **SigPro Style:** `button({ onclick: ... }, 'Click')`

> **Note:** All tag helpers are **lowercase** (e.g., `div`, `span`, `button`). This keeps the syntax close to raw HTML.

These helpers can be used in two ways, depending on your environment:

### Mode A: Classic (IIFE) – Auto‑global  
When you load the **IIFE bundle** (`sigpro.js`) with a traditional `<script>` tag (no `type="module"`), all tag helpers are automatically injected into the `window` object.  
```html
<script src="https://cdn.jsdelivr.net/npm/sigpro@1.2.19/dist/sigpro.js"></script>
<script>
  // div, span, button, ... are already global
  const App = () => div({ class: "card" }, "Hello");
</script>
```

### Mode B: ESM (Modern) – Explicit or Imported  
When you import the **ES module** (via `import` or CDN with `type="module"`), nothing is added to `window` by default. You have two options:

1. **Manual global injection** – import `sigpro` and call it:  
   ```javascript
   import { sigpro } from 'sigpro';
   sigpro();   // now div, span, button, etc. become global
   ```
2. **Named imports** (recommended) – import the helpers you need directly:  
   ```javascript
   import { div, span, button } from 'sigpro';
   // use them directly
   ```

---

## 2. The Complete List of Tag Helpers

All helpers are **lowercase** and follow HTML5 tag names. You can use them globally (after injection) or import them individually.

| Category | Available functions |
| :--- | :--- |
| **Structure** | `div`, `span`, `p`, `section`, `nav`, `main`, `header`, `footer`, `article`, `aside` |
| **Typography** | `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `strong`, `em`, `code`, `pre`, `small`, `b`, `u`, `mark` |
| **Interactive** | `button`, `a`, `label`, `br`, `hr`, `details`, `summary`, `dialog` |
| **Forms** | `form`, `input`, `select`, `option`, `textarea`, `fieldset`, `legend` |
| **Tables** | `table`, `thead`, `tbody`, `tr`, `th`, `td`, `tfoot`, `caption` |
| **Media** | `img`, `canvas`, `video`, `audio`, `svg`, `iframe`, `picture`, `source` |

Full list includes all standard tags: `a`, `abbr`, `article`, `aside`, `audio`, `b`, `blockquote`, `br`, `button`, `canvas`, `caption`, `cite`, `code`, `col`, `colgroup`, `datalist`, `dd`, `del`, `details`, `dfn`, `dialog`, `div`, `dl`, `dt`, `em`, `embed`, `fieldset`, `figcaption`, `figure`, `footer`, `form`, `h1`…`h6`, `header`, `hr`, `i`, `iframe`, `img`, `input`, `ins`, `kbd`, `label`, `legend`, `li`, `main`, `mark`, `meter`, `nav`, `object`, `ol`, `optgroup`, `option`, `output`, `p`, `picture`, `pre`, `progress`, `section`, `select`, `slot`, `small`, `source`, `span`, `strong`, `sub`, `summary`, `sup`, `svg`, `table`, `tbody`, `td`, `template`, `textarea`, `tfoot`, `th`, `thead`, `time`, `tr`, `u`, `ul`, `video`.

---

## 3. Usage Patterns

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

## 4. Reactive Power

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

## 5. Custom Components with `h()` or Tag Helpers

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

## 6. Comparison with `h()`

| Use case | Recommendation |
| :--- | :--- |
| Standard tags (`div`, `span`, `button`) | Use tag helpers: `div()`, `span()`, `button()` |
| Dynamic tag names (unknown at write time) | Use `h(tagName, props, children)` |
| Components returning a single node | Any function that returns a node (using helpers or `h`) |

> **Auto‑cleanup:** All tag helpers and `h` automatically dispose effects, event listeners, and nested components when removed from the DOM.

---

## 7. Complete Example

```javascript
// In a modern ESM environment (recommended)
import { div, h1, input, p, button, mount, $ } from 'sigpro';

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

Or using the classic script (auto‑global):

```html
<script src="https://cdn.jsdelivr.net/npm/sigpro@1.2.19/dist/sigpro.js"></script>
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

---

## 8. Important Notes

- **Naming:** All tag helpers are **lowercase**.  
- **Global availability:**  
  - **IIFE script** → automatically on `window`.  
  - **ESM module** → not global by default; use `import { div } from 'sigpro'` or call `sigpro()` to inject all globals.  
- **Custom components:** Use **PascalCase** for your own component functions (e.g., `UserCard`) to visually distinguish them from built‑in tags.

---

## 9. Summary

| Feature | Description |
| :--- | :--- |
| **Tag helpers** | Lowercase functions for every HTML element (e.g., `div()`, `button()`). |
| **Availability** | Auto‑global in IIFE; in ESM use named imports or `sigpro()`. |
| **Reactive attributes** | Pass a function to any attribute to keep it synced. |
| **Two‑way binding** | Assign a signal directly to `value` or `checked` on form elements. |
| **Dynamic children** | Pass a function as a child for live updating content. |
| **Auto‑cleanup** | All effects, events, and children are disposed when the element is removed. |
