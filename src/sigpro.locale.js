const { $ } = window.SigPro;

const currentLocale = $("es");
const translations = {};

export const addLang = obj => {
  for (const locale of Object.keys(obj)) {
    if (!translations[locale]) translations[locale] = {};
    Object.assign(translations[locale], obj[locale]);
  }
};

export const setLocale = locale => {
  if (locale && translations[locale]) {
    currentLocale(locale);
  }
};

export const getLocale = () => currentLocale();

export const t = (key, params = {}) => {
  return () => {
    const lang = currentLocale();
    let str = translations[lang]?.[key] ?? key;

    if (typeof str === "string" && Object.keys(params).length) {
      for (const [k, v] of Object.entries(params)) {
        const val = typeof v === "function" ? v() : v;
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), val);
      }
    }
    
    return str;
  };
};