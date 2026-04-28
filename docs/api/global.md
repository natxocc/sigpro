# Global State Management: Atomic & Modular

SigPro leverages the native power and efficiency of **signals** to create robust global stores with **zero complexity**. While other frameworks force you into heavy libraries and rigid boilerplate (Redux, Pinia, or Svelte stores), SigPro treats “the store” as a simple architectural choice: **defining a signal outside of a component.**

> **Availability:** `$` (and other core functions) are exported from the SigPro module. In **ESM** you must import them (`import { $ } from 'sigpro'`) or inject all globals via `sigpro()`. In the **IIFE** classic script, `$` is automatically available on `window`. The examples below assume `$` is already in scope (via import or global).

## Modular Organization (Zero Constraints)

You are not restricted to a single `store.js`. You can organize your state by **feature**, **domain**, or **page**. Since a SigPro store is just a standard JavaScript module exporting signals, you can name your files whatever you like (`auth.js`, `cart.js`, `settings.js`) to keep your logic clean.

### 1. File‑Based Stores (`<any-name>.js`)

Creating a dedicated file allows you to export only what you need. This modularity ensures **tree shaking** works perfectly – you never load state that isn’t imported.

```javascript
// auth.js
import { $ } from 'sigpro';

// A simple global signal
export const user = $({ name: "Guest", loggedIn: false });

// A persistent global signal (auto‑syncs with localStorage)
export const theme = $("light", "app-theme-pref");

// A computed global signal that reacts to the 'user' signal
export const welcomeMessage = $(() => `Welcome back, ${user().name}!`);
```

### 2. Cross‑Component Consumption

Once exported, these signals act as a **single source of truth**. SigPro ensures that if a signal changes in one file, every component importing it across the entire app updates **atomically** without a full re‑render.

```javascript
// Profile.js
import { user } from "./auth.js";

const Profile = () => div([
  h2(() => user().name),
  button({ onclick: () => user({ name: "John Doe", loggedIn: true }) }, "Log In")
]);

// Navbar.js
import { welcomeMessage, theme } from "./auth.js";

const Navbar = () => nav({ class: () => theme() }, [
  span(() => welcomeMessage())
]);
```

---

## Why SigPro Stores Are Superior

| Feature               | SigPro                        | Redux / Pinia / Svelte          |
| :-------------------- | :---------------------------- | :------------------------------ |
| **Boilerplate**       | **0%** (just a variable)      | High (actions, reducers, stores)|
| **Organization**      | **Unlimited** (any filename)  | Often strictly “store” files    |
| **Persistence**       | **Native** (just add a key)   | Requires middleware / plugins   |
| **Learning Curve**    | **Instant**                   | Steep / complex                 |
| **Bundle Size**       | **0KB** (part of core)        | 10KB – 30KB+                    |

---

## The Persistence Advantage

The magic of SigPro’s `$(value, "key")` is that it works identically for local and global states. By simply adding a second argument, your modular store survives browser refreshes automatically. No manual `localStorage.getItem` or `JSON.parse` logic is ever required.

```javascript
// This single line creates a global, reactive,
// and persistent store for a shopping cart.
export const cart = $([], "session-cart");
```

---

## Summary of Scopes

| Scope           | Definition                                                      | Behaviour                                     |
| :-------------- | :-------------------------------------------------------------- | :-------------------------------------------- |
| **Local**       | Signal defined **inside** a component                           | Unique to every component instance            |
| **Module**      | Signal defined **outside** a component (same file)              | Shared by all instances within that file      |
| **Global**      | Signal defined in a **separate file** and imported              | Shared across the entire application          |
| **Persistent**  | Any Signal defined with a **key** (e.g., `$([], "cart")`)       | Shared globally and persisted in `localStorage` |

---

## Complete Example – Todo Store

```javascript
// store/todos.js
import { $ } from 'sigpro';

export const todos = $([], "todos");
export const filter = $("all");

export const addTodo = (text) => {
  todos([...todos(), { id: Date.now(), text, done: false }]);
};

export const toggleTodo = (id) => {
  todos(todos().map(t => t.id === id ? { ...t, done: !t.done } : t));
};

export const filteredTodos = $(() => {
  const all = todos();
  if (filter() === "active") return all.filter(t => !t.done);
  if (filter() === "completed") return all.filter(t => t.done);
  return all;
});
```

```javascript
// components/TodoApp.js
import { sigpro } from 'sigpro';
import { todos, filter, addTodo, toggleTodo, filteredTodos } from "../store/todos.js";
sigpro(); // tags helpers available in global also core functions

const TodoApp = () =>
  div({ class: "todo-app" }, [
    input({ placeholder: "Add todo...", onKeyDown: (e) => {
      if (e.key === "Enter" && e.target.value) {
        addTodo(e.target.value);
        e.target.value = "";
      }
    }}),
    div({ class: "filters" }, [
      button({ onClick: () => filter("all") }, "All"),
      button({ onClick: () => filter("active") }, "Active"),
      button({ onClick: () => filter("completed") }, "Completed")
    ]),
    ul(
      each(filteredTodos,
        (todo) => li([
          input({ type: "checkbox", checked: () => todo.done, onInput: () => toggleTodo(todo.id) }),
          span(() => todo.done ? s(todo.text) : todo.text)
        ]),
        (todo) => todo.id
      )
    )
  ]);

mount(TodoApp, "#app");
```