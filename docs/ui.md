<div id="ui"></div>
<div id="tab"></div>
<div id="file"></div>
<div id="demo-toast"></div>

```js
const fruta = $("");
const color = $("#3b82f6");
const fecha = $("");
const rango = $({ start: null, end: null });
const pais = $("");

const frutas = [
  "Manzana",
  "Pera",
  "Plátano",
  "Fresa",
  "Mango",
  "Sandía",
  "Melón",
  "Uva",
];
const paises = [
  { label: "🇪🇸 España", value: "ES" },
  { label: "🇲🇽 México", value: "MX" },
  { label: "🇦🇷 Argentina", value: "AR" },
  { label: "🇨🇴 Colombia", value: "CO" },
  { label: "🇨🇱 Chile", value: "CL" },
];

mount(
  () =>
    div({ class: "p-8 max-w-md mx-auto flex flex-col gap-4" }, [
      h1({ class: "text-2xl font-bold" }, "Field Components"),


      ui.autocomplete({
        label: "Fruta favorita",
        items: frutas,
        value: fruta,
        placeholder: "Buscar fruta...",
      }),


      ui.autocomplete({
        label: "País",
        items: paises,
        value: pais,
        placeholder: "Elige un país...",
      }),

    
      ui.datepicker({
        label: "Fecha de nacimiento",
        value: fecha,
        placeholder: "Selecciona fecha...",
      }),

  
      ui.datepicker({
        label: "Estancia",
        range: true,
        value: rango,
        placeholder: "Check-in → Check-out",
      }),


      ui.colorpicker({
        label: "Color favorito",
        value: color,
        placeholder: "Elige un color...",
      }),

      ui.password({}),
      ui.theme(),

      div(
        { class: "bg-base-200 rounded-box p-4 flex flex-col gap-2 text-sm" },
        [
          div({}, () => `🍎 Fruta: ${val(fruta) || "—"}`),
          div({}, () => `🌍 País: ${val(pais) || "—"}`),
          div({}, () => `📅 Fecha: ${val(fecha) || "—"}`),
          div({}, () => {
            const r = val(rango);
            return r.start && r.end
              ? `🏨 Estancia: ${r.start} → ${r.end}`
              : "🏨 Estancia: —";
          }),
          div({ class: "flex items-center gap-2" }, [
            span({}, "🎨 Color:"),
            div({
              class: "w-6 h-6 rounded border border-base-300",
              style: () => `background:${val(color)}`,
            }),
          ]),
        ],
      ),
    ]),
  "#ui",
);

const archivos = $([]);
const drag = $(false);
const error = $("");
const subiendo = $(false);
const progreso = $(0);

const MAX_SIZE = 5 * 1024 * 1024; 
const MAX_FILES = 3;

const handleFiles = (files) => {
  const arr = Array.from(files);
  if (arr.length > MAX_FILES) {
    error(`Máximo ${MAX_FILES} archivos`);
    return;
  }
  const big = arr.find(f => f.size > MAX_SIZE);
  if (big) {
    error(`"${big.name}" supera los 5MB`);
    return;
  }
  error("");
  archivos(arr);
};

const subirArchivos = async () => {
  const files = archivos();
  if (!files.length) return toast("Selecciona archivos primero", "alert-warning");

  subiendo(true);
  progreso(0);

  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  formData.append('carpeta', 'demo');

  try {
    const xhr = new XMLHttpRequest();
    
    const promise = new Promise((resolve, reject) => {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          progreso(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Error ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Error de conexión'));
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
    
    await promise;
    toast(`✅ ${files.length} archivo(s) subidos`, "alert-success");
    archivos([]);
    progreso(0);
  } catch (err) {
    toast(`❌ ${err.message}`, "alert-error");
  } finally {
    subiendo(false);
  }
};

const fileInputProps = {
  type: "file",
  class: "hidden",
  multiple: true,
  accept: "image/*,.pdf,.doc,.docx",
  onchange: (e) => { handleFiles(e.target.files); e.target.value = ''; }
};

mount(
  () => div({ class: "p-8 max-w-md mx-auto flex flex-col gap-4" }, [
    h1({ class: "text-2xl font-bold" }, "📁 Upload Files"),

    // Zona drag & drop
    h("label", {
      class: () => `relative flex items-center justify-between h-14 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
        drag() ? 'border-primary bg-primary/10' : 'border-base-content/20 bg-base-100'
      } ${subiendo() ? 'pointer-events-none opacity-50' : ''}`,
      ondragover: (e) => { e.preventDefault(); if (!subiendo()) drag(true); },
      ondragleave: () => drag(false),
      ondrop: (e) => {
        e.preventDefault();
        drag(false);
        if (subiendo()) return;
        handleFiles(e.dataTransfer.files);
      }
    }, [
      h("div", { class: "flex items-center gap-3" }, [
        h("span", { class: "icon-[lucide--upload] w-5 h-5 text-base-content/60" }),
        h("div", {}, [
          h("div", { class: "text-sm font-medium" }, "Arrastra archivos aquí"),
          h("div", { class: "text-xs text-base-content/50" }, `Máx ${MAX_FILES} archivos · ${MAX_SIZE / 1024 / 1024}MB c/u`),
        ]),
      ]),
      h("span", { class: "text-xs text-base-content/40" }, "o haz clic"),
      h("input", fileInputProps),
    ]),


    () => error() ? ui.fileError({ message: error() }) : null,


    () => archivos().length > 0 ? h("div", { class: "space-y-3" }, [
      h("div", { class: "flex flex-wrap gap-2" },
        archivos().map((f, i) => {
          const isImage = f.type?.startsWith('image/');
          const url = isImage ? URL.createObjectURL(f) : null;

          return h("div", {
            class: "relative group rounded-lg overflow-hidden border border-base-300 bg-base-200 w-20"
          }, [
            isImage ? h("img", {
              src: url,
              class: "w-20 h-20 object-cover",
              onload: () => url && URL.revokeObjectURL(url)
            }) : h("div", {
              class: "w-20 h-20 flex flex-col items-center justify-center gap-1"
            }, [
              h("span", { class: "text-2xl" }, f.type?.includes('pdf') ? "📕" : "📄"),
              h("span", { class: "text-[8px] uppercase opacity-50" }, f.name?.split('.').pop()),
            ]),
            h("div", { class: "p-1" }, [
              h("div", { class: "text-[9px] truncate font-medium leading-tight" }, f.name),
              h("div", { class: "text-[8px] opacity-50" }, `${~~(f.size / 1024)} KB`),
            ]),
            !subiendo() ? h("button", {
              class: "absolute top-0.5 right-0.5 btn btn-circle btn-ghost btn-xs opacity-0 group-hover:opacity-100 bg-base-100/80",
              onclick: () => archivos(archivos().filter((_, idx) => idx !== i))
            }, h("span", { class: "icon-[lucide--x] w-3 h-3" })) : null,
          ])
        })
      ),

   
      () => subiendo() ? h("div", { class: "space-y-1" }, [
        h("div", { class: "flex justify-between text-xs" }, [
          h("span", {}, "Subiendo..."),
          h("span", {}, () => `${progreso()}%`),
        ]),
        h("progress", { class: "progress progress-primary w-full", value: progreso, max: "100" }),
      ]) : null,

  
      h("div", { class: "flex gap-2" }, [
        h("button", {
          class: "btn btn-ghost btn-sm",
          onclick: () => { archivos([]); error(""); }
        }, "🗑 Limpiar"),
        h("button", {
          class: "btn btn-primary btn-sm",
          disabled: subiendo,
          onclick: subirArchivos
        }, () => subiendo() ? "⏳ Subiendo..." : "☁️ Subir al servidor"),
      ]),
    ]) : null,
  ]),
  "#file",
);


const tabsSignal = $([
  { id: "a", label: "Tab A", content: "Content of tab A", open: true },
  { id: "b", label: "Tab B", content: "Content of tab B", closable: true },
  { id: "c", label: "Tab C", content: "Content of tab C" },
]);

mount(
  () => ui.tabs(
    { class: "tabs-box" },
    () => tabsSignal().flatMap((tab, i) =>
      ui.tab({
        name: "demo-tabs",
        classContent: "bg-base-100 border-base-300 p-6",
        label: tab.label,
        content: tab.content,
        checked: tab.open || false,
        tabs: tabsSignal,
        index: i,
        closable: tab.closable || false,
      })
    )
  ),
  "#tab",
);

mount(
  div({ class: "flex flex-wrap gap-2" }, [
    button({ class: "btn", onclick: () => toast("File saved!") }, "Simple"),
    button(
      { class: "btn", onclick: () => toast("Error!", "alert-error", 5000) },
      "Error (5s)",
    ),
    button(
      {
        class: "btn",
        onclick: () =>
          toast(
            div({ class: "flex items-center gap-2" }, [
              span({ class: "icon-[lucide--check] text-lg" }),
              span({}, "Report generated"),
            ]),
            "alert-success",
          ),
      },
      "With icon",
    ),
    button(
      {
        class: "btn",
        onclick: () =>
          toast(
            div({ class: "flex flex-col" }, [
              strong({}, "ATTENTION!"),
              span({}, "Error saving!"),
              button(
                {
                  class: "btn btn-xs mt-1",
                  onclick: () => console.log("Retry"),
                },
                "Retry",
              ),
            ]),
            "alert-warning",
            7000,
          ),
      },
      "Complex",
    ),
  ]),
  "#toast",
);

mount(
  div({ class: "flex flex-wrap gap-2" }, [
    button({ class: "btn", onclick: () => toast("File saved!") }, "Simple"),
    button(
      { class: "btn", onclick: () => toast("Error!", "alert-error", 5000) },
      "Error (5s)",
    ),
    button(
      {
        class: "btn",
        onclick: () =>
          toast(
            div({ class: "flex items-center gap-2" }, [
              ui.icon("icon-[lucide--check]"),
              span({}, "Report generated"),
            ]),
            "alert-success",
          ),
      },
      "With icon",
    ),
    button(
      {
        class: "btn",
        onclick: () =>
          toast(
            div({ class: "flex flex-col" }, [
              strong({}, "ATTENTION!"),
              span({}, "Error saving!"),
              button(
                {
                  class: "btn btn-xs mt-1",
                  onclick: () => console.log("Retry"),
                },
                "Retry",
              ),
            ]),
            "alert-warning",
            7000,
          ),
      },
      "Complex",
    ),
  ]),
  "#demo-toast",
);

```
