// src/convert.js
import { $ } from "./sigpro.js";
function html2sigpro(h) {
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
      let t = n.tagName.toLowerCase(), p = bP(n), c = [...n.childNodes].map((i) => cN(i, d + 1)).filter(Boolean);
      if (!c.length)
        return `${s}${t}(${p})`;
      if (c.length == 1 && !c[0].includes(`
`))
        return `${s}${t}(${p ? p + ", " : ""}${c[0].trim()})`;
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
  const cnv = () => {
    try {
      setOutS(html2sigpro(inH()));
    } catch (e) {
      setOutS("Error: " + e.message);
    }
  }, txS = "width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical", btS = "padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px";
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
    div({ style: "margin:10px 0" }, [
      button({ style: btS + ";background:#3b82f6;color:#fff", onclick: cnv }, "Convert"),
      button({ style: btS + ";background:#d1d5db", onclick: () => {
        setInH("");
        setOutS("");
      } }, "Clear")
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
