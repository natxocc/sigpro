# HTTP Helper: `db`

A small fetch wrapper for the common cases: GET, POST, JSON/multipart/form-encoded bodies, loading state, and abort. It is not a full HTTP client — just enough to cover 90% of app requests with one function call.

## Signature

```typescript
db<T = any>(
  url: string,
  data?: any | null,
  loading?: ((loading: boolean) => void) | null,
  signal?: AbortSignal | null
): Promise<T>
```

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`url`** | `string` | Yes | Request URL. |
| **`data`** | `any` | No | If provided, the request is a **POST**. If omitted or `null`, the request is a **GET**. Accepted types: plain object/array/primitive (sent as JSON), `FormData` (multipart), `Blob`/`File` (binary), `URLSearchParams` (form-encoded). |
| **`loading`** | `(loading: boolean) => void` | No | Called with `true` before the request and `false` after, in a `finally` block. Receives the same value on success and error. |
| **`signal`** | `AbortSignal` | No | Standard `AbortSignal` for cancellation. Pass `controller.signal` from an `AbortController`. |

**Returns:** a `Promise<T>` resolving to the parsed JSON body, or `null` for 204/205 responses.

> **Availability:** `db` is exported from the SigPro module. Import it by name: `import { db } from 'sigpro'`.

---

## Behavior

- **Method.** POST if `data` is provided, GET otherwise.
- **Headers.** `Content-Type: application/json` for JSON bodies. For `FormData`, `Blob`/`File`, and `URLSearchParams`, the `Content-Type` header is left for the browser to set (so the multipart boundary is correct).
- **Body.**
  - Plain object/array/primitive → `JSON.stringify(data)`.
  - `FormData` / `Blob` / `File` / `URLSearchParams` → sent as-is.
- **Credentials.** Always `include`, so cookies and auth headers are sent for same-origin and CORS-enabled requests.
- **Response.** Parsed as JSON. Returns `null` for 204 (No Content) and 205 (Reset Content).
- **Errors.** If `res.ok` is `false`, throws an `Error` with:
  - `message`: `"HTTP {status}"`
  - `status`: the numeric HTTP status
  - `statusText`: the status text (e.g. `"Not Found"`)
- **Loading.** If `loading` is provided, it is called with `true` before the request and `false` in a `finally` block, so it fires on both success and error (including aborts).
- **Only `null` and `undefined` produce a GET.** Any other value — including `0`, `''`, and `false` — produces a POST with that value serialized as body. If you need a GET with a default query, build the URL yourself.

---

## Basic Usage

### GET

```javascript
import { db } from 'sigpro';

const users = await db('/api/users');
```

### POST (JSON)

```javascript
const created = await db('/api/users', { name: 'Ada', role: 'admin' });
```

### File upload (FormData)

```javascript
const form = new FormData();
form.append('file', fileInput.files[0]);
form.append('name', 'avatar');

await db('/api/upload', form);
// Content-Type: multipart/form-data with boundary (set by browser)
```

### Form-encoded (URLSearchParams)

```javascript
await db('/api/search', new URLSearchParams({ q: 'foo', page: '2' }));
// Content-Type: application/x-www-form-urlencoded
```

### Binary (Blob/File)

```javascript
await db('/api/raw', new Blob([buffer], { type: 'application/octet-stream' }));
```

### With Loading State

<div id="demo-db-loading"></div>

```js
{
  const loading = signal(false);
  const users = signal([]);

  const load = async () => {
    try {
      users(await db('/api/users', null, loading));
    } catch (e) {
      console.error(e);
    }
  };

  const App = () => div(
    button({ onclick: load, disabled: () => loading() },
      () => loading() ? "Loading..." : "Load users"
    ),
    ul(() => users().map(u => li(u.name)))
  );

  setTimeout(() => mount(App, "#demo-db-loading"), 50);
}
```

`loading(true)` fires immediately, `loading(false)` fires on either outcome. The button disables itself while the request is in flight.

---

## Cancellation

Pass an `AbortSignal` to cancel a request. Typical for "cancel the previous search when a new one starts" or "abort on unmount".

```javascript
import { db } from 'sigpro';

const controller = new AbortController();

db('/api/long', null, null, controller.signal)
  .then(data => console.log(data))
  .catch(err => {
    if (err.name === 'AbortError') console.log('cancelled');
    else console.error(err);
  });

// later
controller.abort();
```

### Cancel Inside a Component

Return a cleanup from an `effect` so the request is aborted on unmount:

```javascript
import { signal, effect, db } from 'sigpro';

const UserProfile = () => {
  const user = signal(null);

  effect(() => {
    const controller = new AbortController();
    db(`/api/users/1`, null, null, controller.signal)
      .then(user)
      .catch(() => {});
    return () => controller.abort();
  });

  return div(() => user() ? user().name : 'Loading...');
};
```

### Cancel the Previous Request (Search Pattern)

<div id="demo-db-search"></div>

```js
{
  const query = signal("");
  const results = signal([]);
  const loading = signal(false);
  let controller = null;

  const search = async () => {
    controller?.abort();
    controller = new AbortController();
    try {
      results(await db(
        `/api/search?q=${encodeURIComponent(query())}`,
        null,
        loading,
        controller.signal
      ));
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  };

  watch(query, search);

  const App = () => div(
    input({
      value: () => query(),
      oninput: e => query(e.target.value)
    }),
    ul(() => results().map(r => li(r.title)))
  );

  setTimeout(() => mount(App, "#demo-db-search"), 50);
}
```

Every keystroke aborts the previous request before starting a new one.

---

## Error Handling

`db` throws on non-OK responses, network failures, and JSON parse errors. The thrown `Error` carries the HTTP status code and status text, so you can branch on them without parsing the message.

```javascript
try {
  const data = await db('/api/protected');
} catch (err) {
  if (err.name === 'AbortError') {
    // cancelled
  } else if (err.status === 401) {
    // unauthorized — redirect to login
  } else if (err.status >= 500) {
    // server error — show retry UI
  } else {
    console.error(err.status, err.statusText, err.message);
  }
}
```

### Structured error helper

Wrap `db` for app-wide error handling:

```javascript
const api = {
  async get(url) {
    return db(url);
  },
  async post(url, data) {
    return db(url, data);
  }
};

try {
  const users = await api.get('/api/users');
} catch (err) {
  if (err.status === 401) redirectToLogin();
  else if (err.status >= 500) showRetryToast();
  else console.error(err);
}
```

---

## Loading Pattern

The `loading` parameter is a callback, not a signal. You can pass anything that responds to `true` / `false`:

```javascript
// Signal
const loading = signal(false);
await db('/api/users', null, loading);

// Plain callback
let isLoading = false;
await db('/api/users', null, (v) => isLoading = v);

// Multiple loaders (e.g. counter for parallel requests)
const fetching = signal(false);
const progress = { active: 0 };
await db('/api/users', null, (v) => {
  fetching(v);
  progress.active += v ? 1 : -1;
});
```

The callback is invoked synchronously before the request starts and again in a `finally` block. It cannot be skipped — even aborts trigger `loading(false)`.

---

## What `db` Is Not

- **Not a full HTTP client.** No custom methods (PUT, PATCH, DELETE), no custom headers, no query string builder, no response streaming, no retry, no interceptors.
- **Not content-type aware on responses.** It always parses the response as JSON. If the server returns text, HTML, or a file, `res.json()` throws — use `fetch` directly for those.
- **Not a router-aware fetcher.** No base URL, no path params, no automatic auth headers.

For anything beyond the basics, use `fetch` directly or wrap `db`:

```javascript
const api = async (method, path, body) => {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
```

---

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| GET | `await db('/api/users')` |
| POST JSON | `await db('/api/users', { name: 'Ada' })` |
| POST FormData (file upload) | `await db('/api/upload', formData)` |
| POST form-encoded | `await db('/api/search', new URLSearchParams({ q: 'foo' }))` |
| POST binary | `await db('/api/raw', blob)` |
| With loading signal | `await db(url, null, loading)` |
| With abort | `db(url, null, null, controller.signal)` |
| Check HTTP status | `err.status === 401` |
| Cancel previous request | `controller?.abort(); controller = new AbortController();` |
| Custom method / headers | Use `fetch` directly |
