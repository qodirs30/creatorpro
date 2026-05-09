export async function generateContent(apiKey, prompt, provider = 'gemini', model = 'gemini-1.5-flash-latest') {
  if (!apiKey) {
    throw new Error('API Key belum diatur. Silakan periksa menu Pengaturan.');
  }

  if (provider === 'gemini') {
    return generateGemini(apiKey, prompt, model);
  } else if (provider === 'groq') {
    return generateGroq(apiKey, prompt, model);
  } else if (provider === 'openai') {
    return generateOpenAI(apiKey, prompt, model);
  } else {
    throw new Error('Penyedia AI tidak valid.');
  }
}

async function generateGemini(apiKey, prompt, model) {
  // Fix the v1beta error by using the correct endpoint structure
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gagal membuat konten dengan Gemini');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function generateGroq(apiKey, prompt, model) {
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  
  const payload = {
    model: model,
    messages: [
      { role: 'user', content: prompt }
    ]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gagal membuat konten dengan Groq');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateOpenAI(apiKey, prompt, model) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  
  const payload = {
    model: model,
    messages: [
      { role: 'user', content: prompt }
    ]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gagal membuat konten dengan OpenAI');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}


/**
 * Analyze an image using Gemini Vision.
 * @param {string} apiKey - Gemini API key
 * @param {string} imageDataUrl - Data URL (data:image/...;base64,...)
 * @param {string} prompt - Text instruction for how to analyze
 * @param {string} model - e.g. 'gemini-2.5-flash'
 */
export async function analyzeImageWithGemini(apiKey, imageDataUrl, prompt, model = 'gemini-2.5-flash') {
  if (!apiKey) throw new Error('API Key Gemini belum diatur.');
  if (!imageDataUrl || !imageDataUrl.startsWith('data:')) throw new Error('Format gambar tidak valid.');

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Format data URL gambar tidak valid.');
  const [, mimeType, base64Data] = match;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64Data } },
        { text: prompt }
      ]
    }]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal menganalisa gambar dengan Gemini.');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
