export async function generateContent(apiKeysString, prompt, provider = 'gemini', model = 'gemini-1.5-flash-latest') {
  if (provider === 'qodirsai') {
    return await generateQodirsAi(prompt, model);
  }

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

async function generateQodirsAi(prompt, model) {
  const response = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt, model })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Gagal memproses dengan qodirsAi Server Proxy.');
  }

  const data = await response.json();
  return data.text;
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
1. Tentukan jenis kartu ("type") yang paling cocok dari pilihan berikut atau buat kategori kustom baru:
   - Kategori Default:
     - "task": Jika berisi tugas, rencana, atau pekerjaan yang perlu diselesaikan.
     - "transaction": Jika berisi pengeluaran uang, pemasukan, belanja, atau transaksi finansial.
     - "quote": Jika berisi kutipan kata bijak, lirik lagu, atau kutipan bacaan yang berharga.
     - "contact": Jika berisi informasi tentang nama orang, hubungan, kontak baru, atau pertemuan sosial.
     - "note": Jika berisi catatan harian acak, info umum, atau memo biasa.
   - Kategori Kustom: Jika informasi tidak cocok dengan kategori default (misalnya ide baru, resep masakan, kesehatan/wellness, wishlist belanjaan, mimpi, log hobi, dll), buatlah kategori baru dalam 1 kata lowercase (contoh: "ide", "resep", "kesehatan", "wishlist", "hobi", "mimpi").
2. Buat "title" berupa judul yang sangat singkat, padat, dan representatif (maksimal 5 kata).
3. Buat array "tags" berisi kata kunci penting (1-3 kata kunci, lowercase, tanpa spasi panjang).
4. Buat objek "data" berisi detail spesifik tergantung tipenya:
   - Jika "task": { "todo": "deskripsi tugas", "dueDate": "tanggal tenggat format YYYY-MM-DD (jika ada, jika tidak kosongkan)" }
   - Jika "transaction": { "amount": angka nominal uang (wajib integer angka murni tanpa titik/koma/simbol. GUNA ATURAN RIBUAN: Jika pengguna menginput nominal angka singkat/kecil tanpa ribuan, contoh: "15", "50", "150", konversikan otomatis ke ribuan dengan mengalikan 1000 sehingga menjadi 15000, 50000, 150000. Kecuali jika nominal sudah ditulis lengkap seperti 15000), "category": "makanan/transportasi/hosting/kopi/lainnya", "type": "expense" atau "income" }
   - Jika "quote": { "quote": "teks kutipan", "author": "nama penulis kutipan (jika ada, jika tidak tulis 'Anonim')" }
   - Jika "contact": { "name": "nama orang", "relationship": "rekan kerja/teman/keluarga/klien", "context": "keterangan pertemuan/catatan" }
   - Jika "note" atau kategori kustom lainnya: { "summary": "ringkasan isi catatan/informasi dalam 1-2 kalimat" }
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
export async function generateCompanionChat(apiKey, companion, chatHistory, cardsContext, userMessage, provider = 'gemini', model = 'gemini-2.5-flash', sukiKnowledge = '', habitsContext = [], activityLogContext = []) {
  // ─── Helper: Format rupiah compact ───────────────────────────────────────
  const fmtRp = (n) => {
    if (!n) return 'Rp 0';
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return `Rp ${n}`;
  };

  // ─── Helper: Format kartu detail ─────────────────────────────────────────
  const fmtCard = (c) => {
    const d = c.createdAt
      ? new Date(c.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '?';
    let detail;
    if (c.type === 'transaction') {
      const sign = c.data?.type === 'income' ? '+' : '-';
      detail = `${sign}${fmtRp(c.data?.amount)} | ${c.data?.category || '-'} | ${c.data?.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}`;
    } else if (c.type === 'task') detail = `Tugas: ${c.data?.todo || '-'} (Tenggat: ${c.data?.dueDate || '-'})`;
    else if (c.type === 'quote') detail = `"${c.data?.quote || '-'}" — ${c.data?.author || 'Anonim'}`;
    else if (c.type === 'contact') detail = `${c.data?.name || '-'} (${c.data?.relationship || '-'})`;
    else detail = c.data?.summary || '-';
    return `  • [ID: ${c.id}] [Tanggal: ${d}] [Kategori: ${(c.type || 'note').toUpperCase()}] ${c.title} → ${detail}`;
  };

  // ─── Layer 1: Monthly Summary Table (selalu diinject, sangat compact) ────
  const buildMonthlySummary = (cards) => {
    if (!cards || cards.length === 0) return 'Database kosong, belum ada catatan.';
    const byMonth = {};
    cards.forEach(c => {
      const dt = new Date(c.createdAt || 0);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      if (!byMonth[key]) byMonth[key] = { label, income: 0, expense: 0, txCount: 0, otherCount: 0 };
      if (c.type === 'transaction') {
        byMonth[key].txCount++;
        if (c.data?.type === 'income') byMonth[key].income += (c.data?.amount || 0);
        else byMonth[key].expense += (c.data?.amount || 0);
      } else {
        byMonth[key].otherCount++;
      }
    });
    const months = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));
    const lines = months.map(([, m]) => {
      const saldo = m.income - m.expense;
      const saldoStr = saldo >= 0 ? `+${fmtRp(saldo)}` : `-${fmtRp(Math.abs(saldo))}`;
      return `  ${m.label}: Masuk ${fmtRp(m.income)} | Keluar ${fmtRp(m.expense)} | Saldo ${saldoStr} | ${m.txCount} transaksi${m.otherCount > 0 ? ` + ${m.otherCount} catatan lain` : ''}`;
    });
    return lines.join('\n');
  };

  // ─── Layer 2: Smart Detail Inject — deteksi periode dari pesan user ───────
  const buildDetailContext = (cards, message) => {
    if (!cards || cards.length === 0) return '';
    const msg = (message || '').toLowerCase();
    const now = new Date();

    // Daftar nama bulan Indonesia
    const bulanMap = {
      'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
      'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };

    let filtered = null;
    let periodLabel = '';

    // Cek keyword periode
    if (/hari ini|today/.test(msg)) {
      const today = now.toDateString();
      filtered = cards.filter(c => new Date(c.createdAt || 0).toDateString() === today);
      periodLabel = 'Hari Ini';
    } else if (/kemarin|yesterday/.test(msg)) {
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      const yStr = yesterday.toDateString();
      filtered = cards.filter(c => new Date(c.createdAt || 0).toDateString() === yStr);
      periodLabel = 'Kemarin';
    } else if (/minggu ini|pekan ini/.test(msg)) {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      filtered = cards.filter(c => new Date(c.createdAt || 0) >= weekAgo);
      periodLabel = '7 Hari Terakhir';
    } else if (/minggu lalu/.test(msg)) {
      const start = new Date(now); start.setDate(now.getDate() - 14);
      const end = new Date(now); end.setDate(now.getDate() - 7);
      filtered = cards.filter(c => { const d = new Date(c.createdAt || 0); return d >= start && d < end; });
      periodLabel = 'Minggu Lalu';
    } else if (/bulan ini|this month/.test(msg)) {
      filtered = cards.filter(c => {
        const d = new Date(c.createdAt || 0);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      periodLabel = `Bulan Ini (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`;
    } else if (/bulan lalu|last month/.test(msg)) {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      filtered = cards.filter(c => {
        const d = new Date(c.createdAt || 0);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });
      periodLabel = 'Bulan Lalu';
    } else if (/tahun ini|this year/.test(msg)) {
      filtered = cards.filter(c => new Date(c.createdAt || 0).getFullYear() === now.getFullYear());
      periodLabel = `Tahun ${now.getFullYear()}`;
    } else if (/tahun lalu|last year/.test(msg)) {
      filtered = cards.filter(c => new Date(c.createdAt || 0).getFullYear() === now.getFullYear() - 1);
      periodLabel = `Tahun ${now.getFullYear() - 1}`;
    } else {
      // Cek nama bulan spesifik
      for (const [bulan, idx] of Object.entries(bulanMap)) {
        if (msg.includes(bulan)) {
          // Cek juga tahun jika disebut
          const yearMatch = msg.match(/20\d{2}/);
          const year = yearMatch ? parseInt(yearMatch[0]) : now.getFullYear();
          filtered = cards.filter(c => {
            const d = new Date(c.createdAt || 0);
            return d.getMonth() === idx && d.getFullYear() === year;
          });
          periodLabel = `${bulan.charAt(0).toUpperCase() + bulan.slice(1)} ${year}`;
          break;
        }
      }
    }

    // Kalau keyword "semua" / "total" / "neraca" / "laporan" tanpa periode → inject semua (max 200)
    if (!filtered && /neraca|laporan|semua|rekap|rekapitulasi|riwayat|history/.test(msg)) {
      filtered = [...cards].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 200);
      periodLabel = 'Semua Waktu (200 terbaru)';
    }

    if (!filtered || filtered.length === 0) return '';

    // Urutkan terbaru ke terlama
    const sorted = filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Hitung total keuangan untuk periode ini
    const txCards = sorted.filter(c => c.type === 'transaction');
    const totalMasuk = txCards.filter(c => c.data?.type === 'income').reduce((s, c) => s + (c.data?.amount || 0), 0);
    const totalKeluar = txCards.filter(c => c.data?.type !== 'income').reduce((s, c) => s + (c.data?.amount || 0), 0);
    const saldo = totalMasuk - totalKeluar;

    let header = `\n📋 DETAIL LENGKAP — ${periodLabel} (${sorted.length} catatan`;
    if (txCards.length > 0) {
      header += ` | Masuk: ${fmtRp(totalMasuk)} | Keluar: ${fmtRp(totalKeluar)} | Saldo: ${saldo >= 0 ? '+' : ''}${fmtRp(Math.abs(saldo))}`;
    }
    header += '):\n';
    return header + sorted.map(fmtCard).join('\n');
  };

  const monthlySummary = buildMonthlySummary(cardsContext);
  const detailContext = buildDetailContext(cardsContext, userMessage);

  const knowledgeSection = sukiKnowledge
    ? `Basis Pengetahuan Tambahan (Katalog Produk & Dokumen Anda):\n${sukiKnowledge}\n\n`
    : '';

  const appKnowledge = `Informasi Aplikasi (Website qodirsAi):
Aplikasi ini adalah qodirsAi (qodirsganteng.my.id), sebuah dashboard produktivitas premium all-in-one yang canggih dengan Firebase Cloud Auto-Sync. Fitur-fiturnya meliputi:
- **Beranda (Dashboard)**: Ringkasan harian, kutipan motivasi, tracker kebiasaan, grafik keuangan, tugas mendesak.
- **Card Cloud Journal / Neraca**: Mencatat jurnal harian, transaksi keuangan, tugas, catatan, kutipan. Ada tab Neraca 💰 untuk dashboard keuangan lengkap (filter, chart, analitik).
- **Pelacak Kebiasaan**: Checklist harian, streaks, grafik, koin/XP.
- **Floating Suki Bubble**: Widget chat melayang global di semua halaman.

Sebagai Suki, gunakan gaya bicara gue-lo yang santai dan asyik. Kamu adalah asisten keuangan & produktivitas personal pengguna.`;

  const buildHabitsContext = (habits) => {
    if (!habits || habits.length === 0) return '  • Tidak ada pelacak kebiasaan yang aktif.';
    return habits.map(h => `  • [${h.completedToday ? '✅ SELESAI' : '❌ BELUM'}] ${h.title} (Streak: ${h.streak || 0} hari${h.isMandatory ? ', Wajib' : ''})`).join('\n');
  };

  const buildActivityLogContext = (logs) => {
    if (!logs || logs.length === 0) return '  • Belum ada catatan aktivitas hari ini.';
    // Ambil 15 aktivitas terbaru
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 15);
    return sortedLogs.map(l => {
      const time = l.date ? new Date(l.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      return `  • [${time}] [${l.type === 'habit' ? 'Kebiasaan' : 'Tugas'}] ${l.title} diselesaikan`;
    }).join('\n');
  };

  const localTimeStr = new Date().toLocaleString('id-ID', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const habitsContextStr = buildHabitsContext(habitsContext);
  const activityLogContextStr = buildActivityLogContext(activityLogContext);

  const systemInstructions = `${companion.customPrompt}

${appKnowledge}

WAKTU & TANGGAL SAAT INI (Local Time Pengguna):
${localTimeStr}

${knowledgeSection}
━━━ DATABASE MEMORI KAMU ━━━
Total kartu tersimpan: ${cardsContext.length}

📊 RINGKASAN BULANAN (semua waktu):
${monthlySummary}
${detailContext}

🏃 STATUS KEBIASAAN HARI INI:
${habitsContextStr}

⚡ LOG AKTIVITAS TERBARU HARI INI:
${activityLogContextStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Instruksi:
- Jawab dengan gaya kasual gue-lo, singkat 1-4 kalimat kecuali diminta laporan/neraca lengkap.
- Kalau diminta neraca/laporan, tampilkan data detail dari DATABASE DI ATAS secara lengkap dan terstruktur dalam format tabel atau list yang rapi.
- Kamu boleh menghitung total, rata-rata, atau breakdown kategori dari data di atas.
- Jangan pernah bilang "gue tidak tahu" untuk data yang sudah ada di database di atas.


Kemampuan Mencatat (WAJIB):
Jika dalam pesan pengguna terdeteksi permintaan atau pernyataan berniat mencatat sesuatu (seperti mencatat pengeluaran/pemasukan uang, tugas baru, jadwal, kutipan, kontak orang baru, ide cemerlang, resep masakan, log kesehatan, wishlist, mimpi, dll), maka selain membalas chat secara kasual, kamu WAJIB menyertakan blok XML/JSON berikut di paling bawah jawabanmu untuk dimasukkan ke database. Kamu dibebaskan menggunakan tipe default atau membuat kategori kustom baru (dalam 1 kata lowercase, misal "ide", "resep", "wishlist", "hobi", dll). 

Pastikan dalam balasan chat kasualmu, kamu secara eksplisit mengonfirmasi kepada pengguna bahwa catatan tersebut sudah dimasukkan ke kategori terkait (contoh: "Ide lo cemerlang banget, udah gue catat ke kartu ide ya!", atau "Oke, pengeluaran itu udah masuk ke kartu keuangan.").

Jika pengguna meminta mencatat beberapa hal sekaligus, kamu BISA menyertakan beberapa blok <record_card>...</record_card> terpisah (satu blok untuk tiap item):
<record_card>
{
  "type": "task | transaction | quote | contact | note | [kategori_kustom_lainnya_1_kata_lowercase]",
  "title": "Judul singkat kartu representatif (maksimal 5 kata)",
  "tags": ["tag1", "tag2"],
  "data": { 
    // Jika "task": { "todo": "deskripsi tugas", "dueDate": "tanggal YYYY-MM-DD (jika ada)", "dueTime": "waktu HH:MM dalam format 24 jam (jika ada pengingat spesifik, misal 'jam 19:12' -> '19:12')" }
    // Jika "transaction": { "amount": nominal uang murni (integer), "category": "makanan/transportasi/kopi/lainnya", "type": "expense" atau "income" }
    // Jika "quote": { "quote": "teks kutipan", "author": "penulis (default: Anonim)" }
    // Jika "contact": { "name": "nama orang", "relationship": "rekan/teman/keluarga/klien", "context": "catatan pertemuan" }
    // Jika "note" atau kategori kustom lainnya: { "summary": "ringkasan isi atau detail informasi" }
  }
}
</record_card>

Kemampuan Memperbarui/Merevisi Kartu (WAJIB):
Jika pengguna meminta kamu mengubah, merevisi, mengupdate nominal keuangan, mengganti kategori, memperbaiki kesalahan ketik pada judul, atau merubah tanggal dari catatan/kartu yang sudah ada di DATABASE MEMORI di atas, cari ID kartu tersebut pada daftar memori, lalu kamu WAJIB menyertakan blok XML/JSON berikut di paling bawah jawabanmu. 
Konfirmasikan secara kasual bahwa kamu sudah memperbarui catatan tersebut.
<update_card>
{
  "cardId": "id_kartu_yang_ingin_diubah",
  "updates": {
    "title": "Judul baru (opsional)",
    "tags": ["tag1", "tag2"], // opsional
    "createdAt": "ISO_timestamp_baru_jika_mengubah_tanggal_YYYY-MM-DDTHH:mm:ss.sssZ (opsional)",
    "data": {
      // Properti data spesifik yang ingin diupdate, misal:
      // "amount": nominal_baru (integer murni),
      // "category": "kategori_baru",
      // "todo": "deskripsi tugas baru"
    }
  }
}
</update_card>

Kemampuan Menghapus Kartu (WAJIB):
Jika pengguna meminta kamu menghapus, men-delete, menghilangkan, atau melenyapkan suatu catatan/transaksi/tugas tertentu yang salah dari DATABASE MEMORI di atas, cari ID kartu tersebut pada daftar memori, lalu kamu WAJIB menyertakan blok XML/JSON berikut di paling bawah jawabanmu.
Konfirmasikan secara kasual bahwa kamu sudah menghapus catatan tersebut.
<delete_card>
{
  "cardId": "id_kartu_yang_ingin_dihapus"
}
</delete_card>

Jika pengguna tidak berniat mencatat, memperbarui, atau menghapus apa-apa, cukup balas chat biasa tanpa tag XML di atas.`;

  // Bersihkan chatHistory dari pesan user terakhir jika sudah sama dengan userMessage (mencegah double prompt)
  const historyToRender = [...(chatHistory || [])];
  if (
    historyToRender.length > 0 && 
    historyToRender[historyToRender.length - 1].content === userMessage && 
    historyToRender[historyToRender.length - 1].role === 'user'
  ) {
    historyToRender.pop();
  }

  // Batasi riwayat chat hanya 8 pesan terakhir agar prompt tidak terlalu panjang dan AI merespon lebih cepat
  const recentHistory = historyToRender.slice(-8);

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
1. Tentukan jenis kartu ("type") yang paling cocok dari pilihan berikut atau buat kategori kustom baru:
   - Kategori Default:
     - "task": Jika berisi tugas, rencana, atau pekerjaan yang perlu diselesaikan.
     - "transaction": Jika berisi pengeluaran uang, pemasukan, belanja, atau transaksi finansial (misal struk belanja, kuitansi).
     - "quote": Jika berisi kutipan kata bijak, lirik lagu, atau kutipan bacaan yang berharga.
     - "contact": Jika berisi informasi tentang nama orang, hubungan, kontak baru, atau pertemuan sosial.
     - "note": Jika berisi catatan harian, ide, info umum, ringkasan isi dokumen, atau memo biasa.
   - Kategori Kustom: Jika informasi tidak cocok dengan kategori default (misalnya ide baru, resep masakan, kesehatan/wellness, wishlist belanjaan, mimpi, log hobi, dll), buatlah kategori baru dalam 1 kata lowercase (contoh: "ide", "resep", "kesehatan", "wishlist", "hobi", "mimpi").
2. Buat "title" berupa judul yang sangat singkat, padat, dan representatif (maksimal 5 kata) yang meringkas isi dokumen/gambar.
3. Buat array "tags" berisi kata kunci penting (1-3 kata kunci, lowercase, tanpa spasi panjang).
4. Buat objek "data" berisi detail spesifik tergantung tipenya:
   - Jika "task": { "todo": "deskripsi tugas", "dueDate": "tanggal tenggat format YYYY-MM-DD (jika ada, jika tidak kosongkan)" }
   - Jika "transaction": { "amount": angka nominal uang (wajib integer angka murni tanpa titik/koma/simbol. GUNA ATURAN RIBUAN: Jika pengguna menginput nominal angka singkat/kecil tanpa ribuan, contoh: "15", "50", "150", konversikan otomatis ke ribuan dengan mengalikan 1000 sehingga menjadi 15000, 50000, 150000. Kecuali jika nominal sudah ditulis lengkap seperti 15000), "category": "makanan/transportasi/hosting/kopi/lainnya", "type": "expense" atau "income" }
   - Jika "quote": { "quote": "teks kutipan", "author": "nama penulis kutipan (jika ada, jika tidak tulis 'Anonim')" }
   - Jika "contact": { "name": "nama orang", "relationship": "rekan kerja/teman/keluarga/klien", "context": "keterangan pertemuan/catatan" }
   - Jika "note" atau kategori kustom lainnya: { "summary": "ringkasan isi atau deskripsi dari dokumen/gambar tersebut dalam 1-2 kalimat" }
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

