# Signals, Computed & Persistent State

SigPro's reactivity is built on **three explicit primitives**: `signal()`, `computed()`, and `local()`. Together they cover writable state, derived state, and persisted state. For complex nested objects you **compose signals** — no proxies, no `$$()`, no magic.

## Function Signatures

```typescript
signal<T>(initialValue: T): Signal<T>
computed<T>(getter: () => T): () => T
local<T>(key: string, initial: T): Signal<T>

interface Signal<T> {
  (): T;
  (value: T): void;
}
```

| Function | Purpose | Persistence |
| :--- | :--- | :--- |
| **`signal(v)`** | Writable state. | No |
| **`computed(fn)`** | Read-only derived value. Lazy. | No |
| **`local(key, v)`** | Writable state persisted to `localStorage`. | Yes (JSON) |

> **No updater functions.** Signals accept a plain value, not a `(prev) => next` callback. To update based on the previous value, read first, then write: `list([...list(), newItem])`. This is deliberate — the setter has zero dispatch overhead and stays predictable.

---

## Usage Patterns

### 1. Simple State — `signal(value)`

Creates a writable signal. Returns a function that is both **getter** and **setter**.

<div id="demo-signal-simple"></div>

```javascript
{
  const count = signal(0);
  const App = () => div({ class: "example" }, [
    p(() => `Count: ${count()}`),
    button({ onclick: () => count(count() + 1) }, "+1")
  ]);
  setTimeout(() => mount(App, '#demo-signal-simple'), 50);
}
```

### 2. Persistent State — `local(key, initial)`

Creates a signal that syncs with `localStorage`. The value is JSON-serialized. On load, the stored value takes priority over the initial one.

<div id="demo-signal-persist"></div>

```javascript
{
  const theme = local("theme-persist-demo", "light");
  const App = () => div([
    p(() => `Current theme: ${theme()}`),
    button({
      onclick: () => theme(theme() === "light" ? "dark" : "light")
    }, "Toggle theme")
  ]);
  setTimeout(() => mount(App, '#demo-signal-persist'), 50);
}
```

> **Cleanup contract.** `local()` creates an internal `effect` that writes to `localStorage` on every change of the returned signal. Inside a component, that effect is disposed on unmount. **Outside any scope** (module top-level, `setTimeout`, event handler), the effect lives forever — one effect per `local()` call. Call `local()` once per key and reuse the returned signal. Do **not** call `local()` inside a function that runs multiple times — each call creates a new signal and a new effect on the same key, which is a silent leak.

### 3. Computed (Derived) State — `computed(fn)`

Creates a **lazy** read-only value. It recomputes on read and only when its dependencies actually changed. If nothing downstream depends on it, nothing runs.

<div id="demo-signal-computed"></div>

```javascript
{
  const price = signal(100);
  const tax = signal(0.21);
  const total = computed(() => price() * (1 + tax()));

  const App = () => div([
    p(() => `Price: €${price()}`),
    p(() => `Tax rate: ${tax() * 100}%`),
    p(() => `Total: €${total().toFixed(2)}`),
    button({ onclick: () => price(price() + 10) }, "+€10"),
    button({ onclick: () => price(price() - 10) }, "-€10")
  ]);
  setTimeout(() => mount(App, '#demo-signal-computed'), 50);
}
```

Note: `computed` is **not** a signal. It's a read-only getter with no setter. If you need to write, you write to the underlying signals.

---

## Updating Based on the Previous Value

Signals do not accept updater callbacks. To update based on the current value, **read it, compute the next value, then write it**:

<div id="demo-signal-updater"></div>

```javascript
{
  const list = signal(["A", "B"]);
  const App = () => div([
    ul(() => list().map(item => li(item))),
    button({ onclick: () => list([...list(), "C"]) }, "Add C")
  ]);
  setTimeout(() => mount(App, '#demo-signal-updater'), 50);
}
```

For an increment, the pattern is the same: `count(count() + 1)`. Since a signal write is synchronous and effects flush synchronously (unless inside `batch`), reading the current value right before writing is safe and always reflects the latest state.

If you need to make multiple writes and want to read the updated values in between, wrap them in `batch(() => { ... })` — signals inside a batch still return their latest value on read.

---

## Composing Signals for Complex State

For nested objects, **compose signals** instead of using magic proxies. This gives you explicit control over reactivity and memory.

### 1. Simple Object

<div id="demo-compose-simple"></div>

```javascript
{
  const count = signal(0);
  const name = signal("Juan");

  // Optional: a derived combined value
  const state = computed(() => ({ count: count(), name: name() }));

  const App = () => div([
    p(() => `Count: ${count()}, Name: ${name()}`),
    button({ onclick: () => count(count() + 1) }, "Increment count"),
    button({
      onclick: () => name(name() === "Juan" ? "Ana" : "Juan")
    }, "Toggle name")
  ]);
  setTimeout(() => mount(App, '#demo-compose-simple'), 50);
}
```

### 2. Deeply Nested State

<div id="demo-compose-deep"></div>

```javascript
{
  const profileName = signal("Juan");
  const profileCity = signal("Madrid");
  const profileZip  = signal("28001");

  const fullAddress = computed(() => `${profileCity()}, ${profileZip()}`);

  watch(profileCity, () => console.log("City changed to:", profileCity()));

  const App = () => div([
    p(() => `Name: ${profileName()}`),
    p(() => `City: ${profileCity()}`),
    p(() => `Full address: ${fullAddress()}`),
    button({ onclick: () => profileCity("Barcelona") }, "Change to Barcelona")
  ]);
  setTimeout(() => mount(App, '#demo-compose-deep'), 50);
}
```

### 3. Arrays

<div id="demo-compose-array"></div>

```javascript
{
  const todos = signal([
    { id: 1, text: "Learn SigPro", done: false },
    { id: 2, text: "Build an app",  done: false }
  ]);

  const todoCount = computed(() => todos().length);
  watch(todoCount, () => console.log(`You have ${todoCount()} todos`));

  const App = () => div([
    ul(() => todos().map(todo => li(todo.text + (todo.done ? " ✓" : "")))),
    button({
      onclick: () => todos([...todos(), { id: Date.now(), text: "New todo", done: false }])
    }, "Add todo"),
    button({
      onclick: () => {
        const updated = [...todos()];
        updated[0] = { ...updated[0], done: !updated[0].done };
        todos(updated);
      }
    }, "Toggle first todo")
  ]);
  setTimeout(() => mount(App, '#demo-compose-array'), 50);
}
```

### 4. Complete Form Example

<div id="demo-compose-form"></div>

```javascript
{
  const email = signal("");
  const password = signal("");
  const isValid = computed(() => email().includes("@") && password().length > 6);

  watch(isValid, valid => console.log("Form valid:", valid));

  const App = () => div([
    input({
      type: "email",
      placeholder: "Email",
      value: () => email(),
      oninput: e => email(e.target.value)
    }),
    input({
      type: "password",
      placeholder: "Password",
      value: () => password(),
      oninput: e => password(e.target.value)
    }),
    p(() => `Form valid: ${isValid() ? "Yes" : "No"}`)
  ]);
  setTimeout(() => mount(App, '#demo-compose-form'), 50);
}
```

Note the **explicit two-way wiring**: `value: () => email()` for the forward direction, `oninput: e => email(e.target.value)` for the reverse. SigPro does not auto-bind. This is deliberate.

---

## Best Practices for Complex State

### ✅ DO: Compose signals explicitly

```javascript
// Clear, predictable, memory-safe
const user = {
  name: signal("Juan"),
  email: signal("juan@example.com"),
  preferences: {
    theme: signal("dark"),
    notifications: signal(true)
  }
};

// Derived values from composition
const userDisplay = computed(() => `${user.name()} <${user.email()}>`);
```

### ✅ DO: Create store patterns

```javascript
const createUserStore = () => {
  const name = signal("");
  const email = signal("");

  const isValid = computed(() => name().length > 0 && email().includes("@"));

  const actions = {
    setName:  (value) => name(value),
    setEmail: (value) => email(value),
    reset: () => { name(""); email(""); }
  };

  return { name, email, isValid, ...actions };
};

const userStore = createUserStore();
```

### ✅ DO: Destructure the composed object, not the signal's return value

Because a signal **is** a function, destructuring a plain object that holds signals works fine:

```javascript
const { name, email } = user;   // name and email are still signals (functions)
name();                          // ✅ reactive read
name("Ana");                     // ✅ write
```

What you must **not** do is store a signal's *result* and expect it to stay reactive:

```javascript
const n = user.name();   // ❌ `n` is a snapshot, not a signal
n;                       // won't update when user.name changes
```

Rule: keep the signal reference. Call it only when you want the current value.

### ❌ DON'T: Try to wrap objects with a single signal

```javascript
// Wrong — nested property changes are invisible to the reactive system
const user = signal({ name: "Juan", email: "..." });
user().name = "Ana"; // ❌ Not reactive

// Correct — each property gets its own signal
const userName  = signal("Juan");
const userEmail = signal("...");
```

### ❌ DON'T: Mutate in place

```javascript
// ❌ Mutating the object returned by the signal is invisible to the runtime
user().name = "Ana";
todos().push(newTodo);

// ✅ Replace the reference — this is what triggers reactivity
user({ ...user(), name: "Ana" });
todos([...todos(), newTodo]);
```

---

## Important Notes

### ✅ DO:

```javascript
// Update arrays by replacing the reference
todos([...todos(), newTodo]);

// Update objects immutably
user({ ...user(), name: "Ana" });

// Derive tracked values with computed
const fullName = computed(() => `${first()} ${last()}`);
```

### ❌ DON'T:

```javascript
// Mutate objects in place — no reactivity
user().name = "Ana"; // ❌

// Mutate arrays in place — no reactivity
todos().push(newTodo); // ❌

// Assume a signal read outside an effect will "track" something
name(); // just reads, no tracking outside an active effect/computed

// Pass an updater function — signals do not accept callbacks
todos(prev => [...prev, newTodo]); // ❌ stores the function, not the array
```

---

## Cleanup

Effects and computations created during a component's render are disposed automatically when the component is unmounted. If you create an effect **outside** a component (in a module, in a `setTimeout`, in an event handler), you own its lifecycle:

```javascript
const name = signal("Juan");

// Inside a component — auto-cleanup on unmount
const App = () => {
  effect(() => console.log("Name:", name()));
  return div("...");
};

// Outside — must be stopped manually
const stop = effect(() => console.log("Name:", name()));
// later:
stop();
```

Same for `watch`:

```javascript
const stopWatch = watch(name, (v) => console.log(v));
// later:
stopWatch();
```

For **external resources** (`setInterval`, WebSocket, third-party libs), return a cleanup from the effect:

```javascript
effect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});
```

---

## Complete Example

<div id="demo-complete-final"></div>

```javascript
{
  // All state as explicit signals
  const theme        = local("theme_complete", "dark");
  const sidebarOpen  = signal(true);
  const userName     = signal("");
  const userEmail    = signal("");
  const notifications = signal(true);
  const language     = signal("es");

  // Computed
  const isLoggedIn = computed(() => !!userName() && !!userEmail());

  // Actions as plain functions
  const login = (name, email) => {
    userName(name);
    userEmail(email);
  };

  const logout = () => {
    userName("");
    userEmail("");
    notifications(true);
  };

  const LoginForm = () => div([
    input({ placeholder: "Name",  oninput: e => userName(e.target.value) }),
    input({ placeholder: "Email", oninput: e => userEmail(e.target.value) }),
    button({ onclick: () => login(userName(), userEmail()) }, "Login")
  ]);

  const UserProfile = () => div([
    h2(() => `Welcome ${userName()}`),
    p(() => `Email: ${userEmail()}`),
    p(() => `Notifications: ${notifications() ? "ON" : "OFF"}`),
    p(() => `Language: ${language()}`),
    button({
      onclick: () => notifications(!notifications())
    }, "Toggle Notifications"),
    button({ onclick: logout }, "Logout")
  ]);

  const App = () => div({ class: "complete-example" }, [
    // Reactive conditional — no `when()` primitive needed
    () => isLoggedIn() ? UserProfile() : LoginForm()
  ]);

  setTimeout(() => mount(App, '#demo-complete-final'), 50);
}
```

---

## Summary

With **three primitives** — `signal`, `computed`, `local`:

- ✅ **Explicit** — you know exactly what's reactive.
- ✅ **Memory safe** — no hidden proxies, no WeakMap caches.
- ✅ **Lazy computed** — recomputation is verified against dirty state.
- ✅ **Predictable** — no argument-type dispatch, no overloaded `$()`.
- ✅ **Debuggable** — clear data flow.

Complex state is built by **composing signals**, not by wrapping objects. This gives you the same power as reactive proxies with better control and fewer surprises.

Signals are plain getter/setters. There is **no updater callback** — always read the current value, compute the next one, and write it back. This is one extra character in the common case (`count(count() + 1)`) and avoids a whole category of bugs around stale closures and accidental function values.
