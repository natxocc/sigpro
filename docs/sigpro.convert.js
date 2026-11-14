function x(p,u="tags"){let d=new Set(["allowfullscreen","async","autofocus","autoplay","checked","controls","default","defer","disabled","formnovalidate","hidden","ismap","itemscope","loop","multiple","muted","nomodule","novalidate","open","playsinline","readonly","required","reversed","selected","truespeed"]),l=(r)=>r.replace(/"/g,"\\\""),a=(r)=>{let g=[...r.attributes].map(({name:e,value:t})=>/^on/i.test(e)?`${e}: (e) => { ${t.replace(/\s+/g," ").trim()} }`:d.has(e.toLowerCase())&&(!t||t==e)?`${e}: true`:`${e}: "${l(t)}"`);return g.length?`{ ${g.join(", ")} }`:""},c=(r,g=0)=>{let e="  ".repeat(g);if(r.nodeType==3){let t=r.textContent;return t.trim()?`${e}"${l(t)}"`:""}if(r.nodeType==1){let t=r.tagName.toLowerCase(),n=a(r),i=u==="core"?`h('${t}'`:t,o=[...r.childNodes].map((f)=>c(f,g+1)).filter(Boolean),m=!!n;if(u==="core"){if(!o.length)return m?`${e}${i}, ${n})`:`${e}${i})`;if(o.length===1&&!o[0].includes(`
`))return m?`${e}${i}, ${n}, ${o[0].trim()})`:`${e}${i}, ${o[0].trim()})`;return m?`${e}${i}, ${n},
${o.join(`,
`)}
${e})`:`${e}${i},
${o.join(`,
`)}
${e})`}else{if(!o.length)return m?`${e}${i}(${n})`:`${e}${i}`;if(o.length===1&&!o[0].includes(`
`))return m?`${e}${i}(${n}, ${o[0].trim()})`:`${e}${i}(${o[0].trim()})`;return m?`${e}${i}(${n},
${o.join(`,
`)}
${e})`:`${e}${i}(
${o.join(`,
`)}
${e})`}}return""},s=[...new DOMParser().parseFromString(p,"text/html").body.childNodes].map((r)=>c(r)).filter(Boolean);return s.length==1?s[0].trim():`
${s.join(`,
`)}
`}var h=()=>{let{signal:p,effect:u}=window.SigPro,d=p(""),l=p(""),a=p("tags"),c=p(""),s=()=>{try{l(x(d(),a()))}catch(t){l("Error: "+t.message)}c(d())},r=()=>{d(""),l(""),a("tags"),c("")},g="width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical",e="padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px";return div({style:"margin:20px auto;font-family:sans-serif"},h1("HTML → SigPro"),div({style:"margin-bottom:10px"},div({style:"display:flex;gap:20px;flex-wrap:wrap;margin-top:5px"},label({style:"display:flex;align-items:center;gap:6px"},"Core",input({type:"radio",name:"mode",value:"core",checked:()=>a()==="core",onchange:(t)=>{if(t.target.checked)a("core"),s()}}),span("core — h('tag', props, ...)")),label({style:"display:flex;align-items:center;gap:6px"},"Tags",input({type:"radio",name:"mode",value:"tags",checked:()=>a()==="tags",onchange:(t)=>{if(t.target.checked)a("tags"),s()}}),span("tags — tag({ props }, ...)")))),div({style:"margin-top:15px;display:flex;gap:10px"},button({style:"padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px;background:#3b82f6;color:#fff",onclick:s},"Convert"),button({style:"padding:8px 16px;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-size:14px;background:#d1d5db",onclick:r},"Clear")),div({style:"display:grid;grid-template-columns:1fr;gap:15px;margin-top:15px;width:100%"},div({style:"border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column"},label({style:"font-weight:bold;margin-bottom:8px"},"HTML Input"),textarea({style:"width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical",placeholder:"Paste your HTML here...",value:d,oninput:(t)=>{d(t.target.value),s()}})),div({style:"border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column"},div({style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"},span({style:"font-weight:bold"},"SigPro Output"),button({style:"padding:4px 8px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px",onclick:()=>{navigator.clipboard.writeText(l()),alert("Copied!")}},"Copy")),textarea({style:"width:100%;height:200px;padding:10px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:14px;box-sizing:border-box;resize:vertical;background:#f9fafb",readonly:!0,value:l,placeholder:"Converted code will appear here..."})),div({style:"border:1px solid #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column"},label({style:"font-weight:bold;margin-bottom:8px"},"Live Preview"),iframe({style:"width:100%;height:200px;border:1px solid #e2e8f0;border-radius:4px;background:white;",ref:(t)=>u(()=>{let n=c()||"";t.srcdoc=`
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
                                ${n}
                                </body>
                            </html>
                        `}),sandbox:"allow-same-origin allow-scripts allow-popups allow-forms allow-modals"}))))};window.html2sigpro=x;window.converter=h;
