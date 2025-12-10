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

    // 1. Fetch file metadata — this contains MIME TYPE
    const metaResp = await fetch(`https://api.openai.com/v1/files/${file_id}`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });

    const metadata = await metaResp.json();
    const mime = metadata?.mime_type || "";

    // 2. Fetch the actual file content
    const fileResp = await fetch(
      `https://api.openai.com/v1/files/${file_id}/content`,
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    const buffer = Buffer.from(await fileResp.arrayBuffer());

    // 3. Process based on MIME TYPE
    if (mime === "text/plain") {
      return res.status(200).json({
        success: true,
        type: "txt",
        text: buffer.toString("utf8")
      });
    }

    if (mime === "application/pdf") {
      const text = await extractPDF(buffer);
      return res.status(200).json({ success: true, type: "pdf", text });
    }

    if (
      mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const text = await extractDOCX(buffer);
      return res.status(200).json({ success: true, type: "docx", text });
    }

    return res.status(400).json({
      error: `Unsupported MIME type: ${mime}`
    });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to parse file.",
      details: err.message
    });
  }
}

// PDF parser
async function extractPDF(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    let text = "";

    for (const page of pdfDoc.getPages()) {
      text += page.getTextContent?.() || "";
    }

    return text;
  } catch {
    return "";
  }
}

// DOCX parser
async function extractDOCX(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}