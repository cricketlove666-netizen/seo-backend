// api/parse-file.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // --- CORS SUPPORT (required for OpenAI Actions) ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- METHOD CHECK ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method is allowed." });
  }

  try {
    const { file_id } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: "'file_id' is required." });
    }

    // --- FETCH FILE CONTENT FROM OPENAI ---
    const url = `https://api.openai.com/v1/files/${file_id}/content`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch file from OpenAI`,
        status: response.status
      });
    }

    // Convert file to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Decode safely
    const text = safeDecode(buffer);

    return res.status(200).json({
      success: true,
      message: "File parsed successfully.",
      file_id,
      length: text.length,
      preview: text.slice(0, 30000),   // protect payload
      full_text: text
    });

  } catch (error) {
    console.error("parse-file error:", error);

    return res.status(500).json({
      error: "Internal server error in parse-file.",
      details: error.message
    });
  }
}

// --- SAFE BUFFER DECODER ---
function safeDecode(buffer) {
  try {
    let result = "";
    const chunkSize = 32768;

    for (let i = 0; i < buffer.length; i += chunkSize) {
      result += buffer.slice(i, i + chunkSize).toString("utf-8");

      // Safety limit (300k chars)
      if (result.length > 300000) break;
    }

    // Remove � replacement chars
    return result.replace(/\uFFFD/g, "");
  } catch (e) {
    return buffer.toString("utf-8");
  }
}