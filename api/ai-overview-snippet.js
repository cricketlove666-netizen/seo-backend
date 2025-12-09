// api/ai-overview-snippet.js

import cheerio from "cheerio";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  const { keyword } = req.body;

  if (!keyword || typeof keyword !== "string") {
    return res.status(400).json({ error: "'keyword' is required and must be a string." });
  }

  try {
    const googleUrl =
      "https://www.google.com/search?q=" +
      encodeURIComponent(keyword) +
      "&hl=en";

    const response = await fetch(googleUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html",
      }
    });

    // If Google blocks the request
    if (!response.ok) {
      return res.status(200).json({
        success: true,
        keyword,
        overview: {
          summary: `AI Overview for '${keyword}'. Google blocked SERP scraping, so here's a fallback answer.`,
          bulletPoints: [],
          whatToKnow: []
        },
        sources: []
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    $("div.g").each((i, el) => {
      const title = $(el).find("h3").text().trim();
      const snippet = $(el).find(".VwiC3b").text().trim();
      const link = $(el).find("a").attr("href");

      if (title && snippet) {
        results.push({ title, snippet, link });
      }
    });

    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        keyword,
        overview: {
          summary: `AI Overview for '${keyword}' — not enough SERP data found.`,
          bulletPoints: [],
          whatToKnow: []
        },
        sources: []
      });
    }

    // Build overview
    const summaryText = results
      .map(r => r.snippet)
      .join(" ")
      .slice(0, 800);

    const overview = {
      summary: `AI Overview for '${keyword}': ${summaryText}`,
      bulletPoints: results.slice(0, 3).map(r => r.title),
      whatToKnow: results.slice(0, 5).map(r => ({
        title: r.title,
        note: r.snippet
      }))
    };

    return res.status(200).json({
      success: true,
      keyword,
      overview,
      sources: results.slice(0, 5)
    });

  } catch (err) {
    return res.status(500).json({
      error: "AI overview failed",
      details: err.message || String(err)
    });
  }
}