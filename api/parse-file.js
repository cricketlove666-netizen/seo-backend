// api/parse-file.js

import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST method." });
    }

    const { file_id } = req.body;
    if (!file_id) {
      return res.status(400).json({ error: "'file_id' is required." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY missing in Vercel environment."
      });
    }

    const fileUrl = `https://api.openai.com/v1/files/${file_id}/content`;

    const response = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({
        error: "Failed to fetch file from OpenAI.",
        status: response.status,
        details: errText
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const text = decodeText(buffer);

    return res.status(200).json({
      success: true,
      length: text.length,
      text: text.slice(0, 50000)
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error in parse-file.",
      details: err.stack
    });
  }
}

function decodeText(buffer) {
  try {
    return buffer.toString("utf8").replace(/\uFFFD/g, "");
  } catch {
    return buffer.toString();
  }
}