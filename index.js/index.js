import express from "express";
import axios from "axios";

const app = express();
const port = process.env.PORT || 3000;

// API endpoint
app.get("/api/serp_snapshot", async (req, res) => {
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
});

// 🧩 Export handler for Vercel
export default app;
