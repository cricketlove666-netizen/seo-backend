// api/parse_file.js

export default async function handler(req, res) {
  console.log("REQUEST BODY:", req.body);

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed." });
    }

    const { file_id, file_base64, filename } = req.body;

    //----------------------------------------
    // CASE 1 — Parse using OpenAI file_id
    //----------------------------------------
    if (file_id) {
      try {
        const openAiRes = await fetch(`https://api.openai.com/v1/files/${file_id}/content`, {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
        });

        if (!openAiRes.ok) {
          const errTxt = await openAiRes.text();
          console.error("OpenAI FILE_ID ERROR:", errTxt);
          return res.status(500).json({
            error: "OpenAI file content fetch failed.",
            details: errTxt
          });
        }

        const buffer = Buffer.from(await openAiRes.arrayBuffer());
        const text = buffer.toString("utf-8");

        return res.status(200).json({
          method: "file_id",
          text
        });
      } catch (err) {
        console.error("FILE_ID PARSING ERROR:", err);
        return res.status(500).json({ error: "File ID parse failed", details: err.message });
      }
    }

    //----------------------------------------
    // CASE 2 — Parse using base64 content
    //----------------------------------------
    if (file_base64 && filename) {
      try {
        const buffer = Buffer.from(file_base64, "base64");
        const text = buffer.toString("utf-8");

        return res.status(200).json({
          method: "base64",
          filename,
          text
        });
      } catch (err) {
        console.error("BASE64 PARSE ERROR:", err);
        return res.status(500).json({ error: "Base64 file parse failed", details: err.message });
      }
    }

    //----------------------------------------
    // If nothing valid was provided
    //----------------------------------------
    return res.status(400).json({
      error: "Provide either { file_id } OR { file_base64, filename }."
    });

  } catch (err) {
    console.error("GENERAL PARSE ERROR:", err);
    res.status(500).json({
      error: "Server crashed inside parse_file.",
      details: err.message
    });
  }
}