export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { provider, operation, params } = req.body;

    if (!provider || !operation) {
      return res.status(400).json({
        error: "provider and operation are required"
      });
    }

    // TEMP: mock responses (no real APIs yet)
    if (provider === "gsc") {
      return res.json({
        provider: "gsc",
        operation,
        message: "Google Search Console connected",
        params
      });
    }

    if (provider === "ga4") {
      return res.json({
        provider: "ga4",
        operation,
        message: "Google Analytics 4 connected",
        params
      });
    }

    if (provider === "semrush") {
      return res.json({
        provider: "semrush",
        operation,
        message: "Semrush connected",
        params
      });
    }

    if (provider === "ahrefs") {
      return res.json({
        provider: "ahrefs",
        operation,
        message: "Ahrefs connected",
        params
      });
    }

    if (provider === "ubersuggest") {
      return res.json({
        provider: "ubersuggest",
        operation,
        message: "Ubersuggest connected",
        params
      });
    }

    return res.status(400).json({
      error: "Unknown provider"
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
}