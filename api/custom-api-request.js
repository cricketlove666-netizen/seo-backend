export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST method." });
    }

    const {
      endpoint,
      method = "GET",
      headers = {},
      body
    } = req.body;

    if (!endpoint || !method) {
      return res.status(400).json({
        error: "'endpoint' and 'method' are required."
      });
    }

    const fetchOptions = {
      method,
      headers
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
      fetchOptions.headers["Content-Type"] = "application/json";
    }

    const response = await fetch(endpoint, fetchOptions);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return res.status(200).json({
      success: true,
      status: response.status,
      url: endpoint,
      data
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
}