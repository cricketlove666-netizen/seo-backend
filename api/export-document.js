// api/export-document.js

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph } from "docx";

// Auto-switch formats: If content has Unicode → use DOCX
function requiresDOCX(text) {
  return /[^\x00-\x7F]/.test(text);  // detect unicode
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  try {
    let { content, format } = req.body;

    if (!content || !format) {
      return res.status(400).json({ error: "'content' and 'format' are required." });
    }

    // Auto-switch to DOCX if content has unicode
    if (requiresDOCX(content) && format === "pdf") {
      format = "docx";
    }

    // ---------- PDF ----------
    if (format === "pdf") {
      const pdfBytes = await createSafePDF(content);
      return res.status(200).json({
        success: true,
        format: "pdf",
        base64: Buffer.from(pdfBytes).toString("base64")
      });
    }

    // ---------- DOCX ----------
    if (format === "docx") {
      const buffer = await createDOCX(content);
      return res.status(200).json({
        success: true,
        format: "docx",
        base64: buffer.toString("base64")
      });
    }

    return res.status(400).json({ error: "Unsupported format. Use pdf or docx." });

  } catch (err) {
    return res.status(500).json({
      error: "Document export failed.",
      details: err.message
    });
  }
}

/* ======================
   PDF (SAFE GENERATOR)
======================= */
async function createSafePDF(text) {
  text = cleanForPDF(text);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 14;
  const margin = 40;
  const maxWidth = page.getWidth() - margin * 2;

  const lines = wrap(text, font, fontSize, maxWidth);
  let y = page.getHeight() - margin;

  for (const line of lines) {
    if (y < margin) {
      const newPage = pdf.addPage();
      y = newPage.getHeight() - margin;
    }

    page.drawText(line, {
      x: margin,
      y,
      font,
      size: fontSize,
      color: rgb(0, 0, 0)
    });

    y -= fontSize + 6;
  }

  return await pdf.save();
}

/* ======================
   DOCX GENERATOR
======================= */
async function createDOCX(text) {
  const paragraphs = text.split("\n").map(line => new Paragraph(line));
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return await Packer.toBuffer(doc);
}

/* ======================
   SANITIZE FOR PDF
======================= */
function cleanForPDF(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[^\x00-\x7F]/g, "") // strip unsupported chars
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "*")
    .replace(/\t/g, "  ");
}

/* ======================
   TEXT WRAPPING
======================= */
function wrap(text, font, size, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const testLine = line + word + " ";
    if (font.widthOfTextAtSize(testLine, size) > maxWidth) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = testLine;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}