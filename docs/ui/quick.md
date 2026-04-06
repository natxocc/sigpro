# UI Components `(WIP)`

> **Status: Work In Progress.**  
> SigPro UI is a complete component environment built with SigPro, Tailwind CSS and DaisyUI. It provides smart components that handle their own internal logic, reactivity, and professional styling.

<div class="alert alert-info shadow-md my-10 border-l-8 border-info bg-info/10 text-info-content">
  <div class="flex flex-col md:flex-row items-start gap-4">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6 mt-1"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    <div>
      <h2 class="font-black text-xl tracking-tight mb-2">📢 Official Documentation</h2>
      <p class="text-sm opacity-90 leading-relaxed mb-2">
        All official documentation, interactive examples, and usage guides are available at:
      </p>
      <div class="bg-base-100 p-3 rounded-lg inline-block">
        <a href="https://natxocc.github.io/sigpro-ui/#/" target="_blank" class="text-info font-mono text-base font-bold hover:underline">
          https://natxocc.github.io/sigpro-ui/#/
        </a>
      </div>
      <p class="text-xs mt-4 opacity-70 italic">
        * Documentation is actively being updated as components are released.
      </p>
    </div>
  </div>
</div>

---

## 1. What are UI Components?

Unlike **Tag Helpers** (which are just functional mirrors of HTML tags), SigPro UI Components are smart abstractions:

* **Stateful**: They manage complex internal states (like date ranges, search filtering, or API lifecycles).
* **Reactive**: Attributes prefixed with `$` are automatically tracked via `Watch`.
* **Self-Sane**: They automatically use `._cleanups` to destroy observers or event listeners when removed from the DOM.
* **Themed**: Fully compatible with DaisyUI v5 theme system and Tailwind v4 utility classes.

---

## 2. Prerequisites

<div class="alert alert-warning shadow-md my-6 border-l-8 border-warning bg-warning/10">
  <div class="flex items-start gap-3">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5 mt-0.5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
    <div>
      <p class="text-sm font-semibold">To ensure all components render correctly, your project must have:</p>
      <ul class="flex flex-wrap gap-3 mt-2">
        <li class="badge badge-warning badge-md">Tailwind CSS v4+</li>
        <li class="badge badge-warning badge-md">DaisyUI v5+</li>
      </ul>
    </div>
  </div>
</div>

---

## 3. The UI Registry (Available Now)

| Category | Components |
| :--- | :--- |
| **Forms & Inputs** | `Button`, `Input`, `Select`, `Autocomplete`, `Datepicker`, `Colorpicker`, `CheckBox`, `Radio`, `Range`, `Rating`, `Swap` |
| **Feedback** | `Alert`, `Toast`, `Modal`, `Loading`, `Badge`, `Tooltip`, `Indicator` |
| **Navigation** | `Navbar`, `Menu`, `Drawer`, `Tabs`, `Accordion`, `Dropdown` |
| **Data & Layout** | `Request`, `Response`, `List`, `Stack`, `Timeline`, `Stat`, `Fieldset`, `Fab` |

---

## 4. Examples with "Superpowers"

### A. The Declarative API Flow (`Request` & `Response`)
Instead of manually managing `loading` and `error` flags, use these together to handle data fetching elegantly.

```javascript
// 1. Define the request (it tracks dependencies automatically)
const userProfile = Request(
  () => `https://api.example.com/user/${userId()}`
);

// 2. Render the UI based on the request state
Div({ class: "p-4" }, [
  Response(userProfile, (data) => 
    Div([
      H1(data.name),
      P(data.email)
    ])
  )
]);
```

### B. Smart Inputs & Autocomplete
SigPro UI inputs handle labels, icons, password toggles, and validation states out of the box using DaisyUI v5 classes.

```javascript
const searchQuery = $("");

Autocomplete({
  label: "Find a Country",
  placeholder: "Start typing...",
  options: ["Spain", "France", "Germany", "Italy", "Portugal"],
  $value: searchQuery,
  onSelect: (val) => console.log("Selected:", val)
});
```

### C. The Reactive Datepicker
Handles single dates or ranges with a clean, reactive interface that automatically syncs with your signals.

```javascript
const myDate = $(""); // or { start: "", end: "" } for range

Datepicker({
  label: "Select Expiry Date",
  $value: myDate,
  range: false
});
```

### D. Imperative Toasts & Modals
Trigger complex UI elements from your logic. These components use `Mount` internally to ensure they are properly cleaned up from memory after they close.

```javascript
// Show a notification (Self-destroying after 3s)
Toast("Settings saved successfully!", "alert-success", 3000);

// Control a modal with a simple signal
const isModalOpen = $(false);

Modal({ 
  $open: isModalOpen, 
  title: "Delete Account",
  buttons: [
    Button({ class: "btn-error", onclick: doDelete }, "Confirm")
  ]
}, "This action cannot be undone.");
```

---

## 5. Internationalization (i18n)

The UI library comes with a built-in locale system.

```javascript
// Set the global UI language
Locale("en");

// Access translated strings (Returns a signal that tracks the current locale)
const t = tt("confirm"); 
```