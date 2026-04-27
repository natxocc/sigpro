import { setAttrFilter } from './sigpro.core.js';

const DANGEROUS_PROTOCOL = /^\s*(javascript|data|vbscript):/i;
const DANGEROUS_URI_ATTRS = new Set(["src", "href", "formaction", "action", "background", "code", "archive"]);
const isDangerousAttr = key => DANGEROUS_URI_ATTRS.has(key) || key.startsWith("on");

const validateAttr = (key, val) => {
  if (val == null || val === false) return null;
  if (isDangerousAttr(key)) {
    const sVal = String(val);
    if (DANGEROUS_PROTOCOL.test(sVal)) {
      console.warn(`[SigPro XSS] Locked ${key}`);
      return '#';
    }
  }
  return val;
};

setAttrFilter(validateAttr);