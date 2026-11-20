// sigpro.db.js — Minimal fetch wrapper for GET/POST with loading state and abort support
export const db = async (url, data = null, loading = null, abortSignal = null) => {
  if (loading) loading(true);
  try {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
    const isBlob = typeof Blob !== 'undefined' && data instanceof Blob;
    const isParams = typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams;
    const raw = isForm || isBlob || isParams;

    const res = await fetch(url, {
      method: data !== null && data !== undefined ? 'POST' : 'GET',
      headers: raw ? undefined : { 'Content-Type': 'application/json' },
      body: data == null ? undefined : raw ? data : JSON.stringify(data),
      credentials: 'include',
      signal: abortSignal,
    });

    if (!res.ok) throw Object.assign(
      new Error(`HTTP ${res.status}`),
      { status: res.status, statusText: res.statusText }
    );
    if (res.status === 204 || res.status === 205) return null;
    return await res.json();
  } finally {
    if (loading) loading(false);
  }
};
