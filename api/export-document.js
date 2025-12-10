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

    if (format === "pdf") {
      const pdfBytes = await generatePDF(content);
      return res.status(200).json({
        success: true,
        format: "pdf",
        base64: Buffer.from(pdfBytes).toString("base64")
      });
    }

    if (format === "docx") {
      const docxBuffer = await generateDOCX(content);
      return res.status(200).json({
        success: true,
        format: "docx",
        base64: docxBuffer.toString("base64")
      });
    }

    return res.status(400).json({ error: "Unsupported format. Use pdf or docx." });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to export document.",
      details: err.message
    });
  }
}


// -------------------
// PDF Generator
// -------------------
async function generatePDF(content) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 14;
  const margin = 40;
  const maxWidth = page.getWidth() - margin * 2;

  const lines = wrapText(content, font, fontSize, maxWidth);

  let y = page.getHeight() - margin;

  lines.forEach(line => {
    if (y < margin) {
      const newPage = pdfDoc.addPage();
      y = newPage.getHeight() - margin;
    }
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    });
    y -= fontSize + 4;
  });

  return await pdfDoc.save();
}

// -------------------
// DOCX Generator
// -------------------
async function generateDOCX(content) {
  const paragraphs = content.split("\n").map(line => new Paragraph(line));

  const doc = new Document({
    sections: [{ children: paragraphs }]
  });

  return await Packer.toBuffer(doc);
}

// -------------------
// Text Wrapper
// -------------------
function wrapText(text, font, size, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach(word => {
    const testLine = line + word + " ";
    const width = font.widthOfTextAtSize(testLine, size);

    if (width > maxWidth) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = testLine;
    }
  });

  if (line.trim()) lines.push(line.trim());
  return lines;
}