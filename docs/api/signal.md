# The Signal Function: `$()`

The `$()` function is the **only** reactive primitive in SigPro. It defines how data is stored, computed, and persisted. For complex nested objects, you compose signals naturally.

## Function Signature

```typescript
$(initialValue: any, key?: string): Signal
$(computation: Function): ComputedSignal
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`initialValue`** | `any` | Yes* | The starting value of your signal. |
| **`computation`** | `Function` | Yes* | A function that returns a value based on other signals. |
| **`key`** | `string` | No | A unique name to persist the signal in `localStorage`. |

*\*Either an initial value or a computation function must be provided.*

---

## Usage Patterns

### 1. Simple State
**`$(value)`**
Creates a writable signal. It returns a function that acts as both **getter** and **setter**.

<div id="demo-signal-simple"></div>

```javascript
{
  const count = $(0);
  const App = () => div({ class: "example" }, [
    p(() => `Count: ${count()}`),
    button({ onClick: () => count(count() + 1) }, "+1")
  ]);
  setTimeout(() => mount(App, '#demo-signal-simple'), 50);
}
```

### 2. Persistent State
**`$(value, key)`**
Creates a writable signal that syncs with the browser's storage.

<div id="demo-signal-persist"></div>

```javascript
{
  const theme = $("light", "theme-persist-demo");
  const App = () => div([
    p(() => `Current theme: ${theme()}`),
    button({ onClick: () => theme(theme() === "light" ? "dark" : "light") }, "Toggle theme")
  ]);
  setTimeout(() => mount(App, '#demo-signal-persist'), 50);
}
```
*Note: On page load, SigPro will prioritize the value found in `localStorage` over the `initialValue`.*

### 3. Computed State (Derived)
**`$(function)`**
Creates a read-only signal that updates automatically when any signal used inside it changes.

<div id="demo-signal-computed"></div>

```javascript
{
  const price = $(100);
  const tax = $(0.21);
  const total = $(() => price() * (1 + tax()));

  const App = () => div([
    p(() => `Price: €${price()}`),
    p(() => `Tax rate: ${tax() * 100}%`),
    p(() => `Total: €${total().toFixed(2)}`),
    button({ onClick: () => price(price() + 10) }, "+€10"),
    button({ onClick: () => price(price() - 10) }, "-€10")
  ]);
  setTimeout(() => mount(App, '#demo-signal-computed'), 50);
}
```

---

## Updating with Logic
When calling the setter, you can pass an **updater function** to access the current value safely.

<div id="demo-signal-updater"></div>

```javascript
{
  const list = $(["A", "B"]);
  const App = () => div([
    ul(() => list().map(item => li(item))),
    button({ onClick: () => list(prev => [...prev, "C"]) }, "Add C")
  ]);
  setTimeout(() => mount(App, '#demo-signal-updater'), 50);
}
```

---

## Composing Signals for Complex State

For nested objects, **compose signals** instead of using magic proxies. This gives you explicit control over reactivity and memory.

### 1. Simple Object

<div id="demo-compose-simple"></div>

```javascript
{
  const count = $(0);
  const name = $("Juan");
  
  // Optionally create a derived combined state
  const state = $(() => ({ count: count(), name: name() }));

  const App = () => div([
    p(() => `Count: ${count()}, Name: ${name()}`),
    button({ onClick: () => count(count() + 1) }, "Increment count"),
    button({ onClick: () => name(name() === "Juan" ? "Ana" : "Juan") }, "Toggle name")
  ]);
  setTimeout(() => mount(App, '#demo-compose-simple'), 50);
}
```

### 2. Deeply Nested State

<div id="demo-compose-deep"></div>

```javascript
{
  const profileName = $("Juan");
  const profileCity = $("Madrid");
  const profileZip = $("28001");

  // Computed derived values
  const fullAddress = $(() => `${profileCity()}, ${profileZip()}`);
  
  watch(profileCity, () => console.log("City changed to:", profileCity()));

  const App = () => div([
    p(() => `Name: ${profileName()}`),
    p(() => `City: ${profileCity()}`),
    p(() => `Full address: ${fullAddress()}`),
    button({ onClick: () => profileCity("Barcelona") }, "Change to Barcelona")
  ]);
  setTimeout(() => mount(App, '#demo-compose-deep'), 50);
}
```

### 3. Arrays

<div id="demo-compose-array"></div>

```javascript
{
  const todos = $([
    { id: 1, text: "Learn SigPro", done: false },
    { id: 2, text: "Build an app", done: false }
  ]);

  const todoCount = $(() => todos().length);
  
  watch(todoCount, () => console.log(`You have ${todoCount()} todos`));

  const App = () => div([
    ul(() => todos().map(todo => li(todo.text + (todo.done ? " ✓" : "")))),
    button({ onClick: () => todos(prev => [...prev, { id: Date.now(), text: "New todo", done: false }]) }, "Add todo"),
    button({ onClick: () => {
      const updated = [...todos()];
      updated[0] = { ...updated[0], done: !updated[0].done };
      todos(updated);
    }}, "Toggle first todo")
  ]);
  setTimeout(() => mount(App, '#demo-compose-array'), 50);
}
```

### 4. Complete Form Example

<div id="demo-compose-form"></div>

```javascript
{
  const email = $("");
  const password = $("");
  const isValid = $(() => email().includes("@") && password().length > 6);

  watch(isValid, valid => console.log("Form valid:", valid));

  const App = () => div([
    input({ 
      type: "email", 
      placeholder: "Email", 
      value: email, 
      onInput: e => email(e.target.value) 
    }),
    input({ 
      type: "password", 
      placeholder: "Password", 
      value: password, 
      onInput: e => password(e.target.value) 
    }),
    p(() => `Form valid: ${isValid() ? "Yes" : "No"}`)
  ]);
  setTimeout(() => mount(App, '#demo-compose-form'), 50);
}
```

---

## Best Practices for Complex State

### ✅ DO: Compose signals explicitly

```javascript
// Clear, predictable, and memory-safe
const user = {
  name: $("Juan"),
  email: $("juan@example.com"),
  preferences: {
    theme: $("dark"),
    notifications: $(true)
  }
}

// Computed values derived from composition
const userDisplay = $(() => `${user.name()} <${user.email()}>`)
```

### ✅ DO: Create store patterns

```javascript
const createUserStore = () => {
  const name = $("")
  const email = $("")
  
  const isValid = $(() => name().length > 0 && email().includes("@"))
  
  const actions = {
    setName: (value) => name(value),
    setEmail: (value) => email(value),
    reset: () => {
      name("")
      email("")
    }
  }
  
  return { name, email, isValid, ...actions }
}

const userStore = createUserStore()
```

### ❌ DON'T: Try to wrap objects with signals

```javascript
// Wrong - loses reactivity on nested properties
const user = $({ name: "Juan", email: "..." })
user().name = "Ana" // ❌ Not reactive!

// Correct - each property its own signal
const userName = $("Juan")
const userEmail = $("...")
```

### ❌ DON'T: Destructure signals in reactive contexts

```javascript
// Wrong - breaks tracking
const { name, email } = user
watch(() => name(), ...) // ❌ 'name' is not tracked properly

// Correct - use the original signal
watch(() => user.name(), ...) // ✅
```

---

## Important Notes

### ✅ DO:
```javascript
// Update by recreating objects for arrays
todos(prev => [...prev, newTodo])

// Update objects immutably
const current = user()
user({ ...current, name: "Ana" })

// Track individual signals
watch(() => user.name(), () => {})
watch(() => user.email(), () => {})
```

### ❌ DON'T:
```javascript
// Mutate objects directly
user().name = "Ana" // ❌ Not reactive

// Mutate arrays in place
todos().push(newTodo) // ❌ Not reactive

// Destructure in component bodies
const { name, email } = user // ❌ Breaks reactivity
```

---

## Automatic Cleanup

All signals integrate with the cleanup system:

```javascript
// Effects are automatically disposed when components unmount
const name = $("Juan")
watch(name, () => console.log("Name changed"))

// Manual cleanup if needed
const stop = watch(name, callback)
stop() // Clean up manually
```

---

## Complete Example

<div id="demo-complete-final"></div>

```javascript
{
  // All state as explicit signals
  const theme = $("dark", "theme_complete")
  const sidebarOpen = $(true)
  const userName = $("")
  const userEmail = $("")
  const notifications = $(true)
  const language = $("es")
  
  // Computed signals
  const isLoggedIn = $(() => !!userName() && !!userEmail())
  
  // Actions as plain functions
  const login = (name, email) => {
    userName(name)
    userEmail(email)
  }
  
  const logout = () => {
    userName("")
    userEmail("")
    notifications(true) // Reset on logout
  }
  
  // Components using signals directly
  const LoginForm = () => div([
    input({ 
      placeholder: "Name", 
      onInput: e => userName(e.target.value) 
    }),
    input({ 
      placeholder: "Email", 
      onInput: e => userEmail(e.target.value) 
    }),
    button({ 
      onClick: () => login(userName(), userEmail()) 
    }, "Login")
  ])

  const UserProfile = () => div([
    h2(() => `Welcome ${userName()}`),
    p(() => `Email: ${userEmail()}`),
    p(() => `Notifications: ${notifications() ? "ON" : "OFF"}`),
    p(() => `Language: ${language()}`),
    button({ 
      onClick: () => notifications(!notifications()) 
    }, "Toggle Notifications"),
    button({ onClick: logout }, "Logout")
  ])

  const App = () => div({ class: "complete-example" }, [
    when(() => isLoggedIn(), () => UserProfile(), () => LoginForm())
  ])

  setTimeout(() => mount(App, '#demo-complete-final'), 50)
}
```

---

## Summary

With **only `$()`** as your reactive primitive:

- ✅ **Explicit** - You know exactly what's reactive
- ✅ **Memory safe** - No hidden proxies or WeakMap caches
- ✅ **Predictable** - No magic, just signals
- ✅ **Performant** - Minimal overhead
- ✅ **Debuggable** - Clear data flow

Complex state is built by **composing signals**, not by wrapping objects. This gives you the same power as reactive proxies but with better control and fewer surprises.