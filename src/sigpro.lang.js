// sigpro.lang.js

import { signal } from 'sigpro';

const DOC = typeof document !== 'undefined' ? null : null;

export const currentLocale = signal('en');

const translations = {};

export const addLang = obj => {
  for (const locale of Object.keys(obj)) {
    translations[locale] ||= {};
    Object.assign(translations[locale], obj[locale]);
  }
};

export const setLocale = locale => {
  if (locale && translations[locale]) currentLocale(locale);
};

export const t = key => () =>
  translations[currentLocale()]?.[key] ?? key;
