import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { generateContent } from '../utils/ai';
import { 
  Video, Sparkles, Clipboard, Download, Play, RefreshCw, 
  ShieldAlert, CheckCircle2, FileText, Globe, Info, Sliders, Eye,
  Camera, CameraOff, Square, Trash2, SlidersHorizontal
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
  const [scriptOnly, setScriptOnly] = useState(false);
  
  // Scraper State
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [scrapedContext, setScrapedContext] = useState('');

  // Output State
  const [scriptText, setScriptText] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState('');

  // Teleprompter & Recording State
  const [viewMode, setViewMode] = useState('text'); // 'text' | 'teleprompter'
  const [scrollActive, setScrollActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const teleprompterRef = useRef(null);

  // Video Recorder States
  const [cameraActive, setCameraActive] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [mirrorCamera, setMirrorCamera] = useState(false);
  const [mirrorOutput, setMirrorOutput] = useState(true);
  const [cameraResolution, setCameraResolution] = useState('720p'); // '720p' | '1080p'

  // Teleprompter Styling Customizations
  const [layoutMode, setLayoutMode] = useState('chroma'); // 'split' | 'overlay' | 'chroma'
  const [teleFontSize, setTeleFontSize] = useState(26); // in px (16 - 48)
  const [teleWidth, setTeleWidth] = useState(600); // in px (300 - 900)
  const [teleColor, setTeleColor] = useState('#22c55e'); // Green neon
  const [teleLineHeight] = useState(1.8);
  const [showGuide, setShowGuide] = useState(true);
  const [teleFlip, setTeleFlip] = useState(false);
  const [teleBgOpacity, setTeleBgOpacity] = useState(0.7); // 0.1 - 0.9
  const [pipCorner, setPipCorner] = useState('top-right'); // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);

  // Media references
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const getApiKey = () => {
    if (aiProvider === 'qodirsai') return 'qodirsai';
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return geminiKey;
  };

  // Enumerate video devices on mount or viewMode change
  useEffect(() => {
    if (viewMode === 'teleprompter') {
      navigator.mediaDevices.enumerateDevices()
        .then(deviceInfos => {
          const videoInputs = deviceInfos.filter(d => d.kind === 'videoinput');
          setDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDevice) {
            setSelectedDevice(videoInputs[0].deviceId);
          }
        })
        .catch(err => console.warn('Error listing video devices:', err));
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Handle selected camera device or resolution change
  useEffect(() => {
    if (cameraActive && viewMode === 'teleprompter') {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevice, cameraResolution]);

  // Handle recording timer ticks
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Compile chunks into a downloadable file URL after recording stops
  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0 && !recordedUrl) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecordedUrl(url);
    }
  }, [recordedChunks, isRecording, recordedUrl]);

  // Synchronize webcam stream to video element when it mounts
  useEffect(() => {
    if (cameraActive && streamRef.current && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive, selectedDevice]);

  async function startCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    const is1080p = cameraResolution === '1080p';
    const widthTarget = is1080p ? 1920 : 1280;
    const heightTarget = is1080p ? 1080 : 720;

    try {
      const constraints = {
        video: selectedDevice 
          ? { 
              deviceId: { exact: selectedDevice }, 
              width: { ideal: widthTarget }, 
              height: { ideal: heightTarget }, 
              frameRate: { ideal: 30 } 
            }
          : { 
              width: { ideal: widthTarget }, 
              height: { ideal: heightTarget }, 
              frameRate: { ideal: 30 } 
            },
        audio: { echoCancellation: true, noiseSuppression: true }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setRecordedUrl('');
      setRecordedChunks([]);
    } catch (err) {
      alert('Gagal mengakses kamera/mikrofon: ' + err.message);
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (isRecording) {
      handleStopRecording();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  function handleStartRecording() {
    if (!streamRef.current) {
      alert('Kamera belum aktif. Aktifkan kamera terlebih dahulu.');
      return;
    }
    setRecordedChunks([]);
    setRecordedUrl('');
    setRecordingTime(0);

    let recorder;
    const candidates = [
      'video/webm;codecs=vp8',
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9',
      'video/webm',
      'video/mp4;codecs=h264',
      'video/mp4'
    ];

    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        try {
          recorder = new MediaRecorder(streamRef.current, { mimeType: mime });
          console.log('Menggunakan codec:', mime);
          break;
        } catch {
          // Lanjutkan ke kandidat berikutnya
        }
      }
    }

    if (!recorder) {
      recorder = new MediaRecorder(streamRef.current);
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        setRecordedChunks(prev => [...prev, event.data]);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
    
    // Auto reset and start scroll
    if (teleprompterRef.current) {
      teleprompterRef.current.scrollTop = 0;
    }
    scrollPosRef.current = 0;
    setScrollActive(true);
  }

  function handleStopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setScrollActive(false);
  }

  const handleDownloadVideo = () => {
    if (!recordedUrl) return;
    const a = document.createElement('a');
    a.href = recordedUrl;
    a.download = `rekaman_creator_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const scrollPosRef = useRef(0);

  // Synchronize scroll float ref when scrolling starts
  useEffect(() => {
    if (teleprompterRef.current) {
      scrollPosRef.current = teleprompterRef.current.scrollTop;
    }
  }, [scrollActive]);

  // Teleprompter scroll logic (smooth requestAnimationFrame scroll using sub-pixel float ref)
  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    
    const scroll = (time) => {
      if (scrollActive && viewMode === 'teleprompter' && teleprompterRef.current) {
        const delta = time - lastTime;
        // Cap the maximum delta step to 33ms (equivalent to a 30fps drop) to prevent
        // sudden huge jumps of text if the CPU bottlenecks during webcam encoding.
        const cappedDelta = Math.min(delta, 33);
        const pixelsToScroll = (scrollSpeed * cappedDelta) / 50;
        scrollPosRef.current += pixelsToScroll;
        teleprompterRef.current.scrollTop = Math.round(scrollPosRef.current);
      }
      lastTime = time;
      if (scrollActive && viewMode === 'teleprompter') {
        animationFrameId = requestAnimationFrame(scroll);
      }
    };
    
    if (scrollActive && viewMode === 'teleprompter') {
      animationFrameId = requestAnimationFrame(scroll);
    }
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [scrollActive, scrollSpeed, viewMode]);

  const handleTeleprompterScroll = () => {
    if (scrollActive) return;
    if (teleprompterRef.current) {
      scrollPosRef.current = teleprompterRef.current.scrollTop;
    }
  };

  // Clean Markdown and Script Cues utility
  const cleanMarkdown = (text, isScriptOnly = false) => {
    if (!text) return '';
    let out = text;
    
    // Remove code fences
    out = out.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
    
    if (isScriptOnly) {
      // Remove bracketed visual/audio/scene directions (e.g. [Visual: ...], [BGM: ...], [Scene 1])
      out = out.replace(/\[[^\]]*\]/g, '');
      
      // Remove parenthesized directions (e.g. (SFX: ...), (BGM: ...), (Scene ...))
      out = out.replace(/\((SFX|BGM|Musik|Audio|Scene|Adegan|Visual|Efek|Transition|Transisi)[^)]*\)/gim, '');
      
      // Remove speaker labels at the beginning of lines (e.g. Narator:, VO:, Kreator:, Host:)
      out = out.replace(/^[\s]*(Narator|Pembicara|VO|Voiceover|Voice Over|Kreator|Host|Speaker|Presenter)\s*:\s*/gim, '');
      out = out.replace(/\n[\s]*(Narator|Pembicara|VO|Voiceover|Voice Over|Kreator|Host|Speaker|Presenter)\s*:\s*/gim, '\n');
    }
    
    // Remove standard markdown formatting
    out = out.replace(/\*\*(.+?)\*\*/g, '$1');
    out = out.replace(/__(.+?)__/g, '$1');
    out = out.replace(/\*(.+?)\*/g, '$1');
    out = out.replace(/_(.+?)_/g, '$1');
    out = out.replace(/^#{1,6}\s+/gm, '');
    out = out.replace(/^[\s]*[-*+]\s+/gm, '');
    out = out.replace(/`([^`]+)`/g, '$1');
    out = out.replace(/^>\s+/gm, '');
    
    // Collapse blank lines
    out = out.replace(/\n{3,}/g, '\n\n');
    return out.trim();
  };

  // Scraper proxy
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
    throw lastError || new Error('All proxies failed.');
  };

  const handleScrapeLink = async () => {
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
      
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Link Video / Halaman';

      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) ||
                         html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i);
      const description = descMatch ? descMatch[1].trim() : '';

      const context = `[Hasil Scraping Link]\nJudul Video/Halaman: ${title}\nRingkasan/Deskripsi: ${description}`;
      setScrapedContext(context);
      setIdea(`Buat konten terinspirasi dari video ini: "${title}". Deskripsi video: "${description}"`);
    } catch {
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
    setViewMode('text');
    setScrollActive(false);

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

    let systemPrompt;
    
    if (scriptOnly) {
      systemPrompt = `Kamu adalah seorang "Mega Creator" dan Penulis Naskah Konten kelas dunia. Tugasmu adalah membuat naskah video/konten yang viral-friendly dan siap dibaca untuk dubbing/voiceover berdasarkan ide pengguna.

INPUT PENGGUNA:
- Ide / Topik / Konteks: "${idea}"
- Gaya Konten: "${styleNames[contentStyle]}"
- Nuansa Konten (Tone): "${toneNames[tone]}"
- Platform Target: "${platformNames[platform]}"
- Durasi: "${durationNames[duration]}"

ATURAN NASKAH WAJIB (SCRIPT ONLY):
- Hasilkan HANYA naskah narasi / dialog suara (Voiceover / VO) yang akan dibaca langsung oleh pembicara dari awal sampai akhir.
- JANGAN sertakan panduan visual, adegan (scene), audio/SFX, tips editing, atau penanda visual lainnya.
- JANGAN gunakan simbol markdown tebal/miring (** atau *).
- Tulis langsung teks narasi dalam bentuk paragraf-paragraf bersih yang siap dibaca mengalir.

Gunakan Bahasa Indonesia yang kasual, kekinian, dan mudah dicerna (sesuai gaya kreator konten modern seperti Samuel Christ). Jangan sertakan kata pengantar atau penutup lain di luar naskah tersebut.`;
    } else {
      systemPrompt = `Kamu adalah seorang "Mega Creator" dan Penulis Naskah Konten kelas dunia. Tugasmu adalah membuat naskah video/konten yang sangat terstruktur, viral-friendly, dan profesional berdasarkan input pengguna.

INPUT PENGGUNA:
- Ide / Topik / Konteks: "${idea}"
- Gaya Konten: "${styleNames[contentStyle]}"
- Nuansa Konten (Tone): "${toneNames[tone]}"
- Platform Target: "${platformNames[platform]}"
- Durasi: "${durationNames[duration]}"

Hasilkan naskah yang sangat terperinci dalam format TEKS BERSIH (PLAIN TEXT) tanpa formatting markdown tebal/miring/heading yang mengganggu saat dibaca.

PANDUAN NASKAH WAJIB:
- JANGAN gunakan simbol bintang (* atau **) untuk menebalkan teks.
- JANGAN gunakan pagar (#) untuk judul. Tulis judul dengan huruf kapital biasa saja.
- Sediakan pembagian scene yang rapi dan pisahkan baris dialog dengan jelas agar bisa langsung dibaca untuk dubbing.

Struktur Naskah harus mencakup:
1. PERENCANAAN VIRAL (VIRAL METRICS): Tujuan konten, target audiens, dan viral hook trigger angle.
2. DRAFT NASKAH STRUKTUR (SCENE BY SCENE):
   Format per adegan:
   Scene X: (Waktu/Durasi)
   Visual & Overlay: [Deskripsi visual di layar]
   Audio BGM/SFX: [Efek suara dan jenis lagu]
   Dialog / Narasi: [Teks kalimat yang harus dibaca secara lisan oleh kreator untuk dubbing]
3. TIPS PRODUKSI & EDITING.

Gunakan Bahasa Indonesia yang kasual, kekinian, dan mudah dicerna (sesuai gaya kreator konten modern seperti Samuel Christ). Jangan sertakan kata pengantar atau penutup lain di luar naskah tersebut.`;
    }

  try {
      const response = await generateContent(apiKey, systemPrompt, aiProvider, aiModel);
      const cleaned = cleanMarkdown(response, scriptOnly);
      setScriptText(cleaned);

      addHistory({
        type: 'script',
        category: 'Mega Creator',
        title: idea.slice(0, 80),
        content: cleaned,
        meta: { contentStyle, tone, platform, scriptOnly }
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
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient responsive-title" style={{ marginBottom: '0.5rem', fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Video size={36} /> Mega Creator Studio
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Susun naskah video viral terstruktur berdasar gaya buku "Mega Creator". Tempel ide, artikel, atau link YouTube Anda.
        </p>
      </div>

      <div className="mega-creator-workspace-grid">
        
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

            {/* Script Only Checkbox */}
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={scriptOnly} 
                  onChange={(e) => setScriptOnly(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  disabled={isGenerating}
                />
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Script Only (Hanya Narasi Dubbing saja)</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '1.7rem', marginTop: '0.2rem', lineHeight: 1.4 }}>
                Jika dicentang, AI hanya akan menghasilkan kalimat suara pembicara saja (tanpa instruksi visual/SFX) untuk mempermudah dubbing langsung.
              </p>
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
            
            {scriptText !== null && (
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div style={{ 
                  display: 'flex', background: 'var(--bg-main)', padding: '0.2rem', 
                  borderRadius: '6px', border: '1px solid var(--border-color)', marginRight: '0.25rem' 
                }}>
                  <button
                    className="btn"
                    onClick={() => setViewMode('text')}
                    style={{ 
                      padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderRadius: '4px',
                      background: viewMode === 'text' ? 'var(--bg-card)' : 'transparent',
                      color: viewMode === 'text' ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                  >
                    Teks Bersih
                  </button>
                  <button
                    className="btn"
                    onClick={() => setViewMode('teleprompter')}
                    style={{ 
                      padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderRadius: '4px',
                      background: viewMode === 'teleprompter' ? 'var(--bg-card)' : 'transparent',
                      color: viewMode === 'teleprompter' ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <Eye size={12} /> Mode Baca
                  </button>
                </div>

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
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    if (window.confirm("Hapus naskah ini?")) {
                      setScriptText(null);
                      setViewMode('text');
                    }
                  }}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  title="Hapus Naskah"
                >
                  <Trash2 size={12} /> Hapus
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
          ) : scriptText !== null ? (
            viewMode === 'text' ? (
              <textarea
                className="input-field"
                value={scriptText || ''}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Tulis atau tempel naskah Anda di sini untuk langsung menggunakan teleprompter..."
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
                  resize: 'vertical'
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.75rem', position: 'relative' }}>
                <style>{`
                  .teleprompter-scrollbar::-webkit-scrollbar {
                    width: 6px;
                  }
                  .teleprompter-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .teleprompter-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.25);
                    border-radius: 3px;
                  }
                  .teleprompter-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.45);
                  }
                  @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                  }
                  @keyframes pulse-rec {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                  }
                `}</style>

                {/* 1. Header Toolbar: Control Scroll & Recording */}
                <div style={{ 
                  display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-color)',
                  flexWrap: 'wrap'
                }}>
                  {/* Play/Pause & Speed */}
                  <div className="teleprompter-play-controls">
                    <button
                      className="btn"
                      onClick={() => setScrollActive(!scrollActive)}
                      style={{ 
                        padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 'bold',
                        background: scrollActive ? 'var(--danger)' : 'var(--primary)',
                        color: 'white',
                        minWidth: '90px'
                      }}
                    >
                      {scrollActive ? 'Pause' : 'Auto Scroll'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        if (teleprompterRef.current) teleprompterRef.current.scrollTop = 0;
                        scrollPosRef.current = 0;
                        setScrollActive(false);
                      }}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                    >
                      Reset
                    </button>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Kecepatan:</span>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={scrollSpeed} 
                        onChange={(e) => setScrollSpeed(Number(e.target.value))} 
                        style={{ width: '85px', height: '4px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{scrollSpeed}</span>
                    </div>

                    {/* Quick Font Color Selector */}
                    <div className="teleprompter-quick-colors">
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Warna:</span>
                      {[
                        { name: 'Hijau', value: '#22c55e' },
                        { name: 'Putih', value: '#ffffff' },
                        { name: 'Kuning', value: '#facc15' },
                        { name: 'Cyan', value: '#22d3ee' },
                        { name: 'Merah', value: '#ef4444' }
                      ].map(c => (
                        <button
                          key={c.value}
                          onClick={() => setTeleColor(c.value)}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: c.value,
                            border: teleColor === c.value ? '2px solid var(--primary)' : '1px solid #666',
                            cursor: 'pointer',
                            padding: 0,
                            boxShadow: teleColor === c.value ? `0 0 4px ${c.value}` : 'none',
                            transition: 'all 0.15s ease'
                          }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Camera Controls */}
                  <div className="teleprompter-camera-controls">
                    {/* Device Selector */}
                    {devices.length > 0 && cameraActive && (
                      <select
                        className="input-field teleprompter-device-select"
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '32px' }}
                      >
                        {devices.map(d => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Kamera ${d.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Resolution Selector */}
                    {cameraActive && (
                      <select
                        className="input-field teleprompter-res-select"
                        value={cameraResolution}
                        onChange={(e) => setCameraResolution(e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '32px' }}
                        title="Pilih Resolusi Perekaman"
                      >
                        <option value="720p">720p HD</option>
                        <option value="1080p">1080p FHD</option>
                      </select>
                    )}

                    {/* Camera Toggle */}
                    <button
                      className={`btn ${cameraActive ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={cameraActive ? stopCamera : startCamera}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', height: '32px' }}
                      title={cameraActive ? "Matikan Kamera" : "Aktifkan Kamera"}
                    >
                      {cameraActive ? <CameraOff size={14} /> : <Camera size={14} />}
                      {cameraActive ? 'Cam Off' : 'Kamera'}
                    </button>

                    {/* Mirror Camera Preview Toggle */}
                    {cameraActive && (
                      <button
                        className={`btn ${mirrorCamera ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMirrorCamera(!mirrorCamera)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', height: '32px' }}
                        title="Mirror Tampilan Kamera (Live Preview)"
                      >
                        Mirror Cam: {mirrorCamera ? 'ON' : 'OFF'}
                      </button>
                    )}

                    {/* Mirror Recorded Output Toggle */}
                    {cameraActive && (
                      <button
                        className={`btn ${mirrorOutput ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMirrorOutput(!mirrorOutput)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', height: '32px' }}
                        title="Mirror Hasil Video Rekaman"
                      >
                        Mirror Hasil: {mirrorOutput ? 'ON' : 'OFF'}
                      </button>
                    )}

                    {/* Record Action */}
                    {cameraActive && (
                      <button
                        className="btn"
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        style={{ 
                          padding: '0.4rem 0.85rem', fontSize: '0.8rem', height: '32px',
                          background: isRecording ? '#ef4444' : '#dc2626',
                          color: 'white',
                          fontWeight: 'bold',
                          animation: isRecording ? 'pulse-rec 1.5s infinite' : 'none'
                        }}
                      >
                        {isRecording ? <Square size={12} fill="white" /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                        {isRecording ? `Stop (${formatTime(recordingTime)})` : 'Mulai Rekam'}
                      </button>
                    )}

                    {/* Customize Styles Toggle */}
                    <button
                      className={`btn ${showCustomizePanel ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setShowCustomizePanel(!showCustomizePanel)}
                      style={{ padding: '0.4rem', fontSize: '0.8rem', height: '32px' }}
                      title="Kustomisasi Teleprompter"
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* 2. Style & Layout Customization Drawer */}
                {showCustomizePanel && (
                  <div style={{
                    padding: '1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                    borderRadius: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1rem', animation: 'slideDownFade 0.2s ease-out'
                  }}>
                    {/* Layout Mode */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Layout Studio</label>
                      <select
                        className="input-field"
                        value={layoutMode}
                        onChange={(e) => setLayoutMode(e.target.value)}
                        style={{ padding: '0.35rem', fontSize: '0.8rem', height: '34px' }}
                      >
                        <option value="chroma">Chroma (Background Video)</option>
                        <option value="split">Split (Berdampingan)</option>
                        <option value="overlay">Floating Overlay (PiP)</option>
                      </select>
                    </div>

                    {/* Font Size */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Ukuran Font: {teleFontSize}px</label>
                      <input 
                        type="range" min="16" max="48" value={teleFontSize}
                        onChange={(e) => setTeleFontSize(Number(e.target.value))}
                        style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Column Width */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Lebar Kolom: {teleWidth}px</label>
                      <input 
                        type="range" min="300" max="900" value={teleWidth}
                        onChange={(e) => setTeleWidth(Number(e.target.value))}
                        style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Text Color */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Warna Teks</label>
                      <select
                        className="input-field"
                        value={teleColor}
                        onChange={(e) => setTeleColor(e.target.value)}
                        style={{ padding: '0.35rem', fontSize: '0.8rem', height: '34px' }}
                      >
                        <option value="#22c55e">Hijau Neon</option>
                        <option value="#ffffff">Putih Bersih</option>
                        <option value="#facc15">Kuning Cerah</option>
                        <option value="#22d3ee">Cyan Aqua</option>
                      </select>
                    </div>

                    {/* Background Opacity (Chroma Mode) */}
                    {layoutMode === 'chroma' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Kegelapan BG: {Math.round(teleBgOpacity*100)}%</label>
                        <input 
                          type="range" min="0.1" max="0.9" step="0.1" value={teleBgOpacity}
                          onChange={(e) => setTeleBgOpacity(Number(e.target.value))}
                          style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                        />
                      </div>
                    )}

                    {/* Resolution Selector in Drawer */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Resolusi Kamera</label>
                      <select
                        className="input-field"
                        value={cameraResolution}
                        onChange={(e) => setCameraResolution(e.target.value)}
                        style={{ padding: '0.35rem', fontSize: '0.8rem', height: '34px' }}
                      >
                        <option value="720p">720p HD (Ringan & Mulus)</option>
                        <option value="1080p">1080p FHD (Kualitas Tinggi)</option>
                      </select>
                    </div>

                    {/* Toggles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', justifyContent: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                        <input type="checkbox" checked={showGuide} onChange={(e) => setShowGuide(e.target.checked)} />
                        Garis Batas Baca
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                        <input type="checkbox" checked={teleFlip} onChange={(e) => setTeleFlip(e.target.checked)} />
                        Mirror Teks (Reflektor)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                        <input type="checkbox" checked={mirrorCamera} onChange={(e) => setMirrorCamera(e.target.checked)} />
                        Mirror Kamera Preview
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                        <input type="checkbox" checked={mirrorOutput} onChange={(e) => setMirrorOutput(e.target.checked)} />
                        Mirror Hasil Video
                      </label>
                    </div>
                  </div>
                )}

                {/* 3. Main Studio Workspace Layout */}
                <div className={`teleprompter-studio-container layout-${layoutMode}`}>
                  {/* CAMERA VIEW LAYER / ELEMENT */}
                  {cameraActive && (
                    <div 
                      className={`teleprompter-camera-layer camera-layout-${layoutMode}`}
                      style={
                        layoutMode === 'overlay'
                          ? {
                              top: pipCorner.includes('top') ? '10px' : 'auto',
                              bottom: pipCorner.includes('bottom') ? '10px' : 'auto',
                              left: pipCorner.includes('left') ? '10px' : 'auto',
                              right: pipCorner.includes('right') ? '10px' : 'auto'
                            }
                          : undefined
                      }
                      onClick={layoutMode === 'overlay' ? () => {
                        const corners = ['top-right', 'top-left', 'bottom-left', 'bottom-right'];
                        const nextIdx = (corners.indexOf(pipCorner) + 1) % corners.length;
                        setPipCorner(corners[nextIdx]);
                      } : undefined}
                      title={layoutMode === 'overlay' ? "Klik untuk memindahkan sudut kamera" : undefined}
                    >
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: mirrorCamera ? 'scaleX(-1)' : 'none'
                        }}
                      />
                      {/* Recording indicator overlay */}
                      {isRecording && (
                        <div style={{
                          position: 'absolute', top: '10px', left: '10px',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px',
                          zIndex: 12
                        }}>
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4d',
                            display: 'inline-block', animation: 'blink 1.2s infinite'
                          }} />
                          <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 'bold' }}>REK</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CHROMA BG DARK OVERLAY */}
                  {cameraActive && layoutMode === 'chroma' && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: `rgba(0, 0, 0, ${teleBgOpacity})`,
                      zIndex: 2,
                      pointerEvents: 'none'
                    }} />
                  )}

                  {/* TELEPROMPTER SCREEN */}
                  <div className={`teleprompter-screen-wrapper ${cameraActive && layoutMode === 'split' ? 'split-active' : ''}`} style={{
                    background: cameraActive && layoutMode === 'chroma' ? 'transparent' : '#000'
                  }}>
                    {/* Focus line indicator */}
                    {showGuide && (
                      <div style={{
                        position: 'absolute',
                        top: '35%',
                        left: '20px',
                        right: '20px',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.5) 15%, rgba(239, 68, 68, 0.5) 85%, transparent)',
                        pointerEvents: 'none',
                        zIndex: 5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ color: '#ef4444', fontSize: '0.65rem', background: '#000', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)' }}>BACA DISINI</span>
                        <span style={{ color: '#ef4444', fontSize: '0.65rem', background: '#000', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)' }}>BACA DISINI</span>
                      </div>
                    )}

                    <div 
                      ref={teleprompterRef}
                      onScroll={handleTeleprompterScroll}
                      className="teleprompter-text-viewport teleprompter-scrollbar"
                      style={{
                        width: '100%',
                        maxWidth: `${teleWidth}px`,
                        fontSize: `${teleFontSize}px`,
                        lineHeight: teleLineHeight,
                        color: teleColor,
                        transform: teleFlip ? 'scaleX(-1)' : 'none'
                      }}
                    >
                      {scriptText}
                    </div>
                  </div>
                </div>

                {/* 4. Post-Recording Review & Action Drawer */}
                {recordedUrl && (
                  <div className="card" style={{ 
                    border: '1px solid var(--success)', background: 'rgba(16, 185, 129, 0.04)', 
                    marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    animation: 'slideUpFade 0.3s ease-out'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <CheckCircle2 size={16} /> Rekaman Video Berhasil Dibuat!
                      </h4>
                      <div className="recorded-actions-wrapper">
                        <button className="btn btn-primary" onClick={handleDownloadVideo} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                          <Download size={14} /> Download Rekaman Video
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => {
                            if (window.confirm("Hapus rekaman sementara ini?")) {
                              setRecordedUrl('');
                              setRecordedChunks([]);
                            }
                          }}
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      </div>
                    </div>
                    
                    {/* Embedded preview of the recorded video */}
                    <div style={{ display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '8px', overflow: 'hidden', maxHeight: '200px' }}>
                      <video 
                        src={recordedUrl} 
                        controls 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '200px',
                          transform: mirrorOutput ? 'scaleX(-1)' : 'none'
                        }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-secondary)', padding: '3rem 0', gap: '1rem' }}>
              <Sliders size={36} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem', textAlign: 'center', maxWidth: '300px', margin: 0 }}>
                Isi ide atau link di kolom kiri, atur konfigurasi, lalu klik generate untuk melihat naskah Anda.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '80%', maxWidth: '200px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>ATAU</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setScriptText('');
                  setViewMode('text');
                }}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                + Tulis Naskah Manual
              </button>
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
