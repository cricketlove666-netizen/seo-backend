// api/parse-file.js

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST method." });
    }

    const { file_base64, filename } = req.body;

    if (!file_base64 || !filename) {
      return res.status(400).json({
        error: "Both 'file_base64' and 'filename' are required."
      });
    }

    // Decode base64 into a Buffer
    const buffer = Buffer.from(file_base64, "base64");

    // Convert buffer → UTF-8 text safely
    const text = safeDecode(buffer);

    return res.status(200).json({
      success: true,
      filename,
      length: text.length,
      preview: text.slice(0, 50000)   // limit to 50k chars
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error in parse-file.",
      details: err.message
    });
  }
}

// Safe UTF-8 decoding for large files
function safeDecode(buffer) {
  try {
    let result = "";
    const chunkSize = 32768;

    for (let i = 0; i < buffer.length; i += chunkSize) {
      result += buffer.slice(i, i + chunkSize).toString("utf-8");
      if (result.length > 300000) break;
    }

    return result.replace(/\uFFFD/g, ""); // remove replacement chars
  } catch {
    return buffer.toString("utf-8");
  }
}