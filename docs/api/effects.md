# Effects

Effects are the bridge between reactive state and side effects. SigPro has four primitives that together cover everything you'd want from a reactive runtime:

- **`effect`** — runs a function reactively and tracks what it reads.
- **`effectScope`** — groups child effects so they can be disposed together.
- **`batch`** — defers flushing until a group of writes finishes.
- **`untrack`** — reads a signal without registering it as a dependency.

All four are exported from the module. None require `exposeTags()`.

---

## `effect(fn)`

Runs `fn` immediately, tracks the signals it reads, and re-runs it whenever any of them change. `fn` may return a **cleanup function**, which runs before the next re-execution and again on stop.

```typescript
effect(fn: () => void | (() => void)): () => void
```

**Returns:** a stop function. Call it to dispose the effect.

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

## `effectScope(fn)`

Creates a container for child effects. It does **not** track dependencies and does **not** re-execute. Its only job is to group effects so they can be disposed with a single call.

```typescript
effectScope(fn: () => void): () => void
```

**Returns:** a dispose function. Calling it stops every effect created during `fn`'s execution.

### Grouping Effects

<div id="demo-scope-basic"></div>

```js
{
  const a = signal(0);
  const b = signal(0);

  const dispose = effectScope(() => {
    effect(() => console.log("a:", a()));
    effect(() => console.log("b:", b()));
  });

  // one call stops both
  setTimeout(dispose, 8000);
}
```

Without `effectScope`, you would have to keep every stop function and call them individually.

### Where You Actually Need It

Most of the time you don't call `effectScope` directly. The component system already wraps every component render in one:

```js
const Counter = () => {
  effect(() => console.log(count())); // auto-disposed on unmount
  return div("...");
};
```

The cases where you write it by hand:

- **Outside the render tree.** A module-level setup, a worker, a test harness.
- **Custom lifecycles.** A plugin that mounts and unmounts regions on demand.

```js
const dispose = effectScope(() => {
  effect(() => syncTodos(todos()));
  effect(() => syncTheme(theme()));
});

// later, when the plugin is disabled
dispose();
```

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
| `effectScope` | Group effects | Dispose function |
| `batch` | Coalesce writes into one flush | `fn`'s return value |
| `untrack` | Read without subscribing | `fn`'s return value |

Typical composition:

<div id="demo-combined"></div>

```js
{
  const items = signal([]);
  const query = signal("");

  const dispose = effectScope(() => {
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
  });

  const addAndSearch = () => batch(() => {
    items([...items(), "new"]);
    query(query() === "" ? "n" : "");
  });

  const App = () => div(
    button({ onclick: addAndSearch }, "Add + Search"),
    button({ onclick: dispose }, "Dispose")
  );

  setTimeout(() => mount(App, "#demo-combined"), 50);
}
```

---

## Summary

- `effect` tracks reads and re-runs on change. Return a cleanup to release resources.
- `effectScope` groups effects for a single dispose. You rarely call it directly — the component system already does.
- `batch` coalesces multiple writes into a single flush. Synchronous.
- `untrack` reads a signal without subscribing. Use it deliberately, not defensively.
- Effects created inside a component are disposed automatically on unmount. Effects created outside are your responsibility.