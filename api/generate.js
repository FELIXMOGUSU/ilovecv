// api/generate.js
// Vercel serverless function. Receives a prompt from the frontend,
// calls Google's Gemini API server-side (so the API key never reaches
// the browser), and returns the generated text.
//
// Required environment variable on Vercel: GEMINI_API_KEY

export default async function handler(req, res) {
  // Allow requests from the browser (same-origin in production; open for local testing)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it in Vercel project settings.' });
  }

  const { prompt, isJson } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Request body must include a "prompt" string.' });
  }

  // gemini-2.5-flash: fast, strong at structured JSON output, and available
  // on Google AI Studio's free tier. (gemini-1.5-flash is fully retired as of
  // 2026 and returns 404 — do not use it. If 2.5-flash is ever retired in
  // turn, check https://ai.google.dev/gemini-api/docs/deprecations for the
  // current replacement before changing this string.)
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

  const generationConfig = {
    temperature: 0.4,
    maxOutputTokens: 2048
  };

  // When the caller needs structured data (CV parsing, CV tailoring), force
  // Gemini's native JSON mode rather than just asking nicely in the prompt.
  // This is far more reliable than prompt-only instructions, which models
  // (especially smaller/free-tier ones) sometimes ignore by adding stray
  // preamble text or markdown fences around the JSON.
  if (isJson) {
    generationConfig.responseMimeType = 'application/json';
  }

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return res.status(geminiRes.status).json({
        error: `Gemini API request failed (${geminiRes.status})`,
        details: errText.slice(0, 300)
      });
    }

    const data = await geminiRes.json();

    // Gemini's response shape: candidates[0].content.parts[0].text
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      // Check for a safety block or other non-standard response before giving up
      const finishReason = data?.candidates?.[0]?.finishReason;
      console.error('Gemini returned no text. Finish reason:', finishReason, JSON.stringify(data).slice(0, 300));
      return res.status(502).json({
        error: 'Gemini returned an empty response',
        finishReason: finishReason || 'unknown'
      });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error('Proxy error calling Gemini:', err);
    return res.status(502).json({ error: 'Could not reach Gemini API: ' + err.message });
  }
}
