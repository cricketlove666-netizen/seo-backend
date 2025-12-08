import axios from "axios";

export default async function handler(req, res) {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: "Please provide a keyword" });
  }

  try {
    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google",
        q: keyword,
        num: 10,
        api_key: process.env.SERP_API_KEY,
      },
    });

    const results =
      response.data.organic_results?.map((r) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
      })) || [];

    res.json({ keyword, total_results: results.length, results });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch from SerpApi",
      details: err.message,
    });
  }
}
