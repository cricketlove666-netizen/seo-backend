// api/internal-link-mapper.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method." });
  }

  const { pages } = req.body;

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: "'pages' must be a non-empty array." });
  }

  // Normalize topics
  function clean(text) {
    return text.toLowerCase().trim().replace(/\s+/g, " ");
  }

  const cleanedPages = pages.map(p => ({
    ...p,
    topic: clean(p.topic)
  }));

  // Convert topic → word frequency vector
  function vectorize(text) {
    const freq = {};
    clean(text)
      .split(" ")
      .forEach(w => {
        freq[w] = (freq[w] || 0) + 1;
      });
    return freq;
  }

  // Cosine similarity
  function cosine(a, b) {
    const words = new Set([...Object.keys(a), ...Object.keys(b)]);
    let dot = 0,
      magA = 0,
      magB = 0;

    for (const w of words) {
      const x = a[w] || 0;
      const y = b[w] || 0;
      dot += x * y;
      magA += x * x;
      magB += y * y;
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  // Precompute vectors
  const vectors = cleanedPages.map(p => vectorize(p.topic));

  // Build link suggestions
  const suggestions = [];

  for (let i = 0; i < cleanedPages.length; i++) {
    for (let j = 0; j < cleanedPages.length; j++) {
      if (i === j) continue; // avoid self-linking

      const sim = cosine(vectors[i], vectors[j]);

      // Only recommend links above a similarity threshold
      if (sim >= 0.25) {
        suggestions.push({
          from: cleanedPages[i].url,
          to: cleanedPages[j].url,
          similarity: Number(sim.toFixed(3)),
          anchorText: generateAnchorText(cleanedPages[j].topic)
        });
      }
    }
  }

  // Generate anchor text from topic
  function generateAnchorText(topic) {
    const words = topic.split(" ");
    if (words.length <= 2) return topic; // short topic
    return topic; // keeps main keyword as anchor
  }

  // Group suggestions by source page
  const grouped = {};

  suggestions.forEach(s => {
    if (!grouped[s.from]) grouped[s.from] = [];
    grouped[s.from].push({
      to: s.to,
      anchorText: s.anchorText,
      similarity: s.similarity
    });
  });

  return res.status(200).json({
    success: true,
    totalPages: pages.length,
    internalLinks: grouped
  });
}