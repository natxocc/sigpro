# Global Tag Helpers

In **SigPro**, you don't need to manually type `h('div', ...)` for every element. To keep your code declarative and readable, the engine provides **helper functions** for all standard HTML5 tags.

## 1. How it Works

SigPro creates a wrapper function for each standard HTML tag.  
- **Under the hood:** `h('button', { onclick: ... }, 'Click')`  
- **SigPro Style:** `button({ onclick: ... }, 'Click')`

> **Note:** All tag helpers are **lowercase** (e.g., `div`, `span`, `button`) and can be used directly once globally enabled.

> If you prefer to avoid globals, you can always use `h('div', ...)` directly—it’s perfectly fine.

> **Auto‑cleanup:** All tag helpers and `h` automatically dispose effects, event listeners, and nested components when removed from the DOM.

---

## 2. The Complete List of Tag Helpers

All helpers are **lowercase** and follow HTML5 tag names.

| Category | Available functions |
| :--- | :--- |
| **Structure** | `div`, `span`, `p`, `section`, `nav`, `main`, `header`, `footer`, `article`, `aside` |
| **Typography** | `h1`…`h6`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `strong`, `em`, `code`, `pre`, `small`, `b`, `u`, `mark` |
| **Interactive** | `button`, `a`, `label`, `br`, `hr`, `details`, `summary`, `dialog` |
| **Forms** | `form`, `input`, `select`, `option`, `textarea`, `fieldset`, `legend` |
| **Tables** | `table`, `thead`, `tbody`, `tr`, `th`, `td`, `tfoot`, `caption` |
| **Media** | `img`, `canvas`, `video`, `audio`, `svg`, `iframe`, `picture`, `source` |

Full list: `a`, `abbr`, `article`, `aside`, `audio`, `b`, `blockquote`, `br`, `button`, `canvas`, `caption`, `cite`, `code`, `col`, `colgroup`, `datalist`, `dd`, `del`, `details`, `dfn`, `dialog`, `div`, `dl`, `dt`, `em`, `embed`, `fieldset`, `figcaption`, `figure`, `footer`, `form`, `h1`…`h6`, `header`, `hr`, `i`, `iframe`, `img`, `input`, `ins`, `kbd`, `label`, `legend`, `li`, `main`, `mark`, `meter`, `nav`, `object`, `ol`, `optgroup`, `option`, `output`, `p`, `picture`, `pre`, `progress`, `section`, `select`, `slot`, `small`, `source`, `span`, `strong`, `sub`, `summary`, `sup`, `svg`, `table`, `tbody`, `td`, `template`, `textarea`, `tfoot`, `th`, `thead`, `time`, `tr`, `u`, `ul`, `video`.

---

## 3. Usage Patterns

### A. Attributes + Children

```javascript
div({ class: 'container', id: 'main' }, [
  h1("Welcome to SigPro"),
  p("The zero‑VDOM framework.")
]);
```

### B. Children Only

If you don't need attributes, pass the content directly as the first argument.

```javascript
section([
  h2("Clean Syntax"),
  button("I have no props!")
]);
```

---

## 4. Custom Components with `h()` or Tag Helpers

While the tag helpers cover all standard HTML tags, you can create reusable components using them directly.

### Basic Component

```javascript
const UserCard = (props, children) => 
  div({ class: 'card p-4', 'data-id': props.id }, children);

UserCard({ id: 123 }, [h3("John Doe"), p("john@example.com")]);
```

### Reactive Component

```javascript
const Counter = () => {
  const count = $(0);
  return div({ class: 'flex gap-2' }, [
    button({ onClick: () => count(count() - 1) }, '-'),
    span(() => count()),
    button({ onClick: () => count(count() + 1) }, '+')
  ]);
};
```

### Manual Cleanup for External Resources

Only needed for intervals, sockets, third‑party libraries:

```javascript
const Timer = () => {
  const time = $(new Date().toLocaleTimeString());
  const el = span(() => time());
  
  const interval = setInterval(() => time(new Date().toLocaleTimeString()), 1000);
  onUnmount(() => clearInterval(interval));
  
  return el;
};
```