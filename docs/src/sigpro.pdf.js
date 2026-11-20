import { signal } from './sigpro.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function pdfNew() {
  return signal(new jsPDF());
}

export function pdfSave(pdfSignal, filename) {
  pdfSignal().save(filename);
}

// ---------- convenience helpers ----------

/**
 * Add an autoTable to the existing PDF. Returns `pdfSignal` for chaining.
 */
export function pdfTable(pdfSignal, { head, body, options = {} }) {
  const doc = pdfSignal();
  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 20) + 10,
    head,
    body,
    ...options,
  });
  return pdfSignal;
}

/**
 * Add text at a position. Returns `pdfSignal` for chaining.
 */
export function pdfText(pdfSignal, { text, x, y, fontSize }) {
  const doc = pdfSignal();
  if (fontSize) doc.setFontSize(fontSize);
  if (x != null && y != null) doc.text(text, x, y);
  else doc.text(text, 14, (doc.lastAutoTable?.finalY || 20) + 10);
  return pdfSignal;
}

/**
 * Add a line. Returns `pdfSignal` for chaining.
 */
export function pdfLine(pdfSignal, { x1, y1, x2, y2 }) {
  const doc = pdfSignal();
  doc.line(x1 ?? (doc.lastAutoTable?.finalY || 20) + 5, y1, x2, y2);
  return pdfSignal;
}

/**
 * Add an image (base64 or blob). Returns `pdfSignal` for chaining.
 */
export function pdfImage(pdfSignal, { data, x, y, width, height }) {
  const doc = pdfSignal();
  const format = typeof data === 'string' ? 'PNG' : 'JPEG';
  doc.addImage(data, format, x, y, width, height);
  return pdfSignal;
}

/**
 * Add a new page. Returns `pdfSignal` for chaining.
 */
export function pdfNewPage(pdfSignal) {
  pdfSignal().addPage();
  return pdfSignal;
}
