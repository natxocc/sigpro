const { $ } = window.SigPro;

const currentLocale = $("en");
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

export const t = key => {
  return () => translations[currentLocale()]?.[key] ?? key;
};