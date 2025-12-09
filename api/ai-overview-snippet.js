// api/ai-overview-snippet.js
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  const { keyword } = req.body;

  if (!keyword || typeof keyword !== "string") {
    return res.status(400).json({ error: "'keyword' must be a string." });
  }

  try {
    // Try DuckDuckGo → Best for easy scraping
    const ddgResults = await scrapeDuckDuckGo(keyword);

    let results = ddgResults;

    // If DDG fails → Try Bing
    if (!results || results.length === 0) {
      results = await scrapeBing(keyword);
    }

    // If Bing fails → Try Wikipedia summary
    if (!results || results.length === 0) {
      const wiki = await fetchWikipedia(keyword);

      return res.status(200).json({
        success: true,
        keyword,
        overview: {
          summary: wiki.extract || `No information available for '${keyword}'.`,
          bulletPoints: [],
          whatToKnow: []
        },
        sources: wiki.sources || []
      });
    }

    // Build AI-style summary
    const summarized = buildAISummary(keyword, results);

    return res.status(200).json({
      success: true,
      keyword,
      overview: summarized,
      sources: results.slice(0, 5)
    });

  } catch (err) {
    return res.status(500).json({
      error: "AI overview failed.",
      details: err.message || String(err)
    });
  }
}


/* ------------------------------------
   SCRAPER: DuckDuckGo SERP (reliable)
------------------------------------- */
async function scrapeDuckDuckGo(keyword) {
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`;

    const html = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }).then((r) => r.text());

    const $ = cheerio.load(html);

    const results = [];

    $("a.result__a").each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      const snippet = $(el).parent().find(".result__snippet").text().trim();

      if (title && snippet) {
        results.push({ title, snippet, link });
      }
    });

    return results;
  } catch {
    return [];
  }
}


/* ------------------------------------
   SCRAPER: Bing SERP (fallback)
------------------------------------- */
async function scrapeBing(keyword) {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}`;

    const html = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }).then((r) => r.text());

    const $ = cheerio.load(html);

    const results = [];

    $("li.b_algo").each((i, el) => {
      const title = $(el).find("h2").text().trim();
      const snippet = $(el).find("p").text().trim();
      const link = $(el).find("a").attr("href");

      if (title && snippet) {
        results.push({ title, snippet, link });
      }
    });

    return results;
  } catch {
    return [];
  }
}


/* ------------------------------------
   WIKIPEDIA fallback
------------------------------------- */
async function fetchWikipedia(keyword) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      keyword
    )}`;

    const r = await fetch(url);
    if (!r.ok) return {};

    const json = await r.json();
    return json;
  } catch {
    return {};
  }
}


/* ------------------------------------
   AI SUMMARY ENGINE (local)
------------------------------------- */
function buildAISummary(keyword, results) {
  const combined = results.map((r) => r.snippet).join(" ");

  const shortSummary = combined.slice(0, 800);

  return {
    summary: `AI Overview for '${keyword}': ${shortSummary}`,
    bulletPoints: generateBullets(results),
    whatToKnow: extractHighlights(results),
  };
}

function generateBullets(results) {
  return results.slice(0, 3).map((r) => r.title);
}

function extractHighlights(results) {
  return results.slice(0, 5).map((r) => ({
    title: r.title,
    note: r.snippet,
  }));
}