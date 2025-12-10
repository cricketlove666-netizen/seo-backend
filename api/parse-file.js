// api/parse-file.js

import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST method." });
    }

    const { file_id } = req.body;
    if (!file_id) {
      return res.status(400).json({ error: "'file_id' is required." });
    }

    // Fetch metadata
    const metaResp = await fetch(`https://api.openai.com/v1/files/${file_id}`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    const metadata = await metaResp.json();
    const mime = metadata?.mime_type || "";

    // Fetch file content (as array buffer)
    const fileResp = await fetch(
      `https://api.openai.com/v1/files/${file_id}/content`,
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );

    const arrayBuffer = await fileResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    /* =========================================================
       UNIVERSAL SAFE TEXT READER (NEVER CRASHES)
    ========================================================= */
    if (
      mime.startsWith("text/") ||
      mime.includes("octet-stream") ||
      mime.includes("markdown") ||
      mime.includes("json") ||
      mime.includes("csv") ||
      mime === ""
    ) {
      const text = safeTextFromBuffer(buffer);
      return res.status(200).json({
        success: true,
        type: "text",
        text,
      });
    }

    /* =========================================================
       PDF READER
    ========================================================= */
    if (mime === "application/pdf") {
      const text = await safePDFExtract(buffer);
      return res.status(200).json({
        success: true,
        type: "pdf",
        text,
      });
    }

    /* =========================================================
       DOCX READER
    ========================================================= */
    if (
      mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const text = await safeDOCXExtract(buffer);
      return res.status(200).json({
        success: true,
        type: "docx",
        text,
      });
    }

    /* =========================================================
       FALLBACK
    ========================================================= */
    return res.status(400).json({
      error: `Unsupported MIME type: ${mime}`,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error in parse-file.",
      details: err.message,
    });
  }
}

/* =========================================================
   SAFE UTF-8 DECODER (NEVER CRASHES)
========================================================= */
function safeTextFromBuffer(buffer) {
  try {
    // Split huge buffers into safe chunks
    const chunkSize = 16384;
    let text = "";

    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize);
      text += chunk.toString("utf8");
    }

    return text.replace(/\uFFFD/g, ""); // remove bad chars
  } catch {
    return buffer.toString(); // fallback
  }
}

/* =========================================================
   SAFE PDF EXTRACTOR
========================================================= */
async function safePDFExtract(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();
    let text = "";

    for (const page of pages) {
      try {
        text += page.getTextContent?.() || "";
      } catch {}
    }

    return text;
  } catch {
    return "";
  }
}

/* =========================================================
   SAFE DOCX EXTRACTOR
========================================================= */
async function safeDOCXExtract(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch {
    return "";
  }
}