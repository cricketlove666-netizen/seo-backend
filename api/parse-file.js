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

    // Get metadata (contains MIME type)
    const metaResp = await fetch(`https://api.openai.com/v1/files/${file_id}`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });

    const metadata = await metaResp.json();
    const mime = metadata?.mime_type || "";

    // Fetch the real file bytes
    const fileResp = await fetch(
      `https://api.openai.com/v1/files/${file_id}/content`,
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    const buffer = Buffer.from(await fileResp.arrayBuffer());

    // ---------- UNIVERSAL TEXT SUPPORT ----------
    if (
      mime.startsWith("text/") ||
      mime.includes("json") ||
      mime.includes("xml") ||
      mime.includes("yaml") ||
      mime.includes("csv") ||
      mime.includes("markdown") ||
      mime.includes("octet-stream") ||  // ChatGPT .txt files
      mime === ""  // unknown or missing MIME
    ) {
      return res.status(200).json({
        success: true,
        type: "text",
        text: buffer.toString("utf8")
      });
    }

    // ---------- PDF ----------
    if (mime === "application/pdf") {
      const text = await extractPDF(buffer);
      return res.status(200).json({ success: true, type: "pdf", text });
    }

    // ---------- DOCX ----------
    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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

// PDF extractor
async function extractPDF(buffer) {
  try {
    const doc = await PDFDocument.load(buffer);
    let text = "";
    for (const page of doc.getPages()) {
      text += page.getTextContent?.() || "";
    }
    return text;
  } catch {
    return "";
  }
}

// DOCX extractor
async function extractDOCX(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}