// Import tools
import axios from "axios";

// Main handler function — this runs when your GPT calls the endpoint
export default async function handler(req, res) {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: "Please provide a keyword." });
  }

  try {
    // Fetch live data from SerpApi (you'll add your API key next)
    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        q: keyword,
        api_key: process.env.SERP_API_KEY, // stored securely in .env
        engine: "google",
        num: 10, // number of results
      },
    });

    // Format data
    const results = response.data.organic_results.map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    }));

    // Send response
    res.status(200).json({
      keyword,
      total_results: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching SERP data:", error.message);
    res.status(500).json({
      error: "Failed to fetch data from SerpApi. Check your API key or connection.",
    });
  }
}
