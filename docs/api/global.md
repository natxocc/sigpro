# Global State Management: Atomic & Modular

SigPro leverages the native power and efficiency of **signals** to create robust global stores with **zero complexity**. While other frameworks force you into heavy libraries and rigid boilerplate (Redux, Pinia, or Svelte stores), SigPro treats "the store" as a simple architectural choice: **defining a signal outside of a component.**

> **Availability:** Core functions (`signal`, `computed`, `effect`, `local`, ...) are exported from the SigPro module. In **ESM** you must import them (`import { signal, computed, local } from 'sigpro'`). If you call `exposeTags()` at startup, the HTML helpers (`div`, `span`, `button`, ...) become available as globals. The examples below assume the core functions are in scope via import.

## Modular Organization (Zero Constraints)

You are not restricted to a single `store.js`. You can organize your state by **feature**, **domain**, or **page**. Since a SigPro store is just a standard JavaScript module exporting signals, you can name your files whatever you like (`auth.js`, `cart.js`, `settings.js`) to keep your logic clean.

### 1. File-Based Stores (`<any-name>.js`)

Creating a dedicated file allows you to export only what you need. This modularity ensures **tree shaking** works perfectly – you never load state that isn't imported.

```javascript
// auth.js
import { signal, computed, local } from 'sigpro';

// A simple global signal
export const user = signal({ name: "Guest", loggedIn: false });

// A persistent global signal (auto-syncs with localStorage)
export const theme = local("app-theme-pref", "light");

// A computed global signal that reacts to the 'user' signal
export const welcomeMessage = computed(() => `Welcome back, ${user().name}!`);
```

### 2. Cross-Component Consumption

Once exported, these signals act as a **single source of truth**. SigPro ensures that if a signal changes in one file, every component importing it across the entire app updates **atomically** without a full re-render.

```javascript
// Profile.js
import { user } from "./auth.js";
import { div, h2, button } from 'sigpro'; // o usa las globales tras exposeTags()

const Profile = () => div({}, [
  h2(() => user().name),
  button(
    { onclick: () => user({ name: "John Doe", loggedIn: true }) },
    "Log In"
  )
]);

// Navbar.js
import { welcomeMessage, theme } from "./auth.js";
import { nav, span } from 'sigpro';

const Navbar = () => nav({ class: () => theme() }, [
  span(() => welcomeMessage())
]);
```

---

## Why SigPro Stores Are Superior

| Feature               | SigPro                          | Redux / Pinia / Svelte          |
| :-------------------- | :------------------------------ | :------------------------------ |
| **Boilerplate**       | **0%** (just a variable)        | High (actions, reducers, stores)|
| **Organization**      | **Unlimited** (any filename)    | Often strictly "store" files    |
| **Persistence**       | **Native** (`local()`)          | Requires middleware / plugins   |
| **Learning Curve**    | **Instant**                     | Steep / complex                 |
| **Bundle Size**       | **0KB** (part of core)          | 10KB – 30KB+                    |
| **Reactivity Model**  | Push-pull signals, lazy computed| Varies (diffing, stores, compiler) |

---

## The Persistence Advantage

The magic of SigPro's `local(key, value)` is that it works identically for local and global states. By wrapping the signal with `local`, your modular store survives browser refreshes automatically. No manual `localStorage.getItem` or `JSON.parse` logic is ever required.

```javascript
import { local } from 'sigpro';

// This single line creates a global, reactive,
// and persistent store for a shopping cart.
export const cart = local("session-cart", []);
```

---

## Summary of Scopes

| Scope           | Definition                                                                   | Behaviour                                          |
| :-------------- | :--------------------------------------------------------------------------- | :------------------------------------------------- |
| **Local**       | Signal defined **inside** a component                                        | Unique to every component instance                 |
| **Module**      | Signal defined **outside** a component (same file)                           | Shared by all instances within that file           |
| **Global**      | Signal defined in a **separate file** and imported                           | Shared across the entire application               |
| **Persistent**  | A signal wrapped with **`local(key, initial)`**                              | Shared globally and persisted in `localStorage`    |

> Signals are not scoped to components by default. A signal created inside a component body is *re-created on every render*, so if you want state that survives re-renders, define it **outside** the component or wrap the creation inside an `effectScope()` with a stable boundary.

---

## Complete Example – Todo Store

```javascript
// store/todos.js
import { signal, computed, local } from 'sigpro';

export const todos = local("todos", []);
export const filter = signal("all");

export const addTodo = (text) => {
  todos([...todos(), { id: Date.now(), text, done: false }]);
};

export const toggleTodo = (id) => {
  todos(todos().map(t => t.id === id ? { ...t, done: !t.done } : t));
};

export const filteredTodos = computed(() => {
  const all = todos();
  if (filter() === "active") return all.filter(t => !t.done);
  if (filter() === "completed") return all.filter(t => t.done);
  return all;
});
```

```javascript
// components/TodoApp.js
import { mount, signal } from 'sigpro';
import { div, input, button, ul, li, span } from 'sigpro'; // o tras exposeTags()
import { todos, filter, addTodo, toggleTodo, filteredTodos } from "../store/todos.js";

// Signal local al componente para el texto del input.
// Definida FUERA del cuerpo de render para no recrearla en cada cambio.
const draft = signal("");

const TodoApp = () =>
  div({ class: "todo-app" }, [
    input({
      placeholder: "Add todo...",
      value: () => draft(),
      oninput: (e) => draft(e.target.value),
      onkeydown: (e) => {
        if (e.key === "Enter" && draft().trim()) {
          addTodo(draft().trim());
          draft("");
        }
      }
    }),
    div({ class: "filters" }, [
      button({ onclick: () => filter("all") },       "All"),
      button({ onclick: () => filter("active") },    "Active"),
      button({ onclick: () => filter("completed") }, "Completed")
    ]),
    ul({}, () => filteredTodos().map(todo =>
      li({}, [
        input({
          type: "checkbox",
          checked: () => todo.done,
          oninput: () => toggleTodo(todo.id)
        }),
        span(todo.text)
      ])
    ))
  ]);

mount(TodoApp, "#app");
```
