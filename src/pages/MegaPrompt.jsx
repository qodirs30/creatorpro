import { useState, useEffect, useRef } from 'react';
import useAppStore from '../store/useAppStore';
import { generateContent, analyzeImageWithGemini } from '../utils/ai';
import { Sparkles, Mic, MicOff, Copy, CheckCircle2, Wand2, Code, Image as ImageIcon, Film, Edit3, RefreshCw, AlertTriangle, Trash2, Globe, Camera, Upload, X } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';

const MODES = [
  {
    id: 'universal',
    label: 'Universal',
    icon: Globe,
    color: '#10b981',
    description: 'Prompt engineer universal — output bebas sesuai konteks (essay, analisis, rencana, email, apa saja)',
    placeholder: 'contoh: jelasin strategi marketing warung kopi',
  },
  {
    id: 'photoToPrompt',
    label: 'Photo to Prompt',
    icon: Camera,
    color: '#14b8a6',
    description: 'Upload foto, AI analisa lalu jadi prompt untuk re-generate gambar serupa',
    placeholder: 'Upload foto dulu, lalu klik tombol analisa',
    needsImage: true,
  },
  {
    id: 'vibe',
    label: 'Vibe Coding',
    icon: Code,
    color: '#6366f1',
    description: 'Prompt untuk AI coding assistant (Cursor, Copilot, Kiro, Claude Code)',
    placeholder: 'contoh: bikin landing page buat jual kopi',
  },
  {
    id: 'image',
    label: 'Image Generate',
    icon: ImageIcon,
    color: '#8b5cf6',
    description: 'Prompt untuk generate gambar (Midjourney, DALL-E, Stable Diffusion, Nano Banana)',
    placeholder: 'contoh: cewek cantik di pantai saat sunset',
  },
  {
    id: 'imageEdit',
    label: 'Image to Image',
    icon: Edit3,
    color: '#ec4899',
    description: 'Prompt untuk edit foto (Image-to-Image editing)',
    placeholder: 'contoh: ubah baju jadi jas hitam formal, latar jadi kantor mewah',
  },
  {
    id: 'video',
    label: 'Image to Video',
    icon: Film,
    color: '#f59e0b',
    description: 'Prompt untuk animasi foto ke video (Veo, Kling, Runway)',
    placeholder: 'contoh: foto ini dibikin gerak kayak lagi jalan di pantai',
  },
  {
    id: 'storyboard',
    label: 'Script to Storyboard',
    icon: Film,
    color: '#3b82f6',
    description: 'Ubah naskah video/iklan Anda menjadi prompt storyboard grid + prompt video per adegan',
    placeholder: 'Tulis cerita kasar, naskah iklan, atau film pendek Anda di sini...',
  },
];

const ASPECT_RATIOS = {
  image: ['original', '1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
  imageEdit: [],
  video: ['16:9', '9:16'],
  vibe: [],
  universal: [],
  photoToPrompt: ['original', '1:1', '16:9', '9:16'],
  storyboard: [],
};

export default function MegaPrompt() {
  const { geminiKey, groqKey, openAiKey, aiProvider, aiModel, addHistory } = useAppStore();
  
  const [activeMode, setActiveMode] = useState('universal');
  const [rawInput, setRawInput] = useState('');
  const [upgradedPrompt, setUpgradedPrompt] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [aspectRatio, setAspectRatio] = useState('original');

  // Photo to Prompt state
  const [uploadedImage, setUploadedImage] = useState(null);
  const fileInputRef = useRef(null);

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(() => 
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // Init voice recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';
      
      recognition.onresult = (event) => {
        let interim = '';
        let final = finalTranscriptRef.current;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        
        finalTranscriptRef.current = final;
        setRawInput(final);
        setInterimText(interim);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Izin mikrofon ditolak. Aktifkan mikrofon di browser settings.');
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          setError(`Error voice: ${event.error}`);
        }
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore stop error */ }
      }
    };
  }, []);

  // Reset aspect ratio when mode changes
  useEffect(() => {
    const ratios = ASPECT_RATIOS[activeMode] || [];
    if (ratios.length > 0 && aspectRatio !== ratios[0]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAspectRatio(ratios[0]);
    }
  }, [activeMode, aspectRatio]);

  const toggleVoiceInput = () => {
    if (!voiceSupported) {
      setError('Browser tidak mendukung voice-to-text. Gunakan Chrome/Edge di HP atau laptop.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      finalTranscriptRef.current = rawInput ? rawInput + ' ' : '';
      setError('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        setError('Gagal memulai voice recognition: ' + e.message);
      }
    }
  };

  const clearInput = () => {
    setRawInput('');
    setInterimText('');
    finalTranscriptRef.current = '';
    setUpgradedPrompt('');
    setUploadedImage(null);
    setError('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maks 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setUploadedImage(reader.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const getApiKey = () => {
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return geminiKey;
  };

  // Strip markdown formatting from AI output so it's clean plain text
  const cleanMarkdown = (text) => {
    if (!text) return '';
    let out = text;
    // Remove code fences ```lang ... ```
    out = out.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
    // Remove bold **text** and __text__
    out = out.replace(/\*\*(.+?)\*\*/g, '$1');
    out = out.replace(/__(.+?)__/g, '$1');
    // Remove italic *text* and _text_ (careful with word boundaries)
    out = out.replace(/(?<![\w*])\*([^\s*][^*]*[^\s*]|\S)\*(?![\w*])/g, '$1');
    out = out.replace(/(?<![\w_])_([^\s_][^_]*[^\s_]|\S)_(?![\w_])/g, '$1');
    // Remove ### / ## / # headings
    out = out.replace(/^#{1,6}\s+/gm, '');
    // Remove bullet markers at line start: "- " or "* " or "+ "
    out = out.replace(/^[\s]*[-*+]\s+/gm, '');
    // Remove inline backticks `code`
    out = out.replace(/`([^`]+)`/g, '$1');
    // Remove blockquote markers "> "
    out = out.replace(/^>\s+/gm, '');
    // Collapse 3+ blank lines into 2
    out = out.replace(/\n{3,}/g, '\n\n');
    return out.trim();
  };

  const buildSystemPrompt = (mode, userInput) => {
    const basePrefix = `Kamu adalah "Mega Prompt Engineer" kelas dunia. User memberikan ide kasar (bisa bahasa ngawur, typo, atau campur bahasa Indonesia-Inggris). Tugasmu: ubah jadi prompt profesional yang SUPER POWERFUL.

IDE USER: "${userInput}"

ATURAN OUTPUT WAJIB:
- JANGAN pakai markdown formatting (tanpa **bold**, tanpa *italic*, tanpa ### heading, tanpa backtick)
- JANGAN pakai bullet points dengan simbol * atau -
- Output harus plain text bersih, langsung bisa di-copy paste ke AI lain
- Kalau butuh struktur, pakai angka biasa (1. 2. 3.) atau paragraf terpisah dengan baris kosong
- Jangan ada pembuka seperti "Berikut adalah prompt..." atau penutup

`;

    switch (mode) {
      case 'universal':
        return `Kamu adalah "Universal Prompt Engineer" paling jago se-dunia. User kasih ide kasar/pertanyaan/topik apapun: "${userInput}"

TUGASMU: Ubah ide ini jadi SUPER PROMPT universal yang bisa dipakai di AI manapun (ChatGPT, Claude, Gemini, Grok, dll) untuk menghasilkan output berkualitas tinggi.

ATURAN OUTPUT WAJIB:
- JANGAN pakai markdown (tanpa **bold**, tanpa *italic*, tanpa ### heading, tanpa backtick, tanpa bullet *)
- Output plain text bersih, siap copy-paste
- Pakai angka (1. 2. 3.) atau paragraf terpisah kalau butuh struktur
- Jangan ada pembuka/penutup meta seperti "Berikut adalah prompt..."

ANALISIS DULU (jangan ditulis di output, cuma buat panduan internal):
- Apa sebenarnya yang user inginkan? (jawaban, analisis, konten, rencana, ide, dll)
- Output ideal bentuknya apa? (essay, bullet list, tabel, step-by-step, dll)
- Siapa audience-nya?

Lalu buat SUPER PROMPT yang mencakup:
1. ROLE — AI harus berperan sebagai apa (expert di bidang terkait)
2. CONTEXT — situasi & latar belakang relevan
3. TASK — instruksi spesifik dan jelas
4. REQUIREMENTS — constraint, panjang, tone, gaya
5. OUTPUT FORMAT — bentuk hasil yang diharapkan
6. QUALITY CRITERIA — standar kualitas

Prompt boleh bahasa Indonesia kalau topiknya lokal, atau Inggris kalau global.

OUTPUT: Hanya teks prompt final plain text yang siap di-paste. Tanpa markdown.`;

      case 'vibe':
        return basePrefix + `Buatkan VIBE CODING PROMPT yang sangat terstruktur untuk AI Coding Assistant (Cursor / Claude Code / Copilot / Kiro). 

Struktur output HARUS dalam bahasa Inggris dan mencakup:
1. **Project Overview** — tujuan & konteks proyek
2. **Tech Stack** — framework, library, dependencies yang direkomendasikan (pilih yang modern & battle-tested)
3. **Architecture** — file structure, komponen, pattern (MVC/layered/clean)
4. **Core Features** — breakdown fitur jadi task yang executable
5. **UI/UX Guidelines** — design system, color palette, responsive rules
6. **Code Quality Rules** — clean code, error handling, type safety, testing approach
7. **Step-by-Step Execution Plan** — urutan implementasi step by step

OUTPUT: Hanya teks prompt final. Jangan ada pembuka/penutup/penjelasan apa-apa.`;

      case 'image': {
        const ratioHint = aspectRatio === 'original' ? '' : ` Aspect ratio: --ar ${aspectRatio}`;
        return basePrefix + `Buatkan SUPER IMAGE PROMPT dalam bahasa Inggris untuk AI Image Generator (Midjourney / DALL-E 3 / Stable Diffusion / Nano Banana / Flux).

Prompt HARUS sangat deskriptif dan mencakup:
- Subject detail (ekspresi, pakaian, pose, gesture, ekspresi wajah kalau ada orang)
- Environment & background (detail setting, objek sekitar, waktu/musim)
- Lighting (golden hour, soft diffused, rim light, cinematic, dll)
- Camera & lens (focal length, aperture, angle, shot type — wide/close-up/medium)
- Style & mood (photorealistic / cinematic / anime / oil painting / vaporwave / dll)
- Color palette (tone & dominant colors)
- Texture & material detail
- Composition rules (rule of thirds, depth of field, symmetry)
- Quality modifiers: "8k, ultra detailed, sharp focus, masterpiece, professional photography"${ratioHint ? `\n-${ratioHint}` : '\n- Jangan tambahkan aspect ratio modifier (user pilih original/free)'}

OUTPUT: Hanya teks prompt final, satu paragraf rapat, siap langsung di-paste. Jangan ada pembuka/penutup.`;
      }

      case 'imageEdit':
        return basePrefix + `Buatkan IMAGE-TO-IMAGE EDIT PROMPT dalam bahasa Inggris untuk model edit foto (Nano Banana / Gemini Image Edit / Flux Kontext / SDXL img2img).

Prompt HARUS spesifik dan mencakup:
- Target element — apa persis yang diubah (subject / background / clothing / color / objek tertentu)
- Preservation instruction — apa yang WAJIB dipertahankan (wajah, identitas, pose, komposisi, dll) supaya identitas subjek tetap
- New element description — deskripsi detail elemen baru (material, warna, gaya, lighting)
- Blend & consistency rules — bagaimana elemen baru harus menyatu (matching lighting, shadows, perspective)
- Quality modifiers — photorealistic result, seamless blend, preserve original composition, high detail, natural lighting consistency

OUTPUT: Hanya teks prompt final plain text, jelas dan instruksional. Tanpa markdown, tanpa asterisk, tanpa bullet simbol.`;

      case 'video':
        return basePrefix + `Buatkan IMAGE-TO-VIDEO PROMPT dalam bahasa Inggris untuk AI Video Generator (Veo 3 / Kling / Runway / Luma).

Prompt HARUS cinematic dan mencakup:
- Camera movement — jenis gerakan kamera spesifik (dolly in, pan left, orbit, tilt up, handheld, crane shot, dll) + kecepatan
- Subject motion — gerakan subjek: natural/dramatic/subtle (ekspresi, breathing, berjalan, angin, rambut tertiup)
- Environment motion — elemen latar yang bergerak (daun bergoyang, cahaya berubah, refleksi air, partikel debu)
- Lighting evolution — perubahan cahaya selama video (sunset shift, lens flare, god rays muncul)
- Atmosphere & VFX — efek tambahan (fog, rain particles, bokeh, depth compression)
- Pacing — tempo: slow cinematic / dynamic / dramatic build-up
- Duration hint — rekomendasi durasi ideal (4s / 6s / 8s)
- Aspect ratio: ${aspectRatio}
- Mood descriptor — cinematic, dreamy, ominous, uplifting, dll

OUTPUT: Hanya teks prompt final plain text dalam satu paragraf padat dan siap pakai. Tanpa markdown, tanpa asterisk.`;

      case 'storyboard':
        return `Kamu adalah "Storyboard Prompt Engineer" kelas dunia. User memberikan naskah/cerita video/iklan produk: "${userInput}"

TUGASMU: Ubah naskah/cerita ini menjadi paket prompt storyboard yang sangat detail dan sistematis. Paket ini harus memiliki dua bagian utama:
1. **Prompt Storyboard Sheet (Untuk AI Image Generator)**: Prompt detail dalam bahasa Inggris untuk menghasilkan satu gambar lembaran storyboard (storyboard sheet/grid layout) yang berisi panel-panel adegan visual utama secara konsisten (misal: "A 6-panel storyboard grid sheet, showing [visual brief], cinematic style, color grading, photorealistic, Unreal Engine 5 render, aspect ratio 16:9").
2. **Scene-by-Scene Animation Prompts (Untuk AI Video Generator)**: Kumpulan prompt video (image-to-video) untuk masing-masing adegan/scene berdasarkan storyboard tadi, lengkap dengan deskripsi durasi (misal: 4s/8s), gerakan kamera (camera motion), gerakan subjek (subject motion), dan visual perubahan adegan yang halus sesuai naskah.

ATURAN OUTPUT:
- Gunakan struktur Markdown yang bersih, gunakan sub-heading, teks tebal (**), dan blok kode untuk prompt bahasa Inggris agar pengguna dapat membacanya dengan sangat nyaman.
- Tulis penjelasan adegan dalam Bahasa Indonesia.
- Teks prompt untuk di-copy paste ke generator gambar/video harus ditulis dalam Bahasa Inggris.

Struktur Output yang Diharapkan:
---
### 🎬 PROMPT STORYBOARD SHEET (Copy-paste ke Midjourney/DALL-E 3/Gemini/Flux):
\`\`\`text
[Tulis prompt bahasa Inggris untuk storyboard sheet grid di sini]
\`\`\`

### 📽️ DAFTAR PROMPT VIDEO PER SCENE (Copy-paste ke Kling/Runway/Luma bersama gambar storyboard):

#### 🎞️ Scene 1 (Durasi: [X] Detik)
* **Deskripsi Visual:** [Tulis detail visual adegan]
* **Prompt Animasi Video (Siap Copy):**
\`\`\`text
[Tulis prompt video bahasa Inggris untuk scene ini]
\`\`\`

#### 🎞️ Scene 2 (Durasi: [Y] Detik)
* **Deskripsi Visual:** [Tulis detail visual adegan]
* **Prompt Animasi Video (Siap Copy):**
\`\`\`text
[Tulis prompt video bahasa Inggris untuk scene ini]
\`\`\`

... (dst untuk scene lainnya sesuai naskah)
---

Hasilkan output yang terstruktur, padat, dan langsung siap digunakan.`;

      default:
        return basePrefix;
    }
  };

  const handlePhotoToPrompt = async () => {
    if (!uploadedImage) {
      setError('Upload foto dulu ya.');
      return;
    }
    if (!geminiKey) {
      setError('Fitur Photo to Prompt butuh Gemini API Key (untuk analisis vision). Set di menu Pengaturan.');
      return;
    }

    setIsUpgrading(true);
    setError('');
    setUpgradedPrompt('');
    setCopied(false);

    try {
      const ratioHint = aspectRatio === 'original' 
        ? '' 
        : ` Tambahkan aspect ratio hint --ar ${aspectRatio} di akhir prompt.`;

      const userHint = rawInput.trim() ? `\n\nCatatan tambahan dari user: "${rawInput.trim()}"` : '';

      const analysisPrompt = `Kamu adalah "Reverse Prompt Engineer" profesional. Analisa foto ini secara MENDALAM, lalu buatkan SUPER IMAGE PROMPT dalam bahasa Inggris yang kalau di-generate di AI image model (Midjourney / DALL-E / Stable Diffusion / Nano Banana) akan menghasilkan gambar yang SANGAT MIRIP dengan foto ini.

Analisa wajib mencakup:
- Subject / main focus (orang? objek? binatang? apa?) — deskripsi detail: ekspresi, pakaian, pose, warna, tekstur
- Background / environment — lokasi, setting, objek pendukung, waktu hari
- Lighting — arah cahaya, intensitas, warm/cool, hard/soft shadows, golden hour/studio/natural
- Camera angle & composition — eye-level / high angle / low angle, wide / medium / close-up, rule of thirds
- Color palette — dominant colors, tone (warm/cool/muted/vibrant)
- Mood & atmosphere
- Style — photography style / illustration / 3D render / anime / painting
- Technical details — depth of field, bokeh, sharpness, film grain
- Quality modifiers — "photorealistic, 8k, ultra detailed, sharp focus, masterpiece"${ratioHint}${userHint}

OUTPUT: Hanya SUPER PROMPT final dalam satu paragraf padat bahasa Inggris, siap langsung di-paste. Jangan ada pembuka, penutup, atau penjelasan meta.`;

      const result = await analyzeImageWithGemini(geminiKey, uploadedImage, analysisPrompt, aiModel || 'gemini-2.5-flash');
      const cleaned = cleanMarkdown(result);
      setUpgradedPrompt(cleaned);

      // log to history
      addHistory({
        type: 'mega-prompt',
        category: 'Photo to Prompt',
        title: rawInput.trim() ? rawInput.trim().slice(0, 80) : 'Analisa foto',
        content: cleaned,
        meta: { aspectRatio, hasImage: true },
      });
    } catch (err) {
      setError(err.message || 'Gagal menganalisa foto.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleUpgrade = async () => {
    if (activeMode === 'photoToPrompt') {
      await handlePhotoToPrompt();
      return;
    }

    const input = rawInput.trim();
    if (!input) {
      setError('Tulis dulu atau rekam suaramu dulu ya.');
      return;
    }
    
    const apiKey = getApiKey();
    if (!apiKey) {
      setError(`API Key ${aiProvider.toUpperCase()} belum diatur di menu Pengaturan.`);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setIsUpgrading(true);
    setError('');
    setUpgradedPrompt('');
    setCopied(false);

    try {
      const systemPrompt = buildSystemPrompt(activeMode, input);
      const result = await generateContent(apiKey, systemPrompt, aiProvider, aiModel);
      const cleaned = activeMode === 'storyboard' ? result : cleanMarkdown(result);
      setUpgradedPrompt(cleaned);

      // log to history
      const currentMode = MODES.find(m => m.id === activeMode);
      addHistory({
        type: 'mega-prompt',
        category: currentMode?.label || activeMode,
        title: input.slice(0, 80),
        content: cleaned,
        meta: { aspectRatio: ASPECT_RATIOS[activeMode]?.length > 0 ? aspectRatio : null },
      });
    } catch (err) {
      setError(err.message || 'Gagal meng-upgrade prompt.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCopy = () => {
    if (!upgradedPrompt) return;
    navigator.clipboard.writeText(upgradedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentMode = MODES.find(m => m.id === activeMode);
  const displayRatios = ASPECT_RATIOS[activeMode] || [];
  const isPhotoMode = activeMode === 'photoToPrompt';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <style>{`
        @keyframes pulse-mic {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { box-shadow: 0 0 0 16px rgba(239, 68, 68, 0); }
        }
        .mic-listening { animation: pulse-mic 1.5s infinite; background: var(--danger) !important; }
        .mode-card {
          padding: 0.9rem;
          border-radius: 12px;
          border: 2px solid var(--border-color);
          background: var(--bg-card);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          text-align: left;
        }
        .mode-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .mode-card.active { border-width: 2px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .mode-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.6rem;
          margin-bottom: 2rem;
        }
        @media (max-width: 900px) {
          .mode-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 480px) {
          .mode-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ marginBottom: '0.5rem', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Wand2 size={32} /> Mega Prompt
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Dari ide simple jadi prompt super powerful. Ngomong, ketik, atau upload foto — lalu klik upgrade.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="mode-grid">
        {MODES.map(mode => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              className={`mode-card ${isActive ? 'active' : ''}`}
              onClick={() => setActiveMode(mode.id)}
              style={{
                borderColor: isActive ? mode.color : 'var(--border-color)',
                background: isActive ? `${mode.color}10` : 'var(--bg-card)',
              }}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '8px',
                background: mode.color, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {mode.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Current mode description */}
      <div style={{
        padding: '0.75rem 1rem',
        background: `${currentMode.color}10`,
        borderLeft: `3px solid ${currentMode.color}`,
        borderRadius: '8px',
        marginBottom: '1.5rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
      }}>
        {currentMode.description}
      </div>

      {/* Input Card */}
      <div className="card" style={{ marginBottom: '1.5rem', borderTop: `4px solid ${currentMode.color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <Sparkles size={18} color={currentMode.color} /> 
            {isPhotoMode ? 'Upload foto + catatan tambahan (opsional)' : 'Ide kamu (bisa ngawur, nanti kita upgrade)'}
          </h3>
          {(rawInput || uploadedImage) && (
            <button
              onClick={clearInput}
              className="btn"
              style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            >
              <Trash2 size={14} /> Reset
            </button>
          )}
        </div>

        {/* Photo upload area for photoToPrompt mode */}
        {isPhotoMode && (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            border: `2px dashed ${uploadedImage ? currentMode.color : 'var(--border-color)'}`,
            borderRadius: '12px',
            textAlign: 'center',
            background: 'var(--bg-main)',
          }}>
            {uploadedImage ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={uploadedImage} alt="preview" style={{ maxHeight: '240px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                <button
                  onClick={() => setUploadedImage(null)}
                  style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    background: 'var(--danger)', color: 'white', border: 'none',
                    width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                  aria-label="Hapus foto"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={36} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  Klik atau drop foto di sini (max 10MB)
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn"
                  style={{ background: currentMode.color, color: 'white', padding: '0.5rem 1.25rem', fontWeight: 600 }}
                >
                  <Upload size={16} /> Pilih Foto
                </button>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </div>
        )}

        {/* Text input */}
        <textarea
          className="input-field"
          rows={isPhotoMode ? 2 : 4}
          placeholder={isPhotoMode ? 'Catatan tambahan (opsional): misal "bikin style anime" atau "ganti baju jadi merah"' : currentMode.placeholder}
          value={rawInput + (interimText ? ' ' + interimText : '')}
          onChange={(e) => {
            setRawInput(e.target.value);
            finalTranscriptRef.current = e.target.value;
          }}
          style={{ marginBottom: '1rem', fontSize: '1rem' }}
          disabled={isListening}
        />

        {/* Voice + Aspect ratio controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <button
            onClick={toggleVoiceInput}
            className={`btn ${isListening ? 'mic-listening' : ''}`}
            style={{
              background: isListening ? 'var(--danger)' : currentMode.color,
              color: 'white',
              padding: '0.6rem 1rem',
              fontWeight: 600,
              minWidth: '170px',
            }}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            {isListening ? 'Berhenti Rekam' : 'Ngomong aja'}
          </button>

          {isListening && (
            <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', animation: 'pulse-mic 1s infinite' }} />
              Dengerin... (bicara aja, otomatis jadi teks)
            </span>
          )}

          {displayRatios.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Aspect:</label>
              <select
                className="input-field"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              >
                {displayRatios.map(r => (
                  <option key={r} value={r}>
                    {r === 'original' ? 'Original / Free' : r}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!voiceSupported && (
          <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginBottom: '0.75rem' }}>
            ⚠ Voice-to-text tidak didukung di browser ini. Pakai Chrome/Edge di HP atau laptop.
          </p>
        )}

        {/* Upgrade button */}
        <button
          className="btn btn-primary"
          onClick={handleUpgrade}
          disabled={isUpgrading || (isPhotoMode ? !uploadedImage : !rawInput.trim())}
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1rem',
            fontWeight: 700,
            background: isUpgrading ? '#cbd5e1' : `linear-gradient(135deg, ${currentMode.color}, var(--accent))`,
          }}
        >
          {isUpgrading ? <RefreshCw size={20} className="animate-spin" /> : <Wand2 size={20} />}
          {isUpgrading 
            ? (isPhotoMode ? 'Menganalisa foto...' : 'Meracik prompt super powerful...') 
            : (isPhotoMode ? 'ANALISA FOTO → JADI PROMPT' : 'UPGRADE Prompt Jadi Super Powerful')
          }
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{
          borderLeft: '4px solid var(--danger)',
          background: '#fef2f2',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
        }}>
          <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.9rem', color: '#991b1b' }}>{error}</div>
        </div>
      )}

      {/* Result */}
      {(upgradedPrompt || isUpgrading) && (
        <div className="card" style={{
          background: '#0f172a',
          color: '#e2e8f0',
          border: `1px solid ${currentMode.color}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0', fontSize: '1rem' }}>
              <Sparkles size={18} color={currentMode.color} /> Prompt Super Powerful
            </h3>
            {upgradedPrompt && (
              <button
                onClick={handleCopy}
                className="btn"
                style={{
                  background: copied ? 'var(--success)' : currentMode.color,
                  color: 'white',
                  padding: '0.4rem 0.9rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? 'Tersalin!' : 'Salin Prompt'}
              </button>
            )}
          </div>

          {isUpgrading && !upgradedPrompt && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <RefreshCw size={32} className="animate-spin" style={{ color: currentMode.color, marginBottom: '1rem' }} />
              <p style={{ color: '#94a3b8' }}>
                {isPhotoMode ? 'Gemini lagi baca fotomu...' : 'Lagi meracik prompt terbaik...'}
              </p>
            </div>
          )}

          {upgradedPrompt && (
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '1.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.05)',
              maxHeight: '600px',
              overflowY: 'auto',
              color: '#e2e8f0',
              lineHeight: 1.7
            }}>
              {activeMode === 'storyboard' ? (
                <MarkdownRenderer text={upgradedPrompt} />
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: "'Menlo', 'Monaco', monospace", fontSize: '0.9rem' }}>
                  {upgradedPrompt}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
