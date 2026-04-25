# Global Tag Helpers

In **SigPro**, you don't need to manually type `h('div', ...)` for every element. To keep your code declarative and readable, the engine automatically generates **helper functions** for all standard HTML5 tags upon initialization.

## 1. How it Works

SigPro iterates through a list of standard HTML tags and attaches a wrapper function for each one directly to the `window` object. This creates a specialized **DSL** (Domain Specific Language) that looks like a template engine but is **100% standard JavaScript**.

* **Under the hood:** `h('button', { onclick: ... }, 'Click')`
* **SigPro Style:** `button({ onclick: ... }, 'Click')`

> **Note:** All tag helpers are **lowercase** (e.g. `div`, `span`, `button`). PascalCase versions (`Div`, `Span`, `Button`) are **not** created. This keeps the syntax close to raw HTML.

---

## 2. The Complete Global Registry

The following functions are injected into the global scope using **lowercase** names to match HTML tags:

| Category | Available Global Functions |
| :--- | :--- |
| **Structure** | `div`, `span`, `p`, `section`, `nav`, `main`, `header`, `footer`, `article`, `aside` |
| **Typography** | `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `strong`, `em`, `code`, `pre`, `small`, `b`, `u`, `mark` |
| **Interactive** | `button`, `a`, `label`, `br`, `hr`, `details`, `summary`, `dialog` |
| **Forms** | `form`, `input`, `select`, `option`, `textarea`, `fieldset`, `legend` |
| **Tables** | `table`, `thead`, `tbody`, `tr`, `th`, `td`, `tfoot`, `caption` |
| **Media** | `img`, `canvas`, `video`, `audio`, `svg`, `iframe`, `picture`, `source` |

Full list includes: `a`, `abbr`, `article`, `aside`, `audio`, `b`, `blockquote`, `br`, `button`, `canvas`, `caption`, `cite`, `code`, `col`, `colgroup`, `datalist`, `dd`, `del`, `details`, `dfn`, `dialog`, `div`, `dl`, `dt`, `em`, `embed`, `fieldset`, `figcaption`, `figure`, `footer`, `form`, `h1`…`h6`, `header`, `hr`, `i`, `iframe`, `img`, `input`, `ins`, `kbd`, `label`, `legend`, `li`, `main`, `mark`, `meter`, `nav`, `object`, `ol`, `optgroup`, `option`, `output`, `p`, `picture`, `pre`, `progress`, `section`, `select`, `slot`, `small`, `source`, `span`, `strong`, `sub`, `summary`, `sup`, `svg`, `table`, `tbody`, `td`, `template`, `textarea`, `tfoot`, `th`, `thead`, `time`, `tr`, `u`, `ul`, `video`.

---

## 3. Usage Patterns

SigPro tag helpers are flexible. They automatically detect if you are passing attributes, children, or both.

### A. Attributes + Children

```javascript
div({ class: 'container', id: 'main' }, [
  h1("Welcome to SigPro"),
  p("The zero-VDOM framework.")
]);
```

### B. Children Only

If you don't need attributes, you can pass the content directly as the first argument.

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

SigPro automatically bridges the **signal** and the **input element** bidirectionally when you assign a signal to `value` or `checked`.

```javascript
const search = $("");

input({ 
  type: "text", 
  placeholder: "Search...",
  value: search 
});
```

> **Pro Tip:** If you want an input to be **read‑only** but still reactive, wrap the signal in an anonymous function: `value: () => search()`. This prevents backward synchronization.

### Dynamic Children

You can pass a function as a child – it will be re‑executed whenever any signal inside changes, and the DOM will be patched surgically.

```javascript
const count = $(0);

div([
  p(() => `Count is ${count()}`),
  button({ onClick: () => count(count() + 1) }, "Increment")
]);
```

---

## 5. Custom Components with `h()`

While the global tag helpers cover all standard HTML tags, you can create reusable components using the `h` function directly (or by returning the result of tag helpers).

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
| Standard tags (`div`, `span`, `button`) | Use global helpers: `div()`, `span()`, `button()` |
| Dynamic tag names (unknown at write time) | Use `h(tagName, props, children)` |
| Components returning a single node | Any function that returns a node (using helpers or `h`) |

> **Auto‑cleanup:** All tag helpers and `h` automatically dispose effects, event listeners, and nested components when removed from the DOM.

---

## 7. Complete Example

```javascript
const App = () =>
  div({ class: "app" }, [
    h1("Welcome"),
    input({ 
      placeholder: "Your name", 
      value: nameSignal,
      onInput: (e) => nameSignal(e.target.value)
    }),
    p(() => `Hello, ${nameSignal() || "stranger"}!`),
    button({ onClick: () => alert("Clicked") }, "Click me")
  ]);

mount(App, '#app');
```

---

<div class="alert alert-info">
  <div>
    <h3>Important Notes</h3>
    <ul>
      <li><b>Naming:</b> All tag helpers are <b>lowercase</b>. There are no PascalCase helpers (<code>Div</code>, <code>Button</code>).</li>
      <li><b>Global availability:</b> After importing SigPro (via <code>import 'sigpro'</code> or CDN), all helpers are on <code>window</code>. You can use them anywhere without importing.</li>
      <li><b>Custom components:</b> Use PascalCase for your own component functions to visually distinguish them from built‑in tags (e.g., <code>UserCard</code>).</li>
    </ul>
  </div>
</div>

---

## 8. Summary

| Feature | Description |
| :--- | :--- |
| **Tag helpers** | Lowercase functions for every HTML element (e.g., `div()`, `button()`). |
| **Reactive attributes** | Pass a function to any attribute to keep it synced. |
| **Two‑way binding** | Assign a signal directly to `value` or `checked` on form elements. |
| **Dynamic children** | Pass a function as a child for live updating content. |
| **Auto‑cleanup** | All effects, events, and children are disposed when the element is removed. |