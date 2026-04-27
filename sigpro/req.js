import { $ } from './core.js';

const req = ({ url, method = 'GET', headers = {} }) => {
  const loading = $(false);
  const error = $(null);
  const data = $(null);
  let controller = null;
  let timeoutId = null;

  const run = async (body = null) => {
    controller?.abort();
    clearTimeout(timeoutId);
    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 10000);
    loading(true);
    error(null);
    try {
      const isFormData = body instanceof FormData;
      const res = await fetch(url, {
        method,
        headers: isFormData ? headers : { 'Content-Type': 'application/json', ...headers },
        body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
        signal: controller.signal
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.message || res.statusText);
      data(json);
      return json;
    } catch (e) {
      if (e.name !== 'AbortError') error(e.message);
      throw e;
    } finally {
      loading(false);
      clearTimeout(timeoutId);
      controller = null;
      timeoutId = null;
    }
  };

  const abort = () => controller?.abort();

  return { run, abort, loading, error, data };
};

// Side-effect global
if (typeof window !== "undefined") {
  window.req = req;
}

export { req };