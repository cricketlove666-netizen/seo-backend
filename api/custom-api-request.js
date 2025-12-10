// api/custom-api-request.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  try {
    const { endpoint, method, params, body, headers } = req.body;

    if (!endpoint || !method) {
      return res.status(400).json({
        error: "'endpoint' and 'method' are required."
      });
    }

    // Build full URL with query params
    let url = endpoint;

    if (params && typeof params === "object") {
      const queryString = new URLSearchParams(params).toString();
      url += "?" + queryString;
    }

    // Default headers
    let finalHeaders = {
      "Content-Type": "application/json",
      ...(headers || {})
    };

    // Example: attach AUTH tokens automatically (optional)
    if (process.env.GSC_API_KEY) {
      finalHeaders["Authorization"] = `Bearer ${process.env.GSC_API_KEY}`;
    }

    // Make request to target API
    const requestOptions = {
      method: method.toUpperCase(),
      headers: finalHeaders
    };

    if (["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      requestOptions.body = JSON.stringify(body || {});
    }

    const response = await fetch(url, requestOptions);

    const data = await response
      .json()
      .catch(() => ({ raw: "Could not parse JSON", status: response.status }));

    return res.status(200).json({
      success: true,
      status: response.status,
      url,
      data
    });

  } catch (err) {
    return res.status(500).json({
      error: "Failed to call external API.",
      details: err.message
    });
  }
}