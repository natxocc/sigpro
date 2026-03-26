# 🚦 Routing: `$router()` & Utilities

SigPro includes a built-in, lightweight **Hash Router** to create Single Page Applications (SPA). It manages the URL state, matches components to paths, and handles the lifecycle of your pages automatically.

## 🛠 Router Signature

```typescript
$router(routes: Route[]): HTMLElement
```

### Route Object
| Property | Type | Description |
| :--- | :--- | :--- |
| **`path`** | `string` | The URL fragment (e.g., `"/"`, `"/user/:id"`, or `"*"`). |
| **`component`** | `Function` | A function that returns a Node, a String, or a reactive View. |

---

## 📖 Usage Patterns

### 1. Defining Routes
The `$router` returns a `div` element with the class `.router-outlet`. When the hash changes, the router destroys the previous view and mounts the new one inside this container.

```javascript
const App = () => Div({ class: "app-layout" }, [
  Navbar(),
  // The router outlet is placed here
  $router([
    { path: "/", component: Home },
    { path: "/profile/:id", component: (params) => UserProfile(params.id) },
    { path: "*", component: () => H1("404 Not Found") }
  ])
]);
```

### 2. Dynamic Segments (`:id`)
The router automatically parses URL parameters (like `:id`) and passes them as an object to the component function. You can also access them globally via `$router.params()`.

```javascript
// If the URL is #/profile/42
const UserProfile = (params) => {
  return H1(`User ID is: ${params.id}`); // Displays "User ID is: 42"
};
```

---

## 🏎 Navigation Utilities

SigPro provides a set of programmatic methods to control the history and read the state.

### `$router.to(path)`
Navigates to a specific path. It automatically formats the hash (e.g., `/home` becomes `#/home`).
```javascript
Button({ onclick: () => $router.to("/dashboard") }, "Go to Dashboard")
```

### `$router.back()`
Goes back to the previous page in the browser history.
```javascript
Button({ onclick: () => $router.back() }, "Back")
```

### `$router.path()`
Returns the current path (without the `#`).
```javascript
$watch(() => {
  console.log("Current path is:", $router.path());
});
```

---

## ⚡ Technical Behavior

* **Automatic Cleanup**: Every time you navigate, the router calls `.destroy()` on the previous view. This ensures that all **signals, effects, and event listeners** from the old page are purged from memory.
* **Reactive Params**: `$router.params` is a signal (`$`). You can react to parameter changes without re-mounting the entire router outlet.
* **Hash-Based**: By using `window.location.hash`, SigPro works out-of-the-box on any static hosting (like GitHub Pages or Vercel) without needing server-side redirects.

---

## 🎨 Styling the Outlet
The router returns a standard `div` with the `.router-outlet` class. You can easily style it or add transitions:

```css
.router-outlet {
  display: block;
  min-height: 100vh;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```