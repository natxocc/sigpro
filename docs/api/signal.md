# The Signal Function: `$( )`

The `$( )` function is the core constructor of SigPro. It defines how data is stored, computed, and persisted.

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

# The Reactive Object: `$$( )`

The `$$( )` function creates a reactive proxy for complex nested objects. Unlike `$()`, which tracks a single value, `$$()` tracks **every property access** automatically.

## Function Signature

```typescript
$$<T extends object>(obj: T): T
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`obj`** | `object` | Yes | The object to make reactive. Properties are tracked recursively. |

**Returns:** A reactive proxy that behaves like the original object but triggers updates when any property changes.

---

## Usage Patterns

### 1. Simple Object

<div id="demo-dollar-simple"></div>

```javascript
{
  const state = $$({ count: 0, name: "Juan" });
  watch(() => console.log(`Count is now ${state.count}`));

  const App = () => div([
    p(() => `Count: ${state.count}, Name: ${state.name}`),
    button({ onClick: () => state.count++ }, "Increment count"),
    button({ onClick: () => state.name = state.name === "Juan" ? "Ana" : "Juan" }, "Toggle name")
  ]);
  setTimeout(() => mount(App, '#demo-dollar-simple'), 50);
}
```

### 2. Deep Reactivity

<div id="demo-dollar-deep"></div>

```javascript
{
  const user = $$({
    profile: {
      name: "Juan",
      address: { city: "Madrid", zip: "28001" }
    }
  });

  watch(() => user.profile.address.city, () => console.log("City changed"));

  const App = () => div([
    p(() => `City: ${user.profile.address.city}`),
    button({ onClick: () => user.profile.address.city = "Barcelona" }, "Change to Barcelona")
  ]);
  setTimeout(() => mount(App, '#demo-dollar-deep'), 50);
}
```

### 3. Arrays

<div id="demo-dollar-array"></div>

```javascript
{
  const todos = $$([
    { id: 1, text: "Learn SigPro", done: false },
    { id: 2, text: "Build an app", done: false }
  ]);

  watch(() => todos.length, () => console.log(`You have ${todos.length} todos`));

  const App = () => div([
    ul(() => todos.map(todo => li(todo.text + (todo.done ? " ✓" : "")))),
    button({ onClick: () => todos.push({ id: Date.now(), text: "New todo", done: false }) }, "Add todo"),
    button({ onClick: () => todos[0].done = !todos[0].done }, "Toggle first todo")
  ]);
  setTimeout(() => mount(App, '#demo-dollar-array'), 50);
}
```

### 4. Mixed with Signals

<div id="demo-dollar-mixed"></div>

```javascript
{
  const form = $$({
    fields: { email: "", password: "" },
    isValid: $(false)
  });

  const canSubmit = $(() => 
    form.fields.email.includes("@") && 
    form.fields.password.length > 6
  );

  watch(canSubmit, valid => form.isValid(valid));

  const App = () => div([
    input({ type: "email", placeholder: "Email", value: () => form.fields.email, onInput: e => form.fields.email = e.target.value }),
    input({ type: "password", placeholder: "Password", value: () => form.fields.password, onInput: e => form.fields.password = e.target.value }),
    p(() => `Form valid: ${form.isValid() ? "Yes" : "No"}`)
  ]);
  setTimeout(() => mount(App, '#demo-dollar-mixed'), 50);
}
```

---

## Key Differences: `$()` vs `$$()`

| Feature | `$()` Signal | `$$()` Reactive |
| :--- | :--- | :--- |
| **Primitives** | ✅ Works directly | ❌ Needs wrapper object |
| **Objects** | Manual tracking | ✅ Automatic deep tracking |
| **Nested properties** | ❌ Not reactive | ✅ Fully reactive |
| **Arrays** | Requires reassignment | ✅ Methods (push, pop, etc.) work |
| **Syntax** | `count()` / `count(5)` | `state.count = 5` |
| **LocalStorage** | ✅ Built-in | ❌ (use `$()` for persistence) |
| **Performance** | Lighter | Slightly heavier (Proxy) |
| **Destructuring** | ✅ Safe | ❌ Breaks reactivity |

---

## When to Use Each

### Use `$()` when:

<div id="demo-use-dollar"></div>

```javascript
{
  const count = $(0);
  const firstName = $("John");
  const lastName = $("Doe");
  const fullName = $(() => `${firstName()} ${lastName()}`);

  const App = () => div([
    p(() => `Count: ${count()}`),
    button({ onClick: () => count(count() + 1) }, "Count up"),
    p(() => `Full name: ${fullName()}`),
    input({ value: firstName, placeholder: "First name" }),
    input({ value: lastName, placeholder: "Last name" })
  ]);
  setTimeout(() => mount(App, '#demo-use-dollar'), 50);
}
```

### Use `$$()` when:

<div id="demo-use-dollar-dollar"></div>

```javascript
{
  const form = $$({ email: "", password: "" });
  const settings = $$({ theme: "dark", notifications: true });

  const App = () => div([
    input({ placeholder: "Email", onInput: e => form.email = e.target.value }),
    input({ placeholder: "Password", type: "password", onInput: e => form.password = e.target.value }),
    p(() => `Email: ${form.email}, Password: ${form.password}`),
    button({ onClick: () => settings.theme = settings.theme === "dark" ? "light" : "dark" }, "Toggle theme"),
    p(() => `Current theme: ${settings.theme}`)
  ]);
  setTimeout(() => mount(App, '#demo-use-dollar-dollar'), 50);
}
```

---

## Important Notes

### ✅ DO:
```javascript
// Access properties directly
state.count = 10;
state.user.name = "Ana";
todos.push(newItem);

// Track in effects
watch(() => state.count, () => {});
watch(() => state.user.name, () => {});
```

### ❌ DON'T:
```javascript
// Destructuring breaks reactivity
const { count, user } = state; // ❌ count and user are not reactive

// Reassigning the whole object
state = { count: 10 }; // ❌ Loses reactivity

// Using primitive directly
const count = $$(0); // ❌ Doesn't work (use $() instead)
```

---

## Automatic Cleanup

Like all SigPro reactive primitives, `$$()` integrates with the cleanup system:

- Effects tracking reactive properties are automatically disposed
- No manual cleanup needed
- Works with `watch`, `when`, and `each`

---

## Technical Comparison

| Aspect | `$()` | `$$()` |
| :--- | :--- | :--- |
| **Implementation** | Closure with Set | Proxy with WeakMap |
| **Tracking** | Explicit (function call) | Implicit (property access) |
| **Memory** | Minimal | Slightly more (WeakMap cache) |
| **Use Case** | Simple state | Complex state |
| **Learning Curve** | Low | Low (feels like plain JS) |

---

## Complete Example

<div id="demo-complete"></div>

```javascript
{
  const app = {
    theme: $("dark", "theme_complete"),
    sidebarOpen: $(true),
    user: $$({ name: "", email: "", preferences: { notifications: true, language: "es" } }),
    isLoggedIn: $(() => !!app.user.name),
    login(name, email) {
      app.user.name = name;
      app.user.email = email;
    },
    logout() {
      app.user.name = "";
      app.user.email = "";
      app.user.preferences.notifications = true;
    }
  };

  const LoginForm = () => div([
    input({ placeholder: "Name", onInput: e => app.user.name = e.target.value }),
    input({ placeholder: "Email", onInput: e => app.user.email = e.target.value }),
    button({ onClick: () => app.login(app.user.name, app.user.email) }, "Login")
  ]);

  const UserProfile = () => div([
    h2(() => `Welcome ${app.user.name}`),
    p(() => `Email: ${app.user.email}`),
    p(() => `Notifications: ${app.user.preferences.notifications ? "ON" : "OFF"}`),
    button({ onClick: () => app.user.preferences.notifications = !app.user.preferences.notifications }, "Toggle Notifications"),
    button({ onClick: app.logout }, "Logout")
  ]);

  const App = () => div({ class: "complete-example" }, [
    when(() => app.isLoggedIn(), () => UserProfile(), () => LoginForm())
  ]);

  setTimeout(() => mount(App, '#demo-complete'), 50);
}
```

---

## Migration from `$()` to `$$()`

If you have code using nested signals:

```javascript
// Before - Manual nesting
const user = $({
  name: $(""),
  email: $("")
});
user().name("Juan"); // Need to call inner signal

// After - Automatic nesting
const user = $$({
  name: "",
  email: ""
});
user.name = "Juan"; // Direct assignment
```

