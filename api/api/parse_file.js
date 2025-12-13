// api/parse_file.js

export default async function handler(req, res) {
  console.log("Incoming parse_file request:", req.body);

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST method allowed." });
    }

    const { file_id, file_base64, filename } = req.body;

    // -----------------------------
    // CASE 1 — Using OpenAI File ID
    // -----------------------------
    if (file_id) {
      try {
        const openaiRes = await fetch(
          `https://api.openai.com/v1/files/${file_id}/content`,
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            }
          }
        );

        if (!openaiRes.ok) {
          const errorText = await openaiRes.text();
          console.error("OpenAI error:", errorText);
          return res.status(500).json({
            error: "Failed to retrieve file from OpenAI",
            details: errorText
          });
        }

        const buffer = Buffer.from(await openaiRes.arrayBuffer());
        const text = buffer.toString("utf-8");

        return res.status(200).json({
          source: "file_id",
          text
        });
      } catch (err) {
        console.error("FILE_ID parsing error:", err);
        return res.status(500).json({
          error: "Error parsing file using file_id",
          details: err.message
        });
      }
    }

    // -----------------------------
    // CASE 2 — Using Base64 upload
    // -----------------------------
    if (file_base64 && filename) {
      try {
        const buffer = Buffer.from(file_base64, "base64");
        const text = buffer.toString("utf-8");

        return res.status(200).json({
          source: "base64",
          filename,
          text
        });
      } catch (err) {
        console.error("BASE64 parsing error:", err);
        return res.status(500).json({
          error: "Error parsing base64 file",
          details: err.message
        });
      }
    }

    // -----------------------------
    // No valid input provided
    // -----------------------------
    return res.status(400).json({
      error: "Missing required input. Provide 'file_id' OR 'file_base64' + 'filename'."
    });

  } catch (err) {
    console.error("General server crash:", err);
    return res.status(500).json({
      error: "Internal server error in parse_file.",
      details: err.message
    });
  }
}