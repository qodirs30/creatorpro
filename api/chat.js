const fetch = globalThis.fetch;

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      // ignore
    }
  }
  const { prompt, model = 'gemini-1.5-flash-latest', contents } = body || {};
  if (!prompt && !contents) {
    return res.status(400).json({ message: 'Prompt or contents is required' });
  }

  // Ambil semua API keys yang tersedia di Environment Variables
  const keys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_API_KEY
  ].map(k => k?.trim()).filter(Boolean);

  if (keys.length === 0) {
    return res.status(500).json({ message: 'Server proxy keys are not configured in environment variables.' });
  }

  // Mulai dengan indeks acak untuk load balancing
  let startIndex = Math.floor(Math.random() * keys.length);
  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    const activeKey = keys[(startIndex + i) % keys.length];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;

    const payload = {
      contents: contents || [{
        parts: [{ text: prompt }]
      }]
    };

    try {
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Jika gagal dan modelnya 2.5/2.0, coba fallback ke gemini-1.5-flash
      if (!response.ok && (model.includes('2.5') || model.includes('2.0') || model.includes('gemini-2.'))) {
        const fallbackModel = 'gemini-1.5-flash';
        const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${activeKey}`;
        console.warn(`Model ${model} failed on Vercel proxy, attempting fallback to ${fallbackModel}...`);
        
        response = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return res.status(200).json({ text });
    } catch (err) {
      console.warn(`Proxy key index ${(startIndex + i) % keys.length} failed:`, err.message);
      lastError = err;
    }
  }

  return res.status(502).json({ message: 'All proxy keys failed to process the request.', error: lastError?.message });
}
