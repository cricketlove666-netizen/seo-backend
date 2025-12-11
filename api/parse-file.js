// api/parse-file.js

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST method." });
    }

    const { file_id } = req.body;
    if (!file_id) {
      return res.status(400).json({ error: "'file_id' is required." });
    }

    const response = await fetch(
      `https://api.openai.com/v1/files/${file_id}/content`,
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    const buffer = Buffer.from(await response.arrayBuffer());

    const text = safeDecode(buffer);

    return res.status(200).json({
      success: true,
      type: "text",
      length: text.length,
      text: text.slice(0, 50000)
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error in parse-file.",
      details: err.message
    });
  }
}

function safeDecode(buffer) {
  try {
    let result = "";
    const chunkSize = 32768;

    for (let i = 0; i < buffer.length; i += chunkSize) {
      result += buffer.slice(i, i + chunkSize).toString("utf-8");
      if (result.length > 300000) break;
    }

    return result.replace(/\uFFFD/g, "");
  } catch {
    return buffer.toString();
  }
}