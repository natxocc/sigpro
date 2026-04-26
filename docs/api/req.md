# HTTP Requests: `req( )`

The `req` function creates a **reactive HTTP request controller**. It returns signals for `loading`, `error`, and `data`, plus a `run` method to execute the request and an `abort` method to cancel it. All signals update automatically as the request progresses.

## Function Signature

```typescript
req(config: {
  url: string;
  method?: string;          // default: 'GET'
  headers?: Record<string, string>;
}): {
  run: (body?: any) => Promise<any>;
  abort: () => void;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  data: Signal<any | null>;
}
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`url`** | `string` | Yes | The endpoint to call. |
| **`method`** | `string` | No | HTTP method (`'GET'`, `'POST'`, etc.). Default `'GET'`. |
| **`headers`** | `object` | No | Custom headers (will be merged with defaults). |

**Returns:** A controller object with reactive signals and methods.

> **Availability:** `req` is exported from the SigPro module. In **ESM** you must import it (`import { req } from 'sigpro'`) or inject all globals via `sigpro()`. In the **IIFE** classic script, it is automatically available on `window`. The examples below assume the function is already in scope.

---

## Usage Patterns

### 1. Basic GET Request

```javascript
const users = req({ url: '/api/users' });

// Start the request
users.run().catch(console.error);

// React to the response
watch(() => {
  if (users.loading()) console.log('Loading...');
  if (users.error()) console.error(users.error());
  if (users.data()) console.log('Data:', users.data());
});
```

### 2. POST Request with Body

```javascript
const createUser = req({ url: '/api/users', method: 'POST' });

const handleSubmit = async (formData) => {
  try {
    await createUser.run(formData);
    alert('User created!');
  } catch (err) {
    // Error already in createUser.error()
  }
};
```

### 3. Aborting a Request

```javascript
const search = req({ url: '/api/search' });

// Abort if the user types again quickly
let timeout;
input({ onInput: (e) => {
  clearTimeout(timeout);
  search.abort(); // cancel previous in-flight request
  timeout = setTimeout(() => search.run({ q: e.target.value }), 300);
}});
```

### 4. Reactive UI with Signals

```javascript
const profile = req({ url: '/api/me' });

const App = () =>
  div([
    when(() => profile.loading(),
      () => div("Loading...")
    ),
    when(() => profile.error(),
      () => div("Error: " + profile.error())
    ),
    when(() => profile.data(),
      () => div([
        h2(profile.data().name),
        p(profile.data().email)
      ])
    )
  ]);

profile.run();
mount(App, '#app');
```

---

## Request Lifecycle

When you call `run(body?)`:

1. Any previous request is **aborted** automatically.
2. `loading` becomes `true`.
3. `error` is cleared.
4. A 10‑second timeout is set (auto‑abort).
5. The request is sent using `fetch`.
6. On success: `data` is set with the parsed JSON, `loading` becomes `false`.
7. On error: `error` is set with the message, `data` is cleared, `loading` becomes `false`.

> **Important:** The response body is parsed as JSON. If the response is not OK or the JSON parsing fails, `error` is set and the promise rejects.

---

## Automatic Headers

- If `body` is a plain object or array, the request automatically includes `Content-Type: application/json` (unless you override it in `headers`).
- If `body` is a `FormData` instance, the `Content-Type` is not set (browser will set it automatically with the correct boundary).
- Other headers can be added via the `headers` option.

```javascript
const upload = req({
  url: '/upload',
  method: 'POST',
  headers: { 'X-Custom': 'value' }
});

const formData = new FormData();
formData.append('file', fileInput.files[0]);
upload.run(formData);
```

---

## Error Handling

- Network errors, timeouts, and HTTP error statuses (4xx, 5xx) all set `error` and cause the promise to reject.
- The `error` signal contains a human‑readable message.
- Abort errors (calling `abort()` or timeout) are **silent** – they do not set `error` or reject the promise?  
  Actually, according to the source: if `e.name === 'AbortError'`, it does **not** call `error(e.message)`, but the promise still rejects with the AbortError. You can handle it with `.catch()` if needed.

---

## Complete Example

```javascript
const api = req({ url: 'https://jsonplaceholder.typicode.com/posts/1' });

const App = () =>
  div({ class: "demo" }, [
    when(() => api.loading(), () => p("⏳ Loading...")),
    when(() => api.error(), () => p("❌ " + api.error())),
    when(() => api.data(), () => div([
      h2(api.data().title),
      p(api.data().body)
    ])),
    button({
      onClick: () => api.run(),
      disabled: () => api.loading()
    }, "Fetch")
  ]);

mount(App, '#app');
```

---

## Summary

| Member | Type | Description |
| :--- | :--- | :--- |
| `run(body?)` | `(any) => Promise` | Starts the request. Returns a promise. |
| `abort()` | `() => void` | Cancels the current request. |
| `loading` | `Signal<boolean>` | `true` while request is in flight. |
| `error` | `Signal<string\|null>` | Contains an error message, or `null`. |
| `data` | `Signal<any\|null>` | Contains the parsed response (JSON), or `null`. |