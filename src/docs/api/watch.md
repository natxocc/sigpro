# ⚡ Reactivity Control: `$watch( )`

The `$watch` function is the reactive engine of SigPro. It allows you to execute code automatically when signals change. `$watch` is **polymorphic**: it can track dependencies automatically or follow an explicit list.

## 🛠 Function Signature

```typescript
// Automatic Mode (Magic Tracking)
$watch(callback: Function): StopFunction

// Explicit Mode (Isolated Dependencies)
$watch(deps: Signal[], callback: Function): StopFunction
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`target / deps`** | `Function` | `Array` | Yes | Either the code to run (Auto) or an array of signals to watch (Explicit). |
| **`callback`** | `Function` | Only in Explicit | The code that will run when the `deps` change. |

**Returns:** A `StopFunction` that, when called, destroys the watcher and releases memory.

---

## 📖 Usage Patterns

### 1. Automatic Mode (Default)
Any signal you "touch" inside the callback becomes a dependency. SigPro tracks them behind the scenes.

```javascript
const count = $(0);

$watch(() => {
  // Re-runs every time 'count' changes
  console.log(`Count is: ${count()}`);
});
```

### 2. Explicit Mode (Advanced Cleanup) 🚀
This mode **isolates** execution. The callback only triggers when the signals in the array change. Any other signal accessed *inside* the callback will NOT trigger a re-run. This is the "gold standard" for Routers and heavy components.

```javascript
const sPath = $("/home");
const user = $("Admin");

$watch([sPath], () => {
  // Only triggers when 'sPath' changes.
  // Changes to 'user' will NOT trigger this, preventing accidental re-renders.
  console.log(`Navigating to ${sPath()} as ${user()}`);
});
```

### 3. Automatic Cleanup
If your logic creates timers, event listeners, or other reactive effects, SigPro tracks them as "children" of the current watch. When the watcher re-runs or stops, it kills everything inside automatically.

```javascript
$watch(() => {
  const timer = setInterval(() => console.log("Tick"), 1000);
  
  // Register a manual cleanup if needed
  // Or simply rely on SigPro to kill nested $watch() calls
  return () => clearInterval(timer);
});
```

---

## 🛑 Stopping a Watcher
Call the returned function to manually kill the watcher. This is essential for manual DOM injections (like Toasts) or long-lived background processes.

```javascript
const stop = $watch(() => console.log(count()));

// Later...
stop(); // The link between the signal and this code is physically severed.
```

---

## 💡 Pro Tip: The Microtask Queue
SigPro batches updates. If you update multiple signals in the same execution block, the watcher will only fire **once** at the end of the task.

```javascript
const a = $(0);
const b = $(0);

$watch(() => console.log(a(), b()));

// This triggers only ONE re-run.
a(1);
b(2);
```
