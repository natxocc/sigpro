/// <reference path="../sigpro.d.ts" />

var { $ } = window.SigPro;

function html2sigpro(h, mode = "tags") {
    const B = new Set(["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "defer", "disabled", "formnovalidate", "hidden", "ismap", "itemscope", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "selected", "truespeed"]);
    const esc = v => v.replace(/"/g, '\\"');
    
    const bP = el => {
        let a = [...el.attributes].map(({ name: n, value: v }) =>
            /^on/i.test(n) ? `${n}: (e) => { ${v.replace(/\s+/g, " ").trim()} }` :
            (B.has(n.toLowerCase()) && (!v || v == n)) ? `${n}: true` : `${n}: "${esc(v)}"`
        );
        return a.length ? `{ ${a.join(", ")} }` : "";
    };

    const cN = (n, d = 0) => {
        let s = "  ".repeat(d);
        if (n.nodeType == 3) {
            let t = n.textContent;
            return t.trim() ? `${s}"${esc(t)}"` : "";
        }
        if (n.nodeType == 1) {
            let tag = n.tagName.toLowerCase();
            let props = bP(n);
            let prefix = mode === "core" ? `h('${tag}'` : tag;
            
            let children = [...n.childNodes].map(i => cN(i, d + 1)).filter(Boolean);
            const hasProps = !!props;
            
            if (mode === "core") {
                if (!children.length) return hasProps ? `${s}${prefix}, ${props})` : `${s}${prefix})`;
                if (children.length === 1 && !children[0].includes("\n"))
                    return hasProps ? `${s}${prefix}, ${props}, ${children[0].trim()})` : `${s}${prefix}, ${children[0].trim()})`;
                return hasProps ? `${s}${prefix}, ${props}, [\n${children.join(",\n")}\n${s}])` : `${s}${prefix}, [\n${children.join(",\n")}\n${s}])`;
            } else {
                if (!children.length) return hasProps ? `${s}${prefix}(${props})` : `${s}${prefix}`;
                if (children.length === 1 && !children[0].includes("\n"))
                    return hasProps ? `${s}${prefix}(${props}, ${children[0].trim()})` : `${s}${prefix}(${children[0].trim()})`;
                return hasProps ? `${s}${prefix}(${props}, [\n${children.join(",\n")}\n${s}])` : `${s}${prefix}([\n${children.join(",\n")}\n${s}])`;
            }
        }
        return "";
    };
    
    const r = [...new DOMParser().parseFromString(h, "text/html").body.childNodes].map(n => cN(n)).filter(Boolean);
    return r.length == 1 ? r[0].trim() : `[\n${r.join(",\n")}\n]`;
}

const converter = () => {
    const inH = $("");
    const outS = $("");
    const mode = $("tags");
    const previewHtml = $("");

    const cnv = () => {
        try {
            outS(html2sigpro(inH(), mode()));
        } catch (e) {
            outS("Error: " + e.message);
        }
        previewHtml(inH());
    };

    const clearAll = () => {
        inH("");
        outS("");
        mode("tags");
        previewHtml("");
    };

    const txS = "width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical";
    const btS = "padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px";

    return div({ style: "margin:20px auto;font-family:sans-serif" }, [
        h1("HTML → SigPro"),
        div({ style: "margin-bottom:10px" }, [
            div({ style: "display:flex;gap:20px;flex-wrap:wrap;margin-top:5px" }, [
                label({ style: "display:flex;align-items:center;gap:6px" }, [
                    "Core",
                    input({ type: "radio", name: "mode", value: "core", checked: mode() === "core", onchange: e => { if (e.target.checked) { mode("core"); cnv(); } } }),
                    span("core — h('tag', props, ...)")
                ]),
                label({ style: "display:flex;align-items:center;gap:6px" }, [
                    "Tags",
                    input({ type: "radio", name: "mode", value: "tags", checked: mode() === "tags", onchange: e => { if (e.target.checked) { mode("tags"); cnv(); } } }),
                    span("tags — tag({ props }, ...)")
                ])
            ])
        ]),
        div({ style: "margin-top:15px;display:flex;gap:10px" }, [
            button({ style: btS + ";background:#3b82f6;color:#fff", onclick: cnv }, "Convert"),
            button({ style: btS + ";background:#d1d5db", onclick: clearAll }, "Clear")
        ]),
        div({ style: "display:grid;grid-template-columns:1fr;gap:15px;margin-top:15px;width:100%" }, [
            div({ style: "border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column" }, [
                label({ style: "font-weight:bold;margin-bottom:8px" }, "HTML Input"),
                textarea({
                    style: txS,
                    placeholder: "Paste your HTML here...",
                    value: inH,
                    oninput: e => { inH(e.target.value); cnv(); }
                })
            ]),
            div({ style: "border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column" }, [
                div({ style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px" }, [
                    span({ style: "font-weight:bold" }, "SigPro Output"),
                    button({
                        style: "padding:4px 8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px",
                        onclick: () => { navigator.clipboard.writeText(outS()); alert("Copied!"); }
                    }, "Copy")
                ]),
                textarea({ style: txS + ";background:#f9fafb", readonly: true, value: outS, placeholder: "Converted code will appear here..." })
            ]),
            div({ style: "border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column" }, [
                label({ style: "font-weight:bold;margin-bottom:8px" }, "Live Preview"),
                iframe({
                    style: "width:100%;height:200px;border:1px solid #e2e8f0;border-radius:4px;background:white;",
                    srcdoc: () => {
                        const html = previewHtml() || "";
                        return `
                            <!DOCTYPE html>
                            <html>
                                <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css">
                                <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                                <style>
                                    body { padding: 10px; margin: 0; font-family: sans-serif; }
                                </style>
                                </head>
                                <body>
                                ${html}
                                </body>
                            </html>
                        `;
                    },
                    sandbox: "allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                })
            ])
        ]),
    ]);
};

window.html2sigpro = html2sigpro;
window.converter = converter;