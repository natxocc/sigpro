# PDF

SigPro exposes [jsPDF](https://github.com/parall/jspdf) directly through a signal, combined with helpers (`pdfTable`, `pdfText`, etc.) that return the same signal for chaining. This gives full control over every element of the document — no rigid templates or magic functions.

## Why Signal?

`pdfNew()` returns a signal whose value is a `new jsPDF()`. You can use it directly in an `effect`:

```javascript
import { signal, effect } from 'sigpro';
import { pdfNew, pdfTable, pdfText, pdfSave } from 'sigpro/pdf';

const pdfSignal = pdfNew();

effect(() => {
  const doc = pdfSignal();
  // Each effect rebuilds the PDF from scratch
  doc.setFontSize(18);
  doc.text('My Report', 14, 22);
  pdfTable(pdfSignal, { head: [['Col1','Col2']], body: [['a','b']] });
});
```

## API Reference

### `pdfNew()` → `Signal<jsPDF>`

Creates a new jsPDF document wrapped in a SigPro signal.

```javascript
import { pdfNew } from 'sigpro/pdf';
const doc = pdfNew();
doc().setFontSize(12);  // direct access to the jsPDF object
```

### `pdfSave(pdfSignal, filename)`

Downloads the document. Alias of `doc.save(filename)`.

```javascript
import { pdfSave } from 'sigpro/pdf';
pdfSave(pdfSignal, 'my-file.pdf');
```

### `pdfTable(pdfSignal, options)` → `pdfSignal`

Adds a table with [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable). Returns `pdfSignal` for chaining.

| Option | Type | Description |
| :--- | :--- | :--- |
| `head` | `Array<string[]>` | Header row(s). |
| `body` | `Array<string[]>` | Data rows. |
| `options` | `Object` | Passthrough to `autoTable(doc, options)`. See [jsPDF autoTable docs](https://github.com/simonbengtsson/jsPDF-AutoTable#styling-and-themes). |

```javascript
pdfTable(pdfSignal, {
  head: [['Name', 'Age']],
  body: rows().map(r => [r.name, r.age]),
});
```

### `pdfText(pdfSignal, options)` → `pdfSignal`

Adds text to the document. Returns `pdfSignal` for chaining.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `text` | `string` | — | Text content to render. |
| `x` | `number` | — | X coordinate. |
| `y` | `number` | — | Y coordinate. Falls back to last autoTable finalY + 10 if omitted. |
| `fontSize` | `number` | — | Font size. Sets font only when provided. |

```javascript
pdfText(pdfSignal, { text: 'Section Title', x: 14, y: 30, fontSize: 14 });
```

### `pdfNewPage(pdfSignal)` → `pdfSignal`

Adds a new page. Returns `pdfSignal`.

```javascript
pdfNewPage(pdfSignal);
pdfText(pdfSignal, { text: 'Page 2', x: 14, y: 20 });
```

### `pdfLine(pdfSignal, options)` → `pdfSignal`

Draws a straight line. Returns `pdfSignal`.

| Option | Type | Description |
| :--- | :--- | :--- |
| `x1`, `y1` | `number` | Start coordinates. |
| `x2`, `y2` | `number` | End coordinates. |

### `pdfImage(pdfSignal, options)` → `pdfSignal`

Adds an image (base64 string or blob). Automatically detects format (PNG/JPEG). Returns `pdfSignal`.

| Option | Type | Description |
| :--- | :--- | :--- |
| `data` | `string \| Blob` | Base64 image data or Blob. |
| `x`, `y` | `number` | Position. |
| `width`, `height` | `number` | Render dimensions. |

## Full Example

### Multi-page report with images and tables

```javascript
import { signal, effect } from 'sigpro';
import { pdfNew, pdfText, pdfTable, pdfNewPage, pdfImage, pdfLine, pdfSave } from 'sigpro/pdf';

const title = signal('Q4 Sales Report');
const rows = signal([
  ['Week 1', '12,300', '85%'],
  ['Week 2', '14,100', '90%'],
]);

const pdfSignal = pdfNew();

effect(() => {
  const doc = pdfSignal();

  // Cover page
  doc.setFontSize(28);
  doc.text(title(), 14, 30);
  doc.setFontSize(12);
  doc.text('Generated on ' + new Date().toLocaleDateString(), 14, 40);
  pdfLine(pdfSignal, { x1: 14, y1: 50, x2: 196, y2: 50 });

  // Data table
  pdfText(pdfSignal, { text: 'Weekly Summary', x: 14, y: 60, fontSize: 16 });
  pdfTable(pdfSignal, {
    head: [['Week', 'Revenue', 'Target']],
    body: rows(),
  });

  // Second page
  pdfNewPage(pdfSignal);
  pdfText(pdfSignal, { text: 'Product Detail', x: 14, y: 20, fontSize: 16 });
  pdfTable(pdfSignal, {
    head: [['Product', 'Qty', 'Price']],
    body: [
      ['Widget A', '150', '$45.00'],
      ['Widget B', '87', '$32.00'],
    ],
  });

  // Footer on the last page
  doc.setFontSize(8);
  doc.text('SigPro Report Generator', 14, doc.pageHeight - 10);
});

// Download when user clicks a button
function handleExport() {
  pdfSave(pdfSignal, 'report-q4.pdf');
}
```

## Reactive Example

### PDF updated automatically when data changes

```javascript
import { signal, effect } from 'sigpro';
import { pdfNew, pdfTable, pdfText } from 'sigpro/pdf';

const events = signal([
  ['Team meeting', '10:00'],
  ['Code review', '14:00'],
]);

const pdfSignal = pdfNew();

effect(() => {
  const doc = pdfSignal();
  // Rebuilds from scratch every time `events` changes
  pdfText(pdfSignal, { text: "Today's Events", x: 14, y: 20, fontSize: 16 });
  pdfTable(pdfSignal, { head: [['Event', 'Time']], body: events() });
});

// Modifying events updates the PDF automatically
events([
  ['Standup', '09:00'],
  ['Deploy', '16:00'],
]);
```

## Summary Cheat Sheet

| Goal | Code |
| :--- | :--- |
| Create document | `const doc = pdfNew()` |
| Add text | `pdfText(doc, { text: 'Hello', x: 14, y: 20, fontSize: 18 })` |
| Add table | `pdfTable(doc, { head: [...], body: [...] })` |
| New page | `pdfNewPage(doc)` |
| Draw line | `pdfLine(doc, { x1, y1, x2, y2 })` |
| Add image | `pdfImage(doc, { data: 'base64...', x: 14, y: 14, width: 50, height: 30 })` |
| Download PDF | `pdfSave(doc, 'filename.pdf')` |

## Notes

- **Full rebuild**: each effect rebuilds the document from scratch. There is no append or merge — this is how jsPDF works correctly without state conflicts.
- **`autoTable` position**: helpers automatically calculate `startY` from the last autoTable position (`finalY + 10`) when Y coordinate is not specified.
- **Full jsPDF API**: by accessing `pdfSignal()`, you have access to the entire jsPDF API — colors, fonts, margins, orientations, etc.
