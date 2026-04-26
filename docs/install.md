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
  // Import the module – no automatic global injection
  import { sigpro, $, h, mount } from 'https://cdn.jsdelivr.net/npm/sigpro@1.2.19/+esm';

  // Option A: manually inject all globals (like the classic script)
  sigpro();  // now $, h, div, watch, etc. are on window

  // Option B: use named imports (no global pollution)
  const count = $(0);
  mount(() => h1(() => `Count: ${count()}`), '#app');
</script>
```

  </div>

  <input type="radio" name="install_method" class="tab border-base-300 whitespace-nowrap" aria-label="CDN (IIFE)" />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">

```html
<!-- Classic script: auto‑installs everything on window -->
<script src="https://cdn.jsdelivr.net/npm/sigpro@1.2.19/dist/sigpro.js"></script>
<script>
  // $, h, div, button, watch, ... are already global
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
// App.js – Using named imports (recommended)
import { $, h1, button, div, mount } from 'sigpro';

export const App = () => {
  const count = $(0);
  return div({ class: "card p-4" }, [
    h1(() => `Count is: ${count()}`),
    button(
      { class: "btn btn-primary", onclick: () => count(count() + 1) },
      "Increment"
    ),
  ]);
};

// main.js
import { mount } from 'sigpro';
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

    <script src="https://cdn.jsdelivr.net/npm/sigpro@1.2.19/dist/sigpro.js"></script>
    <script>
      // Everything is already global – no import needed
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

### Mode A: Classic (IIFE) – Auto‑injection
When you load the **IIFE bundle** (`sigpro.js`) with a traditional `<script>` tag (no `type="module"`), the library automatically injects:
- All core functions (`$`, `$$`, `watch`, `h`, `when`, `each`, `fx`, `router`, `req`, `mount`, `batch`) into `window`.
- Lowercase tag helpers (`div`, `span`, `button`, etc.) also become global functions.

✅ Zero configuration – just drop the script and start coding.

### Mode B: ESM (Modern) – Explicit Injection
When you import the **ESM module** (from CDN or via `import`), **nothing** is added to `window` by default. You have two clean options:

1. **Named imports** (recommended for most apps):
   ```javascript
   import { $, h, mount } from 'sigpro';
   ```
   No global pollution, perfect for bundlers and large projects.

2. **Manual global injection** (similar to classic mode but controlled):
   ```javascript
   import { sigpro } from 'sigpro';
   sigpro();  // now $, h, div, button, ... are on window
   ```
   Useful for quick prototyping or when you prefer the global style.

### Why two modes?
- **Legacy / no‑build**: Use the IIFE script and get everything automatically.
- **Modern ESM**: Keep your global namespace clean, leverage tree‑shaking, or inject only when you need it.

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