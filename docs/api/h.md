# Hyperscript Function: `h( )`

The `h` function is the **core DOM builder** of SigPro. It creates DOM elements from a tag name, props, and children. The global tag helpers (`div()`, `button()`, etc.) are thin wrappers around `h`, so anything you can do with them you can do with `h` directly — and vice versa.

> **Availability:** `h` and all tag helpers (`div`, `button`, etc.) are exported from the SigPro module. Call `exposeTags()` once at startup to register the tag helpers as globals (`window.div`, `window.button`, ...). The examples below assume `exposeTags()` has been called and `h` is in scope via import.

## Function Signature

```typescript
h(
  tag: string | ((props: any, children: Child[]) => Node | Node[] | null),
  props?: object | Child | null,
  ...children: Child[]
): Element | SVGElement | Node | Node[] | null
```

| Parameter | Type | Description |
| :--- | :--- | :--- |
| **`tag`** | `string` or `Function` | HTML/SVG tag name (e.g., `"div"`) or a component function. |
| **`props`** | `object` | Optional. Attributes, event handlers, `ref`, `html`, etc. If not a plain object, it is treated as the first child. |
| **`...children`** | `Child[]` | Optional. Text, nodes, arrays, or reactive functions. Variadic. |

**Returns:** A DOM node, or an array of nodes when the tag is a component that returns an array.

**SVG detection:** If `tag` is in the built-in SVG tag set (`svg`, `path`, `circle`, `g`, `defs`, `linearGradient`, ...), `h` uses `createElementNS` automatically. No `xmlns` prop required.

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

Children can be a single node, an array, or a mix. They are appended in order.

```javascript
h('div', { class: 'container' }, [
  h('h1', {}, 'Title'),
  h('p', {}, 'Paragraph text')
]);
```

### 3. Reactive Children

Pass a **function** as a child. It re-evaluates whenever any signal inside changes, and only the affected nodes are added/removed. No diffing, no virtual tree.

```javascript
import { signal } from 'sigpro';

const count = signal(0);

div({}, [
  p(() => `Count: ${count()}`),
  button({ onclick: () => count(count() + 1) }, '+1')
]);
```

### 4. Reactive Attributes

Pass a function as an attribute value to keep it dynamic. The effect re-runs on dependency change and updates the DOM directly.

```javascript
import { signal } from 'sigpro';

const theme = signal('dark');

div({ class: () => `box ${theme()}` }, 'Themed box');
```

### 5. Form Inputs (Explicit, Not Magic)

SigPro does **not** auto-bind `value` to signals. You wire the two directions explicitly:

```javascript
import { signal } from 'sigpro';

const name = signal('');

input({
  type: 'text',
  value: () => name(),
  oninput: (e) => name(e.target.value),
  placeholder: 'Your name'
});

p(() => `Hello, ${name()}`);
```

This is deliberate. Auto-binding hides behavior and breaks down the moment you need parse, format, or validation logic. Explicit is clearer and works identically for `input`, `textarea`, `select`, checkboxes, and radio groups.

### 6. Component Functions as `tag`

A component is just a function that receives `(props, children[])` and returns a node, an array of nodes, or `null`.

```javascript
const Button = (props, children) =>
  button({ class: 'btn', onclick: props.onClick }, children);

const App = () =>
  div({}, [
    Button({ onClick: () => alert('clicked') }, 'Custom button')
  ]);
```

**No `emit` helper.** Events flow through props: the parent passes `onX` and the child calls `props.onX(...)` directly. Simpler, no magic.

**Cleanup:** Component functions run inside a `effectScope`. When the component is unmounted, all its effects, listeners, and nested scopes are disposed automatically.

### 7. SVG Elements

SVG tags are detected by name. No namespace prop needed.

```javascript
svg({ width: 100, height: 100 }, [
  circle({ cx: 50, cy: 50, r: 40, fill: 'red' })
]);
```

Attributes and reactive bindings work the same as HTML — everything goes through `setAttribute` under the hood, which is the correct path for SVG.

---

## Special Props

| Prop | Behaviour |
| :--- | :--- |
| **`ref`** | `ref: (el) => ...` or `ref: { current: null }`. Provides direct access to the DOM node after creation. If the node is unmounted, the reference is not automatically cleared — handle that yourself if needed. |
| **`on*`** | Any prop starting with `on` is treated as an event listener. Case-insensitive: `onclick`, `onClick`, `onINPUT` all normalize to `addEventListener('click')`, `addEventListener('input')`. Listeners are tracked and removed on cleanup. |
| **`class` / `className`** | Both aliases work. Accepts a string or a reactive function. For SVG elements, uses `setAttribute('class', ...)`. |
| **`style`** | Accepts a string or a reactive function returning a string. Uses `setAttribute('style', ...)`. For reactivity: `style: () => open() ? '' : 'display:none'`. |
| **`html`** | If present, sets `innerHTML` and **skips children**. Reactive: `html: () => markdown(source())`. Use deliberately — this is an escape hatch for raw HTML. |
| **`value` / `checked`** | Plain attributes. No auto-binding. Assign directly or via a reactive getter, and wire `oninput` yourself for the reverse direction. |

---

## `h` vs Tag Helpers

| Feature | `h('div', ...)` | `div(...)` (tag helper) |
| :--- | :--- | :--- |
| **Dynamic tag names** | ✅ `h(tagName, ...)` | ❌ Must know tag name at write time |
| **Explicit style** | More verbose | Cleaner, DSL-like |
| **Availability** | Import from `sigpro` | Import from `sigpro`, or global after `exposeTags()` |
| **Performance** | Identical | Identical (helpers call `h` internally) |

> **Recommendation:** Use tag helpers (`div()`, `button()`, etc.) for most cases — they are shorter and more readable. Use `h` directly only when the tag name is dynamic.

---

## Complete Example

```javascript
import { signal, mount, h, exposeTags } from 'sigpro';

exposeTags();

const dynamicTag = signal('h1');

const App = () =>
  div({ class: 'demo' }, [
    h(
      dynamicTag(),
      {},
      () => `Current tag: ${dynamicTag()}`
    ),
    button(
      { onclick: () => dynamicTag(dynamicTag() === 'h1' ? 'h2' : 'h1') },
      'Toggle heading size'
    )
  ]);

mount(App, '#app');
```

Note that `h(dynamicTag(), ...)` is re-created from scratch whenever the tag name changes — `h` does not diff or swap tags. If you need reactive tag switching, wrap it in a reactive child function so the old node is removed and the new one inserted:

```javascript
div({}, () => h(dynamicTag(), {}, `Current tag: ${dynamicTag()}`))
```

---

## Summary

- `h` is the low-level DOM builder used internally by all tag helpers.
- It supports reactive attributes, reactive children, event listeners, `ref`, `html`, and SVG — all with automatic cleanup.
- **No two-way binding, no `emit` helper.** Data flows in via props and out via `on*` handlers. Explicit, predictable, and identical for every input type.
- Use `h` directly when you need a **dynamic tag name**; otherwise, prefer the tag helpers.