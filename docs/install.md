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
  // Import the core and UI components
  import { $ } from "[https://cdn.jsdelivr.net/npm/sigpro@latest/+esm](https://cdn.jsdelivr.net/npm/sigpro@latest/+esm)";
  import { UI } from "[https://cdn.jsdelivr.net/npm/sigpro@latest/ui/+esm](https://cdn.jsdelivr.net/npm/sigpro@latest/ui/+esm)";

  // Initialize UI components globally
  UI($);
</script>
```

  </div>
</div>

  <input type="radio" name="install_method" class="tab border-base-300 whitespace-nowrap" aria-label="CDN (ESM)" />
  <div class="tab-content bg-base-100 border-base-300 rounded-box p-6">
<pre class="bg-base-200 p-4 rounded-lg"><code class="language-html">&lt;script type="module"&gt;
  // Import the core and UI components
  import { $ } from 'https://cdn.jsdelivr.net/npm/sigpro@latest/+esm';
  import { UI } from 'https://cdn.jsdelivr.net/npm/sigpro@latest/ui/+esm';
  
  // Initialize UI components globally
  UI($);
&lt;/script&gt;</code></pre>
  </div>
</div>

---

## 2. Quick Start Examples

SigPro uses **PascalCase** for Tag Helpers (e.g., `Div`, `Button`) to provide a clean, component-like syntax without needing JSX.

<div class="tabs tabs-box w-full mt-8 mb-12 bg-base-200/50 p-2 rounded-xl border border-base-300">
  <input type="radio" name="quick_start_tabs" class="tab !rounded-lg" aria-label="Mainstream (Bundlers)" checked />
  <div class="tab-content bg-base-100 border-base-300 rounded-lg p-6 mt-2">

```javascript
// File: App.js
import { $ } from "sigpro";

export const App = () => {
  const $count = $(0);

  // Tag Helpers like Div, H1, Button are available globally
  return Div({ class: "card p-4" }, [
    H1(["Count is: ", $count]),
    Button(
      {
        class: "btn btn-primary",
        onclick: () => $count((c) => c + 1),
      },
      "Increment",
    ),
  ]);
};

// File: main.js
import { $ } from "sigpro";
import { App } from "./App.js";

$mount(App, "#app");
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
      import { $ } from "https://cdn.jsdelivr.net/npm/sigpro@latest/+esm";

      const $name = $("Developer");

      // No need to import Div, Section, H2, Input... they are global!
      const App = () =>
        Section({ class: "container" }, [
          H2(["Welcome, ", $name]),
          Input({
            type: "text",
            class: "input input-bordered",
            $value: $name, // Automatic two-way binding
            placeholder: "Type your name...",
          }),
        ]);

      $mount(App, "#app");
    </script>
  </body>
</html>
```

  </div>
</div>

---

## 3. Global by Design

One of SigPro's core strengths is its **Global API**, which eliminates "Import Hell".

- **The `$` Function:** Once loaded, it attaches itself to `window.$`. It handles state, effects, and DOM mounting.
- **Tag Helpers (PascalCase):** Common HTML tags (`Div`, `Span`, `Button`, `Input`, etc.) are automatically registered in the global scope.
- **Custom Components:** We recommend using **PascalCase** (e.g., `UserCard`) or prefixes like `_Input` to keep your code organized and distinguish your logic from standard tags.

## 4. Why no build step?

Because SigPro uses **native ES Modules** and standard JavaScript functions to generate the DOM, you don't actually _need_ a compiler like Babel or a transformer for JSX.

- **Development:** Just save and refresh. Pure JS, no "transpilation" required.
- **Performance:** Extremely lightweight. Use any modern bundler (Vite, esbuild) only when you are ready to minify and tree-shake for production.

## 5. Why SigPro? (The Competitive Edge)

SigPro stands out by removing the "Build Step" tax and the "Virtual DOM" overhead. It is the closest you can get to writing raw HTML/JS while maintaining modern reactivity.

| Feature            | **SigPro**       | **SolidJS**  | **Svelte**   | **React**   | **Vue**     |
| :----------------- | :--------------- | :----------- | :----------- | :---------- | :---------- |
| **Bundle Size**    | **~2KB**         | ~7KB         | ~4KB         | ~40KB+      | ~30KB       |
| **DOM Strategy**   | **Direct DOM**   | Direct DOM   | Compiled DOM | Virtual DOM | Virtual DOM |
| **Reactivity**     | **Fine-grained** | Fine-grained | Compiled     | Re-renders  | Proxies     |
| **Build Step**     | **Optional**     | Required     | Required     | Required    | Optional    |
| **Learning Curve** | **Minimal**      | Medium       | Low          | High        | Medium      |
| **Initialization** | **Ultra-Fast**   | Very Fast    | Fast         | Slow        | Medium      |

---

## 6. Key Advantages

- **Extreme Performance**: No Virtual DOM reconciliation. SigPro updates the specific node or attribute instantly when a Signal changes.
- **Fine-Grained Reactivity**: State changes only trigger updates where the data is actually used, not on the entire component.
- **Native Web Standards**: Everything is a standard JS function. No custom template syntax to learn.
- **Zero Magic**: No hidden compilers. What you write is what runs in the browser.
- **Global by Design**: Tag Helpers and the `$` function are available globally to eliminate "Import Hell" and keep your code clean.

## 7. Summary

SigPro isn't just another framework; it's a bridge to the native web. By using standard ES Modules and functional DOM generation, you gain the benefits of a modern library with the weight of a utility script.

**Because, in the end... why fight the web when we can embrace it?**
