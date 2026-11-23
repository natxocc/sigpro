# Slots

A **slot** is a named placeholder inside a component that the parent fills with content. SigPro components receive their children as a single `children` array, so `slots()` normalizes them into a `Slots` map (`{ name: () => ... }`) that you can destructure by name.

> **Availability:** `slots` is exported from the SigPro module (`import { slots } from 'sigpro'`).

## Function Signature

```typescript
slots(children: Child | Child[] | Slots): Slots
```

| Parameter | Type | Description |
| :--- | :--- | :--- |
| **`children`** | `Child` \| `Child[]` \| `Slots` | The raw `children` passed to a component, or a named-slots object. |

**Returns:** A `Slots` map — an object whose values are functions that return the rendered content when called.

---

## How It Works

`slots()` has two modes:

1. **Named-slots object passed directly** — if `children` is a single plain object that is **not** an array and **not** a `Node`, it is returned unchanged. This lets you hand a ready-made slots object straight through.
2. **Children array** — otherwise, the children are wrapped as `{ default: () => children }`, giving you a `default` slot.

---

## Usage

### 1. Default Slot

```javascript
import { slots } from 'sigpro';

const Card = (props, children) => {
  const { default: body } = slots(children);
  return div({ class: 'card' }, body && body());
};

// Parent passes children; slots() wraps them as the `default` slot
Card({}, [
  h('h1', {}, 'Title'),
  p({}, 'Some content')
]);
```

### 2. Named Slots

Pass a slots object with named functions. `slots()` returns it as-is.

```javascript
import { slots } from 'sigpro';

const Card = (props, children) => {
  const { header, footer } = slots(children);
  return div({ class: 'card' }, [
    header && header(),
    p({}, 'Body goes here'),
    footer && footer()
  ]);
};

Card({}, slots({
  header: () => h('h1', {}, 'Title'),
  footer: () => button({ class: 'btn' }, 'Save')
}));
```

### 3. Reactive Slots

Slots are functions, so they re-run reactively when any signal inside them changes — the same as any other reactive child.

```javascript
import { signal, slots } from 'sigpro';

const count = signal(0);

const Counter = (props, children) => {
  const { default: body } = slots(children);
  return div({ class: 'counter' }, [
    p(() => `Count: ${count()}`),
    body && body()
  ]);
};

Counter({}, slots([
  button({ onclick: () => count(count() + 1) }, '+1')
]));
```

---

## Slots vs Props

SigPro has no `emit`/`children` magic — slots are just functions in the `children` array, normalized by `slots()`. Named slots are explicit objects; the default slot is the fallback when you pass plain children.

| Pattern | Syntax | Access |
| :--- | :--- | :--- |
| **Default slot** | `Card({}, [ ...children ])` | `const { default: body } = slots(children)` |
| **Named slots** | `Card({}, slots({ header: () => ... }))` | `const { header } = slots(children)` |
| **No content** | `Card({})` | `body` is `undefined` — guard with `body && body()` |

---

## Summary

- `slots(children)` normalizes a component's `children` into a `Slots` map of `() => ...` functions.
- A single plain object (not array, not `Node`) is returned as-is — use it to pass named slots directly.
- Otherwise children become `{ default: () => children }`.
- Slots are functions, so they are reactive like any other SigPro child.
- Guard optional slots with `slot && slot()` since missing slots are `undefined`.
