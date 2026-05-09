import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { generateContent } from '../utils/ai';
import { Copy, Save, Sparkles, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

export default function ContentScripting() {
  const { geminiKey, groqKey, openAiKey, aiProvider, aiModel, addHistory } = useAppStore();
  const getActiveKey = () => {
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return '';
  };
  const [idea, setIdea] = useState('');
  const [script, setScript] = useState({
    hook: '',
    foreshadow: '',
    body: '',
    ending: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingCol, setLoadingCol] = useState(null);

  const handleGenerateAll = async () => {
    if (!idea) return alert('Silakan masukkan ide terlebih dahulu.');
    if (!getActiveKey()) return alert('Silakan atur API Key Anda di Pengaturan.');
    
    setLoading(true);
    try {
      const prompt = `Anda adalah seorang kreator konten ahli. Tulis naskah singkat dan menarik berdasarkan ide ini: "${idea}". 
      Format hasilnya SECARA KETAT sebagai objek JSON dengan tepat 4 kunci ini: "hook", "foreshadow", "body", "ending".
      Gunakan bahasa Indonesia yang gaul namun profesional. Jangan sertakan blok kode markdown, hanya JSON murni.
      
      - hook: 3 detik pertama untuk menarik perhatian.
      - foreshadow: Petunjuk tentang nilai atau puncak cerita nanti.
      - body: Konten atau cerita utama.
      - ending: Kesimpulan dan ajakan bertindak (CTA).`;
      
      let resultText = await generateContent(getActiveKey(), prompt, aiProvider, aiModel);
      
      resultText = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(resultText);
      
      setScript({
        hook: parsed.hook || '',
        foreshadow: parsed.foreshadow || '',
        body: parsed.body || '',
        ending: parsed.ending || ''
      });

      // Log to history
      const fullNaskah = `HOOK:\n${parsed.hook || ''}\n\nFORESHADOW:\n${parsed.foreshadow || ''}\n\nBODY:\n${parsed.body || ''}\n\nENDING:\n${parsed.ending || ''}`;
      addHistory({
        type: 'script',
        category: 'Naskah Lengkap',
        title: idea.slice(0, 80),
        content: fullNaskah,
      });
    } catch (err) {
      alert('Gagal membuat naskah: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefineColumn = async (colName) => {
    if (!getActiveKey()) return alert('Silakan atur API Key Anda di Pengaturan.');
    
    setLoadingCol(colName);
    try {
      const prompt = `Anda adalah seorang kreator konten ahli. Saya sedang menulis naskah. 
      Ide utamanya adalah: "${idea}".
      Bagian "${colName}" saat ini adalah: "${script[colName]}".
      
      Tolong perbaiki dan tingkatkan bagian "${colName}" ini agar lebih menarik untuk media sosial (TikTok/Reels/Shorts). 
      Gunakan bahasa Indonesia. Kembalikan HANYA teks yang sudah diperbaiki, tanpa tambahan apapun.`;
      
      const refinedText = await generateContent(getActiveKey(), prompt, aiProvider, aiModel);
      
      setScript(prev => ({
        ...prev,
        [colName]: refinedText.trim()
      }));
    } catch (err) {
      alert('Gagal memperbaiki bagian: ' + err.message);
    } finally {
      setLoadingCol(null);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleExportTxt = () => {
    const text = `IDE: ${idea}\n\nHOOK:\n${script.hook}\n\nFORESHADOW:\n${script.foreshadow}\n\nBODY:\n${script.body}\n\nENDING:\n${script.ending}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'naskah.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Naskah Konten', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Ide: ${idea}`, 20, 30);
    
    let yPos = 40;
    
    const addSection = (title, content) => {
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, yPos);
      yPos += 7;
      
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(content || '(Kosong)', 170);
      doc.text(lines, 20, yPos);
      yPos += (lines.length * 7) + 10;
    };

    addSection('HOOK', script.hook);
    addSection('FORESHADOW', script.foreshadow);
    addSection('BODY', script.body);
    addSection('ENDING', script.ending);

    doc.save('naskah.pdf');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Penulis Naskah</h1>
      
      {/* Top Idea Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
          Apa ide konten Anda?
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="misalnya: 3 trik produktivitas untuk orang malas..." 
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <button className="btn btn-primary" onClick={handleGenerateAll} disabled={loading}>
            <Sparkles size={18} />
            {loading ? 'Membuat...' : 'Buat Naskah Otomatis'}
          </button>
        </div>
      </div>

      {/* Scripting Columns */}
      <div className="script-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {['hook', 'foreshadow', 'body', 'ending'].map((col) => (
          <div key={col} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ textTransform: 'capitalize', fontSize: '1rem' }}>{col}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  style={{ background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  onClick={() => handleCopy(script[col])}
                  title="Salin"
                >
                  <Copy size={16} />
                </button>
                <button 
                  style={{ background: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                  onClick={() => handleRefineColumn(col)}
                  title="Perbaiki dengan AI"
                  disabled={loadingCol === col}
                >
                  <Sparkles size={16} />
                </button>
              </div>
            </div>
            
            <textarea 
              className="input-field" 
              style={{ minHeight: '220px', resize: 'vertical' }}
              value={script[col]}
              onChange={(e) => setScript({ ...script, [col]: e.target.value })}
              placeholder={`Tulis ${col} Anda di sini...`}
            />
            {loadingCol === col && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.5rem', textAlign: 'center' }}>Memperbaiki...</div>}
          </div>
        ))}
      </div>

      {/* Save / Export Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap', paddingBottom: '2rem' }}>
        <button className="btn btn-secondary" onClick={handleExportTxt}>
          <FileText size={18} />
          Simpan TXT
        </button>
        <button className="btn btn-primary" onClick={handleExportPdf}>
          <Download size={18} />
          Simpan PDF
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .script-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .script-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
