# Global Tag Helpers

In SigPro you don't need to type `h('div', ...)` for every element. To keep your code declarative and readable, the engine ships a **tag helper factory** for all standard HTML5 tags.

## 1. How It Works

SigPro creates a wrapper function for each standard HTML tag, all pointing to `h`.

- **Under the hood:** `h('button', { onclick: ... }, 'Click')`
- **SigPro style:** `button({ onclick: ... }, 'Click')`

> **Note:** Tag helpers are **not registered automatically**. Call `exposeTags()` once at startup to make them available on `window`.

```javascript
import { exposeTags } from 'sigpro';

exposeTags(); // now window.div, window.button, window.span, etc. exist
```

If you prefer to avoid globals, import them from the module instead:

```javascript
import { div, button, span } from 'sigpro';
```

Or use `h('div', ...)` directly — it's perfectly fine and works identically.

> **Auto-cleanup:** All tag helpers and `h` automatically track effects and event listeners on their nodes. When the node is removed via `unmount()`, a reactive child swap, or a scope dispose, its listeners and scopes are cleaned up. For external resources (`setInterval`, sockets), return a cleanup from an `effect()`.

---

## 2. The Complete List of Tag Helpers

All helpers are **lowercase** and follow HTML5 tag names.

| Category | Available functions |
| :--- | :--- |
| **Structure** | `div`, `span`, `p`, `section`, `nav`, `main`, `header`, `footer`, `article`, `aside` |
| **Typography** | `h1`…`h6`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `strong`, `em`, `code`, `pre`, `small`, `b`, `u`, `mark` |
| **Interactive** | `button`, `a`, `label`, `br`, `hr`, `details`, `summary`, `dialog` |
| **Forms** | `form`, `input`, `select`, `option`, `textarea`, `fieldset`, `legend` |
| **Tables** | `table`, `thead`, `tbody`, `tr`, `th`, `td`, `tfoot`, `caption` |
| **Media** | `img`, `canvas`, `video`, `audio`, `iframe`, `picture`, `source` |

Full list: `a`, `abbr`, `article`, `aside`, `audio`, `b`, `blockquote`, `br`, `button`, `canvas`, `caption`, `cite`, `code`, `col`, `colgroup`, `datalist`, `dd`, `del`, `details`, `dfn`, `dialog`, `div`, `dl`, `dt`, `em`, `embed`, `fieldset`, `figcaption`, `figure`, `footer`, `form`, `h1`…`h6`, `header`, `hr`, `i`, `iframe`, `img`, `input`, `ins`, `kbd`, `label`, `legend`, `li`, `main`, `mark`, `meter`, `nav`, `object`, `ol`, `optgroup`, `option`, `output`, `p`, `picture`, `pre`, `progress`, `section`, `select`, `slot`, `small`, `source`, `span`, `strong`, `sub`, `summary`, `sup`, `table`, `tbody`, `td`, `template`, `textarea`, `tfoot`, `th`, `thead`, `time`, `tr`, `u`, `ul`, `video`.

> **SVG is not in the global list.** SVG tags (`svg`, `path`, `circle`, `g`, `defs`, `linearGradient`, ...) are **detected by name in `h()`** and use the correct namespace automatically. Use `h('path', {...})` or import `svg` from the module. The auto-detection works even without `exposeTags()`.

---

## 3. Usage Patterns

### A. Attributes + Children

```javascript
div({ class: 'container', id: 'main' }, [
  h1('Welcome to SigPro'),
  p('The zero-VDOM library.')
]);
```

Children are **variadic**. Both styles are equivalent:

```javascript
// Array as the last argument (flattened)
div({ class: 'container' }, [h1('Title'), p('Body')]);

// Variadic
div({ class: 'container' }, h1('Title'), p('Body'));
```

### B. Children Only

If you don't need attributes, pass the content directly as the first argument. `h()` detects non-object first arguments and treats them as children.

```javascript
section(
  h2('Clean Syntax'),
  button('I have no props!')
);
```

Or with an array:

```javascript
section([
  h2('Clean Syntax'),
  button('I have no props!')
]);
```

### C. Reactive Attributes

Pass a function as an attribute value to keep it dynamic. The effect updates the DOM directly.

```javascript
const count = signal(0);

div({
  class: () => `badge ${count() > 0 ? 'active' : ''}`,
  style: () => count() > 10 ? 'color: red' : ''
});
```

### D. Reactive Children

Pass a function as a child. It re-runs on dependency change and only the affected nodes are swapped.

```javascript
div({}, () => count() > 0 ? span('positive') : span('zero or negative'));
```

---

## 4. Custom Components with `h()` or Tag Helpers

Tag helpers cover all standard HTML tags. Reusable components are just functions that return nodes.

### Basic Component

```javascript
const UserCard = (props, children) =>
  div({ class: 'card p-4', 'data-id': props.id }, children);

UserCard({ id: 123 }, [h3('John Doe'), p('john@example.com')]);
```

- **`props`** is the first argument (the object you pass when calling `h(UserCard, {...})` or `UserCard({...})`).
- **`children`** is the second argument, always an **array**, even when empty.

### Reactive Component

```javascript
import { signal } from 'sigpro';

const Counter = () => {
  const count = signal(0);
  return div({ class: 'flex gap-2' }, [
    button({ onclick: () => count(count() - 1) }, '-'),
    span(() => count()),
    button({ onclick: () => count(count() + 1) }, '+')
  ]);
};
```

Note that the component function itself does **not** re-execute when `count` changes. Only the reactive child `() => count()` updates the DOM.

### Cleanup for External Resources

For intervals, sockets, third-party libraries, register a cleanup by returning a function from an `effect()`:

```javascript
import { signal, effect } from 'sigpro';

const Timer = () => {
  const time = signal(new Date().toLocaleTimeString());

  effect(() => {
    const id = setInterval(() => {
      time(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(id); // ← runs on scope dispose
  });

  return span(() => time());
};
```

`effect` inside a component is bound to that component's scope. When the component is unmounted, the effect is disposed, the cleanup runs, and the interval is cleared.

---

## 5. Event Handlers

Event props are ordinary props whose name starts with `on`. The suffix is case-insensitive:

- `onclick`, `onClick`, `onCLICK` — all become `addEventListener('click', fn)`.

**Recommended style**: use **lowercase** (`onclick`, `oninput`, `onkeydown`) to match the DOM spec and HTML convention. It also keeps consistency across all handlers.

```javascript
button({ onclick: () => count(count() + 1) }, '+1');

input({ oninput: e => name(e.target.value) });

textarea({ onkeydown: e => e.key === 'Tab' && e.preventDefault() });
```

Listeners are stored on the element (`el._cln`) and removed automatically when the node is cleaned up via `unmount()`, a reactive child swap, or a scope dispose.

---

## 6. Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Register tag helpers as globals | `exposeTags()` |
| Use a specific tag | `div(props, ...children)` |
| Use only children | `div('Hello')` or `div([a, b])` |
| Reactive attribute | `class: () => active() ? 'on' : 'off'` |
| Reactive style | `style: () => open() ? '' : 'display:none'` |
| Reactive child | `div({}, () => cond() ? A() : B())` |
| Event handler | `onclick: fn`, `oninput: fn` (lowercase) |
| Custom component | `const Card = (props, children) => div(props, children)` |
| External cleanup | `effect(() => { ...; return () => cleanup() })` |
| SVG element | `h('path', { d: '...' })` (auto-namespaced) |
