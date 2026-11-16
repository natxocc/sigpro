# Effects

Effects are the bridge between reactive state and side effects. SigPro has five primitives that together cover everything you'd want from a reactive runtime:

- **`effect`** — runs a function reactively and tracks what it reads.
- **`onMount`** — runs a function once when the effect is created (no tracking).
- **`onError`** — sets a global error handler for failing effects and components.
- **`batch`** — defers flushing until a group of writes finishes.
- **`untrack`** — reads a signal without registering it as a dependency.

All five are exported from the module. None require `exposeTags()`.

> **Note:** `effectScope` exists internally (it backs `h()`, `mount()`, and `router()`) but is **not exported**. You do not need it — components already wrap every render in a scope and dispose it on unmount.

---

## `effect(fn)`

Runs `fn` immediately, tracks the signals it reads, and re-runs it whenever any of them change. `fn` may return a **cleanup function**, which runs before the next re-execution and again on stop.

```typescript
effect(fn: () => void | (() => void)): () => void
```

**Returns:** a stop function. Call it to dispose the effect.

If `fn` throws, the effect is disposed (`flags = None`), its dependencies are removed, and the error is forwarded to `onError` (or `console.error`). A dead effect does **not** re-run on subsequent signal changes.

### Basic Usage

<div id="demo-effect-basic"></div>

```js
{
  const count = signal(0);

  effect(() => {
    console.log("count:", count());
  });

  const App = () => div(
    button({ onclick: () => count(count() + 1) }, "Increment")
  );

  setTimeout(() => mount(App, "#demo-effect-basic"), 50);
}
```

Every time `count` changes, the effect re-runs. The signal read inside `fn` is the only dependency.

### Cleanup

The cleanup runs **before** the next re-execution (so you can undo the previous run) and **when the effect is stopped**.

<div id="demo-effect-cleanup"></div>

```js
{
  const count = signal(0);

  const stop = effect(() => {
    const id = setInterval(() => console.log("tick:", count()), 1000);
    return () => clearInterval(id);
  });

  // after 5 seconds, stop the effect and clear the interval
  setTimeout(stop, 5000);
}
```

If you never return a cleanup, the effect has nothing to undo on re-run. Return one for timers, sockets, subscriptions, or any resource that needs explicit release.

### Stop

```js
const stop = effect(() => { ... });

// later
stop();
```

Effects created **inside a component** are automatically bound to that component's scope and disposed on unmount. Effects created **outside any scope** (module top-level, `setTimeout`, event handler) live until you stop them.

---

## `onMount(fn)`

Runs `fn` once when the effect is created, without tracking any reads. `fn` may return a cleanup that runs on parent unmount. Returns the effect disposer.

```typescript
onMount(fn: () => void | (() => void)): () => void
```

**Returns:** a stop function (rarely needed — the parent unmount handles cleanup).

Use it to initialize external libraries (charts, maps, editors) whose lifecycle is tied to the component:

```js
import { onMount } from 'sigpro';

onMount(() => {
  const chart = new Chart(el, config);
  return () => chart.destroy();   // cleanup on unmount
});
```

Inside a component, `onMount` is automatically tied to the component's scope. Outside a component, the effect lives until you call the returned stop.

---

## `onError(handler)`

Sets a global handler called when an `effect`, an `h()` component, or a router component throws. Without a handler, errors go to `console.error('[sigpro] error in', where, err)`.

```typescript
onError(handler: (err: unknown, where: unknown) => void): void
```

`where` is the throwing function (the effect's `fn`, the component function, or the router component). It is `undefined` if not available.

```js
import { onError } from 'sigpro';

onError((err, where) => {
  Sentry.captureException(err, { extra: { where: where?.name } });
});
```

Only **one** handler exists at a time — calling `onError` again replaces the previous one. Pass `null` or `undefined` to reset to the default `console.error` behavior.

---

## `batch(fn)`

Defers the flush of effects until `fn` returns. Multiple writes inside the same batch trigger effects **once**, after all writes complete.

```typescript
batch<T>(fn: () => T): T
```

**Returns:** whatever `fn` returns.

### Without Batch

<div id="demo-batch-without"></div>

```js
{
  const a = signal(0);
  const b = signal(0);

  effect(() => console.log(a(), b()));

  // two separate writes = two runs
  const run = () => {
    a(a() + 1);
    b(b() + 1);
  };

  const App = () => div(
    button({ onclick: run }, "Both +1")
  );

  setTimeout(() => mount(App, "#demo-batch-without"), 50);
}
```

### With Batch

<div id="demo-batch-with"></div>

```js
{
  const a = signal(0);
  const b = signal(0);

  effect(() => console.log(a(), b()));

  const run = () => batch(() => {
    a(a() + 1);
    b(b() + 1);
  });

  const App = () => div(
    button({ onclick: run }, "Both +1")
  );

  setTimeout(() => mount(App, "#demo-batch-with"), 50);
}
```

In the first example, the effect runs twice per click. In the second, once. The values the effect sees are the same in both — `batch` only eliminates the intermediate run.

### What Batch Does Not Do

- It does not defer the effects to a microtask. Flush happens **synchronously** at the end of `fn`.
- It does not coalesce across ticks. `setTimeout` or `queueMicrotask` between writes breaks the batch.
- Nested batches are supported. The flush happens when the outermost batch ends.

> **If `fn` throws, the batch is flushed anyway** in a `finally` block. Signal writes made before the throw are **not rolled back** — the effects fire with the partial state, and the error propagates to the caller. This matches the general behavior: signal writes are synchronous and immediately visible. `batch` only coalesces the *flush*, not the writes themselves.

---

## `untrack(fn)`

Runs `fn` and prevents any signal reads inside it from registering as dependencies of the current effect.

```typescript
untrack<T>(fn: () => T): T
```

**Returns:** whatever `fn` returns.

<div id="demo-untrack"></div>

```js
{
  const a = signal(0);
  const b = signal(0);

  effect(() => {
    console.log("a:", a());
    console.log("b (untracked):", untrack(() => b()));
  });

  const App = () => div(
    button({ onclick: () => a(a() + 1) }, "a +1"),
    button({ onclick: () => b(b() + 1) }, "b +1 (no effect re-run)")
  );

  setTimeout(() => mount(App, "#demo-untrack"), 50);
}
```

Clicking the first button re-runs the effect. Clicking the second updates `b` but does **not** re-run the effect, because `b` was read inside `untrack`.

### When You Need It

- Reading configuration, feature flags, or other "static" values that happen to live in signals.
- Logging from inside an effect without adding the logged signal as a dependency.
- Calling a function that reads signals but whose reactivity you don't want to inherit.

### When You Don't

If you're never inside an effect or computed, `untrack` is a no-op. Don't sprinkle it defensively — it hides intent.

---

## How They Fit Together

| Primitive | Purpose | Returns |
| :--- | :--- | :--- |
| `effect` | Run a reactive function | Stop function |
| `onMount` | Run once on mount, no tracking | Stop function |
| `onError` | Global error handler | — |
| `batch` | Coalesce writes into one flush | `fn`'s return value |
| `untrack` | Read without subscribing | `fn`'s return value |

Typical composition inside a component:

<div id="demo-combined"></div>

```js
{
  const items = signal([]);
  const query = signal("");

  const App = () => {
    effect(() => {
      // Log every change to the item list.
      console.log("items:", items());
    });

    effect(() => {
      // Re-filter only when the query changes, not when items change.
      // (Read `items` untracked to keep it out of the dependency set.)
      const filtered = untrack(() => items()).filter(i => i.includes(query()));
      console.log("filtered:", filtered);
    });

    const addAndSearch = () => batch(() => {
      items([...items(), "new"]);
      query(query() === "" ? "n" : "");
    });

    return div(
      button({ onclick: addAndSearch }, "Add + Search")
    );
  };

  setTimeout(() => mount(App, "#demo-combined"), 50);
}
```

Both effects are owned by the component's internal scope and disposed when the component unmounts. No manual `effectScope` call needed.

---

## Summary

- `effect` tracks reads and re-runs on change. Return a cleanup to release resources.
- `onMount` runs once on mount. Use it for external libraries with a teardown.
- `onError` sets a global handler for failing effects and components.
- `batch` coalesces multiple writes into a single flush. Synchronous.
- `untrack` reads a signal without subscribing. Use it deliberately, not defensively.
- Effects created inside a component are disposed automatically on unmount. Effects created outside are your responsibility.
- `effectScope` is internal — do not use it directly, even if you find it in the source.
