# Installation & Setup (SigPro 1.2.18)

SigPro is designed to be drop-in ready. Whether you are building a complex application with a bundler or a simple reactive widget in a single HTML file, SigPro scales with your needs.

## 1. Installation

Choose the method that best fits your workflow:

<div class="tabs tabs-box w-full mt-8 mb-12">
  <input type="radio" name="install_method" class="tab border-base-300" aria-label="npm" checked />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">

```bash
npm install sigpro
```

  </div>

  <input type="radio" name="install_method" class="tab border-base-300" aria-label="pnpm" />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">

```bash
pnpm add sigpro
```

  </div>

  <input type="radio" name="install_method" class="tab border-base-300" aria-label="yarn" />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">

```bash
yarn add sigpro
```

  </div>

  <input type="radio" name="install_method" class="tab border-base-300" aria-label="bun" />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">

```bash
bun add sigpro
```

  </div>
  <input type="radio" name="install_method" class="tab border-base-300 whitespace-nowrap" aria-label="CDN (ESM)" />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">

```html
<script type="module">
  // Import the core – it auto-installs itself globally
  import 'https://cdn.jsdelivr.net/npm/sigpro@1.2.18/+esm';
  // Now $, $$, watch, h, when, each, fx, router, req, mount, batch and all lowercase tag helpers (div, button, etc.) are available
</script>
```

  </div>
</div>

---

## 2. Quick Start Examples

SigPro uses **lowercase** Tag Helpers (e.g., `div`, `button`) to keep the syntax close to raw HTML, while still being pure JavaScript functions.

<div class="tabs tabs-box w-full mt-8 mb-12 bg-base-200/50 p-2 rounded-xl border border-base-300">
  <input type="radio" name="quick_start_tabs" class="tab !rounded-lg" aria-label="Mainstream (Bundlers)" checked />
  <div class="tab-content bg-base-100 border-base-300 rounded-lg p-6 mt-2">

```javascript
// File: App.js
import 'sigpro';  // auto-installs globals

export const App = () => {
  const count = $(0);

  // Tag helpers like div, h1, button are available globally (lowercase)
  return div({ class: "card p-4" }, [
    h1(() => `Count is: ${count()}`),
    button(
      {
        class: "btn btn-primary",
        onclick: () => count(count() + 1),
      },
      "Increment"
    ),
  ]);
};

// File: main.js
import 'sigpro';
import { App } from './App.js';

mount(App, '#app');
```

  </div>

  <input type="radio" name="quick_start_tabs" class="tab !rounded-lg" aria-label="Classic (Direct CDN)" />
  <div class="tab-content bg-base-100 border-base-300 rounded-lg p-6 mt-2">

```html
<!DOCTYPE html>
<html lang="en">
  <body>
    <div id="app"></div>

    <script type="module">
      import 'https://cdn.jsdelivr.net/npm/sigpro@1.2.18/+esm';

      const name = $('Developer');

      // Lowercase tag helpers: section, h2, input
      const App = () =>
        section({ class: "container" }, [
          h2(() => `Welcome, ${name()}`),
          input({
            type: "text",
            class: "input input-bordered",
            value: name,   // ✅ Two-way binding: signal as value + automatic input event
            placeholder: "Type your name...",
          }),
        ]);

      mount(App, '#app');
    </script>
  </body>
</html>
```

  </div>
</div>

---

## 3. Global by Design

One of SigPro's core strengths is its **Global API**, which eliminates "Import Hell" while remaining ESM-compatible.

- **The "Zero-Config" Import:** By simply adding `import 'sigpro'` (or importing from the CDN), the framework automatically "hydrates" the global `window` object.
  - **Core Functions:** You get immediate access to `$`, `$$`, `watch`, `h`, `when`, `each`, `fx`, `router`, `req`, `mount`, `batch` anywhere in your scripts.
  - **Auto-Installation:** This happens instantly upon import thanks to its built-in self‑installation, making it "Plug & Play" for both local projects and CDN usage.

- **Lowercase Tag Helpers:** All standard HTML tags are pre-registered as global functions (`div`, `span`, `button`, `section`, `input`, `h1`, `h2`, etc.).
  - **Clean UI Syntax:** Write UI structures that look almost like HTML but are pure, reactive JavaScript: `div({ class: "card" }, [ h1("Title") ])`.

- **Tree Shaking Friendly:** For maximum optimization, you can still use named imports: `import { $, watch, mount } from 'sigpro'`. Modern bundlers (Vite, esbuild) will prune unused code.

- **Custom Components:** We recommend using **PascalCase** for your own components (e.g., `UserCard()`) to distinguish them from built-in lowercase tag helpers.

---

## 4. Why no build step?

Because SigPro uses **native ES Modules** and standard JavaScript functions to generate the DOM, you don't actually _need_ a compiler like Babel or a transformer for JSX.

- **Development:** Just save and refresh. Pure JS, no "transpilation" required.
- **Performance:** Extremely lightweight. Use any modern bundler (Vite, esbuild) only when you are ready to minify and tree-shake for production.

## 5. Why SigPro? (The Competitive Edge)

SigPro stands out by removing the "Build Step" tax and the "Virtual DOM" overhead. It is the closest you can get to writing raw HTML/JS while maintaining modern reactivity.

| Feature            | **SigPro**       | **SolidJS**  | **Svelte**   | **React**   | **Vue**     |
| :----------------- | :--------------- | :----------- | :----------- | :---------- | :---------- |
| **Bundle Size**    | **~3KB**         | ~7KB         | ~4KB         | ~40KB+      | ~30KB       |
| **DOM Strategy**   | **Direct DOM**   | Direct DOM   | Compiled DOM | Virtual DOM | Virtual DOM |
| **Reactivity**     | **Fine-grained** | Fine-grained | Compiled     | Re-renders  | Proxies     |
| **Build Step**     | **Optional**     | Required     | Required     | Required    | Optional    |
| **Learning Curve** | **Minimal**      | Medium       | Low          | High        | Medium      |
| **Initialization** | **Ultra-Fast**   | Very Fast    | Fast         | Slow        | Medium      |

---

## 6. Key Advantages

- **Extreme Performance**: No Virtual DOM reconciliation. SigPro updates the specific node or attribute instantly when a signal changes.
- **Fine-Grained Reactivity**: State changes only trigger updates where the data is actually used, not on the entire component.
- **Native Web Standards**: Everything is a standard JS function. No custom template syntax to learn.
- **Zero Magic**: No hidden compilers. What you write is what runs in the browser.
- **Global by Design**: Tag helpers and core functions are available globally to eliminate "Import Hell" and keep your code clean.

---

## 7. Summary

SigPro isn't just another framework; it's a bridge to the native web. By using standard ES Modules and functional DOM generation, you get the benefits of a modern reactive library with the weight of a utility script.

**Because, in the end... why fight the web when we can embrace it?**
