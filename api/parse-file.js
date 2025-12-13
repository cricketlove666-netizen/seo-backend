// api/parse_file.js

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
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      return res.status(500).json({
        error: "Failed to fetch file from OpenAI.",
        status: response.status,
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const text = buffer.toString("utf-8");

    return res.status(200).json({
      success: true,
      extracted_text: text.slice(0, 50000)
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error in parse_file.",
      message: err.message,
    });
  }
}