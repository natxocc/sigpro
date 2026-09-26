# Signals, Computed & Persistent State

SigPro's reactivity is built on **three explicit primitives**: `signal()`, `computed()`, and `local()`. Together they cover writable state, derived state, and persisted state. For complex nested objects you **compose signals** — no proxies, no `$$()`, no magic.

## Function Signatures

```typescript
signal<T>(initialValue: T): Signal<T>
computed<T>(getter: () => T): () => T
local<T>(key: string, initial: T): Signal<T>

interface Signal<T> {
  (): T;
  (value: T | ((prev: T) => T)): void;
}
```

| Function | Purpose | Persistence |
| :--- | :--- | :--- |
| **`signal(v)`** | Writable state. | No |
| **`computed(fn)`** | Read-only derived value. Lazy. | No |
| **`local(key, v)`** | Writable state persisted to `localStorage`. | Yes (JSON) |

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

## Updating with Logic

Both `signal` and `local` accept an **updater function** as the argument. This gives you safe access to the previous value.

<div id="demo-signal-updater"></div>

```javascript
{
  const list = signal(["A", "B"]);
  const App = () => div([
    ul(() => list().map(item => li(item))),
    button({ onclick: () => list(prev => [...prev, "C"]) }, "Add C")
  ]);
  setTimeout(() => mount(App, '#demo-signal-updater'), 50);
}
```

The updater receives the current value and must return the new value. Unlike a plain write, it cannot accidentally close over a stale value.

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
      onclick: () => todos(prev => [...prev, { id: Date.now(), text: "New todo", done: false }])
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

### ❌ DON'T: Try to wrap objects with a single signal

```javascript
// Wrong — nested property changes are invisible to the reactive system
const user = signal({ name: "Juan", email: "..." });
user().name = "Ana"; // ❌ Not reactive

// Correct — each property gets its own signal
const userName  = signal("Juan");
const userEmail = signal("...");
```

### ❌ DON'T: Destructure signals and lose the function reference

```javascript
// Wrong — breaks tracking because you lose the signal identity
const { name, email } = user;
watch(name, ...); // ❌ `name` here is a plain function value

// Correct — keep the signal as a property
watch(user.name, ...); // ✅
```

Actually, destructuring a signal **does** preserve tracking (a signal is just a function). What breaks is destructuring a **plain object that holds signals** if you then call `.value`-style access. In SigPro, since signals are functions, `const { name } = user; name()` works fine. The rule is just: **never store a `signal()`'s return value as a plain value** — always call it.

---

## Important Notes

### ✅ DO:

```javascript
// Update arrays by replacing the reference
todos(prev => [...prev, newTodo]);

// Update objects immutably
const current = user();
user({ ...current, name: "Ana" });

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
