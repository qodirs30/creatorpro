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

async function generateGemini(apiKey, prompt, model) {
  try {
    return await generateGeminiSingle(apiKey, prompt, model);
  } catch (err) {
    if (model === 'gemini-2.5-flash') {
      console.warn('Gemini 2.5 Flash failed, attempting fallback to Gemini 1.5 Flash:', err.message);
      return await generateGeminiSingle(apiKey, prompt, 'gemini-1.5-flash');
    }
    throw err;
  }
}

async function generateGeminiSingle(apiKey, prompt, model) {
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
  try {
    return await analyzeImageWithGeminiSingleRequest(apiKey, imageDataUrl, prompt, model);
  } catch (err) {
    if (model === 'gemini-2.5-flash') {
      console.warn('Gemini 2.5 Flash failed for image analysis, attempting fallback to Gemini 1.5 Flash:', err.message);
      return await analyzeImageWithGeminiSingleRequest(apiKey, imageDataUrl, prompt, 'gemini-1.5-flash');
    }
    throw err;
  }
}

async function analyzeImageWithGeminiSingleRequest(apiKey, imageDataUrl, prompt, model) {
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
export async function generateCompanionChat(apiKey, companion, chatHistory, cardsContext, userMessage, provider = 'gemini', model = 'gemini-2.5-flash', sukiKnowledge = '') {
  const cardsSummary = cardsContext.length > 0 
    ? cardsContext.map(c => {
        let details;
        if (c.type === 'transaction') details = `Transaksi: Rp ${c.data.amount} (${c.data.category}, ${c.data.type})`;
        else if (c.type === 'task') details = `Tugas: ${c.data.todo} (Tenggat: ${c.data.dueDate || '-'})`;
        else if (c.type === 'quote') details = `Kutipan: "${c.data.quote}" oleh ${c.data.author}`;
        else if (c.type === 'contact') details = `Kontak: ${c.data.name} (${c.data.relationship})`;
        else details = `Catatan: ${c.data.summary}`;
        return `- [${c.type.toUpperCase()}] ${c.title} (${details})`;
      }).join('\n')
    : 'Belum ada kartu aktivitas/jurnal yang dicatat hari ini.';

  const knowledgeSection = sukiKnowledge
    ? `Basis Pengetahuan Tambahan (Katalog Produk & Dokumen Anda):\n${sukiKnowledge}\n\n`
    : '';

  const appKnowledge = `Informasi Aplikasi (Website qodirsAi):
Aplikasi ini adalah qodirsAi (qRSTudio.my.id), sebuah dashboard produktivitas premium all-in-one yang canggih dengan Firebase Cloud Auto-Sync. Fitur-fiturnya meliputi:
- **Beranda (Dashboard)**: Ringkasan harian, kutipan motivasi, tracker kebiasaan, grafik keuangan, tugas mendesak.
- **Card Cloud Journal (Memex Journal)**: Mencatat jurnal/fragmen harian. Bisa melampirkan berkas (PDF, Gambar, TXT) untuk diekstrak otomatis oleh AI menjadi kartu (Tugas, Transaksi Keuangan, Catatan, Kutipan, Kontak). Ada tab "Pengetahuan Suki" untuk mengunggah katalog laptop/toko Anda agar kamu (Suki) mengetahuinya.
- **Pelacak Kebiasaan (Habit Tracker)**: Checklist kebiasaan harian, streaks beruntun, grafik keberhasilan, dan gamifikasi koin/XP.
- **Mega Prompt**: Prompt engineering helper dengan template siap pakai dan variabel dinamis.
- **Click Counter**: Penghitung klik tasbih digital, counter olahraga, stok barang dengan setingan warna, target, getaran haptic, dan multi-counter.
- **Penulis Naskah (Content Scripting)**: Penyusun skrip video YouTube/TikTok/Reels dengan Hook, Storyline, Call to Action, dan estimasi waktu baca.
- **Mega Creator Studio**: Pembuat storyboard video, SEO tags, dan deskripsi naskah.
- **Perencana Konten (Social Planner)**: Kanban board drag-and-drop media sosial (Ide, Draf, Jadwal, Terbit).
- **Jadwal Harian (Daily Planner)**: Agenda kalender time-blocking jam-demi-jam.
- **Vibe Coding Hub (Vibe Generator)**: Generator kode seru, template boilerplate, dan debugging assistant.
- **Pengaturan (Settings)**: Pengunci PIN layar, penyetelan API Key (Gemini, Groq, OpenAI), dan model default.
- **Floating Suki Bubble**: Widget chat melayang global dengan input suara (Speech-to-text) di semua halaman (kecuali Memex).

Sebagai Suki, kamu harus mengenali fitur-fitur ini dan menjelaskannya dengan asyik dan santai (menggunakan gaya bicara gue-lo) jika ditanya oleh pengunjung.`;

  const systemInstructions = `System Prompt Kepribadian:
${companion.customPrompt}

${appKnowledge}

${knowledgeSection}Berikut adalah memori aktivitas/jurnal pengguna hari ini yang kamu ketahui (gunakan ini jika pengguna bertanya tentang apa saja yang sudah dilakukan, uang yang dihabiskan, tugas yang tersisa, dll):
${cardsSummary}

Instruksi Tambahan:
Jawablah pesan pengguna menggunakan gaya kepribadianmu di atas. Tulis jawaban yang singkat (1-3 kalimat) agar terasa natural seperti bertukar pesan instan/chatting. Jangan terlalu formal! Gunakan gaya bahasa kasual.`;

  // Batasi riwayat chat hanya 8 pesan terakhir agar prompt tidak terlalu panjang dan AI merespon lebih cepat
  const recentHistory = chatHistory.slice(-8);

  // Gabungkan instruksi dengan pesan pengguna terbaru
  const fullPrompt = `${systemInstructions}\n\nRiwayat Obrolan:\n${recentHistory.map(h => `${h.role === 'user' ? 'User' : 'Companion'}: ${h.content}`).join('\n')}\nUser: ${userMessage}\nCompanion:`;

  return generateContent(apiKey, fullPrompt, provider, model);
}

/**
 * Menganalisis file multimodal (Gambar / PDF) dan mengekstraknya menjadi kartu Memex (JSON) menggunakan Gemini.
 */
export async function extractMemexCardWithMultimodal(apiKeysString, fileDataUrl, textPrompt, model = 'gemini-2.5-flash') {
  if (!apiKeysString) throw new Error('API Key Gemini belum diatur.');
  const keys = apiKeysString.split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error('API Key tidak valid.');

  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const activeKey = keys[i];
    try {
      return await extractMemexCardWithMultimodalSingle(activeKey, fileDataUrl, textPrompt, model);
    } catch (err) {
      console.warn(`Gagal ekstraksi multimodal dengan API Key indeks ${i} (Gemini):`, err.message);
      lastError = err;
      if (i === keys.length - 1) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  throw lastError || new Error('Gagal mengekstrak berkas.');
}

async function extractMemexCardWithMultimodalSingle(apiKey, fileDataUrl, textPrompt, model) {
  try {
    return await extractMemexCardWithMultimodalSingleRequest(apiKey, fileDataUrl, textPrompt, model);
  } catch (err) {
    if (model === 'gemini-2.5-flash') {
      console.warn('Gemini 2.5 Flash multimodal failed, attempting fallback to Gemini 1.5 Flash:', err.message);
      return await extractMemexCardWithMultimodalSingleRequest(apiKey, fileDataUrl, textPrompt, 'gemini-1.5-flash');
    }
    throw err;
  }
}

async function extractMemexCardWithMultimodalSingleRequest(apiKey, fileDataUrl, textPrompt, model) {
  if (!fileDataUrl || !fileDataUrl.startsWith('data:')) throw new Error('Format berkas tidak valid.');

  const match = fileDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Format data URL berkas tidak valid.');
  const [, mimeType, base64Data] = match;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Kamu adalah sistem ekstraksi AI jurnal Memex. Tugasmu adalah menganalisis dokumen atau gambar yang dilampirkan beserta catatan tambahan dari pengguna berikut:
Catatan Tambahan Pengguna: "${textPrompt || 'Tidak ada catatan tambahan'}"

Harap analisis konten dokumen/gambar tersebut dan lakukan ekstraksi menjadi format JSON kartu jurnal terstruktur.

Ketentuan Ekstraksi:
1. Tentukan jenis kartu ("type") yang paling cocok dari pilihan berikut:
   - "task": Jika berisi tugas, rencana, atau pekerjaan yang perlu diselesaikan.
   - "transaction": Jika berisi pengeluaran uang, pemasukan, belanja, atau transaksi finansial (misal struk belanja, kuitansi).
   - "quote": Jika berisi kutipan kata bijak, lirik lagu, atau kutipan bacaan yang berharga.
   - "contact": Jika berisi informasi tentang nama orang, hubungan, kontak baru, atau pertemuan sosial.
   - "note": Jika berisi catatan harian, ide, info umum, ringkasan isi dokumen, atau memo biasa.
2. Buat "title" berupa judul yang sangat singkat, padat, dan representatif (maksimal 5 kata) yang meringkas isi dokumen/gambar.
3. Buat array "tags" berisi kata kunci penting (1-3 kata kunci, lowercase, tanpa spasi panjang).
4. Buat objek "data" berisi detail spesifik tergantung tipenya:
   - Jika "task": { "todo": "deskripsi tugas", "dueDate": "tanggal tenggat format YYYY-MM-DD (jika ada, jika tidak kosongkan)" }
   - Jika "transaction": { "amount": angka nominal uang (wajib integer angka murni tanpa titik/koma/simbol), "category": "makanan/transportasi/hosting/kopi/lainnya", "type": "expense" atau "income" }
   - Jika "quote": { "quote": "teks kutipan", "author": "nama penulis kutipan (jika ada, jika tidak tulis 'Anonim')" }
   - Jika "contact": { "name": "nama orang", "relationship": "rekan kerja/teman/keluarga/klien", "context": "keterangan pertemuan/catatan" }
   - Jika "note": { "summary": "ringkasan isi atau deskripsi dari dokumen/gambar tersebut dalam 1-2 kalimat" }
5. Buat properti "companionComment". Ini adalah komentar spontan yang ditulis dari perspektif karakter AI Companion bernama Suki. Suki adalah teman dekat yang santai, menggunakan gaya bicara gaul santai/lucu kekinian Indonesia (gue, lo, dll), agak usil/humoris, menyemangati namun bisa bercanda meledek jika isi dokumennya aneh/kocak. Sesuaikan komentar dengan isi berkas tersebut.

Harus mengembalikan output dalam format JSON MURNI yang valid tanpa teks pembuka atau penutup lainnya. Jangan gunakan backticks markdown di luar json. Format JSON yang dikembalikan harus berupa:
{
  "type": "...",
  "title": "...",
  "tags": ["..."],
  "data": { ... },
  "companionComment": "..."
}`;

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
    throw new Error(err.error?.message || 'Gagal mengekstrak berkas dengan Gemini.');
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Gagal parse JSON ekstraksi berkas dari AI:", cleaned, err);
    return {
      type: "note",
      title: "Lampiran Dokumen",
      tags: ["attachment"],
      data: { summary: `Gagal menganalisis detail berkas. Tipe MIME: ${mimeType}` },
      companionComment: "Aduh, dokumen/gambarnya agak buram atau susah dibaca nih sama mata kucing gue. Tapi tenang, udah gue simpen catetannya!"
    };
  }
}

/**
 * Menganalisis berkas dokumen (PDF/TXT/Gambar) dan mengekstrak seluruh isinya menjadi format Markdown catalog detail.
 */
export async function extractDocumentToMarkdown(apiKeysString, fileDataUrl, mimeType, model = 'gemini-2.5-flash') {
  if (!apiKeysString) throw new Error('API Key Gemini belum diatur.');
  const keys = apiKeysString.split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error('API Key tidak valid.');

  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const activeKey = keys[i];
    try {
      return await extractDocumentToMarkdownSingle(activeKey, fileDataUrl, mimeType, model);
    } catch (err) {
      console.warn(`Gagal ekstraksi dokumen dengan API Key indeks ${i} (Gemini):`, err.message);
      lastError = err;
      if (i === keys.length - 1) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  throw lastError || new Error('Gagal mengekstrak dokumen.');
}

async function extractDocumentToMarkdownSingle(apiKey, fileDataUrl, mimeType, model) {
  try {
    return await extractDocumentToMarkdownSingleRequest(apiKey, fileDataUrl, mimeType, model);
  } catch (err) {
    if (model === 'gemini-2.5-flash') {
      console.warn('Gemini 2.5 Flash doc-to-markdown failed, attempting fallback to Gemini 1.5 Flash:', err.message);
      return await extractDocumentToMarkdownSingleRequest(apiKey, fileDataUrl, mimeType, 'gemini-1.5-flash');
    }
    throw err;
  }
}

async function extractDocumentToMarkdownSingleRequest(apiKey, fileDataUrl, mimeType, model) {
  if (!fileDataUrl || !fileDataUrl.startsWith('data:')) throw new Error('Format berkas tidak valid.');

  const match = fileDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Format data URL berkas tidak valid.');
  const [, , base64Data] = match;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Kamu adalah AI Document Parser ahli. Tugasmu adalah membaca dan menganalisis berkas dokumen (PDF/TXT/Gambar) ini secara lengkap, lalu mengekstrak semua data yang ada di dalamnya secara terperinci.
  
  Ubah hasilnya menjadi tulisan format teks biasa yang rapi, terstruktur, lengkap, dan fleksibel sesuai dengan data yang dikirim oleh user. 
  JANGAN gunakan format tabel. JANGAN gunakan tanda bintang (* atau **) untuk menebalkan tulisan, melainkan gunakan teks biasa saja.
  
  Khusus untuk data laptop/pricelist produk, usahakan format outputnya terstruktur kurang lebih seperti contoh berikut (sesuaikan dengan data riil yang ada pada dokumen):
  
  Tipe Model/sku : [Model/SKU] - [Harga]
  Spesifikasi Utama
  Prosesor: [Prosesor]
  Memori (RAM): [RAM]
  Penyimpanan: [Penyimpanan]
  Layar: [Layar]
  Sistem Operasi: [Sistem Operasi]
  Software Bundling: [Software seperti OHS, Microsoft 365, dll.]
  Fitur Tambahan: [Fitur tambahan seperti Backlit Keyboard, dll.]
  Warna: [Warna]
  Garansi Resmi: [Garansi]
  
  Buat formatnya mengalir, fleksibel, mudah dibaca, dan mudah direvisi secara manual. Pertahankan semua informasi teknis, harga, dan nama produk secara lengkap dan akurat. Kembalikan HANYA teks murni tanpa penjelasan pembuka atau penutup lainnya.`;

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
    throw new Error(err.error?.message || 'Gagal memproses ekstraksi berkas dokumen.');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

