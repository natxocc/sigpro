# Dependency Injection: `provide` / `inject`

Dependency Injection lets a component pass values down to **any descendant** in the tree without prop drilling. It is scoped by tree: the nearest `provide` wins, and values are invisible to siblings and ancestors.

SigPro ships two functions, both exported from the module:

- **`provide(key, value)`** — register a value for the current scope and its descendants.
- **`inject(key, fallback?)`** — read the nearest value for a key from an ancestor scope.

Both work with `string` or `symbol` keys. Use `symbol` when you want to avoid collisions across modules.

---

## Signatures

```typescript
provide<T>(key: string | symbol, value: T): void

inject<T>(key: string | symbol, fallback?: T): T | undefined
```

- `provide` writes to the current effect / effectScope context.
- `inject` walks up the scope chain until it finds a matching key, then returns the value.
- If no provider is found, `inject` returns `fallback` (which may be `undefined`).

> **Availability:** Both functions are exported from the SigPro module. Import them by name (`import { provide, inject } from 'sigpro'`).

---

## Why DI

Prop drilling:

```js
const App = () => Layout({ theme: "dark" });

const Layout = ({ theme }) => Sidebar({ theme });

const Sidebar = ({ theme }) => Nav({ theme });

const Nav = ({ theme }) => div({ class: `nav ${theme}` }, "...");
```

Every level must know and forward `theme`, even if it doesn't use it. With DI:

```js
import { provide, inject } from 'sigpro';

const App = () => {
  provide("theme", "dark");
  return Layout();
};

const Layout = () => Sidebar();
const Sidebar = () => Nav();

const Nav = () => {
  const theme = inject("theme");
  return div({ class: `nav ${theme}` }, "...");
};
```

`Layout` and `Sidebar` don't know or care about `theme`. Only `App` (provider) and `Nav` (consumer) are aware of it.

DI becomes valuable when:

- A value is used deep in the tree but provided at the root.
- The intermediate components shouldn't be coupled to that value.
- You need **scoping**: different subtrees with different values for the same key.

If none of those apply, a module-level signal is simpler.

---

## Basic Usage

<div id="demo-di-basic"></div>

```js
{
  const THEME = Symbol("theme");

  const App = () => {
    provide(THEME, "dark");
    return Layout();
  };

  const Layout = () => div({ class: "layout" }, [
    Sidebar(),
    Content()
  ]);

  const Sidebar = () => Nav();

  const Nav = () => {
    const theme = inject(THEME);
    return div({ class: () => `nav theme-${theme}` }, "Navigation");
  };

  const Content = () => {
    const theme = inject(THEME);
    return div({ class: () => `content theme-${theme}` }, "Content");
  };

  setTimeout(() => mount(App, "#demo-di-basic"), 50);
}
```

`App` provides, `Layout` and `Sidebar` are transparent, and `Nav` / `Content` consume.

---

## Scoped Overrides

The nearest provider wins. A descendant can override for its own subtree without affecting siblings.

<div id="demo-di-scoped"></div>

```js
{
  const THEME = Symbol("theme");

  const App = () => {
    provide(THEME, "light");
    return div({ class: "app" }, [
      Header(),
      Panel() // overrides internally for its subtree
    ]);
  };

  const Header = () => {
    const theme = inject(THEME);
    return div({ class: `header theme-${theme}` }, `Header (${theme})`);
  };

  const Panel = () => {
    provide(THEME, "dark");
    return div({ class: "panel" }, [
      div("Panel wrapper"),
      Inner()
    ]);
  };

  const Inner = () => {
    const theme = inject(THEME);
    return div({ class: `inner theme-${theme}` }, `Inner (${theme})`);
  };

  setTimeout(() => mount(App, "#demo-di-scoped"), 50);
}
```

Result: `Header` sees `"light"` (from `App`), while `Inner` sees `"dark"` (from `Panel`).

---

## Reactive Values

DI itself is not reactive. If you want descendants to **react** to changes, provide a **signal** and read it where needed.

<div id="demo-di-reactive"></div>

```js
{
  const THEME = Symbol("theme");

  const App = () => {
    const theme = signal("light");
    provide(THEME, theme); // provide the signal itself

    return div(
      button({
        onclick: () => theme(theme() === "light" ? "dark" : "light")
      }, "Toggle"),
      Header(),
      Panel()
    );
  };

  const Header = () => {
    const theme = inject(THEME);
    return div({ class: () => `header theme-${theme()}` }, () => `Header (${theme()})`);
  };

  const Panel = () => {
    const theme = inject(THEME); // same signal, no override
    return div({ class: () => `panel theme-${theme()}` }, () => `Panel (${theme()})`);
  };

  setTimeout(() => mount(App, "#demo-di-reactive"), 50);
}
```

Clicking the toggle updates both `Header` and `Panel`, because they read the same signal.

> **Rule of thumb:** provide signals, not plain values, if you want reactivity. Provide plain values only for things that never change (config constants, service instances, API clients).

---

## Keys: String vs Symbol

**String keys** are convenient:

```js
provide("theme", "dark");
const theme = inject("theme");
```

**Symbol keys** avoid collisions when multiple modules use the same word:

```js
// theme.js
export const THEME = Symbol("theme");

// App.js
import { THEME } from "./theme.js";
provide(THEME, "dark");

// Nav.js
import { THEME } from "./theme.js";
const theme = inject(THEME);
```

For small apps, strings are fine. For libraries, plugins, or anything with multiple providers, use symbols.

---

## Fallbacks

`inject` accepts a second argument used when no provider is found:

```js
const theme = inject("theme", "light"); // returns "light" if nothing provides
```

Without a fallback, `inject` returns `undefined`.

```js
const maybe = inject("missing"); // undefined
```

You can distinguish "not provided" from "provided as undefined" by checking the fallback:

```js
const missing = Symbol("missing");
const value = inject("key", missing);
if (value === missing) {
  // no provider in the tree
}
```

---

## Scope Boundaries

`provide` writes to the **current effect or effectScope context**. This has two consequences:

### 1. Component-level provides

Inside a component, `provide` is scoped to that component's render scope:

```js
const App = () => {
  provide("theme", "dark"); // visible to descendants of App only
  return Layout();
};
```

When `App` unmounts, its provided values disappear. Descendants reading them after that get `undefined` or the fallback.

### 2. Manual scopes

Inside an `effectScope`, `provide` is scoped to that scope:

```js
import { effectScope, provide, inject } from 'sigpro';

const dispose = effectScope(() => {
  provide("config", { debug: true });
  effect(() => {
    console.log(inject("config")); // → { debug: true }
  });
});
```

Outside any scope, `provide` is a no-op (there is no context to write to).

---

## Common Patterns

### 1. Service registry

```js
// services.js
export const API = Symbol("api");

// App.js
import { API } from "./services.js";
import { db } from "sigpro";

const App = () => {
  provide(API, {
    getUsers: () => db("/api/users"),
    saveUser: (u) => db("/api/users", u),
  });
  return UserList();
};

// UserList.js
import { API } from "./services.js";
import { inject } from "sigpro";

const UserList = () => {
  const api = inject(API);
  // ...use api.getUsers(), api.saveUser(), etc.
};
```

Services are injected once at the root and consumed anywhere.

### 2. Theming with signals

```js
const ThemeKey = Symbol("theme");

const App = () => {
  provide(ThemeKey, local("app-theme", "light"));
  return Layout();
};

const ThemedButton = (props, children) => {
  const theme = inject(ThemeKey);
  return button({ class: () => `btn theme-${theme()}` }, children);
};
```

The theme is persisted (via `local`), reactive (it's a signal), and shared across the tree without prop drilling.

### 3. Modal/toast scoping

Each modal instance can provide its own `close` function, so any descendant can close it without knowing the modal's implementation:

```js
const Modal = (props, children) => {
  provide("close-modal", props.onClose);
  return div({ class: "modal" }, children);
};

const CloseButton = () => {
  const close = inject("close-modal");
  return button({ onclick: close }, "Close");
};
```

---

## What DI Is Not

- **Not a global store.** Values are scoped to the tree. Use a module-level signal for globals.
- **Not reactive by itself.** It forwards whatever you give it — signals, services, plain values.
- **Not magic.** `inject` reads the current scope chain, nothing more. There is no auto-subscription, no invalidation.

---

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Provide a static value | `provide("theme", "dark")` |
| Provide a reactive value | `provide("theme", signal("dark"))` |
| Read with fallback | `inject("theme", "light")` |
| Read without fallback | `inject("theme")` |
| Symbol key (no collisions) | `export const THEME = Symbol("theme")` |
| Scope to a component | Call `provide` inside the component function. |
| Scope to a manual region | Call `provide` inside `effectScope`. |
| Provide a service | `provide(API, { get: () => db("/x") })` |

