import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { urls } = req.body;

  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: "Invalid request. 'urls' must be an array." });
  }

  async function extractData(url) {
    try {
      const html = await fetch(url).then(r => r.text());
      const $ = cheerio.load(html);

      // Extract headings
      const h1 = $("h1").map((i, el) => $(el).text().trim()).get();
      const h2 = $("h2").map((i, el) => $(el).text().trim()).get();
      const h3 = $("h3").map((i, el) => $(el).text().trim()).get();

      const metaDesc = $('meta[name="description"]').attr("content") || "";

      // Simple NLP entity extractor (keywords based on splitting text)
      const text = $("body").text().replace(/\s+/g, " ");
      const words = text
        .split(" ")
        .map(w => w.toLowerCase().replace(/[^a-z0-9]/gi, ""))
        .filter(w => w.length > 5);

      const frequency = {};
      words.forEach(w => {
        if (!frequency[w]) frequency[w] = 0;
        frequency[w]++;
      });

      const entities = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20) // top 20 entities
        .map(([word]) => word);

      return {
        url,
        title: $("title").text(),
        metaDesc,
        headings: {
          h1,
          h2,
          h3
        },
        entities
      };
    } catch (e) {
      return { url, error: "Failed to scrape." };
    }
  }

  // Scrape each URL
  const competitorData = [];
  for (const url of urls) {
    const result = await extractData(url);
    competitorData.push(result);
  }

  // GAP FINDING → compare all headings across competitors
  const allHeadings = competitorData.flatMap(site => [
    ...site.headings.h2,
    ...site.headings.h3
  ]);

  const headingFrequency = {};
  allHeadings.forEach(h => {
    headingFrequency[h] = (headingFrequency[h] || 0) + 1;
  });

  const topicGaps = Object.entries(headingFrequency)
    .filter(([_, count]) => count === 1) // only appears on one site → a content gap
    .map(([heading]) => heading);

  return res.status(200).json({
    success: true,
    competitors: competitorData,
    topicGaps,
    note: "Topic gaps show headings competitors cover but others do not."
  });
}
