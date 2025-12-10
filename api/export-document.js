// api/export-document.js

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph } from "docx";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  try {
    const { content, format } = req.body;

    if (!content || !format) {
      return res.status(400).json({ error: "'content' and 'format' are required." });
    }

    // ---------- PDF EXPORT ----------
    if (format === "pdf") {
      const pdfBytes = await generatePDF(content);
      return res.status(200).json({
        success: true,
        format: "pdf",
        base64: Buffer.from(pdfBytes).toString("base64")
      });
    }

    // ---------- DOCX EXPORT ----------
    if (format === "docx") {
      const docxBuffer = await generateDOCX(content);
      return res.status(200).json({
        success: true,
        format: "docx",
        base64: docxBuffer.toString("base64")
      });
    }

    return res.status(400).json({
      error: "Unsupported format. Use pdf or docx."
    });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to export document.",
      details: err.message
    });
  }
}

/* ============================================================
   PDF GENERATION (SANITIZED, ERROR-FREE)
============================================================ */

async function generatePDF(content) {
  // Clean content for PDF encoding
  content = sanitizeForPDF(content);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 14;
  const margin = 40;
  const maxWidth = page.getWidth() - margin * 2;

  const lines = wrapText(content, font, fontSize, maxWidth);

  let y = page.getHeight() - margin;

  for (let i = 0; i < lines.length; i++) {
    if (y < margin) {
      const newPage = pdfDoc.addPage();
      y = newPage.getHeight() - margin;
    }

    page.drawText(lines[i], {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    });

    y -= fontSize + 6;
  }

  return await pdfDoc.save();
}

/* ============================================================
   DOCX GENERATION (FULL UNICODE SUPPORT)
============================================================ */

async function generateDOCX(content) {
  const paragraphs = content.split("\n").map(line => new Paragraph(line));

  const doc = new Document({
    sections: [{ children: paragraphs }]
  });

  return await Packer.toBuffer(doc);
}

/* ============================================================
   SANITIZE TEXT FOR PDF (WINANSI-SAFE)
============================================================ */

function sanitizeForPDF(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[^\x00-\x7F]/g, "") // removes unsupported Unicode
    .replace(/\u2014/g, "-") // em dash
    .replace(/\u2013/g, "-") // en dash
    .replace(/[“”]/g, '"') // smart quotes
    .replace(/[‘’]/g, "'"); // smart apostrophes
}

/* ============================================================
   WRAP TEXT INTO LINES THAT FIT PAGE WIDTH
============================================================ */

function wrapText(text, font, size, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (let word of words) {
    const testLine = line + word + " ";
    const width = font.widthOfTextAtSize(testLine, size);

    if (width > maxWidth) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = testLine;
    }
  }

  if (line.trim()) lines.push(line.trim());

  return lines;
}