// src/convert.js
import { $ } from "./sigpro.js";
function html2sigpro(h, advanced = false) {
  const B = new Set(["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "defer", "disabled", "formnovalidate", "hidden", "ismap", "itemscope", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "selected", "truespeed"]), esc = (v) => v.replace(/"/g, "\\\""), bP = (el) => {
    let a = [...el.attributes].map(({ name: n, value: v }) => /^on/i.test(n) ? `${n}: (e) => { ${v.replace(/\s+/g, " ").trim()} }` : B.has(n.toLowerCase()) && (!v || v == n) ? `${n}: true` : `${n}: "${esc(v)}"`);
    return a.length ? `{ ${a.join(", ")} }` : "";
  }, cN = (n, d = 0) => {
    let s = "  ".repeat(d);
    if (n.nodeType == 3) {
      let t = n.textContent;
      return t.trim() ? `${s}"${esc(t)}"` : "";
    }
    if (n.nodeType == 1) {
      let t = n.tagName.toLowerCase();
      let classes = [];
      let otherAttrs = [];
      if (advanced) {
        const classAttribute = Array.from(n.attributes).find((attr) => attr.name === "class");
        if (classAttribute) {
          classes = classAttribute.value.trim().split(/\s+/).filter((c2) => c2);
        }
        otherAttrs = [...n.attributes].filter((attr) => attr.name !== "class");
      }
      let p = "";
      if (advanced && classes.length > 0) {
        const classChain = classes.map((c2) => `.${c2.replace(/-/g, "_")}`).join("");
        if (otherAttrs.length > 0) {
          const otherProps = otherAttrs.map(({ name: n2, value: v }) => /^on/i.test(n2) ? `${n2}: (e) => { ${v.replace(/\s+/g, " ").trim()} }` : B.has(n2.toLowerCase()) && (!v || v == n2) ? `${n2}: true` : `${n2}: "${esc(v)}"`);
          p = `${classChain}({ ${otherProps.join(", ")} })`;
        } else {
          p = classChain;
        }
      } else {
        p = bP(n);
      }
      let c = [...n.childNodes].map((i) => cN(i, d + 1)).filter(Boolean);
      if (!c.length) {
        if (advanced && classes.length > 0 && otherAttrs.length === 0) {
          return `${s}${t}${p}`;
        }
        return `${s}${t}(${p})`;
      }
      if (c.length == 1 && !c[0].includes(`
`)) {
        if (advanced && classes.length > 0 && otherAttrs.length === 0 && !p.includes("{")) {
          return `${s}${t}${p}(${c[0].trim()})`;
        }
        return `${s}${t}(${p ? p + ", " : ""}${c[0].trim()})`;
      }
      if (advanced && classes.length > 0 && otherAttrs.length === 0 && !p.includes("{")) {
        return `${s}${t}${p}([
${c.join(`,
`)}
${s}])`;
      }
      return `${s}${t}(${p ? p + ", " : ""}[
${c.join(`,
`)}
${s}])`;
    }
    return "";
  }, r = [...new DOMParser().parseFromString(h, "text/html").body.childNodes].map((n) => cN(n)).filter(Boolean);
  return r.length == 1 ? r[0].trim() : `[
${r.join(`,
`)}
]`;
}
var converter = () => {
  const inH = $("");
  const setInH = (v) => inH(v);
  const outS = $("");
  const setOutS = (v) => outS(v);
  const advanced = $(false);
  const setAdvanced = (v) => advanced(v);
  const cnv = () => {
    try {
      setOutS(html2sigpro(inH(), advanced()));
    } catch (e) {
      setOutS("Error: " + e.message);
    }
  };
  const txS = "width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical", btS = "padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px";
  return div({ style: "max-width:900px;margin:20px auto;font-family:sans-serif" }, [
    h1("HTML → SigPro"),
    label({ style: "display:block;font-weight:700" }, "HTML:"),
    textarea({
      style: txS,
      placeholder: "HTML...",
      value: inH,
      oninput: (e) => {
        setInH(e.target.value);
        cnv();
      }
    }),
    div({ style: "margin:10px 0;display:flex;align-items:center;gap:10px" }, [
      button({ style: btS + ";background:#3b82f6;color:#fff", onclick: cnv }, "Convert"),
      button({ style: btS + ";background:#d1d5db", onclick: () => {
        setInH("");
        setOutS("");
        setAdvanced(false);
      } }, "Clear"),
      label({ style: "display:flex;align-items:center;gap:5px;cursor:pointer" }, [
        input({ type: "checkbox", checked: advanced, onchange: (e) => {
          setAdvanced(e.target.checked);
          cnv();
        } }),
        span("Advanced (dot notation for classes)")
      ])
    ]),
    div({ style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:5px" }, [
      span({ style: "font-weight:700" }, "Out:"),
      button({ style: btS + ";background:#10b981;color:#fff", onclick: () => {
        navigator.clipboard.writeText(outS());
        alert("Copied!");
      } }, "Copy")
    ]),
    textarea({ style: txS + ";background:#f9fafb", readonly: true, value: outS, placeholder: "Result..." })
  ]);
};
window.html2sigpro = html2sigpro;
window.converter = converter;
