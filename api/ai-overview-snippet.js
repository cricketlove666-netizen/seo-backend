// api/ai-overview-snippet.js

import * as cheerio from "cheerio";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  const { keyword } = req.body;

  if (!keyword || typeof keyword !== "string") {
    return res.status(400).json({ error: "'keyword' is required and must be a string." });
  }

  try {
    // STEP 1: Perform a simple Google query using scrape
    const googleUrl =
      "https://www.google.com/search?q=" +
      encodeURIComponent(keyword) +
      "&hl=en";

    const response = await fetch(googleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEO-GPT/1.0)"
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract titles + snippets from search results
    const results = [];
    $("div.g").each((i, el) => {
      const title = $(el).find("h3").text().trim();
      const snippet = $(el).find(".VwiC3b").text().trim();
      const link = $(el).find("a").attr("href");

      if (title && snippet) {
        results.push({ title, snippet, link });
      }
    });

    // STEP 2: Generate a synthetic AI overview summary
    const summary = generateAIOverview(keyword, results);

    return res.status(200).json({
      success: true,
      keyword,
      overview: summary,
      sources: results.slice(0, 5) // top 5 sources
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to generate overview.",
      details: error.toString()
    });
  }
}

// Simple local AI-style summarization engine
function generateAIOverview(keyword, results) {
  if (!results.length) return "Not enough data to generate an overview.";

  const combinedText = results
    .map(r => r.snippet)
    .join(" ")
    .slice(0, 800); // keep clean length

  return {
    summary:
      `Here is an AI-powered overview for '${keyword}': ` +
      combinedText,

    bulletPoints: extractBulletPoints(results),
    whatToKnow: extractWhatToKnow(results)
  };
}

function extractBulletPoints(results) {
  return results.slice(0, 3).map(r => r.title);
}

function extractWhatToKnow(results) {
  return results.slice(0, 5).map(r => ({
    title: r.title,
    note: r.snippet
  }));
}