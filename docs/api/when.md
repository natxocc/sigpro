# Reactive Branching: `when( )`

The `when` function is the reactive control flow operator in SigPro. It conditionally renders one of two branches (or nothing) based on a reactive condition. The inactive branch is completely removed from the DOM and its effects are destroyed, saving memory and CPU.

## Function Signature

```typescript
when(
  condition: boolean | Signal<boolean> | (() => boolean),
  thenBranch: Node | (() => Node),
  elseBranch?: Node | (() => Node) | null
): HTMLElement
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`condition`** | `boolean` / `Signal` / `() => boolean` | Yes | A value or reactive expression that determines which branch to show. |
| **`thenBranch`** | `Node` / `() => Node` | Yes | Content rendered when the condition is **truthy**. |
| **`elseBranch`** | `Node` / `() => Node` | No | Content rendered when the condition is **falsy**. Defaults to nothing. |

**Returns:** A `div` with `style="display:contents"` that acts as an anchor for the dynamic content. This element is part of the DOM and will be replaced/updated automatically.

> **Availability:** `when` is exported from the SigPro module. In **ESM** you must import it (`import { when } from 'sigpro'`) or inject all globals via `sigpro()`. In the **IIFE** classic script, it is automatically available on `window`. The examples below assume the function is already in scope.

---

## Usage Patterns

### 1. Simple Toggle

```javascript
const isVisible = $(false);

div([
  button({ onclick: () => isVisible(!isVisible()) }, "Toggle"),
  when(isVisible,
    p("Now you see me!"),
    p("Now you don't...")
  )
]);
```

### 2. With Functions (Lazy Initialization)

To avoid creating heavy components until they are actually needed, pass a function that returns the branch.

```javascript
when(() => user.isLoggedIn(),
  () => DashboardComponent(),   // Only created when logged in
  () => LoginForm()             // Only created when guest
);
```

### 3. Complex Conditions

`condition` can be any expression that returns a boolean – it can read signals, computed values, or plain booleans.

```javascript
when(() => count() > 10 && status() === 'ready',
  span("Threshold reached!")
);
```

### 4. Without an `else` branch

If no `elseBranch` is provided, nothing is rendered when the condition is falsy.

```javascript
when(loading,
  div({ class: "spinner" }, "Loading...")
);
```

---

## Automatic Cleanup

`when` automatically manages the lifecycle of each branch:

- When the condition changes, the current branch is destroyed.
- All effects (`watch`), event listeners, and child `when`/`each` inside the destroyed branch are recursively disposed.
- The new branch is created and mounted.
- Memory leaks are prevented without any manual intervention.

---

## Best Practices

- **Use functions for expensive branches** – `() => Component()` ensures the component is only created when the branch becomes active.
- **Avoid inline complex logic** – keep conditions readable; extract to computed signals if needed.
- **No manual cleanup required** – SigPro handles everything.

---

## Technical Comparison

| Feature | CSS `display: none` | `when` |
| :--- | :--- | :--- |
| **DOM presence** | Always present | Only active branch exists |
| **Event listeners** | Still attached | Removed |
| **Effects (`watch`)** | Still running | Destroyed |
| **Memory usage** | Higher | Optimised (only one branch alive) |
| **Cleanup** | Manual | Automatic |

---

## Complete Example

```javascript
const loggedIn = $(false);
const username = $("Guest");

const Profile = () => div([
  h2(`Welcome, ${username()}`),
  button({ onclick: () => loggedIn(false) }, "Logout")
]);

const LoginForm = () => div([
  input({ placeholder: "Name", onInput: e => username(e.target.value) }),
  button({ onclick: () => loggedIn(true) }, "Login")
]);

const App = () =>
  div([
    when(loggedIn,
      () => Profile(),
      () => LoginForm()
    )
  ]);

mount(App, '#app');
```