export const db = async (url, data = null, loading = null) => {
  if (loading) loading(true);
  try {
    const options = {
      method: data ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    
    if (data) options.body = JSON.stringify(data);

    const res = await fetch(url, options);
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error ${res.status}: ${errorText}`);
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    return await res.text();

  } finally {
    if (loading) loading(false);
  }
};