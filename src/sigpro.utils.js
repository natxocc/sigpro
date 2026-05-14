/// <reference path="../sigpro.d.ts" />

const { $, h, watch, render, isF } = window.SigPro;

// router
export const router = routes => {
  const getHash = () => window.location.hash.slice(1) || "/";
  const path = $(getHash());
  const handler = () => path(getHash());
  window.addEventListener("hashchange", handler);
  
  const hook = h("div", { class: "router-hook" });
  let currentView = null;
  
  watch([path], () => {
    const cur = path();
    const route = routes.find(r => {
      const p1 = r.path.split("/").filter(Boolean);
      const p2 = cur.split("/").filter(Boolean);
      return p1.length === p2.length && p1.every((p, i) => p[0] === ":" || p === p2[i]);
    }) || routes.find(r => r.path === "*");
    
    if (route) {
      currentView?.destroy();
      const params = {};
      route.path.split("/").filter(Boolean).forEach((p, i) => {
        if (p[0] === ":") params[p.slice(1)] = cur.split("/").filter(Boolean)[i];
      });
      router.params(params);
      currentView = render(() => isF(route.component) ? route.component(params) : route.component);
      hook.replaceChildren(currentView.container);
    }
  });
  
  hook.destroy = () => {
    window.removeEventListener("hashchange", handler);
    currentView?.destroy();
  };
  
  return hook;
};

router.params = $({});
router.to = p => window.location.hash = p.replace(/^#?\/?/, "#/");
router.back = () => window.history.back();
router.path = () => window.location.hash.replace(/^#/, "") || "/";

// db
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

const currentLocale = $('en');

const translations = {};

// addLang
export const addLang = (obj) => {
  for (const locale of Object.keys(obj)) {
    if (!translations[locale]) translations[locale] = {};
    Object.assign(translations[locale], obj[locale]);
  }
};

// setLocale
export const setLocale = (locale) => {
  if (locale && translations[locale]) {
    currentLocale(locale);
  }
};

// t
export const t = (key) => {
  return () => translations[currentLocale()]?.[key] ?? key;
};