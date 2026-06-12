import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { generateContent } from '../utils/ai';
import { 
  Video, Sparkles, Clipboard, Download, Play, RefreshCw, 
  ShieldAlert, CheckCircle2, FileText, Globe, Info, Sliders
} from 'lucide-react';
import jsPDF from 'jspdf';

export default function MegaCreator() {
  const { geminiKey, groqKey, openAiKey, aiProvider, aiModel, addHistory } = useAppStore();

  // Inputs State
  const [idea, setIdea] = useState('');
  const [contentStyle, setContentStyle] = useState('storytelling');
  const [tone, setTone] = useState('casual');
  const [platform, setPlatform] = useState('shorts');
  const [duration, setDuration] = useState('short');
  
  // Scraper State
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [scrapedContext, setScrapedContext] = useState('');

  // Output State
  const [scriptText, setScriptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState('');

  const getApiKey = () => {
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return geminiKey;
  };

  // Free CORS Proxies for link scraping
  const fetchHtmlWithFallbackProxies = async (url) => {
    const proxies = [
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.codetabs.com/v1/proxy?quest=${u}`,
      (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`
    ];

    let lastError = null;
    for (let i = 0; i < proxies.length; i++) {
      const proxyUrl = proxies[i](url);
      try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        if (proxyUrl.includes('allorigins.win')) {
          const json = await response.json();
          if (json && json.contents) return json.contents;
          throw new Error('AllOrigins empty content');
        } else {
          const text = await response.text();
          if (text && text.trim().length > 100) return text;
          throw new Error('Raw response empty/short');
        }
      } catch (err) {
        console.warn(`Proxy ${i + 1} failed for MegaCreator:`, err.message);
        lastError = err;
      }
    }
    throw lastError || new Error('All CORS proxies failed.');
  };

  const handleScrapeLink = async () => {
    // Regex to detect if input looks like a URL
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
    const trimmedIdea = idea.trim();
    
    if (!trimmedIdea) {
      setScrapeError('Masukkan URL YouTube/Sosmed di kolom Ide terlebih dahulu.');
      return;
    }
    
    setIsScraping(true);
    setScrapeError('');
    setScrapedContext('');

    let formattedUrl = trimmedIdea;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const html = await fetchHtmlWithFallbackProxies(formattedUrl);
      
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Link Video / Halaman';

      // Extract description
      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) ||
                         html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i);
      const description = descMatch ? descMatch[1].trim() : '';

      const context = `[Hasil Scraping Link]\nJudul Video/Halaman: ${title}\nRingkasan/Deskripsi: ${description}`;
      setScrapedContext(context);
      setIdea(`Buat konten terinspirasi dari video ini: "${title}". Deskripsi video: "${description}"`);
    } catch (err) {
      setScrapeError('Gagal mengekstrak link secara otomatis (CORS/WAF block). Silakan ketik langsung topik video tersebut di kolom Ide.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleGenerateScript = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setGenError('API Key belum diatur. Harap konfigurasi API Key di menu Pengaturan.');
      return;
    }

    if (!idea.trim()) {
      setGenError('Masukkan ide topik atau link sosmed terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    setGenError('');
    setScriptText('');
    setCopied(false);

    const styleNames = {
      storytelling: 'Storytelling (Bercerita / Naratif)',
      edustory: 'Edu-Storytelling (Edukasi dibungkus cerita)',
      problemsolution: 'Problem-Solution (Mengatasi masalah target)',
      review: 'Review & Comparison (Ulasan & Perbandingan produk)',
      pov: 'POV & Interaktif (Opini, Point of View & Interaksi audiens)',
      listicle: 'Listicle Tips & Tricks (Daftar / 3 Trik Praktis)'
    };

    const toneNames = {
      casual: 'Casual & Santai (Gaul, lo-gue, ramah)',
      edukatif: 'Edukatif & Informatif (Faktual, kredibel, tenang)',
      inspiratif: 'Inspiratif & Emosional (Menggugah hati, memotivasi)',
      humoris: 'Humoris & Komedi (Menghibur, lucu, ekspresif)',
      misterius: 'Misterius & Dramatis (Penuh ketegangan, bikin penasaran)'
    };

    const platformNames = {
      shorts: 'Shorts / TikTok / Reels (Video Vertikal 9:16)',
      youtube: 'YouTube Video (Video Horizontal 16:9)',
      thread: 'Thread / Post Media Sosial (Teks Sosial Media)'
    };

    const durationNames = {
      short: 'Short-form (30-60 detik)',
      medium: 'Mid-form (1-3 menit)',
      long: 'Long-form (3-10 menit)'
    };

    const systemPrompt = `Kamu adalah seorang "Mega Creator" dan Penulis Naskah Konten kelas dunia. Tugasmu adalah membuat naskah video/konten yang sangat terstruktur, viral-friendly, dan profesional berdasarkan input pengguna.

INPUT PENGGUNA:
- Ide / Topik / Konteks: "${idea}"
- Gaya Konten: "${styleNames[contentStyle]}"
- Nuansa Konten (Tone): "${toneNames[tone]}"
- Platform Target: "${platformNames[platform]}"
- Durasi: "${durationNames[duration]}"

Hasilkan naskah yang sangat terperinci dalam format Markdown (.md) yang mencakup bagian berikut:

1. **PERENCANAAN VIRAL (VIRAL METRICS)**:
   - **Tujuan Konten**: Apa tujuan utama video ini.
   - **Target Audiens**: Siapa target spesifik yang akan menonton.
   - **Pilar Konten**: Kategori konten.
   - **Viral Trigger Angle**: Mengapa naskah ini akan memicu interaksi tinggi (suka, komen, share, simpan).

2. **DRAFT NASKAH STRUKTUR (SCENE BY SCENE)**:
   Buat naskah video dengan format pemisahan adegan yang jelas. Untuk setiap adegan, sedia informasi:
   - **Waktu / Scene**: (misal: Scene 1: Hook / Detik 00:00 - 00:03)
   - **Visual & Overlay**: Petunjuk adegan kamera, ekspresi wajah, gerakan tangan, dan tulisan/teks yang muncul di layar (Overlay).
   - **Audio (BGM/SFX)**: Jenis sound effect (misal: swoosh, vinyl scratch, pop) dan nuansa latar musik (BGM).
   - **Dialog / Narasi (Voiceover)**: Teks persis yang harus diucapkan oleh pembicara.

3. **TIPS PRODUKSI (PRODUKSI & EDITING)**:
   - Rekomendasi pacing (kecepatan berbicara).
   - B-Roll yang dibutuhkan.
   - Efek transisi video yang disarankan.

Gunakan Bahasa Indonesia yang kasual, kekinian, dan mudah dicerna (sesuai gaya kreator konten modern seperti Samuel Christ). Jangan berikan teks pembuka atau penutup lain di luar laporan Markdown tersebut.`;

    try {
      const response = await generateContent(apiKey, systemPrompt, aiProvider, aiModel);
      setScriptText(response);

      // Log to history
      addHistory({
        type: 'script',
        category: 'Mega Creator',
        title: idea.slice(0, 80),
        content: response,
        meta: { contentStyle, tone, platform }
      });
    } catch (err) {
      setGenError(err.message || 'Gagal menghasilkan naskah konten.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!scriptText) return;
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    if (!scriptText) return;
    const blob = new Blob([scriptText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `naskah_mega_creator_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    if (!scriptText) return;
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    // Split text to fit page width
    const lines = doc.splitTextToSize(scriptText, 170);
    
    let y = 20;
    lines.forEach(line => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 6;
    });

    doc.save(`naskah_mega_creator_${Date.now()}.pdf`);
  };

  const isUrl = idea.trim().startsWith('http://') || idea.trim().startsWith('https://') || idea.trim().includes('.com') || idea.trim().includes('youtube.com');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ marginBottom: '0.5rem', fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Video size={36} /> Mega Creator Studio
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Susun naskah video viral terstruktur berdasar gaya buku "Mega Creator". Tempel ide, artikel, atau link YouTube Anda.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start', marginBottom: '2rem' }}>
        
        {/* Input Card */}
        <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--primary)" /> Perumusan Ide Konten
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Ide Topik / Teks Panjang / Link Video Sosmed
              </label>
              <textarea
                className="input-field"
                rows={5}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Masukkan topik konten (misal: 3 kesalahan investasi pemula), artikel panjang, atau link video YouTube / TikTok..."
                disabled={isGenerating}
              />
              {isUrl && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleScrapeLink}
                  disabled={isScraping || isGenerating}
                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center' }}
                >
                  {isScraping ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={14} />}
                  {isScraping ? 'Mengekstrak Link...' : 'Ekstrak Ringkasan dari Link'}
                </button>
              )}
              {scrapeError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.5rem' }}>⚠ {scrapeError}</p>
              )}
              {scrapedContext && (
                <div style={{ 
                  marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-main)', 
                  border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)'
                }}>
                  <Info size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  {scrapedContext.slice(0, 150)}...
                </div>
              )}
            </div>

            {/* Config options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Gaya Konten</label>
                <select className="input-field" value={contentStyle} onChange={(e) => setContentStyle(e.target.value)} disabled={isGenerating}>
                  <option value="storytelling">Storytelling</option>
                  <option value="edustory">Edu-Storytelling</option>
                  <option value="problemsolution">Problem-Solution</option>
                  <option value="review">Review & Comparison</option>
                  <option value="pov">POV / Opini Interaktif</option>
                  <option value="listicle">Listicle Tips</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Nuansa (Tone)</label>
                <select className="input-field" value={tone} onChange={(e) => setTone(e.target.value)} disabled={isGenerating}>
                  <option value="casual">Casual & Santai</option>
                  <option value="edukatif">Edukatif</option>
                  <option value="inspiratif">Inspiratif</option>
                  <option value="humoris">Humoris</option>
                  <option value="misterius">Misterius</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Platform Target</label>
                <select className="input-field" value={platform} onChange={(e) => setPlatform(e.target.value)} disabled={isGenerating}>
                  <option value="shorts">TikTok / Reels / Shorts</option>
                  <option value="youtube">YouTube (Horizontal)</option>
                  <option value="thread">Thread / Post Teks</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Target Durasi</label>
                <select className="input-field" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={isGenerating}>
                  <option value="short">Short-form (30-60s)</option>
                  <option value="medium">Mid-form (1-3m)</option>
                  <option value="long">Long-form (3-10m)</option>
                </select>
              </div>
            </div>

            {/* Warning if API keys not set */}
            {!getApiKey() && (
              <div style={{ 
                padding: '0.75rem 1rem', borderRadius: '8px', background: '#fffbeb', 
                border: '1px solid #f59e0b', color: '#b45309', fontSize: '0.85rem',
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
              }}>
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  API Key belum diatur. Harap isi di menu <Link to="/settings" style={{ fontWeight: 'bold', textDecoration: 'underline', color: '#b45309' }}>Pengaturan</Link>.
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleGenerateScript}
              disabled={isGenerating || !idea.trim() || !getApiKey()}
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 600 }}
            >
              {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
              {isGenerating ? 'Meracik Naskah Viral...' : 'Hasilkan Naskah Mega Creator'}
            </button>

            {genError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>❌ {genError}</p>
            )}

          </div>
        </div>

        {/* Output Panel Card */}
        <div className="card" style={{ borderTop: '4px solid var(--success)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--success)" /> Naskah Konten Terstruktur
            </h3>
            {scriptText && (
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleCopy}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  title="Salin Naskah"
                >
                  {copied ? <CheckCircle2 size={12} color="var(--success)" /> : <Clipboard size={12} />}
                  {copied ? 'Tersalin' : 'Salin'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleExportTxt}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  title="Unduh TXT"
                >
                  <Download size={12} /> TXT
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleExportPdf}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  title="Unduh PDF"
                >
                  <FileText size={12} /> PDF
                </button>
              </div>
            )}
          </div>

          {isGenerating && !scriptText ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '3rem 0' }}>
              <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                AI sedang merancang sudut viral video Anda dan menulis naskah detail per adegan...
              </p>
            </div>
          ) : scriptText ? (
            <textarea
              readOnly
              className="input-field"
              value={scriptText}
              style={{ 
                flex: 1, 
                fontFamily: 'monospace', 
                fontSize: '0.85rem', 
                lineHeight: 1.6,
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: 'none',
                borderRadius: '8px',
                padding: '1.25rem',
                minHeight: '350px',
                resize: 'none'
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', padding: '3rem 0' }}>
              <Sliders size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem', textAlign: 'center', maxWidth: '300px' }}>
                Isi ide atau link di kolom kiri, atur konfigurasi, lalu klik generate untuk melihat naskah Anda.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Guide details from the book */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent)', background: 'var(--bg-main)' }}>
        <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>💡 Tips Tambahan Mega Creator:</h4>
        <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li><strong>The 3-Second Hook Rule</strong>: Pastikan adegan pertama memiliki hook visual/dialog yang mengejutkan atau kontradiktif (misal: "Jangan lakukan ini jika kamu mau produktif").</li>
          <li><strong>Pacing & Audio SFX</strong>: Naskah modern sangat bergantung pada pacing yang dinamis. Gunakan visual overlay di layar (teks besar/kata kunci) dan Sound Effect (SFX) di setiap transisi (setiap 3-4 detik).</li>
          <li><strong>Call to Action (CTA) yang Halus</strong>: Alih-alih berkata "Jangan lupa follow", gunakan CTA yang mengikat rasa penasaran (misal: "Gue udah taruh file template lengkapnya di link bio, ambil gratis sekarang").</li>
        </ul>
      </div>

    </div>
  );
}
