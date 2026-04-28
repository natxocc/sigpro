# SigPro – Complete API Reference

## Core Reactivity

### `$(value, localStorageKey?)` – Signal & Computed

Creates a reactive signal. If a function is passed, it becomes a **computed** signal that caches its result until dependencies change.

| Usage | Description |
|-------|-------------|
| `const count = $(0)` | Basic signal, returns a getter/setter: `count()` reads, `count(5)` writes. |
| `const double = $( () => count() * 2 )` | Computed signal – updates automatically when `count` changes. |
| `const stored = $('hello', 'myKey')` | Persisted signal – reads/writes to `localStorage`. |

**Example**  
```javascript
const count = $(0)
const double = $( () => count() * 2 )

watch(() => {
  console.log(`count = ${count()}, double = ${double()}`)
}) // logs on every change

count(5) // triggers log: count=5, double=10
```

---

### `$$(object)` – Deep Reactive Proxy

Makes a plain object (and all nested objects) deeply reactive. Any property access is tracked, any mutation triggers updates.

```javascript
const state = $$({ user: { name: 'Alice', age: 30 }, items: [1,2,3] })

watch(() => {
  console.log(state.user.name) // tracks `user.name`
})

state.user.name = 'Bob' // triggers the effect
```

> **Note**: `$$` caches proxies per original object, so calling `$$` multiple times on the same object returns the same proxy.

---

### `watch(source, callback?)` – Reactive Effect

Two modes:

1. **Auto‑track mode** – pass a function: `watch(() => { /* reads signals */ })`  
   Automatically re‑runs whenever any signal read inside changes.

2. **Explicit mode** – pass an array of signals and a callback:  
   `watch([count, double], () => { ... })`  
   Runs the callback when any of the listed signals change. The callback receives the new values.

Both modes return a `stop` function that disposes the effect.

```javascript
// auto mode
const stop = watch(() => console.log(count()))

// explicit mode
watch([count, double], ([newCount, newDouble]) => {
  console.log(newCount, newDouble)
})
```

> **Important**: Effects are depth‑aware – they run in topological order, parents before children.

---

## Components & DOM (Hyperscript)

### `h(tag, props, children)` – Create DOM Nodes

The universal builder. `props` can be omitted. Children can be strings, numbers, nodes, arrays, or **dynamic functions**.

| Feature | Example |
|---------|---------|
| Standard attributes | `h('div', { class: 'box', id: 'main' })` |
| Events | `onClick: (e) => ...` (automatically cleaned up) |
| Reactive attributes | `class: () => count() > 0 ? 'positive' : 'negative'` |
| Two‑way binding | `value: mySignal` (works on `input`, `textarea`, `select`) |
| Refs | `ref: (el) => ...` or `ref: { current: null }` |
| SVG support | tag names like `svg`, `circle`, `path` – sets correct namespace |
| Dangerous URL sanitising | `href` / `src` with `javascript:` or `data:` are blocked → `'#'` (when XSS shield is active) |

**Dynamic children** – pass a function as a child, it will be re‑executed and the DOM patched automatically:

```javascript
h('div', {}, [
  () => count() > 0 ? h('span', {}, 'positive') : h('span', {}, 'zero or negative')
])
```

### Tag shortcuts

Tag helpers are **not exported individually** from the core. To use them globally without the `h(...)` wrapper, activate the side‑effect module:

```javascript
import { sigpro } from "sigpro"
sigpro();  // now window.div, window.span, etc. are available

// You can now write:
div({ class: 'container' }, [
  h1({}, 'Title'),
  button({ onClick: () => alert('hi') }, 'Click me')
])
```

In the **IIFE bundle** (`sigpro.min.js`), the helpers are already injected globally – no import needed.

Available tags: `a`, `abbr`, `article`, `aside`, `audio`, `b`, `blockquote`, `br`, `button`, `canvas`, `caption`, `cite`, `code`, `col`, `colgroup`, `datalist`, `dd`, `del`, `details`, `dfn`, `dialog`, `div`, `dl`, `dt`, `em`, `embed`, `fieldset`, `figcaption`, `figure`, `footer`, `form`, `h1`…`h6`, `header`, `hr`, `i`, `iframe`, `img`, `input`, `ins`, `kbd`, `label`, `legend`, `li`, `main`, `mark`, `meter`, `nav`, `object`, `ol`, `optgroup`, `option`, `output`, `p`, `picture`, `pre`, `progress`, `section`, `select`, `slot`, `small`, `source`, `span`, `strong`, `sub`, `summary`, `sup`, `svg`, `table`, `tbody`, `td`, `template`, `textarea`, `tfoot`, `th`, `thead`, `time`, `tr`, `u`, `ul`, `video`.

---

## Flow Control Components

### `when(condition, thenComponent, elseComponent?)`

Reactive conditional rendering. `condition` can be a boolean, a signal, or any function that returns a boolean. Both branches can be `Node`, `() => Node`, or `null`. Automatically disposes the unmounted branch.

```javascript
when(
  () => user.loggedIn(),
  () => div({}, 'Welcome back!'),
  () => button({ onClick: () => login() }, 'Login')
)
```

---

### `each(source, itemRenderer, keyFn)`

Optimised keyed list rendering. `source` can be an array or a signal/function returning an array. `itemRenderer(item, index)` returns a Node (or a function that returns Nodes). `keyFn(item, index)` returns a unique identifier – **required** for efficient DOM reuse.

```javascript
const items = $([{ id: 1, text: 'a' }, { id: 2, text: 'b' }])

each(items,
  (item) => Li({}, item.text),
  (item) => item.id
)
```

When the array changes, elements are added, removed, or reordered with minimal DOM operations.

---

## Batch

### `batch(fn)`

Batch multiple reactive updates into a single flush, improving performance.

```javascript
batch(() => {
  count(1)
  name('John')
  // effects run only once after the batch ends
})
```

---

## Router – `router(routes)`

Hash‑based SPA router. Returns a DOM node that renders the current route.

```javascript
import { router } from 'sigpro'

const routes = [
  { path: '/', component: () => div({}, 'Home') },
  { path: '/user/:id', component: (params) => div({}, `User ${params.id}`) },
  { path: '*', component: () => div({}, '404') }
]

const App = () => div({}, [
  a({ href: '#/' }, 'Home'),
  a({ href: '#/user/42' }, 'User 42'),
  router(routes)
])
```

**API**

| Method | Description |
|--------|-------------|
| `router.params()` | Returns a reactive signal of current route params (e.g., `{ id: '42' }`). |
| `router.to(path)` | Navigate to a new hash (e.g., `router.to('/user/5')`). Prepend `#` automatically. |
| `router.back()` | Go back in history. |
| `router.path()` | Returns current hash path without `#` (e.g., `/user/42`). |

---

## Mounting – `mount(component, target)`

Clears the target element and mounts the application. Returns the runtime instance (which has a `.destroy()` method).

```javascript
mount(() => App(), '#app')
// or
mount(App, document.body)
```

If you mount again on the same target, the previous instance is automatically destroyed.

---

## Global Cleanup & Memory

SigPro tracks every effect, DOM event listener, and nested component. When a component is unmounted:
- All its effects are disposed.
- All DOM event listeners are removed.
- All `onUnmount` callbacks run.
- Child components are recursively destroyed.

You never need to manually clean up – just write reactive code.

---

## Full Example – Counter with Persistence

```javascript
import { sigpro } from 'sigpro';
sigpro();  // All in global window

const count = $(0, 'counter') // persists in localStorage

const App = () =>
  div({ class: 'counter' }, [
    h1({}, () => `Count: ${count()}`),
    button({ onClick: () => count(count() + 1) }, '+'),
    button({ onClick: () => count(count() - 1) }, '-'),
    button({ onClick: () => count(0) }, 'Reset')
  ])

mount(App, '#app')
```
