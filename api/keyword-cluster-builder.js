// api/keyword-cluster-builder.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  const { keywords } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: "'keywords' must be a non-empty array." });
  }

  // STEP 1: Normalize keywords
  const normalized = keywords.map(k =>
    k.toLowerCase().trim().replace(/\s+/g, " ")
  );

  // STEP 2: Create keyword embeddings (simple statistical vector)
  function embed(keyword) {
    const vector = {};
    keyword.split(" ").forEach(word => {
      vector[word] = (vector[word] || 0) + 1;
    });
    return vector;
  }

  function cosineSimilarity(vec1, vec2) {
    const allWords = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    let dot = 0, mag1 = 0, mag2 = 0;

    for (const w of allWords) {
      const a = vec1[w] || 0;
      const b = vec2[w] || 0;
      dot += a * b;
      mag1 += a * a;
      mag2 += b * b;
    }

    if (mag1 === 0 || mag2 === 0) return 0;
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  // STEP 3: Convert keywords into vectors
  const vectors = normalized.map(embed);

  // STEP 4: Group keywords into clusters based on similarity
  const threshold = 0.35; // tune if needed
  const clusters = [];
  const used = new Set();

  for (let i = 0; i < keywords.length; i++) {
    if (used.has(i)) continue;

    const cluster = [keywords[i]];
    used.add(i);

    for (let j = i + 1; j < keywords.length; j++) {
      if (used.has(j)) continue;

      const sim = cosineSimilarity(vectors[i], vectors[j]);

      if (sim >= threshold) {
        cluster.push(keywords[j]);
        used.add(j);
      }
    }

    clusters.push(cluster);
  }

  // STEP 5: Search Intent Detection
  function detectIntent(keyword) {
    keyword = keyword.toLowerCase();

    if (keyword.includes("buy") || keyword.includes("price") || keyword.includes("discount"))
      return "Transactional";

    if (keyword.includes("best") || keyword.includes("top") || keyword.includes("review"))
      return "Commercial";

    if (keyword.includes("how to") || keyword.includes("guide") || keyword.includes("meaning"))
      return "Informational";

    if (keyword.includes("near me") || keyword.includes("official"))
      return "Navigational";

    return "Informational"; // default
  }

  const clustersWithIntent = clusters.map(group => ({
    intent: detectIntent(group[0]),
    keywords: group
  }));

  return res.status(200).json({
    success: true,
    totalKeywords: keywords.length,
    totalClusters: clusters.length,
    clusters: clustersWithIntent,
    unclustered: keywords.filter((k, i) => !used.has(i))
  });
}