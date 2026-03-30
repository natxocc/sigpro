# Global State Management: Atomic & Modular

SigPro leverages the native power and efficiency of **Signals** to create robust global stores with **0% complexity**. While other frameworks force you into heavy libraries and rigid boilerplate (Redux, Pinia, or Svelte Stores), SigPro treats "The Store" as a simple architectural choice: **defining a Signal outside of a component.**

## Modular Organization (Zero Constraints)

You are not restricted to a single `store.js`. You can organize your state by **feature**, **domain**, or **page**. Since a SigPro store is just a standard JavaScript module exporting Signals, you can name your files whatever you like (`auth.js`, `cart.js`, `settings.js`) to keep your logic clean.

### 1. File-Based Stores (`<any-name>.js`)
Creating a dedicated file allows you to export only what you need. This modularity ensures **Tree Shaking** works perfectly—you never load state that isn't imported.

```javascript
// auth.js
import SigPro from "sigpro";

// A simple global signal
export const user = $({ name: "Guest", loggedIn: false });

// A persistent global signal (auto-syncs with localStorage via native key)
export const theme = $("light", "app-theme-pref");

// A computed global signal that reacts to the 'user' signal
export const welcomeMessage = $(() => `Welcome back, ${user().name}!`);
```

### 2. Cross-Component Consumption
Once exported, these signals act as a **Single Source of Truth**. SigPro ensures that if a signal changes in one file, every component importing it across the entire app updates **atomically** without a full re-render.

```javascript
// Profile.js
import { user } from "./auth.js";

const Profile = () => Div([
  H2(user().name),
  Button({ onclick: () => user({ name: "John Doe", loggedIn: true }) }, "Log In")
]);

// Navbar.js
import { welcomeMessage, theme } from "./auth.js";

const Navbar = () => Nav({ class: theme }, [
  Span(welcomeMessage)
]);
```

---

## Why SigPro Stores are Superior

| Feature | SigPro | Redux / Pinia / Svelte |
| :--- | :--- | :--- |
| **Boilerplate** | **0%** (Just a variable) | High (Actions, Reducers, Wrappers) |
| **Organization** | **Unlimited** (Any filename) | Often strictly "Store" or "Actions" |
| **Persistence** | **Native** (Just add a key) | Requires Middleware / Plugins |
| **Learning Curve** | **Instant** | Steep / Complex |
| **Bundle Size** | **0KB** (Part of the core) | 10KB - 30KB+ |

---

## The "Persistence" Advantage
The magic of SigPro’s `$(value, "key")` is that it works identically for local and global states. By simply adding a second argument, your Modular Store survives browser refreshes automatically. No manual `localStorage.getItem` or `JSON.parse` logic is ever required.

```javascript
// This single line creates a global, reactive, 
// and persistent store for a shopping cart.
export const cart = $([], "session-cart");
```

---

## Summary of Scopes
* **Local Scope:** Signal defined **inside** a component. Unique to every instance created.
* **Module Scope:** Signal defined **outside** a component (same file). Shared by all instances within that specific file.
* **Global Scope:** Signal defined in a **separate file**. Shared across the entire application by any importing module.
* **Persistent Scope:** Any Signal defined with a **key**. Shared globally and remembered after a page reload.
