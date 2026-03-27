# The Signal Function: `$( )`

The `$( )` function is the core constructor of SigPro. It defines how data is stored, computed, and persisted.

## Function Signature

```typescript
$(initialValue: any, key?: string): Signal
$(computation: Function): ComputedSignal
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`initialValue`** | `any` | Yes* | The starting value of your signal. |
| **`computation`** | `Function` | Yes* | A function that returns a value based on other signals. |
| **`key`** | `string` | No | A unique name to persist the signal in `localStorage`. |

*\*Either an initial value or a computation function must be provided.*

---

## Usage Patterns

### 1. Simple State
**`$(value)`**
Creates a writable signal. It returns a function that acts as both **getter** and **setter**.

```javascript
const count = $(0); 

count();    // Read (0)
count(10);  // Write (10)
```

### 2. Persistent State
**`$(value, key)`**
Creates a writable signal that syncs with the browser's storage.

```javascript
const theme = $("light", "app-theme"); 

theme("dark"); // Automatically calls localStorage.setItem("app-theme", '"dark"')
```
*Note: On page load, SigPro will prioritize the value found in `localStorage` over the `initialValue`.*

### 3. Computed State (Derived)
**`$(function)`**
Creates a read-only signal that updates automatically when any signal used inside it changes.

```javascript
const price = $(100);
const tax = $(0.21);

// This tracks both 'price' and 'tax' automatically
const total = $(() => price() * (1 + tax())); 
```

---

## Updating with Logic
When calling the setter, you can pass an **updater function** to access the current value safely.

```javascript
const list = $(["A", "B"]);

// Adds "C" using the previous state
list(prev => [...prev, "C"]); 
```
