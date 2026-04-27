# Installation & Setup

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
  // Import the core – no global helpers or XSS yet
  import { $, h, mount } from 'https://cdn.jsdelivr.net/npm/sigpro@1.2.23/dist/sigpro.esm.min.js';

  // Option A: use named imports (no globals, recommended)
  const count = $(0);
  mount(() => h('h1', {}, () => `Count: ${count()}`), '#app');

  // Option B: enable global tag helpers (still optional)
  import 'https://cdn.jsdelivr.net/npm/sigpro@1.2.23/sigpro/tags.js';
  // now div, span, button, etc. become global
</script>
```

  </div>

  <input type="radio" name="install_method" class="tab border-base-300 whitespace-nowrap" aria-label="CDN (IIFE)" />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">

```html
<!-- Classic script: full kit (core, router, tags, XSS) auto‑installed -->
<script src="https://cdn.jsdelivr.net/npm/sigpro@1.2.23/dist/sigpro.min.js"></script>
<script>
  // $, h, div, button, router, etc. are already global
  const count = $(0);
  const App = () => div({ class: "card" }, [
    h1(() => `Count: ${count()}`),
    button({ onclick: () => count(count() + 1) }, "Increment")
  ]);
  mount(App, '#app');
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
import { $, mount } from 'sigpro';
import 'sigpro/tags';   // ← make div, h1, button, etc. global
import 'sigpro/xss';    // ← optional: activate XSS shield

const App = () => {
  const count = $(0);
  return div({ class: "card p-4" }, [
    h1(() => `Count is: ${count()}`),
    button(
      { class: "btn btn-primary", onclick: () => count(count() + 1) },
      "Increment"
    ),
  ]);
};

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

    <!-- IIFE full bundle – everything ready to use -->
    <script src="https://cdn.jsdelivr.net/npm/sigpro@1.2.23/dist/sigpro.min.js"></script>
    <script>
      const name = $('Developer');
      const App = () => section({ class: "container" }, [
        h2(() => `Welcome, ${name()}`),
        input({
          type: "text",
          class: "input input-bordered",
          value: name,
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

## 3. Global by Design (Two Modes)

SigPro gives you full control over global pollution.

### Mode A: Classic (IIFE) – Full Auto‑injection
When you load the **IIFE full bundle** (`sigpro.min.js`) with a traditional `<script>` tag (no `type="module"`), the library automatically provides **everything**:
- Core functions (`$`, `$$`, `watch`, `h`, `when`, `each`, `router`, `mount`, `batch`) directly on `window` (also available as `SigPro.*`).
- Lowercase tag helpers (`div`, `span`, `button`, …) become global functions.
- Built‑in XSS protection activated.

✅ Zero configuration – just drop the script and start coding.

### Mode B: ESM (Modern) – Explicit Activation
When you import the **ESM core** (`import { ... } from 'sigpro'`), **only the reactive core and router are available**. Tags and security are opt‑in:

1. **Named imports** (for the core):
   ```javascript
   import { $, h, mount, router } from 'sigpro';
   ```
   No global pollution – perfect for bundlers and large projects.

2. **Activate global helpers** (when you want `div`, `span`, etc. without importing each one):
   ```javascript
   import 'sigpro/tags';   // side‑effect: injects all tag helpers into window
   ```

3. **Activate XSS shield** (optional):
   ```javascript
   import 'sigpro/xss';    // side‑effect: enables attribute sanitization
   ```

### Why two modes?
- **Legacy / no‑build**: Use the IIFE full script and get everything automatically.
- **Modern ESM**: Keep your global namespace clean, only activate helpers/security when needed, and benefit from tree‑shaking.

---

## 4. Why no build step?

Because SigPro uses **native ES Modules** and standard JavaScript functions to generate the DOM, you don't actually *need* a compiler like Babel or a transformer for JSX.

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
- **Global by Design** (with control): Tag helpers and core functions can be globally available (IIFE) or imported on demand (ESM) – you choose.

---

## 7. Summary

SigPro isn't just another framework; it's a bridge to the native web. By using standard ES Modules and functional DOM generation, you get the benefits of a modern reactive library with the weight of a utility script.

**Because, in the end... why fight the web when we can embrace it?**