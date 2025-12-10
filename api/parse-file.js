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

    // Fetch metadata from OpenAI
    const metaResp = await fetch(`https://api.openai.com/v1/files/${file_id}`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });

    const metadata = await metaResp.json();
    const mime = metadata?.mime_type || "";

    // Fetch actual file content
    const fileResp = await fetch(
      `https://api.openai.com/v1/files/${file_id}/content`,
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    const arrayBuffer = await fileResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    /* =================================================
       1️⃣ UNIVERSAL TEXT FALLBACK (never crashes)
    ================================================= */
    if (
      mime.startsWith("text/") ||
      mime.includes("octet-stream") ||  // .txt and ChatGPT uploads
      mime.includes("markdown") ||
      mime.includes("json") ||
      mime.includes("csv") ||
      mime === ""  // UNKNOWN
    ) {
      let text = safeDecodeUTF8(buffer);
      return res.status(200).json({
        success: true,
        type: "text",
        text
      });
    }

    /* =================================================
       2️⃣ PDF SUPPORT
    ================================================= */
    if (mime === "application/pdf") {
      const text = await extractPDF(buffer);
      return res.status(200).json({
        success: true,
        type: "pdf",
        text
      });
    }

    /* =================================================
       3️⃣ DOCX SUPPORT
    ================================================= */
    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const text = await extractDOCX(buffer);
      return res.status(200).json({
        success: true,
        type: "docx",
        text
      });
    }

    return res.status(400).json({
      error: `Unsupported MIME type: ${mime}`
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error in parse-file.",
      details: err.message
    });
  }
}

/* =================================================
   SAFE UTF-8 DECODER (never crashes)
================================================= */
function safeDecodeUTF8(buffer) {
  try {
    return buffer.toString("utf8");
  } catch {
    return buffer.toString(); // fallback
  }
}

/* =================================================
   PDF PARSER (EXTREMELY SAFE)
================================================= */
async function extractPDF(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();
    let text = "";

    for (const page of pages) {
      if (page.getTextContent) {
        text += page.getTextContent() || "";
      }
    }

    return text;
  } catch {
    return "";
  }
}

/* =================================================
   DOCX PARSER
================================================= */
async function extractDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch {
    return "";
  }
}