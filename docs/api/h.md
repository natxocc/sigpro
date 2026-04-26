# Hyperscript Function: `h( )`

The `h` function is the **core DOM builder** of SigPro. It creates DOM elements from a tag name, props, and children. While the global tag helpers (`div()`, `button()`, etc.) are built on top of `h`, you may need `h` directly for dynamic tag names or when you prefer an explicit function style.

> **Availability:** `h` and all tag helpers (`div`, `button`, etc.) are exported from the SigPro module. In **ESM** you must import them (`import { h, div, button } from 'sigpro'`) or inject all globals via `sigpro()`. In the **IIFE** classic script, `h` and all tag helpers are automatically available on `window`. The examples below assume the functions are already in scope.

## Function Signature

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
| **`props`** | `object` | Optional. Attributes, event handlers, refs, etc. If not an object, it becomes `children`. |
| **`children`** | `any` | Optional. Text, nodes, arrays, or reactive functions. |

**Returns:** A DOM node (or an array of nodes when the tag is a component that returns an array).

---

## Usage Patterns

### 1. Basic Element Creation

```javascript
// Simple div with text
h('div', {}, 'Hello world');

// With attributes
h('button', { class: 'btn', onclick: () => alert('clicked') }, 'Click me');
```

### 2. Nested Children

Children can be a single node, an array, or a function.

```javascript
h('div', { class: 'container' }, [
  h('h1', {}, 'Title'),
  h('p', {}, 'Paragraph text')
]);
```

### 3. Reactive Children

Pass a **function** as a child – it will be re‑evaluated whenever any signal inside changes, and the DOM will be patched surgically.

```javascript
const count = $(0);

h('div', {}, [
  h('p', {}, () => `Count: ${count()}`),
  h('button', { onclick: () => count(count() + 1) }, '+1')
]);
```

### 4. Reactive Attributes

Pass a function as an attribute value to keep it dynamic.

```javascript
const theme = $('dark');

h('div', { class: () => `box ${theme()}` }, 'Themed box');
```

### 5. Two‑Way Binding

Assign a signal directly to `value` or `checked` on form elements – SigPro automatically syncs both ways.

```javascript
const name = $('');

h('input', {
  type: 'text',
  value: name,        // two-way binding
  placeholder: 'Your name'
});
h('p', {}, () => `Hello, ${name()}`);
```

### 6. Component Functions as `tag`

You can pass a component function directly to `h`. SigPro will execute it with the provided props and an `emit` helper for custom events.

```javascript
const Button = (props, { children }) =>
  h('button', { class: 'btn', onclick: props.onClick }, children);

const App = () =>
  h('div', {}, [
    h(Button, { onClick: () => alert('clicked') }, 'Custom button')
  ]);
```

### 7. SVG Elements

Use `h` with SVG tag names – SigPro automatically applies the correct namespace.

```javascript
h('svg', { width: 100, height: 100 }, [
  h('circle', { cx: 50, cy: 50, r: 40, fill: 'red' })
]);
```

---

## Special Props

| Prop | Behaviour |
| :--- | :--- |
| **`ref`** | `ref: (el) => ...` or `ref: { current: null }` – provides direct access to the DOM node after creation. |
| **`onEvent`** | Any prop starting with `on` (e.g., `onClick`, `onInput`) is treated as an event listener. Automatically removed on cleanup. |
| **`value` / `checked`** | When a signal is passed, creates two‑way binding for inputs, textareas, and selects. |
| **`class`** | You can use `class` (not `className`). Accepts a string or a reactive function. |

---

## `h` vs Tag Helpers

| Feature | `h('div', ...)` | `div(...)` (tag helper) |
| :--- | :--- | :--- |
| **Dynamic tag names** | ✅ `h(tagName, ...)` | ❌ Must know tag name at write time |
| **Explicit style** | More verbose | Cleaner, DSL‑like |
| **Availability** | Import or global | Import or global (same) |
| **Performance** | Identical | Identical (helpers call `h` internally) |

> **Recommendation:** Use tag helpers (`div()`, `button()`, etc.) for most cases – they are shorter and more readable. Use `h` directly only when the tag name is dynamic (e.g., `h(props.tag, ...)`). Remember that in ESM you need to import the helpers or call `sigpro()` to make them global.

---

## Complete Example

```javascript
import { $, h, mount } from 'sigpro';

const dynamicTag = $('h1');

const App = () =>
  h('div', { class: 'demo' }, [
    h(dynamicTag(), {}, () => `Current tag: ${dynamicTag()}`),
    h('button', { onclick: () => dynamicTag(dynamicTag() === 'h1' ? 'h2' : 'h1') }, 'Toggle heading size')
  ]);

mount(App, '#app');
```

---

## Summary

- `h` is the low‑level DOM builder used internally by all tag helpers.
- It supports reactive attributes, reactive children, two‑way binding, event listeners, and SVG.
- Use `h` directly when you need a **dynamic tag name**; otherwise, prefer the convenient tag helpers (import them or inject globally).
- Components written with `h` are fully reactive and automatically cleaned up.
