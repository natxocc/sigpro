
# 🧩 UI Components `(WIP)`

> **Status: Work In Progress.** > These are high-level, complex visual components designed to speed up development. They replace native HTML elements with "superpowered" versions that handle their own internal logic, reactivity, and professional styling.

## ⚠️ Prerequisites

To ensure all components render correctly with their reactive themes and states, your project **must** have the following versions installed:

* **Tailwind CSS v4+**: For the new engine performance and modern CSS variables.
* **DaisyUI v5+**: Required for the updated theme-selectors and improved component classes used in the SigPro UI library.

---

## 1. What are UI Components?

Unlike **Tag Helpers** (which are just functional mirrors of HTML tags), SigPro UI Components are smart abstractions:

* **Stateful**: They manage complex internal states (like date ranges, search filtering, or API lifecycles).
* **Reactive**: Attributes prefixed with `$` are automatically tracked via `$watch`.
* **Self-Sane**: They automatically use `._cleanups` to destroy observers or event listeners when removed from the DOM.
* **Themed**: Fully compatible with the DaisyUI v5 theme system and Tailwind v4 utility classes.

---

## 2. The UI Registry (Available Now)

| Category | Components |
| :--- | :--- |
| **Forms & Inputs** | `Button`, `Input`, `Select`, `Autocomplete`, `Datepicker`, `Colorpicker`, `CheckBox`, `Radio`, `Range`, `Rating`, `Swap` |
| **Feedback** | `Alert`, `Toast`, `Modal`, `Loading`, `Badge`, `Tooltip`, `Indicator` |
| **Navigation** | `Navbar`, `Menu`, `Drawer`, `Tabs`, `Accordion`, `Dropdown` |
| **Data & Layout** | `Request`, `Response`, `Grid` (AG-Grid), `List`, `Stack`, `Timeline`, `Stat`, `Fieldset`, `Fab` |

---

## 3. Examples with "Superpowers"

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
Trigger complex UI elements from your logic. These components use `$mount` internally to ensure they are properly cleaned up from memory after they close.

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

## 4. Internationalization (i18n)

The UI library comes with a built-in locale system.

```javascript
// Set the global UI language
SetLocale("en");

// Access translated strings (Returns a signal that tracks the current locale)
const t = tt("confirm"); 
```


