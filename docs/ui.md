<div id="ui"></div>

```js
// ===== SIGNALS =====
const fruta = $("");
const color = $("#3b82f6");
const fecha = $("");
const rango = $({ start: null, end: null });
const pais = $("");

// ===== OPCIONES =====
const frutas = ["Manzana", "Pera", "Plátano", "Fresa", "Mango", "Sandía", "Melón", "Uva"];
const paises = [
  { label: "🇪🇸 España", value: "ES" },
  { label: "🇲🇽 México", value: "MX" },
  { label: "🇦🇷 Argentina", value: "AR" },
  { label: "🇨🇴 Colombia", value: "CO" },
  { label: "🇨🇱 Chile", value: "CL" }
];

mount(() =>
  div({ class: "p-8 max-w-md mx-auto flex flex-col gap-4" }, [
    h1({ class: "text-2xl font-bold" }, "Field Components"),

    // Autocomplete simple
    ui.autocomplete({
      label: "Fruta favorita",
      items: frutas,
      value: fruta,
      placeholder: "Buscar fruta..."
    }),

    // Autocomplete con objetos
    ui.autocomplete({
      label: "País",
      items: paises,
      value: pais,
      placeholder: "Elige un país..."
    }),

    // Datepicker simple
    ui.datepicker({
      label: "Fecha de nacimiento",
      value: fecha,
      placeholder: "Selecciona fecha..."
    }),

    // Datepicker rango
    ui.datepicker({
      label: "Estancia",
      range: true,
      value: rango,
      placeholder: "Check-in → Check-out"
    }),

    // Colorpicker
    ui.colorpicker({
      label: "Color favorito",
      value: color,
      placeholder: "Elige un color..."
    }),

    ui.theme(),
    // Preview
    div({ class: "bg-base-200 rounded-box p-4 flex flex-col gap-2 text-sm" }, [
      div({}, () => `🍎 Fruta: ${val(fruta) || "—"}`),
      div({}, () => `🌍 País: ${val(pais) || "—"}`),
      div({}, () => `📅 Fecha: ${val(fecha) || "—"}`),
      div({}, () => {
        const r = val(rango);
        return r.start && r.end ? `🏨 Estancia: ${r.start} → ${r.end}` : "🏨 Estancia: —";
      }),
      div({ class: "flex items-center gap-2" }, [
        span({}, "🎨 Color:"),
        div({ class: "w-6 h-6 rounded border border-base-300", style: () => `background:${val(color)}` })
      ])
    ])
  ])
, "#ui");
```
