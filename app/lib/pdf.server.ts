/**
 * Dependency-free PDF generator for withdrawal "evidence packs".
 *
 * Produces a valid single- or multi-page PDF using the two built-in standard
 * fonts (Helvetica / Helvetica-Bold) with WinAnsi encoding — no font embedding,
 * no external dependencies. Text is wrapped using the real Helvetica AFM metrics
 * so line breaks are accurate. Characters outside Latin-1 are transliterated or
 * replaced with "?" (the packs are Latin-script legal records).
 *
 * This is intentionally small: it supports exactly the block types the evidence
 * pack needs (title, headings, key/value rows, paragraphs, dividers, spacing).
 */

// --- Helvetica widths (AFM, 1000-unit em) for printable ASCII 32..126 --------
// prettier-ignore
const HELV_W: number[] = [
  278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278, // 32-47
  556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556, // 48-63
  1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778, // 64-79
  667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,  // 80-95
  333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,  // 96-111
  556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,      // 112-126
];

function charWidth(code: number): number {
  if (code >= 32 && code <= 126) return HELV_W[code - 32];
  // Latin-1 accented letters (0xC0-0xFF) — good-enough average widths.
  if (code >= 0xc0 && code <= 0xff) return 556;
  if (code === 0xa0) return 278; // nbsp
  return 556;
}

/** Transliterate common punctuation and drop anything not WinAnsi-safe. */
function sanitize(input: string): string {
  const map: Record<string, string> = {
    "–": "-", "—": "-", "‘": "'", "’": "'",
    "“": '"', "”": '"', "…": "...", " ": " ",
    "•": "-", "−": "-", "\t": "  ",
  };
  let out = "";
  for (const ch of input.replace(/\r\n?/g, "\n")) {
    if (map[ch] !== undefined) { out += map[ch]; continue; }
    const code = ch.codePointAt(0)!;
    if (ch === "\n") { out += "\n"; continue; }
    if (code === 9) { out += "  "; continue; }
    if (code < 32) continue; // strip control chars
    if (code <= 255) { out += ch; continue; } // Latin-1 / WinAnsi
    out += "?"; // outside supported range
  }
  return out;
}

function textWidth(s: string, size: number): number {
  let w = 0;
  for (let i = 0; i < s.length; i++) w += charWidth(s.charCodeAt(i));
  return (w * size) / 1000;
}

/** Escape a string for a PDF literal ( ) and keep bytes 0..255. */
function pdfEscape(s: string): string {
  return s.replace(/([\\()])/g, "\\$1");
}

export type PdfBlock =
  | { t: "title"; text: string }
  | { t: "subtitle"; text: string }
  | { t: "heading"; text: string }
  | { t: "kv"; label: string; value: string }
  | { t: "para"; text: string; muted?: boolean }
  | { t: "divider" }
  | { t: "space"; h?: number };

// Page geometry (A4) and layout constants.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 64;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

interface Op {
  // one drawn line / primitive
  render: (y: number) => string;
  height: number; // vertical advance consumed (incl. spacing after)
}

function wrap(text: string, size: number, maxW: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split("\n")) {
    const words = rawLine.split(/ +/);
    let cur = "";
    for (const word of words) {
      const attempt = cur ? cur + " " + word : word;
      if (textWidth(attempt, size) <= maxW || !cur) {
        // hard-break a single word too long to fit
        if (!cur && textWidth(word, size) > maxW) {
          let chunk = "";
          for (const ch of word) {
            if (textWidth(chunk + ch, size) > maxW && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else chunk += ch;
          }
          cur = chunk;
        } else cur = attempt;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    lines.push(cur);
  }
  return lines;
}

function textOp(
  text: string,
  opts: { size: number; bold?: boolean; color?: [number, number, number]; x?: number; leading?: number },
): Op {
  const size = opts.size;
  const font = opts.bold ? "/F2" : "/F1";
  const x = opts.x ?? MARGIN_X;
  const [r, g, b] = opts.color ?? [0.12, 0.12, 0.17];
  const leading = opts.leading ?? size * 1.15;
  return {
    height: leading,
    render: (y) =>
      `${r} ${g} ${b} rg\nBT ${font} ${size} Tf ${x.toFixed(2)} ${(y - size).toFixed(2)} Td (${pdfEscape(text)}) Tj ET\n`,
  };
}

/** Flatten blocks into a list of atomic draw ops (already wrapped). */
function layout(blocks: PdfBlock[]): Op[] {
  const ops: Op[] = [];
  for (const blk of blocks) {
    switch (blk.t) {
      case "title": {
        for (const ln of wrap(sanitize(blk.text), 20, CONTENT_W))
          ops.push(textOp(ln, { size: 20, bold: true, leading: 25 }));
        ops.push({ height: 6, render: () => "" });
        break;
      }
      case "subtitle": {
        for (const ln of wrap(sanitize(blk.text), 10, CONTENT_W))
          ops.push(textOp(ln, { size: 10, color: [0.42, 0.42, 0.5], leading: 14 }));
        break;
      }
      case "heading": {
        ops.push({ height: 10, render: () => "" });
        for (const ln of wrap(sanitize(blk.text), 12, CONTENT_W))
          ops.push(textOp(ln, { size: 12, bold: true, leading: 17 }));
        ops.push({ height: 3, render: () => "" });
        break;
      }
      case "kv": {
        const label = sanitize(blk.label).toUpperCase();
        ops.push(textOp(label, { size: 8, bold: true, color: [0.54, 0.54, 0.6], leading: 12 }));
        for (const ln of wrap(sanitize(blk.value || "-"), 11, CONTENT_W))
          ops.push(textOp(ln, { size: 11, leading: 15 }));
        ops.push({ height: 6, render: () => "" });
        break;
      }
      case "para": {
        const color: [number, number, number] = blk.muted ? [0.5, 0.5, 0.58] : [0.2, 0.2, 0.26];
        for (const ln of wrap(sanitize(blk.text), 10, CONTENT_W))
          ops.push(textOp(ln, { size: 10, color, leading: 14 }));
        ops.push({ height: 4, render: () => "" });
        break;
      }
      case "divider": {
        ops.push({
          height: 14,
          render: (y) =>
            `0.88 0.88 0.91 RG 0.8 w ${MARGIN_X} ${(y - 7).toFixed(2)} m ${(PAGE_W - MARGIN_X).toFixed(2)} ${(y - 7).toFixed(2)} l S\n`,
        });
        break;
      }
      case "space":
        ops.push({ height: blk.h ?? 12, render: () => "" });
        break;
    }
  }
  return ops;
}

/** Paginate ops into page content streams. */
function paginate(ops: Op[]): string[] {
  const pages: string[] = [];
  let stream = "";
  let y = PAGE_H - MARGIN_TOP;
  for (const op of ops) {
    if (y - op.height < MARGIN_BOTTOM) {
      pages.push(stream);
      stream = "";
      y = PAGE_H - MARGIN_TOP;
    }
    stream += op.render(y);
    y -= op.height;
  }
  pages.push(stream);
  return pages;
}

/** Build the final PDF file from page content streams. */
export function renderPdf(blocks: PdfBlock[]): Uint8Array {
  const pageStreams = paginate(layout(blocks));

  const objects: string[] = [];
  const addObj = (body: string) => {
    objects.push(body);
    return objects.length; // 1-based object number
  };

  // Reserve: 1=Catalog, 2=Pages, then fonts, then per-page (content + page).
  const catalogNum = 1;
  const pagesNum = 2;
  objects.push(""); // placeholder 1
  objects.push(""); // placeholder 2

  const fontHelv = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const fontBold = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );

  const pageNums: number[] = [];
  for (const stream of pageStreams) {
    const contentNum = addObj(
      `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    );
    const pageNum = addObj(
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] ` +
        `/Resources << /Font << /F1 ${fontHelv} 0 R /F2 ${fontBold} 0 R >> >> ` +
        `/Contents ${contentNum} 0 R >>`,
    );
    pageNums.push(pageNum);
  }

  objects[catalogNum - 1] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`;
  objects[pagesNum - 1] =
    `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageNums.length} >>`;

  // Assemble with a proper xref table.
  let out = "%PDF-1.4\n%âãÏÓ\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets[i] = out.length;
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    out += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  out +=
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF`;

  return Uint8Array.from(Buffer.from(out, "latin1"));
}
