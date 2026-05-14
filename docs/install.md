# Installation & Setup

SigPro is designed to be drop-in ready. Whether you are building a complex application with a bundler or a simple reactive widget in a single HTML file, SigPro scales with your needs.

## 1. Installation

Choose the method that best fits your workflow:

<div class="tabs tabs-box w-full mt-8 mb-12">
  <input type="radio" name="install_method" class="tab border-base-300" aria-label="npm" checked />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">

```bash
npm install sigpro

or

bun add sigpro
```

  </div>

  <input type="radio" name="install_method" class="tab border-base-300 whitespace-nowrap" aria-label="CDN" />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">

```html
<script type="module">
  // Import the core
  import {
    $,
    h,
    mount,
  } from "https://cdn.jsdelivr.net/npm/sigpro@latest/dist/sigpro.esm.min.js";

  // For full import and assign to window
  // import * as SigPro from "./sigpro.js";
  // Object.assign(window, SigPro);

  const count = $(0);
  mount(() => h("h1", {}, () => `Count: ${count()}`), "#app");
</script>
```

  </div>
</div>

---

## 2. Quick Start Examples

SigPro uses **lowercase** Tag Helpers (e.g., `div`, `button`) to keep the syntax close to raw HTML, while still being pure JavaScript functions.

<div class="tabs tabs-box w-full mt-8 mb-12 bg-base-200/50 p-2 rounded-xl border border-base-300">
  <input type="radio" name="quick_start_tabs" class="tab !rounded-lg" aria-label="Bundlers (ESM)" checked />
  <div class="tab-content bg-base-100 border-base-300 rounded-lg p-6 mt-2">

```javascript
// App.js – Use named imports for the core, activate helpers if needed
import { $, mount } from "sigpro";

const App = () => {
  const count = $(0);
  return div({ class: "card p-4" }, [
    h1(() => `Count is: ${count()}`),
    button(
      { class: "btn btn-primary", onclick: () => count(count() + 1) },
      "Increment",
    ),
  ]);
};

mount(App, "#app");
```

  </div>

  <input type="radio" name="quick_start_tabs" class="tab !rounded-lg" aria-label="Classic (Direct CDN)" />
  <div class="tab-content bg-base-100 border-base-300 rounded-lg p-6 mt-2">

```html
<!DOCTYPE html>
<html lang="en">
  <body>
    <div id="app"></div>

    <!-- CDN full bundle – everything ready to use -->
    <script type="module">
      // Import the core
      import { $, h, mount } from "https://cdn.jsdelivr.net/npm/sigpro@latest/dist/sigpro.esm.min.js";
      const name = $("Developer");
      const App = () =>
        section({ class: "container" }, [
          h2(() => `Welcome, ${name()}`),
          input({
            type: "text",
            class: "input input-bordered",
            value: name,
            placeholder: "Type your name...",
          }),
        ]);
      mount(App, "#app");
    </script>
  </body>
</html>
```

  </div>
</div>

---

## 3. Why no build step?

Because SigPro uses **native ES Modules** and standard JavaScript functions to generate the DOM, you don't actually _need_ a compiler like Babel or a transformer for JSX.

- **Development:** Just save and refresh. Pure JS, no "transpilation" required.
- **Performance:** Extremely lightweight. Use any modern bundler (Vite, esbuild) only when you are ready to minify and tree-shake for production.

## 4. Key Advantages

- **Extreme Performance**: No Virtual DOM reconciliation. SigPro updates the specific node or attribute instantly when a signal changes.
- **Fine-Grained Reactivity**: State changes only trigger updates where the data is actually used, not on the entire component.
- **Native Web Standards**: Everything is a standard JS function. No custom template syntax to learn.
- **Zero Magic**: No hidden compilers. What you write is what runs in the browser.
- **Global by Design** (with control): Tag helpers and core functions can be globally available (IIFE) or imported on demand (ESM) – you choose.

---

## 5. Summary

SigPro isn't just another framework; it's a bridge to the native web. By using standard ES Modules and functional DOM generation, you get the benefits of a modern reactive library with the weight of a utility script.

**Because, in the end... why fight the web when we can embrace it?**
