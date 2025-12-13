// api/parse-file.js

import fetch from "node-fetch";
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST method." });
    }

    const { file_id, file_base64, filename } = req.body;

    // ======================================================
    // 1) SUPPORT BOTH METHODS
    // ======================================================

    let buffer;

    // -------- FILE ID METHOD (OpenAI Files API) --------
    if (file_id) {
      const response = await fetch(
        `https://api.openai.com/v1/files/${file_id}/content`,
        {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
        }
      );

      if (!response.ok) {
        return res.status(500).json({
          error: "Failed to fetch file from OpenAI.",
          status: response.status
        });
      }

      buffer = Buffer.from(await response.arrayBuffer());
    }

    // -------- BASE64 METHOD --------
    else if (file_base64 && filename) {
      try {
        buffer = Buffer.from(file_base64, "base64");
      } catch (e) {
        return res.status(400).json({
          error: "Invalid base64 content.",
          details: e.message
        });
      }
    }

    // -------- NEITHER PRESENT --------
    else {
      return res.status(400).json({
        error: "Either 'file_id' or ('file_base64' + 'filename') is required."
      });
    }

    // ======================================================
    // 2) PARSE CONTENT BY FILE TYPE
    // ======================================================

    const ext = filename?.split(".").pop().toLowerCase() || "txt";

    let text = "";

    if (ext === "txt" || !ext) {
      text = buffer.toString("utf-8");
    }

    else if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    else if (ext === "pdf") {
      const pdf = await PDFDocument.load(buffer);
      const pages = pdf.getPages();
      text = pages.map(p => p.getTextContent?.()?.items?.map(i => i.str).join(" ")).join("\n");
    }

    else {
      text = buffer.toString("utf-8");
    }

    // Limit huge files
    text = text.slice(0, 300000);

    return res.status(200).json({
      success: true,
      length: text.length,
      text
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error in parse-file.",
      details: err.message
    });
  }
}