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

```javascript
const count = $(0); 

count();    // Read (0)
count(10);  // Write (10)
```

### 2. Persistent State
**`$(value, key)`**
Creates a writable signal that syncs with the browser's storage.

```javascript
const theme = $("light", "app-theme"); 

theme("dark"); // Automatically calls localStorage.setItem("app-theme", '"dark"')
```
*Note: On page load, SigPro will prioritize the value found in `localStorage` over the `initialValue`.*

### 3. Computed State (Derived)
**`$(function)`**
Creates a read-only signal that updates automatically when any signal used inside it changes.

```javascript
const price = $(100);
const tax = $(0.21);

// This tracks both 'price' and 'tax' automatically
const total = $(() => price() * (1 + tax())); 
```

---

## Updating with Logic
When calling the setter, you can pass an **updater function** to access the current value safely.

```javascript
const list = $(["A", "B"]);

// Adds "C" using the previous state
list(prev => [...prev, "C"]); 
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

```javascript
const state = $$({ count: 0, name: "Juan" });

$watch(() => state.count, () => {
  console.log(`Count is now ${state.count}`);
});

state.count++; // ✅ Triggers update
state.name = "Ana"; // ✅ Also reactive
```

### 2. Deep Reactivity

Unlike `$()`, `$$()` tracks nested properties automatically.

```javascript
const user = $$({
  profile: {
    name: "Juan",
    address: {
      city: "Madrid",
      zip: "28001"
    }
  }
});

// This works! Tracks deep property access
$watch(() => user.profile.address.city, () => {
  console.log("City changed");
});

user.profile.address.city = "Barcelona"; // ✅ Triggers update
```

### 3. Arrays

`$$()` works with arrays and array methods.

```javascript
const todos = $$([
  { id: 1, text: "Learn SigPro", done: false },
  { id: 2, text: "Build an app", done: false }
]);

$watch(() => todos.length, () => {
  console.log(`You have ${todos.length} todos`);
});

// Array methods are reactive
todos.push({ id: 3, text: "Deploy", done: false }); // ✅ Triggers
todos[0].done = true; // ✅ Deep reactivity works
todos.splice(1, 1); // ✅ Triggers
```

### 4. Mixed with Signals

`$$()` works seamlessly with `$()` signals.

```javascript
const form = $$({
  fields: {
    email: "",
    password: ""
  },
  isValid: $(false) // Signal inside reactive object
});

// Computed using both
const canSubmit = $(() => 
  form.fields.email.includes("@") && 
  form.fields.password.length > 6
);

$watch(canSubmit, (valid) => {
  form.isValid(valid); // Update signal inside reactive object
});
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
- Working with primitives (numbers, strings, booleans)
- Need localStorage persistence
- Creating computed values
- Want explicit control over updates

```javascript
const count = $(0);
const user = $(null);
const fullName = $(() => `${firstName()} ${lastName()}`);
```

### Use `$$()` when:
- Working with complex nested objects
- Managing forms with multiple fields
- Using arrays with mutations (push, pop, splice)
- Want natural object syntax (no function calls)

```javascript
const form = $$({ email: "", password: "" });
const settings = $$({ theme: "dark", notifications: true });
const store = $$({ users: [], filters: {}, pagination: { page: 1 } });
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
$watch(() => state.count, () => {});
$watch(() => state.user.name, () => {});
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
- Works with `$watch`, `$if`, and `$for`

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

```javascript
// Combining both approaches
const app = {
  // Simple primitives with persistence
  theme: $("dark", "theme"),
  sidebarOpen: $(true),
  
  // Complex state with $$()
  user: $$({
    name: "",
    email: "",
    preferences: {
      notifications: true,
      language: "es"
    }
  }),
  
  // Computed values
  isLoggedIn: $(() => !!app.user.name),
  
  // Actions
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

// UI component
const UserProfile = () => {
  return Div({}, [
    $if(() => app.isLoggedIn(),
      () => Div({}, [
        H2(`Welcome ${app.user.name}`),
        P(`Email: ${app.user.email}`),
        P(`Notifications: ${app.user.preferences.notifications ? "ON" : "OFF"}`),
        Button({ onclick: () => app.user.preferences.notifications = !app.user.preferences.notifications },
          "Toggle Notifications"
        ),
        Button({ onclick: app.logout }, "Logout")
      ]),
      () => LoginForm()
    )
  ]);
};
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