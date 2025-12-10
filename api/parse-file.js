// api/parse-file.js

import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  try {
    const { file_id } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: "'file_id' is required." });
    }

    // STEP 1 — Download the file from ChatGPT's hosted file URL
    const fileUrl = `https://api.openai.com/v1/files/${file_id}/content`;

    const fileResponse = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect file type
    if (file_id.endsWith(".pdf")) {
      const text = await extractPDF(buffer);
      return res.status(200).json({ success: true, type: "pdf", text });
    }

    if (file_id.endsWith(".docx")) {
      const text = await extractDOCX(buffer);
      return res.status(200).json({ success: true, type: "docx", text });
    }

    if (file_id.endsWith(".txt")) {
      return res.status(200).json({
        success: true,
        type: "txt",
        text: buffer.toString("utf8"),
      });
    }

    return res.status(400).json({ error: "Unsupported file type." });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to parse file.",
      details: err.message || String(err),
    });
  }
}

// PDF extraction
async function extractPDF(buffer) {
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  let text = "";

  for (const page of pages) {
    text += page.getTextContent?.() || ""; // fallback if getTextContent unavailable
  }

  return text;
}

// DOCX extraction
async function extractDOCX(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}