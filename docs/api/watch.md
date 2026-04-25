# Reactivity Control: `watch( )`

The `watch` function is the reactive engine of SigPro. It allows you to execute code automatically when signals change. `watch` is **polymorphic**: it can track dependencies automatically or follow an explicit list.

## Function Signature

```typescript
// Automatic Mode (Magic Tracking)
watch(callback: Function): StopFunction

// Explicit Mode (Isolated Dependencies)
watch(deps: Signal[], callback: (values: any[]) => void): StopFunction
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`callback`** (auto mode) | `Function` | Yes | The code to run. Any signal accessed inside becomes a dependency. |
| **`deps`** (explicit mode) | `Signal[]` | Yes | An array of signals to watch explicitly. |
| **`callback`** (explicit mode) | `Function` | Yes | Runs when any of the `deps` change. Receives an array of their current values. |

**Returns:** A `StopFunction` that, when called, destroys the watcher and releases memory.

---

## Usage Patterns

### 1. Automatic Mode (Default)
Any signal you **touch** inside the callback becomes a dependency. SigPro tracks them behind the scenes.

```javascript
const count = $(0);

watch(() => {
  // Re‑runs every time 'count' changes
  console.log(`Count is: ${count()}`);
});
```

### 2. Explicit Mode (Isolated)
This mode **isolates** execution. The callback only triggers when the signals in the array change. Any other signal accessed *inside* the callback will **not** trigger a re‑run. This is ideal for routers or performance‑critical components.

```javascript
const path = $("/home");
const user = $("Admin");

watch([path], ([newPath]) => {
  // Only triggers when 'path' changes.
  // Changes to 'user' will NOT trigger this.
  console.log(`Navigating to ${newPath} as ${user()}`);
});
```

In explicit mode, the callback receives an array of current values corresponding to the `deps` order.

### 3. Stopping a Watcher
Call the returned function to kill the watcher manually.

```javascript
const stop = watch(() => console.log(count()));
// Later...
stop(); // Disconnects the watcher completely.
```

### 4. Automatic Cleanup Inside Effects
If your watcher creates timers, event listeners, or nested effects, SigPro tracks them as children and cleans them up automatically before re‑running or when stopped.

```javascript
watch(() => {
  const timer = setInterval(() => console.log("tick"), 1000);
  // No need to manually clear – SigPro will dispose it when the watcher re‑runs or stops.
  // (But you can also return a cleanup function if needed)
});
```

---

## Batching & Microtask Queue

SigPro batches reactive updates. If you modify several signals in the same synchronous block, the watcher will fire **only once**, after the task completes.

```javascript
const a = $(0);
const b = $(0);

watch(() => console.log(a(), b()));

// Triggers only ONE log: "1 2"
a(1);
b(2);
```

This is achieved via `queueMicrotask`, ensuring optimal performance.

---

## Key Points

- **Function name:** `watch` (lowercase) – exported from SigPro and also available globally.
- **Auto mode:** `watch(fn)` – automatically tracks any signals read inside `fn`.
- **Explicit mode:** `watch([sig1, sig2], (values) => {...})` – only re‑runs when listed signals change; callback receives an array of their new values.
- **Stop function:** returned by both modes; call it to dispose the effect and its children.
- **Batching:** multiple signal writes in one event loop tick trigger a single execution (microtask).

---

## Complete Example

```javascript
const count = $(0);
const step = $(1);

watch(() => {
  console.log(`Count changed to ${count()}`);
});

watch([count, step], ([newCount, newStep]) => {
  console.log(`Count=${newCount}, step=${newStep} (explicit)`);
});

count(5);      // logs: auto + explicit
step(2);       // logs: explicit only (auto does not track step)
```

