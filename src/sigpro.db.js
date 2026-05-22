export const db = async (url, data = {}, loading = null) => {
  if (loading) loading(true);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error ${res.status}: ${errorText}`);
    }
    return await res.json();
  } finally {
    if (loading) loading(false);
  }
};