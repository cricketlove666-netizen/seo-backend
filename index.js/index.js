// ───────────────────────────────────────────────
// ✅ SEO BACKEND - SERP SNAPSHOT API
// Built for Node.js + Express + SerpApi
// ───────────────────────────────────────────────

// IMPORTS
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

// LOAD .env FROM SAME FOLDER
dotenv.config(); // Looks for .env in the same directory as index.js

// DEBUG: Check if your API key is loaded
console.log("🔍 Loaded SerpApi key:", process.env.SERP_API_KEY);

const app = express();
app.use(cors());

// ───────────────────────────────────────────────
// ROUTE: http://localhost:3000/api/serp_snapshot?keyword=your+query
// ───────────────────────────────────────────────
app.get("/api/serp_snapshot", async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: "Please provide a keyword." });
  }

  try {
    // Call SerpApi using your API key
    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google",
        q: keyword,
        num: 10,
        api_key: process.env.SERP_API_KEY,
      },
    });

    // Format the results for your frontend or GPT action
    const results = response.data.organic_results?.map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    })) || [];

    return res.json({
      keyword,
      total_results: results.length,
      results,
    });
  } catch (error) {
    console.error("❌ SerpApi Error:", error.message);
    return res.status(500).json({
      error: "Failed to fetch from SerpApi",
      details: error.message,
    });
  }
});

// START SERVER
const port = 3000;
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
