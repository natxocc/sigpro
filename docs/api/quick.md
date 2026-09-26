# SigPro – Complete API Reference

## Core Reactivity

### `signal(value)` – Writable Signal

Creates a reactive signal. Call with no args to read, with a value or updater function to write.

```javascript
import { signal } from 'sigpro';

const count = signal(0);
count();              // read → 0
count(5);             // write
count(c => c + 1);    // updater
```

### `computed(getter)` – Lazy Derived Value

Creates a derived value. **Lazy**: recomputes on read, and only when dependencies have actually changed (`checkDirty` verification). No eager recalculation.

```javascript
import { signal, computed } from 'sigpro';

const count = signal(0);
const double = computed(() => count() * 2);

double(); // → 0
count(5);
double(); // → 10 (recomputed on read)
```

### `local(key, initial)` – Persistent Signal

Creates a signal backed by `localStorage`. Value is JSON-serialized. Falls back to `initial` if unavailable.

```javascript
import { local } from 'sigpro';

const theme = local('app-theme', 'light');
theme();          // 'light' or stored value
theme('dark');    // writes to signal + localStorage
```

### `effect(fn)` – Reactive Effect

Runs `fn` reactively. Re-executes when tracked dependencies change. `fn` may return a **cleanup function** that runs before the next re-execution and on stop.

```javascript
import { signal, effect } from 'sigpro';

const count = signal(0);

const stop = effect(() => {
  console.log(count());
  return () => console.log('cleanup');  // runs before re-execution and on stop
});

count(5);   // → "cleanup", then "5"
stop();     // → "cleanup"
```

### `effectScope(fn)` – Scope Grouping

Groups child effects so they can be stopped together with a single call. Does **not** track dependencies and does **not** re-execute. Returns a dispose function.

```javascript
import { signal, effect, effectScope } from 'sigpro';

const count = signal(0);

const dispose = effectScope(() => {
  effect(() => console.log('A:', count()));
  effect(() => console.log('B:', count()));
});

dispose(); // stops both effects
```

### `watch(source, cb, options?)` – Value Watcher

Watches a signal or getter and calls `cb(newValue, oldValue)` when the value changes. Skips the initial run by default. Pass `{ immediate: true }` to call once on setup.

```javascript
import { signal, watch } from 'sigpro';

const count = signal(0);

const stop = watch(count, (nuevo, viejo) => {
  console.log(viejo, '→', nuevo);
});

count(5); // → 0 → 5
```

### `batch(fn)` – Batched Updates

Batches multiple signal writes into a single flush.

```javascript
import { signal, batch } from 'sigpro';

const a = signal(0);
const b = signal(0);

batch(() => {
  a(1);
  b(2);
  // effects run once, after the batch ends
});
```

### `untrack(fn)` – Read Without Tracking

Runs `fn` without registering signal reads as dependencies of the current effect.

```javascript
import { signal, effect, untrack } from 'sigpro';

const a = signal(0);
const b = signal(0);

effect(() => {
  console.log('tracked:', a());
  console.log('untracked:', untrack(() => b())); // b is not a dependency
});
```

### `provide(key, value)` / `inject(key, fallback?)` – Dependency Injection

Scoped value propagation by tree. `provide` registers a value for the current effect/scope; `inject` finds the nearest ancestor value.

```javascript
import { signal, provide, inject } from 'sigpro';

const THEME = Symbol('theme');

const App = () => {
  provide(THEME, signal('dark'));
  return div({}, Child());
};

const Child = () => {
  const theme = inject(THEME);
  return div({ class: () => `theme-${theme()}` }, '...');
};
```

---

## Components & DOM (Hyperscript)

### `h(tag, props, ...children)` – Create DOM Nodes

The universal DOM builder. `props` is optional and defaults to `{}`. Children are **variadic**.

```javascript
import { h } from 'sigpro';

h('div', { class: 'box' }, 'Hello');
h('div', { class: 'box' }, child1, child2, child3);
h('div', {}, [child1, child2]); // arrays are flattened
```

| Feature | Example |
|---------|---------|
| Static attributes | `h('div', { class: 'box', id: 'main' })` |
| Events | `onclick: e => ...` (case-insensitive, auto-cleaned) |
| Reactive attributes | `class: () => count() > 0 ? 'pos' : 'neg'` |
| Reactive style | `style: () => open() ? '' : 'display:none'` |
| Reactive children | `h('div', {}, () => count() > 0 ? A() : B())` |
| Refs | `ref: el => ...` or `ref: { current: null }` |
| `innerHTML` | `html: () => markdown(source())` |
| SVG | Auto-detected by tag name (`svg`, `circle`, `path`, ...) |

**No two-way binding.** Wire explicitly:
```javascript
input({
  value: () => name(),
  oninput: e => name(e.target.value)
});
```

**No XSS sanitization.** SigPro does not filter URLs. Sanitization is the programmer's responsibility.

### `exposeTags(target?)` – Register Global Tag Helpers

Registers all standard HTML tags as globals (`window.div`, `window.button`, `window.span`, ...) so you can skip imports.

```javascript
import { exposeTags } from 'sigpro';

exposeTags();

// Now available as globals:
div({ class: 'container' }, [
  h1('Hello'),
  button({ onclick: () => alert('hi') }, 'Click')
]);
```

**Full list of tags**: `a`, `abbr`, `article`, `aside`, `audio`, `b`, `blockquote`, `br`, `button`, `canvas`, `caption`, `cite`, `code`, `col`, `colgroup`, `datalist`, `dd`, `del`, `details`, `dfn`, `dialog`, `div`, `dl`, `dt`, `em`, `embed`, `fieldset`, `figcaption`, `figure`, `footer`, `form`, `h1`–`h6`, `header`, `hr`, `i`, `iframe`, `img`, `input`, `ins`, `kbd`, `label`, `legend`, `li`, `main`, `mark`, `meter`, `nav`, `object`, `ol`, `optgroup`, `option`, `output`, `p`, `picture`, `pre`, `progress`, `section`, `select`, `slot`, `small`, `source`, `span`, `strong`, `sub`, `summary`, `sup`, `table`, `tbody`, `td`, `template`, `textarea`, `tfoot`, `th`, `thead`, `time`, `tr`, `u`, `ul`, `video`.

**SVG tags** (`svg`, `path`, `circle`, `g`, `defs`, `linearGradient`, ...) are detected by name and use the correct namespace automatically. They are **not** exposed as globals — use `h('path', {...})` or `svg({...}, [h('path', {...})])`.

---

## Flow Control

SigPro does not ship `when` or `each` as primitives. Use reactive child functions instead:

### Conditionals

```javascript
div({}, () =>
  user.loggedIn()
    ? div({}, 'Welcome back!')
    : button({ onclick: login }, 'Login')
);
```

### Lists

```javascript
ul({}, () =>
  items().map(item =>
    li({}, [
      input({ type: 'checkbox', checked: () => item.done }),
      span(item.text)
    ])
  )
);
```

For small lists, this is enough. For large reordering lists with DOM state (inputs, scroll, focus), keyed reconciliation with LIS is on the roadmap — not in the current core.

---

## Mounting

### `mount(component, target)` – Mount an App

Renders a component into a target. Returns a **stop function**.

```javascript
import { mount } from 'sigpro';

const App = () => div({ class: 'app' }, 'Hello');

const stop = mount(App, '#app');
stop(); // disposes the app scope and clears the target
```

- `component`: a function `(props?) => Node | Node[] | null`.
- `target`: CSS selector or Element.
- Returns a no-op function if the target does not exist.

### `unmount(node)` – Manually Remove a Node

Recursively stops scopes and removes tracked event listeners on a node and its descendants, then detaches it from the DOM. Only needed for nodes created **outside** the `h()` tree.

```javascript
import { unmount } from 'sigpro';

unmount(document.querySelector('.widget'));
```

### No Auto-Replace on Same Target

SigPro does **not** track mounted targets. Calling `mount` twice on the same target leaves the old scope alive. **Keep the stop function** and call it before remounting:

```javascript
let stop = mount(Login, '#app');

// later
stop();
stop = mount(Dashboard, '#app');
```

---

## Lifecycle & Cleanup

All effects, listeners, and nested scopes are cleaned up automatically when the scope that owns them is stopped. This happens on:

- `stop()` from `mount`
- `dispose()` from `effectScope`
- `stop()` from `effect`
- Removal of a reactive child node
- Route change in the router

**You must clean up manually for external resources**: `setInterval`, `setTimeout`, WebSocket, `IntersectionObserver`, third-party library instances. Use an `effect` that returns a cleanup function.

```javascript
effect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});
```

---

## Router

### `router(routes)` – Hash-Based Router

```javascript
import { router } from 'sigpro';

const App = router([
  { path: '/',           component: Home },
  { path: '/about',      component: About },
  { path: '/blog/:slug', component: BlogPost },
  { path: '*',           component: NotFound }
]);

mount(App, '#app');
```

- `path` supports `:param` segments and `*` for fallback.
- Route components receive `params` as their first argument.

### `router.to(path)`, `router.back()`, `router.path()`

```javascript
router.to('/about');   // navigate
router.back();         // browser history back
router.path();         // current path string
```

### `currentPath` / `routerParams` – Reactive Signals

```javascript
import { currentPath, routerParams } from 'sigpro';

h1(() => `Path: ${currentPath()}`);
h2(() => `Slug: ${routerParams().slug}`);
```

---

## i18n

### `addLang(translations)`, `setLocale(locale)`

```javascript
import { addLang, setLocale, t, tt, currentLocale } from 'sigpro';

addLang({
  en: { hello: 'Hello' },
  es: { hello: 'Hola' }
});

setLocale('es');
```

### `tt(key)` and `t(key)`

```javascript
tt('hello');       // → "Hola"  (imperative)
t('hello')();      // → "Hola"  (reactive getter)
```

### `currentLocale` – Active Locale Signal

```javascript
currentLocale();         // 'es'
currentLocale('en');     // switch
```

---

## HTTP Helper

### `db(url, data?, loading?, signal?)` – JSON Fetch

GET when `data` is omitted, POST otherwise. Calls `loading(true/false)` if provided.

```javascript
import { db, signal } from 'sigpro';

const loading = signal(false);

const data = await db('/api/users', null, loading);

await db('/api/save', { name: 'Ada' });
```

Pass an `AbortSignal` to cancel:

```javascript
const controller = new AbortController();
db('/api/long', null, null, controller.signal);
controller.abort();
```

---

## Full Example – Counter with Persistence

```javascript
import { signal, computed, local, mount, exposeTags } from 'sigpro';

exposeTags();

const App = () => {
  const count = local('counter', 0);
  const double = computed(() => count() * 2);

  return div({ class: 'counter' }, [
    h1(() => `Count: ${count()} (double: ${double()})`),
    button({ onclick: () => count(count() + 1) }, '+'),
    button({ onclick: () => count(count() - 1) }, '−'),
    button({ onclick: () => count(0) }, 'Reset')
  ]);
};

mount(App, '#app');
```