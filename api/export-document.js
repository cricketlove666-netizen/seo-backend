// api/export-document.js

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  try {
    const { content, format } = req.body;

    if (!content || !format) {
      return res.status(400).json({ error: "'content' and 'format' are required." });
    }

    if (format !== "pdf") {
      return res.status(400).json({ error: "Only PDF export is supported in this version." });
    }

    // Create new PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 14;
    const margin = 40;

    // Break content into lines
    const maxWidth = page.getWidth() - margin * 2;
    const lines = wrapText(content, font, fontSize, maxWidth);

    let y = page.getHeight() - margin;

    lines.forEach(line => {
      if (y < margin) {
        // Add new page if needed
        const newPage = pdfDoc.addPage();
        y = newPage.getHeight() - margin;
      }
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= fontSize + 4;
    });

    const pdfBytes = await pdfDoc.save();

    const base64Pdf = Buffer.from(pdfBytes).toString("base64");

    return res.status(200).json({
      success: true,
      format: "pdf",
      fileBase64: base64Pdf,
      message: "PDF generated successfully."
    });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to generate PDF.",
      details: err.message || String(err)
    });
  }
}

// Helper: Wrap text for PDF line fitting
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