const fetch = globalThis.fetch;

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid JSON body' })
    };
  }

  const { prompt, model = 'gemini-1.5-flash-latest' } = body;
  if (!prompt) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Prompt is required' })
    };
  }

  // Ambil semua API keys yang tersedia di Environment Variables
  const keys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_API_KEY
  ].map(k => k?.trim()).filter(Boolean);

  if (keys.length === 0) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server proxy keys are not configured in Netlify environment variables.' })
    };
  }

  // Mulai dengan indeks acak untuk load balancing
  let startIndex = Math.floor(Math.random() * keys.length);
  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    const activeKey = keys[(startIndex + i) % keys.length];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ text })
      };
    } catch (err) {
      console.warn(`Proxy key index ${(startIndex + i) % keys.length} failed:`, err.message);
      lastError = err;
      // Lanjut ke key berikutnya
    }
  }

  return {
    statusCode: 502,
    headers,
    body: JSON.stringify({ message: 'All proxy keys failed to process the request.', error: lastError?.message })
  };
};
