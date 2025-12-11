// api/parse-file.js

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST method." });
    }

    const { file_base64, filename } = req.body;

    if (!file_base64 || !filename) {
      return res.status(400).json({
        error: "'file_base64' and 'filename' are required."
      });
    }

    // Decode base64 into raw buffer
    const buffer = Buffer.from(file_base64, "base64");

    // Convert buffer to readable UTF-8 text
    const text = buffer.toString("utf-8");

    // Limit output to protect server memory
    const safe = text.slice(0, 200000);

    return res.status(200).json({
      success: true,
      filename,
      length: safe.length,
      text: safe
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error in parse-file.",
      details: err.message
    });
  }
}