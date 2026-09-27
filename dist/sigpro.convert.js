function x(p,l="tags"){let a=new Set(["allowfullscreen","async","autofocus","autoplay","checked","controls","default","defer","disabled","formnovalidate","hidden","ismap","itemscope","loop","multiple","muted","nomodule","novalidate","open","playsinline","readonly","required","reversed","selected","truespeed"]),i=(r)=>r.replace(/"/g,"\\\""),m=(r)=>{let c=[...r.attributes].map(({name:e,value:n})=>/^on/i.test(e)?`${e}: (e) => { ${n.replace(/\s+/g," ").trim()} }`:a.has(e.toLowerCase())&&(!n||n==e)?`${e}: true`:`${e}: "${i(n)}"`);return c.length?`{ ${c.join(", ")} }`:""},s=(r,c=0)=>{let e="  ".repeat(c);if(r.nodeType==3){let n=r.textContent;return n.trim()?`${e}"${i(n)}"`:""}if(r.nodeType==1){let n=r.tagName.toLowerCase(),d=m(r),o=l==="core"?`h('${n}'`:n,t=[...r.childNodes].map((f)=>s(f,c+1)).filter(Boolean),g=!!d;if(l==="core"){if(!t.length)return g?`${e}${o}, ${d})`:`${e}${o})`;if(t.length===1&&!t[0].includes(`
`))return g?`${e}${o}, ${d}, ${t[0].trim()})`:`${e}${o}, ${t[0].trim()})`;return g?`${e}${o}, ${d},
${t.join(`,
`)}
${e})`:`${e}${o},
${t.join(`,
`)}
${e})`}else{if(!t.length)return g?`${e}${o}(${d})`:`${e}${o}`;if(t.length===1&&!t[0].includes(`
`))return g?`${e}${o}(${d}, ${t[0].trim()})`:`${e}${o}(${t[0].trim()})`;return g?`${e}${o}(${d},
${t.join(`,
`)}
${e})`:`${e}${o}(
${t.join(`,
`)}
${e})`}}return""},u=[...new DOMParser().parseFromString(p,"text/html").body.childNodes].map((r)=>s(r)).filter(Boolean);return u.length==1?u[0].trim():`
${u.join(`,
`)}
`}var h=()=>{let{signal:p}=window.SigPro,l=p(""),a=p(""),i=p("tags"),m=p(""),s=()=>{try{a(x(l(),i()))}catch(e){a("Error: "+e.message)}m(l())},u=()=>{l(""),a(""),i("tags"),m("")},r="width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical",c="padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px";return div({style:"margin:20px auto;font-family:sans-serif"},h1("HTML → SigPro"),div({style:"margin-bottom:10px"},div({style:"display:flex;gap:20px;flex-wrap:wrap;margin-top:5px"},label({style:"display:flex;align-items:center;gap:6px"},"Core",input({type:"radio",name:"mode",value:"core",checked:()=>i()==="core",onchange:(e)=>{if(e.target.checked)i("core"),s()}}),span("core — h('tag', props, ...)")),label({style:"display:flex;align-items:center;gap:6px"},"Tags",input({type:"radio",name:"mode",value:"tags",checked:()=>i()==="tags",onchange:(e)=>{if(e.target.checked)i("tags"),s()}}),span("tags — tag({ props }, ...)")))),div({style:"margin-top:15px;display:flex;gap:10px"},button({style:"padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px;background:#3b82f6;color:#fff",onclick:s},"Convert"),button({style:"padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px;background:#d1d5db",onclick:u},"Clear")),div({style:"display:grid;grid-template-columns:1fr;gap:15px;margin-top:15px;width:100%"},div({style:"border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column"},label({style:"font-weight:bold;margin-bottom:8px"},"HTML Input"),textarea({style:"width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical",placeholder:"Paste your HTML here...",value:l,oninput:(e)=>{l(e.target.value),s()}})),div({style:"border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column"},div({style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"},span({style:"font-weight:bold"},"SigPro Output"),button({style:"padding:4px 8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px",onclick:()=>{navigator.clipboard.writeText(a()),alert("Copied!")}},"Copy")),textarea({style:"width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical;background:#f9fafb",readonly:!0,value:a,placeholder:"Converted code will appear here..."})),div({style:"border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column"},label({style:"font-weight:bold;margin-bottom:8px"},"Live Preview"),iframe({style:"width:100%;height:200px;border:1px solid #e2e8f0;border-radius:4px;background:white;",srcdoc:()=>{return`
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
                                ${m()||""}
                                </body>
                            </html>
                        `},sandbox:"allow-same-origin allow-scripts allow-popups allow-forms allow-modals"}))))};window.html2sigpro=x;window.converter=h;
