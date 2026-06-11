export async function generateContent(apiKeysString, prompt, provider = 'gemini', model = 'gemini-1.5-flash-latest') {
  if (!apiKeysString) {
    throw new Error('API Key belum diatur. Silakan periksa menu Pengaturan.');
  }

  // Pisahkan keys berdasarkan spasi, baris baru, atau koma
  const keys = apiKeysString.split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error('API Key tidak valid.');
  }

  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const activeKey = keys[i];
    try {
      if (provider === 'gemini') {
        return await generateGemini(activeKey, prompt, model);
      } else if (provider === 'groq') {
        return await generateGroq(activeKey, prompt, model);
      } else if (provider === 'openai') {
        return await generateOpenAI(activeKey, prompt, model);
      } else {
        throw new Error('Penyedia AI tidak valid.');
      }
    } catch (err) {
      console.warn(`Gagal memproses dengan API Key indeks ${i} (${provider}):`, err.message);
      lastError = err;
      // Jika ini adalah key terakhir, lemparkan error-nya ke luar
      if (i === keys.length - 1) {
        throw err;
      }
      // Jika kuota habis atau rate limit, beri delay kecil sebelum lanjut ke key berikutnya
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  throw lastError || new Error('Gagal memproses permintaan AI.');
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 4000 } = options; // Default 4 seconds timeout
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Timeout: Permintaan ke server AI melebihi batas waktu 4 detik (koneksi sedang sibuk).');
    }
    throw error;
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

  const response = await fetchWithTimeout(endpoint, {
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

  const response = await fetchWithTimeout(endpoint, {
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

  const response = await fetchWithTimeout(endpoint, {
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
 * Analyze an image using Gemini Vision (supports multiple keys with failover).
 * @param {string} apiKeysString - Gemini API key(s)
 * @param {string} imageDataUrl - Data URL
 * @param {string} prompt - Prompt instruction
 * @param {string} model - Gemini model
 */
export async function analyzeImageWithGemini(apiKeysString, imageDataUrl, prompt, model = 'gemini-2.5-flash') {
  if (!apiKeysString) throw new Error('API Key Gemini belum diatur.');
  const keys = apiKeysString.split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error('API Key tidak valid.');

  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const activeKey = keys[i];
    try {
      return await analyzeImageWithGeminiSingle(activeKey, imageDataUrl, prompt, model);
    } catch (err) {
      console.warn(`Gagal menganalisa gambar dengan API Key indeks ${i} (Gemini):`, err.message);
      lastError = err;
      if (i === keys.length - 1) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  throw lastError || new Error('Gagal menganalisa gambar dengan Gemini.');
}

async function analyzeImageWithGeminiSingle(apiKey, imageDataUrl, prompt, model) {
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

  const response = await fetchWithTimeout(endpoint, {
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

/**
 * Menganalisis teks acak pengguna dan menstrukturkannya menjadi kartu Memex (JSON).
 */
export async function extractMemexCard(apiKey, text, provider = 'gemini', model = 'gemini-2.5-flash') {
  const prompt = `Kamu adalah sistem ekstraksi AI jurnal Memex. Tugasmu adalah menganalisis teks singkat yang diinput oleh pengguna dan mengekstraknya ke dalam format JSON terstruktur untuk dijadikan kartu (timeline card).

Teks Pengguna: "${text}"

Ketentuan Ekstraksi:
1. Tentukan jenis kartu ("type") yang paling cocok dari pilihan berikut:
   - "task": Jika berisi tugas, rencana, atau pekerjaan yang perlu diselesaikan.
   - "transaction": Jika berisi pengeluaran uang, pemasukan, belanja, atau transaksi finansial.
   - "quote": Jika berisi kutipan kata bijak, lirik lagu, atau kutipan bacaan yang berharga.
   - "contact": Jika berisi informasi tentang nama orang, hubungan, kontak baru, atau pertemuan sosial.
   - "note": Jika berisi catatan harian acak, ide, refleksi diri, info umum, atau snippet informasi lainnya.
2. Buat "title" berupa judul yang sangat singkat, padat, dan representatif (maksimal 5 kata).
3. Buat array "tags" berisi kata kunci penting (1-3 kata kunci, lowercase, tanpa spasi panjang).
4. Buat objek "data" berisi detail spesifik tergantung tipenya:
   - Jika "task": { "todo": "deskripsi tugas", "dueDate": "tanggal tenggat format YYYY-MM-DD (jika ada, jika tidak kosongkan)" }
   - Jika "transaction": { "amount": angka nominal uang (wajib integer angka murni tanpa titik/koma/simbol), "category": "makanan/transportasi/hosting/kopi/lainnya", "type": "expense" atau "income" }
   - Jika "quote": { "quote": "teks kutipan", "author": "nama penulis kutipan (jika ada, jika tidak tulis 'Anonim')" }
   - Jika "contact": { "name": "nama orang", "relationship": "rekan kerja/teman/keluarga/klien", "context": "keterangan pertemuan/catatan" }
   - Jika "note": { "summary": "ringkasan isi catatan dalam 1-2 kalimat" }
5. Buat properti "companionComment". Ini adalah komentar spontan yang ditulis dari perspektif karakter AI Companion bernama Suki. Suki adalah teman dekat yang santai, menggunakan gaya bicara gaul santai/lucu kekinian Indonesia (gue, lo, dll), agak usil/humoris, menyemangati namun bisa bercanda meledek jika kegiatannya aneh/berlebihan. Sesuaikan komentar dengan isi teks pengguna.

Harus mengembalikan output dalam format JSON MURNI yang valid tanpa teks pembuka atau penutup lainnya. Jangan gunakan backticks markdown di luar json. Format JSON yang dikembalikan harus berupa:
{
  "type": "...",
  "title": "...",
  "tags": ["..."],
  "data": { ... },
  "companionComment": "..."
}`;

  const responseText = await generateContent(apiKey, prompt, provider, model);
  
  // Bersihkan respons dari format markdown ```json ... ``` jika ada
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Gagal parse JSON dari AI:", cleaned, err);
    // Fallback jika AI gagal mengembalikan JSON valid
    return {
      type: "note",
      title: "Catatan Cepat",
      tags: ["quick"],
      data: { summary: text },
      companionComment: "Hmm, gue gak ngerti lo ngomong apaan barusan, tapi udah gue catet ya!"
    };
  }
}

/**
 * Menghasilkan balasan chat dari AI Companion berdasarkan riwayat chat dan memori kartu.
 */
export async function generateCompanionChat(apiKey, companion, chatHistory, cardsContext, userMessage, provider = 'gemini', model = 'gemini-2.5-flash') {
  const cardsSummary = cardsContext.length > 0 
    ? cardsContext.map(c => {
        let details = '';
        if (c.type === 'transaction') details = `Transaksi: Rp ${c.data.amount} (${c.data.category}, ${c.data.type})`;
        else if (c.type === 'task') details = `Tugas: ${c.data.todo} (Tenggat: ${c.data.dueDate || '-'})`;
        else if (c.type === 'quote') details = `Kutipan: "${c.data.quote}" oleh ${c.data.author}`;
        else if (c.type === 'contact') details = `Kontak: ${c.data.name} (${c.data.relationship})`;
        else details = `Catatan: ${c.data.summary}`;
        return `- [${c.type.toUpperCase()}] ${c.title} (${details})`;
      }).join('\n')
    : 'Belum ada kartu aktivitas/jurnal yang dicatat hari ini.';

  const systemInstructions = `System Prompt Kepribadian:
${companion.customPrompt}

Berikut adalah memori aktivitas/jurnal pengguna hari ini yang kamu ketahui (gunakan ini jika pengguna bertanya tentang apa saja yang sudah dilakukan, uang yang dihabiskan, tugas yang tersisa, dll):
${cardsSummary}

Instruksi Tambahan:
Jawablah pesan pengguna menggunakan gaya kepribadianmu di atas. Tulis jawaban yang singkat (1-3 kalimat) agar terasa natural seperti bertukar pesan instan/chatting. Jangan terlalu formal! Gunakan gaya bahasa kasual.`;

  // Batasi riwayat chat hanya 8 pesan terakhir agar prompt tidak terlalu panjang dan AI merespon lebih cepat
  const recentHistory = chatHistory.slice(-8);

  // Gabungkan instruksi dengan pesan pengguna terbaru
  const fullPrompt = `${systemInstructions}\n\nRiwayat Obrolan:\n${recentHistory.map(h => `${h.role === 'user' ? 'User' : 'Companion'}: ${h.content}`).join('\n')}\nUser: ${userMessage}\nCompanion:`;

  return generateContent(apiKey, fullPrompt, provider, model);
}
