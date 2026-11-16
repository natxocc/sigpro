# Reactivity Control: `watch( )`

The `watch` function lets you run a callback when a signal (or computed) changes value. It is built on top of `effect`: internally it runs a reactive getter that reads `source()`, and compares the new value against the previous one with `Object.is`. It **skips the initial read by default** — only fires on actual changes.

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

> **⚠️ Reference equality gotcha.** `watch` compares the getter's return value with `Object.is`. If the getter returns a **new object or array** on every run (`() => ({ a: a(), b: b() })` or `() => [a(), b()]`), `Object.is` will always be `false` — the callback fires on **every change of any dependency**, even if the values inside are identical. To avoid this, either:
>
> - Return a primitive (string, number, boolean) from the getter, which compares by value.
> - Or serialize the result: `watch(() => JSON.stringify({ a: a(), b: b() }), ...)`.
> - Or track dependencies manually with `effect` and compare yourself.
>
> For signals of primitives (`watch(count, ...)`), this is a non-issue.

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

### 5. Callback Runs Untracked

The callback is invoked inside `untrack`, so any signal read **inside the callback** does **not** become a dependency of the watcher. This prevents accidental loops and hidden dependencies:

```javascript
const a = signal(0);
const b = signal(0);

watch(a, (value) => {
  // b() is read inside the callback — it does NOT create a dependency.
  console.log('a changed to', value, 'and b is', b());
});

b(99);   // watcher does NOT fire
a(1);    // watcher fires once, logs b's current value
```

If you *want* the callback to re-run when another signal changes, use `effect` directly.

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

SigPro flushes effects **synchronously** by default. A signal write triggers dependent effects (including `watch` callbacks) before the next line of code runs.

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

> **Note:** the getter `() => [a(), b()]` returns a **new array** on every run. As explained in the reference-equality note above, this means the callback fires on **every** change of `a` or `b`, even if the array's contents are the same as before. For grouping unrelated writes, that's fine; if you want to skip identical tuples, serialize them (`JSON.stringify`) or compare manually.

`batch` defers the flush until the function returns. Effects run once at the end.

---

## Key Points

- **Signature:** `watch(source, cb, { immediate })`.
- **Built on `effect`.** It is sugar for "run a getter, compare with `Object.is`, call the callback on change".
- **Skips initial run** unless `{ immediate: true }`.
- **Callback receives** `(newValue, oldValue)`. On the immediate first call, `oldValue` is `undefined`.
- **Equality check** uses `Object.is`. Getters returning objects/arrays will always trigger (reference inequality).
- **Callback runs untracked.** Signals read inside `cb` do not become dependencies.
- **Stop function** returned. Call it to dispose.
- **Synchronous flush** by default. Use `batch` to group writes.
- **No "auto vs explicit" mode.** There is one signature. If you want to watch two signals together, use a getter that reads both (and be aware of the reference-equality caveat).

---

## Complete Example

```javascript
import { signal, computed, watch, batch } from 'sigpro';

const count = signal(0);
const step  = signal(1);
const total = computed(() => count() * step());

// Watch the raw signal — primitive, compares by value.
watch(count, (nuevo, viejo) => {
  console.log(`count: ${viejo} → ${nuevo}`);
});

// Watch a getter that returns an object — will fire on any dep change.
watch(
  () => ({ count: count(), total: total() }),
  (nuevo, viejo) => {
    console.log(`state: ${JSON.stringify(viejo)} → ${JSON.stringify(nuevo)}`);
  }
);

count(5);      // → "count: 0 → 5", then "state: {count:0,total:0} → {count:5,total:5}"
step(2);       // → "state: {count:5,total:5} → {count:5,total:10}" (count watcher silent)
batch(() => {
  count(10);
  step(3);
});            // → "count: 5 → 10", then one "state: {count:5,total:10} → {count:10,total:30}"
```

If the second watcher's object-comparison behavior is not what you want, switch its getter to a serialized string:

```javascript
watch(
  () => JSON.stringify({ count: count(), total: total() }),
  (nuevo, viejo) => console.log(`${viejo} → ${nuevo}`)
);
```

Now it only fires when the *contents* differ, not on every dependency change.
