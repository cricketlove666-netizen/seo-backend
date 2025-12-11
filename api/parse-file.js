// api/parse-file.js

import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST method." });
    }

    const { file_id } = req.body;

    if (!file_id) {
      return res.status(400).json({
        error: "'file_id' is required by this endpoint."
      });
    }

    const response = await fetch(
      `https://api.openai.com/v1/files/${file_id}/content`,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({
        error: "Failed to fetch file from OpenAI.",
        details: errText
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const text = buffer.toString("utf-8");

    return res.status(200).json({
      success: true,
      type: "text",
      length: text.length,
      text: text.slice(0, 100000) // safety limit
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error in parse-file.",
      details: err.message
    });
  }
}