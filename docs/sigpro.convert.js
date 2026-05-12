var{$:x}=window.SigPro;function f(s,l="tags"){let a=new Set(["allowfullscreen","async","autofocus","autoplay","checked","controls","default","defer","disabled","formnovalidate","hidden","ismap","itemscope","loop","multiple","muted","nomodule","novalidate","open","playsinline","readonly","required","reversed","selected","truespeed"]),p=(o)=>o.replace(/"/g,"\\\""),c=(o)=>{let t=[...o.attributes].map(({name:e,value:n})=>/^on/i.test(e)?`${e}: (e) => { ${n.replace(/\s+/g," ").trim()} }`:a.has(e.toLowerCase())&&(!n||n==e)?`${e}: true`:`${e}: "${p(n)}"`);return t.length?`{ ${t.join(", ")} }`:""},m=(o,t=0)=>{let e="  ".repeat(t);if(o.nodeType==3){let n=o.textContent;return n.trim()?`${e}"${p(n)}"`:""}if(o.nodeType==1){let n=o.tagName.toLowerCase(),d=c(o),i=l==="core"?`h('${n}'`:n,r=[...o.childNodes].map((h)=>m(h,t+1)).filter(Boolean),g=!!d;if(l==="core"){if(!r.length)return g?`${e}${i}, ${d})`:`${e}${i})`;if(r.length===1&&!r[0].includes(`
`))return g?`${e}${i}, ${d}, ${r[0].trim()})`:`${e}${i}, ${r[0].trim()})`;return g?`${e}${i}, ${d}, [
${r.join(`,
`)}
${e}])`:`${e}${i}, [
${r.join(`,
`)}
${e}])`}else{if(!r.length)return g?`${e}${i}(${d})`:`${e}${i}`;if(r.length===1&&!r[0].includes(`
`))return g?`${e}${i}(${d}, ${r[0].trim()})`:`${e}${i}(${r[0].trim()})`;return g?`${e}${i}(${d}, [
${r.join(`,
`)}
${e}])`:`${e}${i}([
${r.join(`,
`)}
${e}])`}}return""},u=[...new DOMParser().parseFromString(s,"text/html").body.childNodes].map((o)=>m(o)).filter(Boolean);return u.length==1?u[0].trim():`[
${u.join(`,
`)}
]`}var b=()=>{let s=x(""),l=x(""),a=x("tags"),p=x(""),c=()=>{try{l(f(s(),a()))}catch(t){l("Error: "+t.message)}p(s())},m=()=>{s(""),l(""),a("tags"),p("")},u="width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical",o="padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px";return div({style:"margin:20px auto;font-family:sans-serif"},[h1("HTML → SigPro"),div({style:"margin-bottom:10px"},[div({style:"display:flex;gap:20px;flex-wrap:wrap;margin-top:5px"},[label({style:"display:flex;align-items:center;gap:6px"},["Core",input({type:"radio",name:"mode",value:"core",checked:a()==="core",onchange:(t)=>{if(t.target.checked)a("core"),c()}}),span("core — h('tag', props, ...)")]),label({style:"display:flex;align-items:center;gap:6px"},["Tags",input({type:"radio",name:"mode",value:"tags",checked:a()==="tags",onchange:(t)=>{if(t.target.checked)a("tags"),c()}}),span("tags — tag({ props }, ...)")])])]),div({style:"margin-top:15px;display:flex;gap:10px"},[button({style:"padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px;background:#3b82f6;color:#fff",onclick:c},"Convert"),button({style:"padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px;background:#d1d5db",onclick:m},"Clear")]),div({style:"display:grid;grid-template-columns:1fr;gap:15px;margin-top:15px;width:100%"},[div({style:"border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column"},[label({style:"font-weight:bold;margin-bottom:8px"},"HTML Input"),textarea({style:"width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical",placeholder:"Paste your HTML here...",value:s,oninput:(t)=>{s(t.target.value),c()}})]),div({style:"border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column"},[div({style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"},[span({style:"font-weight:bold"},"SigPro Output"),button({style:"padding:4px 8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px",onclick:()=>{navigator.clipboard.writeText(l()),alert("Copied!")}},"Copy")]),textarea({style:"width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical;background:#f9fafb",readonly:!0,value:l,placeholder:"Converted code will appear here..."})]),div({style:"border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column"},[label({style:"font-weight:bold;margin-bottom:8px"},"Live Preview"),iframe({style:"width:100%;height:200px;border:1px solid #e2e8f0;border-radius:4px;background:white;",srcdoc:()=>{return`
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
                                ${p()||""}
                                </body>
                            </html>
                        `},sandbox:"allow-same-origin allow-scripts allow-popups allow-forms allow-modals"})])])])};window.html2sigpro=f;window.converter=b;
