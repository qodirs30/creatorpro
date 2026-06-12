import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { generateContent } from '../utils/ai';
import { 
  Terminal, Code, Clipboard, Download, Play, RefreshCw, Zap, 
  ShieldAlert, Sparkles, Paintbrush, HelpCircle, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';

export default function VibeCoder() {
  const { geminiKey, groqKey, openAiKey, aiProvider, aiModel, addHistory } = useAppStore();

  // Tabs
  const [activeTab, setActiveTab] = useState('pedoman'); // 'pedoman' | 'token-killer'

  // Tab 1: Pedoman Proyek State
  const [theme, setTheme] = useState('Toko Kopi Online');
  const [aesthetic, setAesthetic] = useState('glassmorphism'); // 'glassmorphism' | 'neobrutalism' | 'minimalist' | 'cyberpunk'
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [specialNotes, setSpecialNotes] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [designMd, setDesignMd] = useState('');
  const [styleMd, setStyleMd] = useState('');
  const [promptMd, setPromptMd] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('design'); // 'design' | 'style' | 'prompt'
  const [copiedText, setCopiedText] = useState(false);
  const [pedomanError, setPedomanError] = useState('');

  // Tab 2: Token Killer State
  const [rawLogs, setRawLogs] = useState('');
  const [compressedLogs, setCompressedLogs] = useState('');
  const [logType, setLogType] = useState('auto'); // 'auto' | 'git' | 'vite' | 'test' | 'linter' | 'general'
  const [isCompressing, setIsCompressing] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [stats, setStats] = useState(null);

  const getApiKey = () => {
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return geminiKey;
  };

  // Dynamic Styles for Mockup Preview
  const getMockupStyles = () => {
    switch (aesthetic) {
      case 'neobrutalism':
        return {
          container: {
            background: '#fef08a',
            padding: '1.5rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '2px solid #000000',
            minHeight: '220px'
          },
          card: {
            background: '#ffffff',
            border: '3px solid #000000',
            borderRadius: '0px',
            padding: '1.25rem',
            color: '#000000',
            boxShadow: '5px 5px 0px #000000',
            width: '100%',
            maxWidth: '300px',
            fontFamily: "'Outfit', sans-serif"
          },
          title: {
            color: '#000000',
            fontWeight: '900',
            fontSize: '1.2rem',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
            display: 'block'
          },
          subtitle: {
            color: '#4b5563',
            fontSize: '0.8rem',
            fontWeight: '600',
            marginBottom: '1rem',
            display: 'block'
          },
          stat: {
            border: '2px solid #000000',
            padding: '0.4rem',
            background: '#f3f4f6',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '1rem'
          },
          button: {
            background: primaryColor,
            color: '#ffffff',
            padding: '0.5rem 1rem',
            fontWeight: 'bold',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            borderRadius: '0px',
            width: '100%',
            cursor: 'pointer'
          }
        };
      case 'minimalist':
        return {
          container: {
            background: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid #e5e7eb',
            minHeight: '220px'
          },
          card: {
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.25rem',
            color: '#1f2937',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            width: '100%',
            maxWidth: '300px',
            fontFamily: "'Outfit', sans-serif"
          },
          title: {
            color: '#111827',
            fontWeight: '600',
            fontSize: '1.15rem',
            letterSpacing: '-0.01em',
            marginBottom: '0.25rem',
            display: 'block'
          },
          subtitle: {
            color: '#6b7280',
            fontSize: '0.75rem',
            marginBottom: '1rem',
            display: 'block'
          },
          stat: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#4b5563',
            borderBottom: '1px solid #f3f4f6',
            paddingBottom: '0.5rem',
            marginBottom: '1rem'
          },
          button: {
            background: primaryColor,
            color: '#ffffff',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: '500',
            border: 'none',
            fontSize: '0.8rem',
            width: '100%',
            cursor: 'pointer'
          }
        };
      case 'cyberpunk':
        return {
          container: {
            background: '#030712',
            padding: '1.5rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid #1f2937',
            minHeight: '220px'
          },
          card: {
            background: '#090d16',
            border: `2px solid ${primaryColor}`,
            borderRadius: '4px',
            padding: '1.25rem',
            color: '#00ffcc',
            boxShadow: `0 0 12px ${primaryColor}77`,
            width: '100%',
            maxWidth: '300px',
            fontFamily: "'Courier New', Courier, monospace"
          },
          title: {
            color: '#00ffcc',
            fontWeight: '700',
            fontSize: '1.1rem',
            textShadow: '0 0 6px #00ffcc66',
            letterSpacing: '1px',
            marginBottom: '0.5rem',
            display: 'block'
          },
          subtitle: {
            color: '#ff0055',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginBottom: '1rem',
            display: 'block'
          },
          stat: {
            fontSize: '0.7rem',
            color: '#9ca3af',
            border: '1px solid #1f2937',
            padding: '0.3rem',
            background: '#0b0f19',
            marginBottom: '1rem'
          },
          button: {
            background: 'transparent',
            color: '#00ffcc',
            padding: '0.5rem 1rem',
            fontWeight: 'bold',
            border: '2px solid #00ffcc',
            boxShadow: '0 0 8px #00ffcc44',
            borderRadius: '4px',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            width: '100%',
            cursor: 'pointer'
          }
        };
      case 'glassmorphism':
      default:
        return {
          container: {
            background: 'radial-gradient(circle at top left, #1e1b4b, #09090b)',
            padding: '1.5rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '220px'
          },
          card: {
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '1.25rem',
            color: '#ffffff',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
            width: '100%',
            maxWidth: '300px',
            fontFamily: "'Outfit', sans-serif"
          },
          title: {
            color: primaryColor,
            fontWeight: '700',
            fontSize: '1.15rem',
            textShadow: `0 0 8px ${primaryColor}55`,
            marginBottom: '0.25rem',
            display: 'block'
          },
          subtitle: {
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '0.75rem',
            marginBottom: '1rem',
            display: 'block'
          },
          stat: {
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '1rem'
          },
          button: {
            background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)`,
            color: '#ffffff',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontWeight: '600',
            border: 'none',
            boxShadow: `0 4px 10px ${primaryColor}33`,
            fontSize: '0.8rem',
            width: '100%',
            cursor: 'pointer'
          }
        };
    }
  };

  // Tab 1: Generate Guidelines
  const handleGenerateGuidelines = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setPedomanError('API Key belum diatur. Harap konfigurasi API Key di menu Pengaturan.');
      return;
    }

    setIsGenerating(true);
    setPedomanError('');
    setDesignMd('');
    setStyleMd('');
    setPromptMd('');

    const systemPrompt = `Kamu adalah seorang Vibe Coding Architect senior. Tugasmu adalah membuat pedoman proyek terstruktur untuk vibe coding agar bisa di-copy paste ke workspace AI Coding Assistant (Cursor / Copilot / Claude Code / Kiro).

Pengguna memberikan spesifikasi berikut:
- Tema/Nama Proyek: "${theme}"
- Estetika/Style Desain: "${aesthetic}"
- Warna Utama: "${primaryColor}"
- Catatan Khusus: "${specialNotes}"

Hasilkan tiga dokumen spesifik:
1. design.md: Panduan arsitektur layout, komponen inti, struktur folder, tipografi, dan petunjuk UX.
2. style.md: Kode CSS (custom properties), class utility, scrollbar, animations, dan class pendukung estetika "${aesthetic}".
3. prompt.md: System instructions / prompt developer untuk AI coding assistant agar mematuhi design.md dan style.md ini secara ketat.

Kembalikan jawaban dengan format pemisah yang sangat ketat seperti ini:

===DESIGN===
[Isi design.md di sini]
===STYLE===
[Isi style.md di sini]
===PROMPT===
[Isi prompt.md di sini]

Pastikan isi setiap bagian ditulis dalam bahasa Indonesia yang profesional (kecuali kode teknis) dan sangat detail. Tanpa teks pembuka atau penutup lain di luar pembatas tersebut.`;

    try {
      const response = await generateContent(apiKey, systemPrompt, aiProvider, aiModel);
      
      // Parse response
      const parts = response.split(/===\s*(DESIGN|STYLE|PROMPT)\s*===/i);
      let design = '';
      let style = '';
      let prompt = '';
      
      for (let i = 1; i < parts.length; i += 2) {
        const section = parts[i].toUpperCase();
        const content = parts[i + 1]?.trim() || '';
        if (section === 'DESIGN') design = content;
        else if (section === 'STYLE') style = content;
        else if (section === 'PROMPT') prompt = content;
      }

      // If parsing failed (AI missed placeholders), put entire output in design
      if (!design && !style && !prompt) {
        design = response;
      }

      setDesignMd(design);
      setStyleMd(style);
      setPromptMd(prompt);

      // Log to history
      addHistory({
        type: 'vibe-assets',
        category: 'Pedoman Vibe',
        title: `Asset untuk ${theme}`,
        content: `design.md & style.md generated for theme: ${theme}`,
        meta: { theme, aesthetic, primaryColor }
      });
    } catch (err) {
      setPedomanError(err.message || 'Gagal menghasilkan pedoman proyek.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPedoman = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadPedoman = (filename, text) => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tab 2: Token Killer Log Compression logic
  const handleCompressLogs = () => {
    if (!rawLogs.trim()) return;

    setIsCompressing(true);
    
    // Simulate slight instant processing for smooth UX animation
    setTimeout(() => {
      let lines = rawLogs.split('\n');
      let detectedType = logType;

      if (logType === 'auto') {
        const textLower = rawLogs.toLowerCase();
        if (textLower.includes('on branch') || textLower.includes('changes not staged') || textLower.includes('untracked files') || textLower.includes('git status')) {
          detectedType = 'git';
        } else if (textLower.includes('vite') || textLower.includes('transforming (') || textLower.includes('built in') || textLower.includes('building for production')) {
          detectedType = 'vite';
        } else if (textLower.includes('test suites:') || textLower.includes('tests:') || textLower.includes('fail') || textLower.includes('pass')) {
          detectedType = 'test';
        } else if (textLower.includes('eslint') || textLower.includes('ts(') || textLower.includes('error ts') || textLower.includes('linter') || textLower.includes('warning:')) {
          detectedType = 'linter';
        } else {
          detectedType = 'general';
        }
      }

      let compressed = '';

      if (detectedType === 'git') {
        let branch = 'unknown';
        let modified = [];
        let untracked = [];
        let deleted = [];
        let added = [];
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('On branch ')) {
            branch = trimmed.replace('On branch ', '');
          } else if (trimmed.includes('modified:')) {
            modified.push(trimmed.split('modified:')[1].trim());
          } else if (trimmed.includes('deleted:')) {
            deleted.push(trimmed.split('deleted:')[1].trim());
          } else if (trimmed.includes('new file:')) {
            added.push(trimmed.split('new file:')[1].trim());
          } else if (trimmed.startsWith('use "git add') || trimmed.startsWith('(') || trimmed.startsWith('use "git restore')) {
            // Skip instruction
          } else if (trimmed && !trimmed.toLowerCase().includes('changes to be committed') && !trimmed.toLowerCase().includes('changes not staged') && !trimmed.toLowerCase().includes('untracked files') && !trimmed.includes('no changes added to commit')) {
            if (line.startsWith('\t') || line.startsWith('    ')) {
              untracked.push(trimmed);
            }
          }
        });

        let parts = [`[Git Status] Branch: ${branch}`];
        if (added.length > 0) parts.push(`Added: [${added.join(', ')}]`);
        if (modified.length > 0) parts.push(`Modified: [${modified.join(', ')}]`);
        if (deleted.length > 0) parts.push(`Deleted: [${deleted.join(', ')}]`);
        if (untracked.length > 0) parts.push(`Untracked: [${untracked.join(', ')}]`);
        if (parts.length === 1) parts.push('Working tree clean');
        compressed = parts.join('\n');
      } 
      else if (detectedType === 'vite') {
        let buildLines = [];
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.includes('transforming (')) return;
          if (trimmed) buildLines.push(trimmed);
        });
        compressed = buildLines.join('\n');
      } 
      else if (detectedType === 'test') {
        let failedTests = [];
        let currentFailedTest = null;
        let summaryLines = [];
        let insideStackTrace = false;

        lines.forEach(line => {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('FAIL') || trimmed.includes('❌') || trimmed.includes('failed')) {
            if (currentFailedTest) {
              failedTests.push(currentFailedTest);
            }
            currentFailedTest = { file: trimmed, details: [] };
            insideStackTrace = true;
          } else if (trimmed.startsWith('PASS') || trimmed.includes('✓')) {
            insideStackTrace = false;
          } else if (insideStackTrace && currentFailedTest) {
            if (currentFailedTest.details.length < 20) {
              currentFailedTest.details.push(line);
            }
          }

          if (trimmed.startsWith('Test Suites:') || trimmed.startsWith('Tests:') || trimmed.startsWith('Snapshots:') || trimmed.startsWith('Time:')) {
            summaryLines.push(trimmed);
          }
        });

        if (currentFailedTest) {
          failedTests.push(currentFailedTest);
        }

        let outputParts = [];
        if (failedTests.length > 0) {
          outputParts.push(`--- FAILED TESTS (${failedTests.length}) ---`);
          failedTests.forEach(test => {
            outputParts.push(test.file);
            outputParts.push(test.details.join('\n'));
            outputParts.push('------------------------');
          });
        } else {
          outputParts.push('All tests passed! (or no failures detected)');
        }

        if (summaryLines.length > 0) {
          outputParts.push('\n--- TEST SUMMARY ---');
          outputParts.push(summaryLines.join('\n'));
        }

        compressed = outputParts.join('\n');
      } 
      else if (detectedType === 'linter') {
        let errors = [];
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.toLowerCase().includes('error') || trimmed.toLowerCase().includes('failed') || trimmed.includes('ts(') || trimmed.includes('✖')) {
            errors.push(trimmed);
          }
        });
        if (errors.length === 0) {
          compressed = lines.slice(0, 50).map(l => l.trim()).filter(Boolean).join('\n') + '\n(Linter warnings collapsed)';
        } else {
          compressed = errors.join('\n');
        }
      } 
      else {
        let collapsed = [];
        let lastLine = '';
        let duplicateCount = 0;

        lines.forEach(line => {
          let trimmed = line.trim();
          if (!trimmed) return;

          // Strip typical timestamp prefixes to clean log
          trimmed = trimmed.replace(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\s*/, '');
          trimmed = trimmed.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');

          if (trimmed === lastLine) {
            duplicateCount++;
          } else {
            if (duplicateCount > 0) {
              collapsed[collapsed.length - 1] = `${lastLine} (repeated ${duplicateCount + 1} times)`;
              duplicateCount = 0;
            }
            collapsed.push(trimmed);
            lastLine = trimmed;
          }
        });

        if (duplicateCount > 0) {
          collapsed[collapsed.length - 1] = `${lastLine} (repeated ${duplicateCount + 1} times)`;
        }

        if (collapsed.length > 200) {
          const start = collapsed.slice(0, 70);
          const end = collapsed.slice(-70);
          compressed = [...start, `\n... [${collapsed.length - 140} lines collapsed to save tokens] ...\n`, ...end].join('\n');
        } else {
          compressed = collapsed.join('\n');
        }
      }

      // Calculations
      const charBefore = rawLogs.length;
      const charAfter = compressed.length;
      const tokensBefore = Math.round(charBefore / 4);
      const tokensAfter = Math.round(charAfter / 4);
      const savedPercent = Math.max(0, Math.round(((charBefore - charAfter) / charBefore) * 100));
      
      // standard Claude 3.5 Sonnet / GPT-4o input: $3.00 per 1M tokens
      const costBefore = (tokensBefore / 1000000) * 3.0;
      const costAfter = (tokensAfter / 1000000) * 3.0;
      const costSaved = Math.max(0, costBefore - costAfter);

      setCompressedLogs(compressed);
      setStats({
        charBefore,
        charAfter,
        tokensBefore,
        tokensAfter,
        savedPercent,
        costSaved
      });
      setIsCompressing(false);
    }, 400);
  };

  const handleCopyLogs = () => {
    if (!compressedLogs) return;
    navigator.clipboard.writeText(compressedLogs);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const mockup = getMockupStyles();
  const activeGuidelineText = activeSubTab === 'design' ? designMd : activeSubTab === 'style' ? styleMd : promptMd;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ marginBottom: '0.5rem', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Code size={32} /> Vibe Coding Hub
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Alat pendukung Vibe Coding: rancang guidelines desain visual, dan pangkas token log terminal Anda.
        </p>
      </div>

      {/* Main Tab Switcher */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        background: 'var(--bg-main)', 
        padding: '0.35rem', 
        borderRadius: '10px', 
        border: '1px solid var(--border-color)', 
        marginBottom: '2rem',
        width: 'fit-content'
      }}>
        <button
          onClick={() => setActiveTab('pedoman')}
          className="btn"
          style={{
            background: activeTab === 'pedoman' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'pedoman' ? 'var(--primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'pedoman' ? 'var(--shadow-sm)' : 'none',
            borderRadius: '8px',
            padding: '0.6rem 1.25rem'
          }}
        >
          <Paintbrush size={16} /> Pedoman Proyek (design.md & style.md)
        </button>
        <button
          onClick={() => setActiveTab('token-killer')}
          className="btn"
          style={{
            background: activeTab === 'token-killer' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'token-killer' ? 'var(--primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'token-killer' ? 'var(--shadow-sm)' : 'none',
            borderRadius: '8px',
            padding: '0.6rem 1.25rem'
          }}
        >
          <Terminal size={16} /> Token Killer (Log Compressor)
        </button>
      </div>

      {/* ===================== TAB 1: PEDOMAN PROYEK ===================== */}
      {activeTab === 'pedoman' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="var(--primary)" /> Konfigurasi Tema & Desain
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Nama / Tema Proyek</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)} 
                    placeholder="Contoh: Toko Kopi Online"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Estetika Visual</label>
                    <select 
                      className="input-field" 
                      value={aesthetic} 
                      onChange={(e) => setAesthetic(e.target.value)}
                    >
                      <option value="glassmorphism">Glassmorphism Dark</option>
                      <option value="neobrutalism">Neobrutalism Vibrant</option>
                      <option value="minimalist">Minimalist Clean</option>
                      <option value="cyberpunk">Retro Cyberpunk</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Warna Utama (Primary)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)} 
                        style={{ width: '42px', height: '42px', padding: '0', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input 
                        type="text" 
                        className="input-field" 
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)} 
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem', padding: '0.5rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Catatan Khusus / Requirements Tambahan (Opsional)</label>
                  <textarea 
                    className="input-field" 
                    rows={3} 
                    value={specialNotes} 
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="Contoh: Gunakan Outfit font, responsive, support Dark Mode, navigasi transparan..."
                  />
                </div>

                {/* API Key warning if missing */}
                {!getApiKey() && (
                  <div style={{ 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    background: '#fffbeb', 
                    border: '1px solid #f59e0b', 
                    color: '#b45309',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}>
                    <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      Gemini/Groq/OpenAI API Key belum diatur. Silakan atur di <Link to="/settings" style={{ fontWeight: 'bold', textDecoration: 'underline', color: '#b45309' }}>Pengaturan</Link> terlebih dahulu untuk menggunakan generator AI.
                    </div>
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  onClick={handleGenerateGuidelines} 
                  disabled={isGenerating || !getApiKey()}
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 600 }}
                >
                  {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                  {isGenerating ? 'Menyusun Pedoman Desain...' : 'Hasilkan Pedoman Vibe Coding (AI)'}
                </button>

                {pedomanError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    ❌ {pedomanError}
                  </div>
                )}
              </div>
            </div>

            {/* Generated Output Card */}
            {(designMd || styleMd || promptMd || isGenerating) && (
              <div className="card" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                {isGenerating && !designMd ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>AI sedang menulis dokumen design.md, style.md, dan prompt.md...</p>
                  </div>
                ) : (
                  <div>
                    {/* Sub-tab selection */}
                    <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                      <button 
                        onClick={() => setActiveSubTab('design')}
                        className="btn"
                        style={{
                          background: activeSubTab === 'design' ? 'var(--primary-light)' : 'transparent',
                          color: activeSubTab === 'design' ? 'var(--primary)' : 'var(--text-secondary)',
                          fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '6px'
                        }}
                      >
                        <FileText size={14} /> design.md
                      </button>
                      <button 
                        onClick={() => setActiveSubTab('style')}
                        className="btn"
                        style={{
                          background: activeSubTab === 'style' ? 'var(--primary-light)' : 'transparent',
                          color: activeSubTab === 'style' ? 'var(--primary)' : 'var(--text-secondary)',
                          fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '6px'
                        }}
                      >
                        <Code size={14} /> style.md
                      </button>
                      <button 
                        onClick={() => setActiveSubTab('prompt')}
                        className="btn"
                        style={{
                          background: activeSubTab === 'prompt' ? 'var(--primary-light)' : 'transparent',
                          color: activeSubTab === 'prompt' ? 'var(--primary)' : 'var(--text-secondary)',
                          fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '6px'
                        }}
                      >
                        <Terminal size={14} /> prompt.md
                      </button>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Tipe: {activeSubTab === 'design' ? 'design.md (Arsitektur)' : activeSubTab === 'style' ? 'style.md (CSS Utility)' : 'prompt.md (Prompt System)'}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => handleCopyPedoman(activeGuidelineText)}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          {copiedText ? <CheckCircle2 size={14} color="var(--success)" /> : <Clipboard size={14} />}
                          {copiedText ? 'Tersalin' : 'Salin'}
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => handleDownloadPedoman(`${activeSubTab}.md`, activeGuidelineText)}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          <Download size={14} /> Unduh
                        </button>
                      </div>
                    </div>

                    {/* Text Display */}
                    <textarea
                      readOnly
                      className="input-field"
                      value={activeGuidelineText}
                      rows={12}
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.85rem', 
                        lineHeight: 1.5,
                        backgroundColor: '#0f172a',
                        color: '#f8fafc',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Preview & Documentation Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Real-time Preview */}
            <div className="card" style={{ borderTop: '4px solid var(--accent)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Paintbrush size={18} color="var(--accent)" /> Real-Time Mockup Preview
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Perubahan estetika dan warna primary akan memodifikasi mockup visual di bawah ini secara instan.
              </p>

              {/* Preview Box */}
              <div style={mockup.container}>
                <div style={mockup.card}>
                  <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  </div>
                  
                  <span style={mockup.title}>{theme || 'Nama Proyek'}</span>
                  <span style={mockup.subtitle}>Estetika: {aesthetic.toUpperCase()}</span>
                  
                  <div style={mockup.stat}>
                    {aesthetic === 'cyberpunk' ? (
                      <div>STATUS: ONLINE // TARGET: COMPLETED</div>
                    ) : aesthetic === 'neobrutalism' ? (
                      <div>SKOR KINERJA: 98% AKURAT</div>
                    ) : (
                      <span>⚙️ Integrasi Sistem Aktif</span>
                    )}
                  </div>
                  
                  <button style={mockup.button} onClick={() => alert('Mockup Interaktif!')}>
                    Mulai Proyek
                  </button>
                </div>
              </div>
            </div>

            {/* Instruction Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>Cara Vibe Coding dengan File Ini:</h4>
              <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li>Hasilkan dokumen dan salin isi dari `design.md` dan `style.md` ke folder proyek Anda.</li>
                <li>Salin isi `prompt.md` dan gunakan sebagai System Instruction (atau tempel di file `.cursorrules` / `.claudeprompt` / AI Chat panel).</li>
                <li>AI Assistant Anda akan secara akurat mengikuti aturan coding, format component, dan styling visual tersebut tanpa melenceng.</li>
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* ===================== TAB 2: TOKEN KILLER ===================== */}
      {activeTab === 'token-killer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ borderTop: '4px solid var(--danger)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} color="var(--danger)" /> Token Killer — Log Compressor
              </h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipe Log:</label>
                <select 
                  className="input-field" 
                  value={logType} 
                  onChange={(e) => setLogType(e.target.value)}
                  style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <option value="auto">Auto-Detect</option>
                  <option value="git">Git Status</option>
                  <option value="vite">Vite Build</option>
                  <option value="test">Unit Test (Vitest/Jest)</option>
                  <option value="linter">Linter (ESLint/TS Compiler)</option>
                  <option value="general">General (Collapse Duplicate & Lines)</option>
                </select>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Kurangi konsumsi token input AI Anda hingga 60-90% dengan membuang visual bloat, modul loading transform, test passed yang tidak penting, dan file warning duplikat dari log terminal.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Raw Input Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Log Mentah (Raw Terminal Output)</label>
                <textarea
                  className="input-field"
                  rows={12}
                  value={rawLogs}
                  onChange={(e) => setRawLogs(e.target.value)}
                  placeholder="Tempel output terminal di sini... (misal: npm run build, git status, npm test, dll)"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.4 }}
                />
              </div>

              {/* Compressed Output Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Log Ringkas (Compressed Logs)</label>
                  {compressedLogs && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleCopyLogs}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      {copiedLogs ? <CheckCircle2 size={12} color="var(--success)" /> : <Clipboard size={12} />}
                      {copiedLogs ? 'Tersalin' : 'Salin Hasil'}
                    </button>
                  )}
                </div>
                <textarea
                  readOnly
                  className="input-field"
                  rows={12}
                  value={compressedLogs}
                  placeholder="Hasil kompresi log akan muncul di sini..."
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.8rem', 
                    lineHeight: 1.4,
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0'
                  }}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleCompressLogs}
              disabled={isCompressing || !rawLogs.trim()}
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem', fontWeight: 600 }}
            >
              {isCompressing ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
              {isCompressing ? 'Mengompresi Log...' : 'Bunuh Token (Kompresi Log)'}
            </button>
          </div>

          {/* Analytics Savings Widget */}
          {stats && (
            <div className="card" style={{ 
              borderLeft: '5px solid var(--success)', 
              background: '#ecfdf5',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem',
              alignItems: 'center',
              animation: 'slideUpFade 0.3s ease-out forwards'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Tingkat Penghematan</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Zap size={22} fill="var(--warning)" color="var(--warning)" /> {stats.savedPercent}%
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Karakter Log</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#065f46' }}>
                  {stats.charBefore.toLocaleString()} → {stats.charAfter.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Estimasi Token LLM</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#065f46' }}>
                  ~{stats.tokensBefore.toLocaleString()} → ~{stats.tokensAfter.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Penghematan Biaya</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#065f46' }}>
                  ${stats.costSaved.toFixed(5)} USD / prompt
                </span>
                <span style={{ fontSize: '0.65rem', color: '#047857' }}>*Skala Claude 3.5 Sonnet Input</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
