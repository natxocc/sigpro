# `SigPro`

Blazing fast, zero-overhead, vanilla JS renderer with atomic reactivity.

[![npm version](https://img.shields.io/npm/v/sigpro.svg)](https://www.npmjs.com/package/sigpro)
![js size](https://img.shields.io/badge/js_size-~4_kB_brotli-blue)
[![license](https://img.shields.io/npm/l/sigpro)](https://github.com/natxocc/sigpro/blob/main/LICENSE)

[**Explore the Docs →**](https://sigpro.natxocc.com/#/)

---

## Why SigPro?

After years of building within closed ecosystems like **React, Vue, or Svelte**—spending countless hours mastering their internal rules and extra development time on abstractions—we must face an inevitable truth: all those complex "wrappers" must ultimately be translated back into Pure JavaScript for the browser to understand.

That extra development time and the cognitive load of "learning the framework" instead of "learning the language" is exactly what **SigPro** eliminates. If the final destination is always JS, why not use a Pure JS-based system that drastically simplifies coding with a readable, vanilla, and remarkably fast architecture?

* **Atomic Precision:** Powered by an **alien-signals**-class push-pull reactive core. State is bound directly to DOM nodes—when a value changes, **only that specific node updates**. No diffing, no virtual tree, no wasted work.
* **Zero-Hydration Bottlenecks:** No 100KB bundles or complex build steps. SigPro is pure, optimized JavaScript tailored for the browser's native engine.
* **Lazy Computation:** `computed()` is lazy and verified with `checkDirty`. Effects don't re-run when a dependency's value didn't actually change.
* **Build-Tool Agnostic:** Total freedom. Use it with **Vite, Webpack, or Rollup** for enterprise projects, or simply import it via a **`<script type="module">` tag** for rapid prototyping. No tooling required.
* **Zero-Scale Bloat:** Unlike other frameworks where the bundle grows exponentially, SigPro's footprint remains **flat and predictable**.
* **Premium DX:** Forget boilerplate imports. SigPro injects an elegant, functional syntax (`div()`, `button()`, `span()`) directly into your scope (via `exposeTags()`) for a **"Zero-Import"** workflow.
* **Fully Loaded:** Built-in Hash Routing, native **`localStorage` persistence**, **SVG support**, and automatic cleanup of listeners and scopes—all in a single file.
* **No Memory Leaks:** Scopes cascade idempotently. Event listeners are tracked and removed with the node. Computeds die with their owners.

-----

## Elegance in Action

Create reactive, persistent components with a syntax that feels like Vanilla JS, but works like magic:

```html
<div id="app"></div>
```

```javascript
import { signal, computed, local, mount, exposeTags } from "sigpro";

exposeTags();

const Counter = () => {
  // Simple signal
  const value = signal(100);
  // One-line persistence: state survives page reloads automatically
  const count = local("user-counter-pref", 0); 
  const ref   = signal(100);
  const doubleValue = computed(() => value() * ref());

  return div({ class: "card" }, [
    h1(() => `Count: ${count()}, Reference: ${value()}, Double: ${doubleValue()}`),
    p("Atomic updates. Zero re-renders of the parent tree."),
    button({ onclick: () => count(count() + 1) }, "Increment +1")
  ]);
};

mount(Counter, "#app");
```

-----

## Core API

### Reactivity

```javascript
import {
  signal, computed, effect, onMount, onError,
  batch, untrack, watch, local
} from "sigpro";

const count = signal(0);
count();        // read
count(1);       // write

const double = computed(() => count() * 2);
double();       // → 2, lazily evaluated

// Effect with cleanup
const stop = effect(() => {
  const v = count();
  console.log(v);
  return () => console.log("cleanup");
});

// Run once on mount (great for 3rd party libs)
const dispose = onMount(() => {
  const chart = new Chart(el);
  return () => chart.destroy();
});

// Batching: defer flush until the end
batch(() => {
  count(1);
  count(2);
});

// Watch: skip initial run, receive old/new values
watch(count, (newval, oldval) => console.log(oldval, "→", newval));

// Untrack: read without subscribing
untrack(() => count());

// Persistent signal (localStorage-backed, JSON)
const theme = local("theme", "light");
theme("dark");  // stored, survives reloads
```

### Rendering

```javascript
import { h, mount, exposeTags } from "sigpro";

exposeTags(); // → window.div, window.span, window.button, etc.

// Static
div({ class: "card" }, "Hello");

// Reactive props
div({ class: () => active() ? "card active" : "card" });

// Reactive style (string or object)
div({ style: () => open() ? "" : "display:none" });

// Reactive children
div({}, () => items().map(i => li({}, i.name)));

// Events (tracked and cleaned up automatically)
button({ onclick: () => count(count() + 1) }, "+1");

// ref
input({ ref: el => el.focus() });

// Two-way binding
input({ value: () => username(), oninput: e => username(e.target.value) })
```

### SVG

```javascript
h('svg', { viewBox: "0 0 24 24" }, [
  h('path', { d: "M9 12l2 2 4-4", stroke: "currentColor", fill: "none" })
]);
```

SVG tags are detected automatically. `class`, `style`, and every attribute go through `setAttribute` correctly.

### Router

```javascript
import { router } from "sigpro/router";

const App = router([
  { path: "/",          component: Home },
  { path: "/about",     component: About },
  { path: "/blog/:slug", component: BlogPost },
  { path: "*",          component: NotFound }
]);

router.to("/about");
router.back();
router.path(); // current path
```

### i18n

```javascript
import { addLang, setLocale, t } from "sigpro/lang";

addLang({
  en: { hello: "Hello" },
  es: { hello: "Hola" }
});

setLocale("es");
t("hello")();   // "Hola" (imperative read)
h1(t("hello")); // "Hola" (reactive, updates when locale changes)
```

### HTTP Helper

```javascript
import { db } from "sigpro/db";

const loading = signal(false);
const data = await db("/api/users", null, loading);

// POST JSON
await db("/api/save", { name: "Ada" });

// Upload files (FormData is supported natively)
await db("/api/upload", formData);
```

-----

## Performance Without Compromise

| Feature | **SigPro** | React / Vue | Svelte |
| :--- | :--- | :--- | :--- |
| **Payload (Brotli)** | **~4KB** | ~30KB - 50KB | ~5KB (Compiled Runtime) |
| **State Logic** | **Push-pull Signals** | Virtual DOM Diffing | Compiler Dirty Bits |
| **Update Speed** | **Direct Node Access** | Component Re-render | Block Reconciliation |
| **Native Persistence** | **`local()`** | Requires Plugins | Manual |
| **Dependencies** | **Zero** | Many | Build Toolchain |
| **Lifecycle Mgmt** | **Automatic (Scopes + `_cln`)** | Manual / Hook-based | Manual / Hook-based |
| **Routing** | **Reactive Hash Router** | Virtual Router (External) | File-based / External |
| **Learning Curve** | **Zero (Vanilla JS)** | Steep (JSX/Templates) | Medium (Directives) |

-----

## Quick Start

```bash
npm install sigpro
```

**With Vite:**
```bash
npm create vite@latest my-app -- --template vanilla
cd my-app
npm install sigpro
```

**Or without build tools (Native ES Modules):**
```html
<script type="module">
  import { signal, mount, exposeTags } from "https://cdn.jsdelivr.net/npm/sigpro/+esm";
  // ...
</script>
```

-----

## What SigPro Is Not

SigPro is **not** a framework with a custom compiler, virtual DOM, or JSX transform. It is:

- **Vanilla JS** with a reactive core.
- **Explicit**: `signal()`, `computed()`, `effect()` — no overloaded operators, no magic argument-type dispatch.
- **Minimal**: only the primitives needed to build UIs, not a kitchen sink.

If you want JSX, file-based routing with auto-generation, or a component lifecycle DSL, SigPro is not that. If you want **the rawest, smallest reactive renderer that stays out of your way**, it is.

-----

## License

MIT © 2026 **SigPro Team**.
*Engineered for speed, designed for clarity, built for the modern web.*
