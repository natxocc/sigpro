# Reactivity Control: `watch( )`

The `watch` function lets you run a callback when a signal (or computed) changes value. It runs **outside** the normal effect flow and **skips the initial read by default** — only fires on actual changes.

## Function Signature

```typescript
watch<T>(
  source: Signal<T> | (() => T),
  cb: (value: T, oldValue: T | undefined) => void,
  options?: { immediate?: boolean }
): () => void
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`source`** | `Signal<T>` or `() => T` | Yes | Signal or getter to observe. |
| **`cb`** | `(value, oldValue) => void` | Yes | Called when `source` produces a new value. `oldValue` is `undefined` on the first `immediate` call. |
| **`options.immediate`** | `boolean` | No | If `true`, `cb` runs once at setup with `oldValue = undefined`. Default `false`. |

**Returns:** A stop function. Call it to dispose the watcher.

> **Availability:** `watch` is exported from the SigPro module. Import it (`import { watch } from 'sigpro'`). The examples below assume it is in scope.

> **Comparison with `effect`:** `watch` is sugar over `effect` for the specific case of "run a callback when a value changes". If you need full control (multiple dependencies, cleanup, side effects on every read), use `effect` directly.

---

## Usage Patterns

### 1. Watch a Signal

```javascript
import { signal, watch } from 'sigpro';

const count = signal(0);

const stop = watch(count, (nuevo, viejo) => {
  console.log(`${viejo} → ${nuevo}`);
});

count(5);   // logs: "0 → 5"
count(5);   // no log (same value)
count(7);   // logs: "5 → 7"
stop();     // detach
```

`watch` uses `Object.is` for equality. Writing the same value does **not** trigger the callback.

### 2. Watch a Getter (Composed Value)

If your value is derived from multiple signals, pass a getter:

```javascript
import { signal, watch } from 'sigpro';

const first = signal('Ada');
const last  = signal('Lovelace');

watch(() => `${first()} ${last()}`, (fullName, oldFullName) => {
  console.log(`${oldFullName} → ${fullName}`);
});

first('Grace'); // logs: "Ada Lovelace → Grace Lovelace"
```

The getter is tracked inside an effect, so any signal it reads becomes a dependency.

### 3. Immediate Run

By default `watch` skips the initial read. Use `immediate` to fire once at setup:

```javascript
import { signal, watch } from 'sigpro';

const theme = signal('dark');

watch(
  theme,
  (value) => console.log('theme:', value),
  { immediate: true }
);
// logs immediately: "theme: dark"
```

The first call receives `oldValue === undefined`, which lets you distinguish the initial invocation from real changes:

```javascript
watch(source, (nuevo, viejo) => {
  if (viejo === undefined) {
    console.log('initial:', nuevo);
  } else {
    console.log(`${viejo} → ${nuevo}`);
  }
}, { immediate: true });
```

### 4. Stopping a Watcher

```javascript
const stop = watch(count, v => console.log(v));

// later
stop();
```

If you create the watcher **inside a component** (inside a component function body, or inside an `effect`), it is automatically disposed when the enclosing scope is disposed. If you create it **outside** any scope (module top-level, `setTimeout`, event handler), you own its lifecycle — call the stop function yourself.

---

## `watch` vs `effect`

| Use case | Use |
| :--- | :--- |
| Run a callback when a value changes, skip initial | `watch` |
| React to changes and update the DOM | reactive child function `() => ...` |
| Run side effects, manage resources, register cleanup | `effect` |
| Watch multiple independent values | two `watch` calls, or one `effect` reading all of them |

`watch` is **narrower** than `effect`. It only gives you `(nuevo, viejo)` values. If you need to do something on every read, or want cleanup semantics per run, use `effect`:

```javascript
import { effect } from 'sigpro';

effect(() => {
  const id = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(id);
});
```

---

## Synchronous Flush

SigPro flushes effects **synchronously** by default. A signal write triggers dependent effects before the next line of code runs.

```javascript
import { signal, watch } from 'sigpro';

const a = signal(0);

watch(a, v => console.log('a =', v));

a(1);
console.log('after');
// Output order:
//   a = 1
//   after
```

If you want to batch multiple writes into a single flush, use `batch`:

```javascript
import { signal, batch, watch } from 'sigpro';

const a = signal(0);
const b = signal(0);

watch(() => [a(), b()], ([na, nb]) => console.log(na, nb));

// Without batch: two logs
// a(1); b(2);

// With batch: one log
batch(() => {
  a(1);
  b(2);
});
// logs: "1 2"
```

`batch` defers the flush until the function returns. Effects run once at the end.

---

## Key Points

- **Signature:** `watch(source, cb, { immediate })`.
- **Skips initial run** unless `{ immediate: true }`.
- **Callback receives** `(newValue, oldValue)`. On the immediate first call, `oldValue` is `undefined`.
- **Equality check** uses `Object.is`.
- **Stop function** returned. Call it to dispose.
- **Synchronous flush** by default. Use `batch` to group writes.
- **No "auto vs explicit" mode.** There is one signature. If you want to watch two signals together, use a getter that reads both.

---

## Complete Example

```javascript
import { signal, computed, watch, batch } from 'sigpro';

const count = signal(0);
const step  = signal(1);
const total = computed(() => count() * step());

// Watch the raw signal
watch(count, (nuevo, viejo) => {
  console.log(`count: ${viejo} → ${nuevo}`);
});

// Watch a getter that reads several signals
watch(
  () => ({ count: count(), total: total() }),
  (nuevo, viejo) => {
    console.log(`state: ${JSON.stringify(viejo)} → ${JSON.stringify(nuevo)}`);
  }
);

count(5);      // logs: count 0 → 5, then state change
step(2);       // logs: only state change (count didn't change)
batch(() => {
  count(10);
  step(3);
});            // logs: one combined update
```