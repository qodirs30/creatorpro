import { useState, useEffect, useRef, useCallback } from 'react';
import useAppStore from '../store/useAppStore';
import { 
  Sparkles, Trash2, Send, Calendar, DollarSign, 
  User, Quote, FileText, MessageSquare, X, 
  Settings, RefreshCw, AlertCircle, CheckCircle2,
  Paperclip, File, Edit3, LogOut,
  Upload, Save, Eye, Search
} from 'lucide-react';
import { 
  extractMemexCard, 
  generateCompanionChat, 
  extractMemexCardWithMultimodal,
  extractDocumentToMarkdown
} from '../utils/ai';
import { 
  logoutFirebase,
  uploadBackupToDatabase, 
  downloadBackupFromDatabase,
  addPushSubscription,
  removePushSubscription
} from '../utils/firebase';
import MarkdownRenderer from '../components/MarkdownRenderer';
import NeracaDashboard from '../components/NeracaDashboard';

// Helper to extract selectable text from PDF files using PDF.js locally in the browser
const extractTextFromPdf = (file) => {
  return new Promise((resolve, reject) => {
    const runExtraction = async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            const pdfjsLib = window.pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
            const pdf = await loadingTask.promise;
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const items = textContent.items;
              
              // Group items by line Y-coordinate (within 5px threshold)
              const lines = {};
              items.forEach(item => {
                const transform = item.transform;
                const y = Math.round(transform[5]);
                let foundY = Object.keys(lines).find(existingY => Math.abs(existingY - y) < 5);
                if (foundY) {
                  lines[foundY].push(item);
                } else {
                  lines[y] = [item];
                }
              });
              
              // Sort lines by Y descending (top to bottom)
              const sortedY = Object.keys(lines).sort((a, b) => b - a);
              let pageText = '';
              sortedY.forEach(y => {
                // Sort items on the same line by X coordinate ascending (left to right)
                const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
                const lineStr = lineItems.map(item => item.str).join(' ');
                pageText += lineStr + '\n';
              });
              
              fullText += `--- Halaman ${i} ---\n${pageText}\n\n`;
            }
            resolve(fullText);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Gagal membaca berkas PDF.'));
        reader.readAsArrayBuffer(file);
      } catch (err) {
        reject(err);
      }
    };

    if (window.pdfjsLib) {
      runExtraction();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        runExtraction();
      };
      script.onerror = () => {
        reject(new Error('Gagal memuat pustaka parser PDF.js dari CDN.'));
      };
      document.head.appendChild(script);
    }
  });
};

export default function MemexJournal() {
  const { 
    memexCards, addMemexCard, deleteMemexCard, updateMemexCard,
    memexCompanion, updateMemexCompanion,
    memexChats, addMemexChat, clearMemexChats,
    geminiKey, groqKey, openAiKey,
    aiProvider, aiModel,
    firebaseUser, isAuthActive, restoreBackup,
    habits, scripts, socialPosts, counters, activityLog, history,
    sukiKnowledge, setSukiKnowledge, addHistory, logActivity, removeActivityLog
  } = useAppStore();

  const [textCapture, setTextCapture] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loadingCapture, setLoadingCapture] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [mobileActiveView, setMobileActiveView] = useState('journal'); // 'journal' | 'chat'
  
  // State untuk Fitur Upload File (PDF, TXT, Gambar)
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDataUrl, setFileDataUrl] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // State untuk Fitur Upload File di Chat Suki
  const [chatSelectedFile, setChatSelectedFile] = useState(null);
  const [chatFileDataUrl, setChatFileDataUrl] = useState(null);
  const chatFileInputRef = useRef(null);

  // Kustomisasi Companion
  const [compName, setCompName] = useState(memexCompanion.name);
  const [compAvatar, setCompAvatar] = useState(memexCompanion.avatar);
  const [compPrompt, setCompPrompt] = useState(memexCompanion.customPrompt);
  const [compMode, setCompMode] = useState(memexCompanion.mode || 'default');
  const [compPreset, setCompPreset] = useState(memexCompanion.preset || 'bad');
  const [compPersonality, setCompPersonality] = useState(memexCompanion.personalityPrompt || 'Kamu suka bercanda dan selalu santai.');
  const [compHardPrompt, setCompHardPrompt] = useState(memexCompanion.customHardPrompt || '');

  // State untuk Editor & Markdown Modal
  const [editingCard, setEditingCard] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('read'); // 'read' | 'edit'

  // State untuk Google Drive Sync
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(localStorage.getItem('memex_last_sync') || null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // State untuk Suki Knowledge Catalog
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeErrorMsg, setKnowledgeErrorMsg] = useState('');
  const [knowledgeSuccessMsg, setKnowledgeSuccessMsg] = useState('');
  const [knowledgeDragActive, setKnowledgeDragActive] = useState(false);
  const [knowledgeActiveTab, setKnowledgeActiveTab] = useState('preview'); // 'preview' | 'edit'
  const [knowledgeEditingContent, setKnowledgeEditingContent] = useState(sukiKnowledge?.content || '');
  const [knowledgeSearchTerm, setKnowledgeSearchTerm] = useState('');
  const knowledgeFileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync editing text area with store if updated outside
  useEffect(() => {
    if (sukiKnowledge?.content !== knowledgeEditingContent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKnowledgeEditingContent(sukiKnowledge?.content || '');
    }
  }, [sukiKnowledge, knowledgeEditingContent]);

  // Intercept Ctrl+F / Cmd+F when in Suki Knowledge tab to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        if (activeTab === 'suki-knowledge') {
          e.preventDefault();
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Cek status notifikasi aktif di browser/device ini
  useEffect(() => {
    const checkStatus = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window && firebaseUser) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          setNotificationsEnabled(!!sub);
        } catch (e) {
          console.warn('Gagal membaca push subscription status:', e);
        }
      }
    };
    checkStatus();
  }, [firebaseUser]);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleToggleNotifications = async () => {
    if (!firebaseUser) {
      alert('Harap masuk/login terlebih dahulu untuk mengaktifkan notifikasi.');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Perangkat atau browser Anda tidak mendukung Web Push Notifications.');
      return;
    }

    setNotificationLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();

      if (existingSub) {
        // Toggle OFF: Unsubscribe
        await existingSub.unsubscribe();
        await removePushSubscription(firebaseUser.uid, existingSub.endpoint);
        setNotificationsEnabled(false);
        alert('Notifikasi Pengingat Suki dinonaktifkan.');
      } else {
        // Toggle ON: Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Izin notifikasi ditolak. Silakan aktifkan izin notifikasi di pengaturan browser Anda.');
          setNotificationLoading(false);
          return;
        }

        const publicVapidKey = 'BM9MIyqrEyZE14pDk4Jw3kicLqKhJARFkWjyDFlatpqdjU9zDcXzJEM4qaD86FsjXI7E9l3ltGlri_CtmBEaDiU';
        const convertedKey = urlBase64ToUint8Array(publicVapidKey);

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        // Simpan ke Firebase DB
        await addPushSubscription(firebaseUser.uid, sub.toJSON());
        setNotificationsEnabled(true);
        alert('Notifikasi Pengingat Suki aktif untuk perangkat ini! 🎉');
      }
    } catch (err) {
      console.error('Gagal memproses toggle notifikasi:', err);
      alert('Gagal mengaktifkan notifikasi: ' + err.message);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!firebaseUser) return;
    setNotificationLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        alert('Aktifkan notifikasi terlebih dahulu sebelum melakukan tes.');
        setNotificationLoading(false);
        return;
      }

      const response = await fetch('/.netlify/functions/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          title: `🦊 ${memexCompanion.name}`,
          message: `Oi! Ini tes notifikasi langsung dari ${memexCompanion.name}. Koneksi Web Push lo udah jalan lancar jaya! 👍`
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal mengirim push.');
      }
      alert('Tes notifikasi berhasil dikirim! Silakan periksa layar perangkat Anda.');
    } catch (err) {
      console.error('Gagal mengirim tes notifikasi:', err);
      alert('Gagal mengirim tes notifikasi: ' + err.message);
    } finally {
      setNotificationLoading(false);
    }
  };

  // Helper to merge data by ID with timestamp conflict resolution
  const mergeData = (local, cloud) => {
    if (!cloud) return local;
    
    const mergeArray = (localArr, cloudArr, key = 'id') => {
      const lArr = Array.isArray(localArr) ? localArr : [];
      const cArr = Array.isArray(cloudArr) ? cloudArr : [];
      const map = new Map();
      cArr.forEach(item => {
        if (item && item[key]) map.set(item[key], item);
      });
      lArr.forEach(item => {
        if (item && item[key]) {
          const cloudItem = map.get(item[key]);
          if (!cloudItem) {
            map.set(item[key], item);
          } else {
            const localTime = new Date(item.updatedAt || item.createdAt || item.date || 0).getTime();
            const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || cloudItem.date || 0).getTime();
            if (localTime > cloudTime) {
              map.set(item[key], item);
            }
          }
        }
      });
      return Array.from(map.values());
    };

    let mergedSukiKnowledge = local?.sukiKnowledge || { content: '', updatedAt: new Date(0).toISOString() };
    if (cloud?.sukiKnowledge) {
      const localTime = new Date(mergedSukiKnowledge.updatedAt || 0).getTime();
      const cloudTime = new Date(cloud.sukiKnowledge.updatedAt || 0).getTime();
      if (cloudTime > localTime) {
        mergedSukiKnowledge = cloud.sukiKnowledge;
      }
    }

    return {
      memexCards: mergeArray(local?.memexCards, cloud?.memexCards),
      habits: mergeArray(local?.habits, cloud?.habits),
      scripts: mergeArray(local?.scripts, cloud?.scripts),
      socialPosts: mergeArray(local?.socialPosts, cloud?.socialPosts),
      counters: mergeArray(local?.counters, cloud?.counters),
      activityLog: mergeArray(local?.activityLog, cloud?.activityLog),
      history: mergeArray(local?.history, cloud?.history),
      sukiKnowledge: mergedSukiKnowledge,
      memexChats: mergeArray(local?.memexChats, cloud?.memexChats).sort((a, b) => {
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
      }),
    };
  };

  const handleManualSync = async () => {
    if (!firebaseUser) return;
    setSyncingCloud(true);
    try {
      const cloudData = await downloadBackupFromDatabase(firebaseUser.uid);
      const localData = { 
        memexCards: memexCards || [], 
        habits: habits || [], 
        scripts: scripts || [], 
        socialPosts: socialPosts || [], 
        counters: counters || [], 
        activityLog: activityLog || [], 
        history: history || [],
        sukiKnowledge: sukiKnowledge || { content: '', updatedAt: new Date(0).toISOString() },
        memexChats: memexChats || [],
      };
      if (cloudData) {
        const merged = mergeData(localData, cloudData);
        restoreBackup(merged);
        await uploadBackupToDatabase(firebaseUser.uid, merged);
        const nowStr = new Date().toISOString();
        localStorage.setItem('memex_last_sync', nowStr);
        setLastSyncTime(nowStr);
        alert('Sinkronisasi cloud berhasil!');
      } else {
        await uploadBackupToDatabase(firebaseUser.uid, localData);
        const nowStr = new Date().toISOString();
        localStorage.setItem('memex_last_sync', nowStr);
        setLastSyncTime(nowStr);
        alert('Data lokal berhasil diunggah ke cloud (karena cloud kosong)!');
      }
    } catch (error) {
      console.error("Gagal sinkronisasi manual Firebase:", error);
      alert("Gagal sinkronisasi: " + error.message);
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleFirebaseLogout = async () => {
    if (window.confirm("Apakah Anda yakin ingin keluar dari akun qodirsAi?")) {
      try {
        await logoutFirebase();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Parser Markdown Sederhana berbasis Regex (Dependency-Free & Ringan)
  const renderMarkdown = (text) => {
    if (!text) return { __html: '' };
    
    // Melindungi HTML tag bawaan agar tidak dieksekusi (XSS Protection)
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Konversi tag Markdown
    html = html
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br />');

    // Rapikan bullet points
    html = html.replace(/(<li>.*?<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');
    
    return { __html: html };
  };

  // Handler Menyimpan Perubahan Hasil Revisi Kartu (Lokal & Cloud)
  const handleSaveEditCard = async () => {
    if (!editingCard) return;

    if (!editingCard.title.trim()) {
      alert("Judul kartu tidak boleh kosong!");
      return;
    }

    if (editingCard.id) {
      const updatedCard = {
        ...editingCard,
        updatedAt: new Date().toISOString()
      };
      updateMemexCard(editingCard.id, updatedCard);
    } else {
      const newCard = {
        ...editingCard,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMemexCard(newCard);
    }

    setEditingCard(null);
  };

  const handleDeleteCard = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus kartu ini?")) {
      deleteMemexCard(id);
    }
  };

  const chatContainerRef = useRef(null);

  // Dapatkan API key yang aktif
  const getApiKey = () => {
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return null;
  };

  const apiKey = getApiKey();

  // Scroll otomatis ke chat terakhir (hanya scroll container chat untuk mencegah jank/layar melompat)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [memexChats, loadingChat]);

  // Handler Pemrosesan File
  const handleFileProcess = (file) => {
    if (!file) return;

    // Batas maksimal ukuran berkas (15MB)
    const MAX_SIZE_MB = 15;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Berkas terlalu besar! Batas maksimal ukuran berkas adalah ${MAX_SIZE_MB}MB.`);
      return;
    }

    const fileExt = file.name.split('.').pop().toLowerCase();
    const isTxt = fileExt === 'txt' || file.type === 'text/plain';
    const isPdf = fileExt === 'pdf' || file.type === 'application/pdf';
    const isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt) || file.type.startsWith('image/');

    if (!isTxt && !isPdf && !isImg) {
      alert('Tipe berkas tidak didukung! Format yang didukung adalah .txt, .pdf, dan gambar (.png, .jpg, .webp).');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    // Membaca semua file sebagai Data URL untuk mempermudah loading state dan preview
    reader.onload = (e) => {
      setFileDataUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleCaptureSubmit = async (e) => {
    e.preventDefault();
    if ((!textCapture.trim() && !selectedFile) || loadingCapture) return;

    if (aiProvider !== 'qodirsai' && !apiKey) {
      alert('API Key belum dikonfigurasi! Harap atur API Key Anda di menu Pengaturan.');
      return;
    }

    // Validasi provider jika mengunggah gambar/PDF
    const isTxt = selectedFile && (selectedFile.name.split('.').pop().toLowerCase() === 'txt' || selectedFile.type === 'text/plain');
    if (selectedFile && !isTxt && aiProvider !== 'gemini') {
      alert('Ekstraksi berkas gambar atau PDF saat ini hanya didukung untuk model Gemini. Silakan ubah provider Anda ke Gemini di halaman Pengaturan.');
      return;
    }

    setLoadingCapture(true);
    try {
      let result;

      if (selectedFile) {
        if (isTxt) {
          // Baca konten teks secara lokal
          const fileTextContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Gagal membaca file teks.'));
            reader.readAsText(selectedFile);
          });

          const combinedText = `Isi Dokumen (${selectedFile.name}):\n${fileTextContent}\n\nCatatan Tambahan Pengguna:\n${textCapture}`;
          result = await extractMemexCard(apiKey, combinedText, aiProvider, aiModel);
        } else {
          // Kirim berkas Base64 (PDF/Gambar) ke API Multimodal Gemini
          result = await extractMemexCardWithMultimodal(apiKey, fileDataUrl, textCapture, aiModel);
        }
      } else {
        // Ekstrak dari teks biasa
        result = await extractMemexCard(apiKey, textCapture, aiProvider, aiModel);
      }
      
      // Susun objek kartu baru secara eksplisit agar ID sinkron antara lokal dan cloud
      const newCard = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: result.type || 'note',
        title: result.title || 'Catatan Jurnal',
        tags: result.tags || ['jurnal'],
        data: result.data || { summary: textCapture || (selectedFile ? `Berkas lampiran: ${selectedFile.name}` : '') },
        companionComment: result.companionComment || 'Tercatat!'
      };

      // Tambahkan ke store lokal
      addMemexCard(newCard);



      // Tambahkan reaksi Companion ke obrolan chat otomatis
      if (result.companionComment) {
        addMemexChat({
          role: 'assistant',
          content: `*[Mengomentari: ${result.title}]* ${result.companionComment}`
        });
      }

      // Reset Form & File State
      setTextCapture('');
      setSelectedFile(null);
      setFileDataUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      alert('Gagal mengekstrak kartu: ' + err.message);
    } finally {
      setLoadingCapture(false);
    }
  };

  const handleKnowledgeDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setKnowledgeDragActive(true);
    } else if (e.type === "dragleave") {
      setKnowledgeDragActive(false);
    }
  };

  const handleKnowledgeDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setKnowledgeDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processKnowledgeFile(e.dataTransfer.files[0]);
    }
  };

  const handleKnowledgeFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processKnowledgeFile(e.target.files[0]);
    }
  };

  const processKnowledgeFile = async (file) => {
    if (!apiKey) {
      setKnowledgeErrorMsg('API Key belum diatur! Harap atur API Key Anda di menu Pengaturan.');
      return;
    }

    const fileExt = file.name.split('.').pop().toLowerCase();
    const isTxt = fileExt === 'txt' || file.type === 'text/plain';
    const isPdf = fileExt === 'pdf' || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isTxt && !isPdf && !isImage) {
      setKnowledgeErrorMsg('Format file tidak didukung. Harap upload file PDF, TXT, atau Gambar.');
      return;
    }

    if (!isTxt && aiProvider !== 'gemini') {
      setKnowledgeErrorMsg('Ekstraksi PDF atau Gambar memerlukan model Google Gemini. Silakan ubah provider ke Gemini di Pengaturan.');
      return;
    }

    setKnowledgeLoading(true);
    setKnowledgeErrorMsg('');
    setKnowledgeSuccessMsg('');

    try {
      if (isTxt) {
        // Read text file locally
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error('Gagal membaca berkas TXT.'));
          reader.readAsText(file);
        });

        setSukiKnowledge(text);
        setKnowledgeEditingContent(text);
        setKnowledgeSuccessMsg(`Berhasil memuat berkas teks "${file.name}"!`);
        addHistory({
          type: 'suki-knowledge-update',
          category: 'Katalog Suki',
          title: `Update Teks: ${file.name}`,
          content: `Teks katalog produk diunggah langsung.`
        });
      } else if (isPdf) {
        // Coba ekstraksi teks lokal terlebih dahulu
        try {
          const localText = await extractTextFromPdf(file);
          if (localText && localText.trim().length > 20) {
            setSukiKnowledge(localText);
            setKnowledgeEditingContent(localText);
            setKnowledgeSuccessMsg(`Berhasil mengekstrak teks PDF secara lokal (${file.name})!`);
            addHistory({
              type: 'suki-knowledge-update',
              category: 'Katalog Suki',
              title: `Update PDF (Lokal): ${file.name}`,
              content: `Teks dokumen PDF berhasil diekstrak secara lokal tanpa batas ukuran.`
            });
          } else {
            throw new Error('Teks PDF kosong (kemungkinan PDF hasil scan gambar).');
          }
        } catch (localErr) {
          console.warn("Ekstraksi PDF lokal gagal, beralih ke multimodal Gemini:", localErr.message);
          
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Gagal membaca berkas dokumen.'));
            reader.readAsDataURL(file);
          });

          const extractedMarkdown = await extractDocumentToMarkdown(apiKey, dataUrl, file.type, aiModel);
          
          if (!extractedMarkdown.trim()) {
            throw new Error('AI gagal mengekstrak konten terstruktur dari berkas.', { cause: localErr });
          }

          setSukiKnowledge(extractedMarkdown);
          setKnowledgeEditingContent(extractedMarkdown);
          setKnowledgeSuccessMsg(`Sukses mengekstrak dokumen scan "${file.name}" via Gemini!`);
          addHistory({
            type: 'suki-knowledge-update',
            category: 'Katalog Suki',
            title: `Update PDF (Scan Gemini): ${file.name}`,
            content: `Dokumen PDF hasil scan berhasil diekstrak oleh Gemini.`
          });
        }
      } else {
        // Image extraction via Gemini
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
          reader.readAsDataURL(file);
        });

        const extractedMarkdown = await extractDocumentToMarkdown(apiKey, dataUrl, file.type, aiModel);
        
        if (!extractedMarkdown.trim()) {
          throw new Error('AI gagal mengekstrak konten terstruktur dari gambar.');
        }

        setSukiKnowledge(extractedMarkdown);
        setKnowledgeEditingContent(extractedMarkdown);
        setKnowledgeSuccessMsg(`Sukses mengekstrak gambar "${file.name}" via Gemini!`);
        addHistory({
          type: 'suki-knowledge-update',
          category: 'Katalog Suki',
          title: `Update Gambar: ${file.name}`,
          content: `Gambar berhasil diekstrak oleh Gemini.`
        });
      }
      setKnowledgeActiveTab('preview');
    } catch (err) {
      console.error(err);
      setKnowledgeErrorMsg(err.message || 'Gagal memproses berkas dokumen.');
    } finally {
      setKnowledgeLoading(false);
      if (knowledgeFileInputRef.current) knowledgeFileInputRef.current.value = '';
    }
  };

  const handleKnowledgeSave = () => {
    setSukiKnowledge(knowledgeEditingContent);
    setKnowledgeSuccessMsg('Pengetahuan Suki berhasil diperbarui dan disimpan!');
    setKnowledgeErrorMsg('');
    addHistory({
      type: 'suki-knowledge-update',
      category: 'Katalog Suki',
      title: 'Revisi Manual Katalog',
      content: 'Katalog produk diperbarui secara manual.'
    });
    setTimeout(() => setKnowledgeSuccessMsg(''), 3000);
  };

  const handleKnowledgeReset = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus basis pengetahuan Suki? Suki tidak akan mengetahui katalog produk Anda lagi.')) {
      setSukiKnowledge('');
      setKnowledgeEditingContent('');
      setKnowledgeSuccessMsg('Basis pengetahuan Suki berhasil direset!');
      setTimeout(() => setKnowledgeSuccessMsg(''), 3000);
    }
  };

  // Regex markdown rendering parser (with tables support)
  const renderKnowledgeMarkdown = (text) => {
    if (!text) return { __html: '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Belum ada basis pengetahuan/katalog yang disimpan. Unggah file PDF/TXT di atas untuk memulai!</p>' };
    
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    html = html
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br />');

    // Bullet points lists
    html = html.replace(/(<li>.*?<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');

    // Render simple table markup
    const lines = html.split('<br />');
    let inTable = false;
    let tableHtml = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableHtml += '<table style="width:100%; border-collapse:collapse; margin: 1rem 0; font-size:0.9rem;">';
        }
        
        // Skip separator line |---|---|
        if (line.includes('---')) continue;

        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        tableHtml += '<tr style="border-bottom: 1px solid var(--border-color);">';
        cells.forEach(cell => {
          const isHeader = tableHtml.includes('<thead>') === false && tableHtml.includes('<tr>') === false; // rough header check
          tableHtml += isHeader 
            ? `<th style="padding: 0.5rem; border: 1px solid var(--border-color); background: var(--bg-main); text-align:left; font-weight:600;">${cell}</th>`
            : `<td style="padding: 0.5rem; border: 1px solid var(--border-color);">${cell}</td>`;
        });
        tableHtml += '</tr>';
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += '</table>';
          lines[i] = tableHtml + lines[i];
          tableHtml = '';
        }
      }
    }
    if (inTable) {
      tableHtml += '</table>';
      lines[lines.length - 1] = lines[lines.length - 1] + tableHtml;
    }

    html = lines.join('<br />');
    
    if (knowledgeSearchTerm && knowledgeSearchTerm.trim()) {
      const escapedTerm = knowledgeSearchTerm.replace(new RegExp('[-/\\\\^$*+?.()|[\\]{}]', 'g'), '\\$&');
      const regex = new RegExp(`(${escapedTerm})(?![^<>]*>)`, 'gi');
      html = html.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    return { __html: html };
  };

  const handleChatFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const MAX_SIZE_MB = 15;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`Berkas terlalu besar! Batas maksimal ukuran berkas adalah ${MAX_SIZE_MB}MB.`);
        return;
      }
      setChatSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setChatFileDataUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const isSendingChat = useRef(false);

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const handleSendChat = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    // Guard: cegah double-send
    if (isSendingChat.current) return;
    isSendingChat.current = true;
    const userMsg = chatInput.trim();
    if ((!userMsg && !chatSelectedFile) || loadingChat) {
      isSendingChat.current = false;
      return;
    }

    if (aiProvider !== 'qodirsai' && !apiKey) {
      alert('API Key belum dikonfigurasi! Harap atur API Key Anda di menu Pengaturan.');
      isSendingChat.current = false;
      return;
    }

    // Tampilkan pesan user ke chat history beserta lampiran
    const userDisplayMsg = userMsg 
      ? (chatSelectedFile ? `${userMsg}\n\n📎 *[Berkas: ${chatSelectedFile.name}]*` : userMsg)
      : `📎 *[Berkas: ${chatSelectedFile.name}]*`;

    addMemexChat({ role: 'user', content: userDisplayMsg });
    setChatInput('');
    setLoadingChat(true);

    const currentFile = chatSelectedFile;
    const currentDataUrl = chatFileDataUrl;

    // Reset state upload
    setChatSelectedFile(null);
    setChatFileDataUrl(null);
    if (chatFileInputRef.current) chatFileInputRef.current.value = '';

    try {
      if (currentFile) {
        const fileExt = currentFile.name.split('.').pop().toLowerCase();
        const isTxt = ['txt', 'md', 'json'].includes(fileExt) || currentFile.type === 'text/plain' || currentFile.type === 'application/json';

        if (!isTxt && aiProvider !== 'gemini') {
          alert('Ekstraksi berkas gambar atau PDF saat ini hanya didukung untuk model Gemini. Silakan ubah provider Anda ke Gemini di halaman Pengaturan.');
          setLoadingChat(false);
          return;
        }

        let result;
        if (isTxt) {
          const fileTextContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Gagal membaca file teks.'));
            reader.readAsText(currentFile);
          });
          const combinedText = `Isi Dokumen (${currentFile.name}):\n${fileTextContent}\n\nCatatan Tambahan Pengguna:\n${userMsg}`;
          result = await extractMemexCard(apiKey, combinedText, aiProvider, aiModel);
        } else {
          result = await extractMemexCardWithMultimodal(apiKey, currentDataUrl, userMsg, aiModel);
        }

        const newCard = {
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: result.type || 'note',
          title: result.title || 'Catatan Chat',
          tags: result.tags || ['chat-upload'],
          data: result.data || { summary: userMsg || `Lampiran: ${currentFile.name}` },
          companionComment: result.companionComment || 'Tercatat!'
        };
        addMemexCard(newCard);

        addMemexChat({ 
          role: 'assistant', 
          content: `*[Mengomentari: ${result.title}]* ${result.companionComment || 'Udah gue catat ke jurnal lo ya!'}` 
        });
      } else {
        // Kirim SEMUA kartu sebagai konteks database Suki (bukan hanya hari ini)
        const allCards = memexCards || [];
        const reply = await generateCompanionChat(
          apiKey,
          memexCompanion,
          memexChats.concat({ role: 'user', content: userMsg }),
          allCards,
          userMsg,
          aiProvider,
          aiModel,
          sukiKnowledge?.content || '',
          habits,
          activityLog
        );

        let cleanReply = reply.trim();

        // Helper untuk parse JSON dengan menghapus komentar secara aman
        const safeJsonParse = (str) => {
          try {
            const cleaned = str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? m : "");
            return JSON.parse(cleaned);
          } catch (e) {
            return JSON.parse(str); // Fallback ke parse biasa
          }
        };

        // 1. Proses record_card (tambah kartu)
        const recordRegex = /<record_card>([\s\S]*?)<\/record_card>/g;
        let recordMatch;
        while ((recordMatch = recordRegex.exec(reply)) !== null) {
          try {
            const cardObj = safeJsonParse(recordMatch[1].trim());
            if (cardObj) {
              addMemexCard({
                type: cardObj.type || 'note',
                title: cardObj.title || 'Catatan Chat',
                tags: cardObj.tags || ['chat'],
                data: cardObj.data || { summary: userMsg },
                companionComment: reply.replace(/<record_card>[\s\S]*?<\/record_card>|<update_card>[\s\S]*?<\/update_card>|<delete_card>[\s\S]*?<\/delete_card>/g, '').trim(),
                ...(cardObj.createdAt ? { createdAt: cardObj.createdAt } : {})
              });
            }
          } catch (parseErr) {
            console.error("Gagal parse record_card dari chat Suki di Memex:", parseErr);
          }
        }

        // 2. Proses update_card (ubah kartu)
        const updateRegex = /<update_card>([\s\S]*?)<\/update_card>/g;
        let updateMatch;
        while ((updateMatch = updateRegex.exec(reply)) !== null) {
          try {
            const updateObj = safeJsonParse(updateMatch[1].trim());
            if (updateObj && updateObj.cardId) {
              updateMemexCard(updateObj.cardId, updateObj.updates);
            }
          } catch (updateErr) {
            console.error("Gagal parse update_card dari chat Suki di Memex:", updateErr);
          }
        }

        // 3. Proses delete_card (hapus kartu)
        const deleteRegex = /<delete_card>([\s\S]*?)<\/delete_card>/g;
        let deleteMatch;
        while ((deleteMatch = deleteRegex.exec(reply)) !== null) {
          try {
            const deleteObj = safeJsonParse(deleteMatch[1].trim());
            if (deleteObj && deleteObj.cardId) {
              deleteMemexCard(deleteObj.cardId);
            }
          } catch (deleteErr) {
            console.error("Gagal parse delete_card dari chat Suki di Memex:", deleteErr);
          }
        }

        // Bersihkan semua tag XML dari reply teks agar tidak muncul di chat bubble
        cleanReply = cleanReply
          .replace(/<record_card>[\s\S]*?<\/record_card>/g, '')
          .replace(/<update_card>[\s\S]*?<\/update_card>/g, '')
          .replace(/<delete_card>[\s\S]*?<\/delete_card>/g, '')
          .trim();

        addMemexChat({ role: 'assistant', content: cleanReply });
      }
    } catch (err) {
      console.error(err);
      addMemexChat({ role: 'assistant', content: 'Duh sorry, koneksi AI gue lagi error nih. Coba tanya lagi entar ya!' });
    } finally {
      setLoadingChat(false);
      isSendingChat.current = false;
    }
  };

  const handleSaveCompanion = () => {
    let compiledPrompt = '';
    const name = compName.trim() || 'Suki';
    if (compMode === 'default') {
      if (compPreset === 'good') {
        compiledPrompt = `Kamu adalah ${name} (Good ${name}). Kamu sangat suportif, ramah, lemah lembut, sabar, manis, selalu memberikan saran-saran positif untuk membantu produktivitas pengguna, menyapa dengan sapaan hangat, dan bertutur kata sopan. Kepribadian tambahan: ${compPersonality}`;
      } else {
        compiledPrompt = `Kamu adalah ${name} (Bad ${name}). Kamu adalah teman gaul yang sarkas, usil, super kocak, ceplas-ceplos, suka menyindir bercanda, dan menggunakan bahasa gaul kekinian (gue, lo). Meskipun suka meledek atau 'roast' pengguna secara bercanda, kamu tetap sangat kompeten, pintar, dan siap membantu segala pencatatan jurnal dengan cermat. Kepribadian tambahan: ${compPersonality}`;
      }
    } else {
      compiledPrompt = `${compHardPrompt}\nKepribadian tambahan: ${compPersonality}`;
    }

    updateMemexCompanion({
      name: name,
      avatar: compAvatar,
      mode: compMode,
      preset: compPreset,
      personalityPrompt: compPersonality,
      customHardPrompt: compHardPrompt,
      customPrompt: compiledPrompt
    });
    setCompPrompt(compiledPrompt);
    setIsConfiguring(false);
  };

  // Format tanggal + jam lokalisasi (handal di semua browser)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format jam chat: jam:menit saja jika hari ini, tambahkan tanggal jika bukan hari ini
  const formatChatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = days[d.getDay()];
    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (sameDay) {
      return `Hari Ini, ${timeStr}`;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const sameYesterday = d.toDateString() === yesterday.toDateString();
    if (sameYesterday) {
      return `Kemarin, ${timeStr}`;
    }

    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return `${dayName}, ${timeStr}`;
    }

    const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    return `${dateStr}, ${timeStr}`;
  };

  // Format nominal rupiah
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Filter kartu berdasarkan tab aktif
  const filteredCards = memexCards.filter(card => {
    if (activeTab === 'all') return true;
    return card.type === activeTab;
  });

  const cardIcons = {
    task: <CheckCircle2 size={16} color="#8b5cf6" />,
    transaction: <DollarSign size={16} color="#ef4444" />,
    note: <FileText size={16} color="#06b6d4" />,
    quote: <Quote size={16} color="#f59e0b" />,
    contact: <User size={16} color="#10b981" />
  };

  const avatarsList = ['🐱', '🤖', '🦊', '🦉', '🦁', '🐸', '👾', '✨'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
      {/* Header Utama */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient responsive-title" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Sparkles size={32} color="var(--primary)" /> Card Cloud Journal
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Catatan & Jurnal offline-first dengan Sinkronisasi Cloud otomatis.
          </p>
        </div>

        {/* Cloud Sync Status Widget */}
        <div className="cloud-sync-status-widget" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-card)',
          padding: '0.5rem 1rem',
          borderRadius: '24px',
          border: '1px solid var(--border-color)',
          fontSize: '0.85rem'
        }}>
          {isAuthActive && firebaseUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img 
                src={firebaseUser.photoURL || 'https://www.gravatar.com/avatar?d=mp'} 
                alt="Profile" 
                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--primary-light)', objectFit: 'cover' }} 
                onError={(e) => { e.target.src = 'https://www.gravatar.com/avatar?d=mp'; }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {firebaseUser.displayName}
                </span>
                <span style={{ fontSize: '0.7rem', color: syncingCloud ? 'var(--primary)' : '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {syncingCloud ? (
                    <>
                      <RefreshCw size={10} className="animate-spin" /> Sinkronisasi...
                    </>
                  ) : (
                    <>
                      ● Cloud Aktif {lastSyncTime ? `(Sync: ${formatDate(lastSyncTime)})` : ''}
                    </>
                  )}
                </span>
              </div>
              
              <button 
                onClick={handleManualSync}
                style={{
                  marginLeft: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title="Sinkronisasi Manual"
                aria-label="Sinkronisasi data manual"
                disabled={syncingCloud}
              >
                <RefreshCw size={14} className={syncingCloud ? 'animate-spin' : ''} />
              </button>

              <button 
                onClick={handleFirebaseLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title="Keluar Akun"
                aria-label="Keluar akun"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Sesi belum aktif
            </span>
          )}
        </div>
      </div>

      {/* Banner Peringatan jika API Key belum diatur */}
      {aiProvider !== 'qodirsai' && !apiKey && (
        <div className="card card-danger" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AlertCircle size={28} color="var(--danger)" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ color: 'var(--danger)', margin: 0 }}>API Key Belum Ditemukan!</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Fitur penataan jurnal otomatis memerlukan API Key yang aktif. Silakan buka halaman <a href="/settings" style={{ textDecoration: 'underline', fontWeight: 'bold', color: 'var(--danger)' }}>Pengaturan</a> untuk menyetel kunci API.
            </p>
          </div>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="mobile-view-tabs">
        <button 
          className={`mobile-tab-btn ${mobileActiveView === 'journal' ? 'active' : ''}`}
          onClick={() => setMobileActiveView('journal')}
          type="button"
        >
          <FileText size={16} /> Jurnal & Capture
        </button>
        <button 
          className={`mobile-tab-btn ${mobileActiveView === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileActiveView('chat')}
          type="button"
        >
          <MessageSquare size={16} /> Chat Companion
        </button>
      </div>

      {/* Panel Utama Layout */}
      <div className={`memex-layout ${mobileActiveView === 'journal' ? 'journal-active' : 'chat-active'}`}>
        
        {/* Kolom Kiri: Input Capture & Card Feeds */}
        <div className="memex-layout-left">
          
          {/* Tab Filter Kartu (moved to the top!) */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {(() => {
              const defaultTabs = [
                { id: 'all', label: 'Semua Kartu' },
                { id: 'task', label: 'Tugas' },
                { id: 'transaction', label: 'Keuangan' },
                { id: 'note', label: 'Catatan' },
                { id: 'quote', label: 'Kutipan' },
                { id: 'contact', label: 'Kontak' },
              ];
              const defaultTypes = ['task', 'transaction', 'note', 'quote', 'contact'];
              const customTypes = Array.from(new Set(
                (memexCards || [])
                  .map(c => c.type)
                  .filter(type => type && !defaultTypes.includes(type))
              ));
              return [
                ...defaultTabs,
                ...customTypes.map(type => ({
                  id: type,
                  label: type.charAt(0).toUpperCase() + type.slice(1)
                })),
                { id: 'neraca', label: '💰 Neraca' },
                { id: 'suki-knowledge', label: 'Pengetahuan Suki 📖' }
              ];
            })().map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  backgroundColor: activeTab === tab.id ? 'var(--primary-light)' : 'var(--bg-card)',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                  border: activeTab === tab.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'neraca' ? (
            <NeracaDashboard
              memexCards={memexCards}
              formatCurrency={formatCurrency}
              onAskSuki={(msg) => {
                setActiveTab('all');
                setTimeout(() => {
                  setCaptureText(msg);
                }, 100);
              }}
              addMemexChat={addMemexChat}
              setMobileActiveView={setMobileActiveView}
            />
          ) : activeTab !== 'suki-knowledge' ? (
            <>
              {/* Form Quick Capture */}
              <div 
                className={`card memex-capture-card ${isDragActive ? 'drag-active' : ''}`} 
                style={{ 
                  marginBottom: '2rem', 
                  borderTop: '4px solid var(--primary)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {isDragActive && (
                  <div className="drag-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(79, 70, 229, 0.15)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    pointerEvents: 'none',
                    border: '2px dashed var(--primary)',
                    borderRadius: 'inherit'
                  }}>
                    <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
                      <Sparkles size={32} className="animate-pulse" />
                      <p style={{ fontWeight: '600', margin: '0.5rem 0 0 0' }}>Lepaskan berkas di sini untuk unggah</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mendukung PDF, TXT, dan Gambar</p>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Sparkles size={18} color="var(--primary)" /> Tulis Fragmen Hari Ini
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCard({
                        id: '',
                        title: '',
                        type: 'note',
                        tags: [],
                        data: { summary: '' },
                        companionComment: 'Kartu ini dibuat secara manual oleh pengguna.'
                      });
                      setActiveModalTab('edit');
                    }}
                    className="btn btn-secondary"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    + Buat Kartu Manual
                  </button>
                </div>
                <form onSubmit={handleCaptureSubmit} className="memex-capture-form">
                  <input
                    type="text"
                    name="textCapture"
                    autocomplete="off"
                    className="input-field"
                    placeholder={selectedFile ? "Beri catatan tambahan untuk berkas ini (opsional)..." : "Contoh: beli kopi habis 35000, ingatkan jam 8 malam rapat RT, quote: be yourself"}
                    value={textCapture}
                    onChange={(e) => setTextCapture(e.target.value)}
                    disabled={loadingCapture}
                    style={{ flex: 1, width: '100%' }}
                  />

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }}
                    accept=".txt,.pdf,image/*"
                  />

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${selectedFile ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loadingCapture}
                      style={{ 
                        padding: '0.75rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid var(--border-color)',
                        backgroundColor: selectedFile ? 'var(--primary-light)' : 'var(--bg-card)',
                        color: selectedFile ? 'var(--primary)' : 'var(--text-secondary)'
                      }}
                      title="Lampirkan berkas (PDF, TXT, Gambar)"
                    >
                      <Paperclip size={18} />
                    </button>
                    
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={loadingCapture || (!textCapture.trim() && !selectedFile)}
                      style={{ padding: '0 1.5rem', whiteSpace: 'nowrap', flex: 1 }}
                    >
                      {loadingCapture ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Ekstraksi...
                        </>
                      ) : (
                        <>
                          Kirim <Send size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* File Preview Widget */}
                {selectedFile && (
                  <div className="file-preview-container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      {/* Thumbnail or Icon */}
                      {selectedFile.type.startsWith('image/') && fileDataUrl ? (
                        <img 
                          src={fileDataUrl} 
                          alt="Preview" 
                          className="file-preview-thumbnail"
                        />
                      ) : (
                        <div className="file-preview-icon">
                          {selectedFile.name.endsWith('.pdf') ? (
                            <FileText size={20} color="#ef4444" />
                          ) : selectedFile.name.endsWith('.txt') ? (
                            <FileText size={20} color="#3b82f6" />
                          ) : (
                            <File size={20} color="var(--text-secondary)" />
                          )}
                        </div>
                      )}
                      
                      {/* File Metadata */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedFile.name}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {(selectedFile.size / 1024).toFixed(1)} KB | {selectedFile.name.split('.').pop().toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="file-preview-remove-btn"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileDataUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      title="Hapus lampiran"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  AI akan otomatis menebak isi teks, gambar struk belanja, atau dokumen PDF Anda untuk dijadikan kartu jurnal terstruktur.
                </p>
              </div>

              {/* List Feeds Kartu */}
              <div className="memex-feed">
                {filteredCards.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <FileText size={48} style={{ opacity: 0.25, marginBottom: '1rem', color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      Belum ada kartu untuk filter ini. Coba tulis fragmen baru di atas!
                    </p>
                  </div>
                ) : (
                  filteredCards.map(card => (
                    <div key={card.id} className={`card memex-card card-${card.type}`} style={{ padding: '1.25rem 1.5rem' }}>
                      <div className="memex-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           {cardIcons[card.type] || <Sparkles size={16} color="#ec4899" />}
                           <span className="memex-card-type" style={{ textTransform: 'capitalize' }}>{card.type}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            onClick={() => {
                              setEditingCard(card);
                              setActiveModalTab('read');
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                            title="Lihat / Edit Detail Kartu"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                            title="Hapus Kartu"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                        {card.title}
                      </h3>

                      {/* Render Data Spesifik Berdasarkan Tipe */}
                      <div className="memex-card-body" style={{ color: 'var(--text-primary)' }}>
                        {card.type === 'transaction' && (
                          <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                              <strong>Nominal:</strong> <span style={{ color: card.data.type === 'expense' ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                                {card.data.type === 'expense' ? '-' : '+'} {formatCurrency(card.data.amount)}
                              </span>
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              Kategori: {card.data.category} | Tipe: {card.data.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                            </p>
                          </div>
                        )}

                        {card.type === 'task' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem', opacity: card.data?.completed ? 0.6 : 1 }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input 
                                type="checkbox" 
                                checked={!!card.data?.completed} 
                                onChange={() => {
                                  const isNowDone = !card.data?.completed;
                                  updateMemexCard(card.id, {
                                    data: { ...card.data, completed: isNowDone }
                                  });
                                  if (isNowDone) {
                                    logActivity({ id: card.id, type: 'task', title: card.data?.todo || card.title });
                                  } else {
                                    removeActivityLog(card.id, 'task');
                                  }
                                }}
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }} 
                              />
                              <span style={{ textDecoration: card.data?.completed ? 'line-through' : 'none' }}>{card.data.todo}</span>
                            </p>
                            {card.data.dueDate && (
                              <p style={{ margin: '0.25rem 0 0 1.25rem', fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={12} /> Tenggat: {card.data.dueDate}{card.data.dueTime ? ` pukul ${card.data.dueTime}` : ''}
                              </p>
                            )}
                          </div>
                        )}

                        {card.type === 'quote' && (
                          <blockquote style={{ borderLeft: '3px solid #cbd5e1', paddingLeft: '0.75rem', margin: '0.5rem 0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                            "{card.data.quote}"
                            <cite style={{ display: 'block', fontStyle: 'normal', fontWeight: '600', fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                              — {card.data.author || 'Anonim'}
                            </cite>
                          </blockquote>
                        )}

                        {card.type === 'contact' && (
                          <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                              <strong>Nama:</strong> {card.data.name}
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                              <strong>Hubungan:</strong> {card.data.relationship}
                            </p>
                            {card.data.context && (
                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <strong>Catatan:</strong> {card.data.context}
                              </p>
                            )}
                          </div>
                        )}

                        {(card.type === 'note' || !['transaction', 'task', 'quote', 'contact'].includes(card.type)) && (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            {card.data.summary}
                          </p>
                        )}
                      </div>

                      {/* Render Tags */}
                      {card.tags && card.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          {card.tags.map(t => (
                            <span key={t} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Companion Reaction Bubble */}
                      {card.companionComment && (
                        <div className="memex-reaction-bubble">
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)', marginRight: '0.25rem' }}>
                            {memexCompanion.avatar} {memexCompanion.name}:
                          </span>
                          {card.companionComment}
                        </div>
                      )}

                      <div className="memex-card-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem', width: '100%' }}>
                        <span>📅 {formatDate(card.createdAt)}</span>
                        {card.updatedAt && card.updatedAt !== card.createdAt && (
                          <span style={{ fontStyle: 'italic', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            ✏️ Edit: {formatDate(card.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Suki Knowledge Document Manager Uploader, Editor, Preview */}
              {/* Alert Messages for Knowledge */}
              {knowledgeErrorMsg && (
                <div className="card card-danger" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--danger)' }}>
                    <AlertCircle size={20} />
                    <span style={{ color: 'var(--text-primary)' }}>{knowledgeErrorMsg}</span>
                  </div>
                </div>
              )}

              {knowledgeSuccessMsg && (
                <div className="card card-success" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--success)' }}>
                    <CheckCircle2 size={20} />
                    <span style={{ color: 'var(--text-primary)' }}>{knowledgeSuccessMsg}</span>
                  </div>
                </div>
              )}

              {/* File Uploader */}
              <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Unggah File Katalog Baru</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Mendukung PDF, TXT, atau Gambar. File PDF katalog laptop Anda akan dianalisis secara multimodal oleh model AI Gemini untuk disusun menjadi format pengetahuan terstruktur secara otomatis.
                </p>

                <form 
                  onDragEnter={handleKnowledgeDrag} 
                  onDragOver={handleKnowledgeDrag} 
                  onDragLeave={handleKnowledgeDrag} 
                  onDrop={handleKnowledgeDrop}
                  onClick={() => knowledgeFileInputRef.current?.click()}
                  style={{
                    border: knowledgeDragActive ? '2px dashed var(--primary)' : '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: knowledgeDragActive ? 'var(--primary-light)' : 'var(--bg-main)',
                    cursor: knowledgeLoading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                    opacity: knowledgeLoading ? 0.6 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <input 
                    ref={knowledgeFileInputRef}
                    type="file"
                    accept=".pdf,.txt,image/*"
                    style={{ display: 'none' }}
                    disabled={knowledgeLoading}
                    onChange={handleKnowledgeFileChange}
                  />
                  {knowledgeLoading ? (
                    <>
                      <RefreshCw size={40} color="var(--primary)" style={{ animation: 'spin 1.5s infinite linear' }} />
                      <strong style={{ fontSize: '0.95rem' }}>AI sedang menganalisis dokumen...</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mengekstrak spesifikasi, harga, dan merubahnya menjadi Markdown catalog. Proses ini dapat memakan waktu 10-30 detik.</span>
                    </>
                  ) : (
                    <>
                      <Upload size={40} color="var(--text-secondary)" />
                      <strong style={{ fontSize: '0.95rem' }}>Tarik & Lepas berkas di sini atau klik untuk memilih file</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Format yang didukung: PDF, TXT, PNG, JPG (Maks 10MB)</span>
                    </>
                  )}
                </form>
              </div>

              {/* Editor & Viewer tabs */}
              <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {/* Tabs */}
                  <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '4px', borderRadius: '8px' }}>
                    <button
                      onClick={() => setKnowledgeActiveTab('preview')}
                      style={{
                        padding: '0.5rem 1rem',
                        border: 'none',
                        borderRadius: '6px',
                        background: knowledgeActiveTab === 'preview' ? 'var(--bg-card)' : 'transparent',
                        color: knowledgeActiveTab === 'preview' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: knowledgeActiveTab === 'preview' ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      <Eye size={16} /> Pratinjau Detail
                    </button>
                    <button
                      onClick={() => setKnowledgeActiveTab('edit')}
                      style={{
                        padding: '0.5rem 1rem',
                        border: 'none',
                        borderRadius: '6px',
                        background: knowledgeActiveTab === 'edit' ? 'var(--bg-card)' : 'transparent',
                        color: knowledgeActiveTab === 'edit' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: knowledgeActiveTab === 'edit' ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      <Edit3 size={16} /> Revisi Editor
                    </button>
                  </div>

                  {/* Timestamp terakhir update Knowledge */}
                  {sukiKnowledge?.updatedAt && sukiKnowledge.updatedAt !== new Date(0).toISOString() && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      📚 Update: <strong>{formatDate(sukiKnowledge.updatedAt)}</strong>
                    </span>
                  )}
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {sukiKnowledge?.content && (
                      <button 
                        className="btn btn-secondary" 
                        onClick={handleKnowledgeReset}
                        style={{ color: 'var(--danger)', padding: '0.5rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Trash2 size={15} /> Reset
                      </button>
                    )}
                    <button 
                      className="btn btn-primary" 
                      onClick={handleKnowledgeSave}
                      disabled={!knowledgeEditingContent.trim()}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Save size={15} /> Simpan Semua Revisi
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                {knowledgeActiveTab === 'preview' ? (
                  <>
                    {/* Kotak Pencarian Global Suki Knowledge */}
                    <div style={{ marginBottom: '1rem', position: 'relative' }}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        name="knowledgeSearch"
                        autocomplete="off"
                        className="input-field"
                        placeholder="Cari dalam database Suki... (Tekan Ctrl + F atau Cmd + F)"
                        value={knowledgeSearchTerm}
                        onChange={(e) => setKnowledgeSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          paddingLeft: '2.5rem',
                          paddingRight: '2.5rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          height: '42px',
                          fontSize: '0.9rem'
                        }}
                      />
                      <Search 
                        size={18} 
                        style={{ 
                          position: 'absolute', 
                          left: '0.85rem', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          color: 'var(--text-secondary)',
                          pointerEvents: 'none'
                        }} 
                      />
                      {knowledgeSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setKnowledgeSearchTerm('')}
                          style={{
                            position: 'absolute',
                            right: '0.85rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <div 
                      className="markdown-preview suki-knowledge-preview"
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--bg-main)',
                        padding: '1.5rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        minHeight: '350px',
                        maxHeight: '60vh',
                        overflowY: 'auto',
                        fontSize: '0.95rem',
                        lineHeight: 1.7,
                        color: 'var(--text-primary)'
                      }}
                      dangerouslySetInnerHTML={renderKnowledgeMarkdown(sukiKnowledge?.content)}
                    />
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <textarea
                      className="input-field"
                      value={knowledgeEditingContent}
                      onChange={(e) => setKnowledgeEditingContent(e.target.value)}
                      placeholder="# Katalog Laptop Toko Kami&#10;&#10;| Nama Laptop | Spesifikasi | Harga |&#10;|---|---|---|&#10;| ASUS ROG Zephyrus | Ryzen 9, 32GB RAM, RTX 4070 | Rp 28.500.000 |"
                      style={{
                        flex: 1,
                        minHeight: '400px',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        padding: '1rem',
                        resize: 'vertical',
                        backgroundColor: 'var(--bg-card)'
                      }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      *Tulis dalam format Markdown. Anda bisa memasukkan spesifikasi laptop, ketersediaan stok, harga, promo, dll. Informasi ini akan langsung dibaca dan diingat oleh Suki.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Kolom Kanan: AI Companion Box & Settings */}
        <div className="memex-companion-panel">
          
          {/* Companion Profile Card */}
          <div className="card" style={{ borderTop: '4px solid var(--accent)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyStyle: 'space-between', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2.25rem' }}>{memexCompanion.avatar}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{memexCompanion.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    Companion ({memexCompanion.personality})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsConfiguring(!isConfiguring)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                title="Kustomisasi AI Companion"
                aria-label={isConfiguring ? "Tutup kustomisasi AI Companion" : "Buka kustomisasi AI Companion"}
              >
                {isConfiguring ? <X size={18} /> : <Settings size={18} />}
              </button>
            </div>

            {/* Panel Kustomisasi Companion */}
            {isConfiguring ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'slideUpFade 0.2s ease-out forwards', paddingBottom: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Nama Karakter</label>
                  <input
                    type="text"
                    name="companionName"
                    autocomplete="off"
                    className="input-field"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    style={{ padding: '0.5rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Avatar Emoji</label>
                  <div className="avatar-selector">
                    {avatarsList.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        className={`avatar-btn ${compAvatar === emoji ? 'selected' : ''}`}
                        onClick={() => setCompAvatar(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pilih Mode */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Mode Sistem</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${compMode === 'default' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCompMode('default')}
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                    >
                      Preset Bawaan
                    </button>
                    <button
                      type="button"
                      className={`btn ${compMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCompMode('custom')}
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                    >
                      Kustom Penuh
                    </button>
                  </div>
                </div>

                {/* Sub-opsi Mode Bawaan */}
                {compMode === 'default' ? (
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Pilih Karakter Bawaan</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className={`btn ${compPreset === 'bad' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCompPreset('bad')}
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', borderColor: compPreset === 'bad' ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}
                      >
                        😈 Bad {compName} (Sarkas/Kocak)
                      </button>
                      <button
                        type="button"
                        className={`btn ${compPreset === 'good' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCompPreset('good')}
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', borderColor: compPreset === 'good' ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}
                      >
                        😇 Good {compName} (Manis/Sopan)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Hard Prompt Utama (System Instruction)</label>
                    <textarea
                      className="input-field"
                      placeholder="Masukkan instruksi inti sistem untuk AI..."
                      value={compHardPrompt}
                      onChange={(e) => setCompHardPrompt(e.target.value)}
                      rows={4}
                      style={{ padding: '0.5rem', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>
                )}

                {/* Personality Prompt */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>
                    {compMode === 'default' ? 'Kustomisasi Tambahan Kepribadian' : 'Prompt Kepribadian (Personality)'}
                  </label>
                  <textarea
                    className="input-field"
                    placeholder="misal: Suka menyapa dengan kata 'Halo Bos!', atau sering bercanda soal kopi..."
                    value={compPersonality}
                    onChange={(e) => setCompPersonality(e.target.value)}
                    rows={3}
                    style={{ padding: '0.5rem', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                {/* Push Notification Toggle Section */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: 0 }}>
                    <span>🔔 Notifikasi Pengingat {compName}</span>
                    <input 
                      type="checkbox" 
                      checked={notificationsEnabled} 
                      onChange={handleToggleNotifications}
                      disabled={notificationLoading}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </label>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', lineHeight: 1.3 }}>
                    Asisten akan mengirim notifikasi ke perangkat ini untuk mengingatkan tugas hari ini & kebiasaan wajib secara berkala.
                  </p>
                  
                  {notificationsEnabled && (
                    <button 
                      type="button" 
                      onClick={handleSendTestNotification} 
                      disabled={notificationLoading}
                      style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.25rem 0.5rem', 
                        fontSize: '0.7rem', 
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      🧪 Kirim Tes Notifikasi
                    </button>
                  )}

                  {/* Deteksi iOS / Safari Tip */}
                  {typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.5rem', borderRadius: '6px', marginTop: '0.5rem', fontSize: '0.72rem', color: '#f59e0b', lineHeight: '1.3' }}>
                      <strong>📱 Tips Safari/iOS:</strong> Notifikasi memerlukan web app terinstal. Ketuk ikon <strong>Share</strong> di Safari lalu pilih <strong>"Add to Home Screen"</strong> untuk mengaktifkannya.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button className="btn btn-primary" onClick={handleSaveCompanion} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                    Simpan
                  </button>
                  <button className="btn btn-secondary" onClick={() => setIsConfiguring(false)} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                "{memexCompanion.customPrompt.substring(0, 95)}..."
              </p>
            )}
          </div>

          {/* Companion Chat Box */}
          <div className="companion-chat-box">
            {/* Header Chat */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={14} color="var(--accent)" /> Chat dengan {memexCompanion.name}
              </span>
              {memexChats.length > 0 && (
                <button 
                  onClick={clearMemexChats}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Clear Chat
                </button>
              )}
            </div>

            {/* Gelembung Pesan */}
            <div ref={chatContainerRef} className="companion-chat-messages">
              {memexChats.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <span>Mulailah menyapa {memexCompanion.name}! Dia ingat jurnal harianmu di sebelah kiri.</span>
                </div>
              ) : (
                memexChats.map(chat => (
                  <div
                    key={chat.id}
                    className={`chat-bubble ${chat.role}`}
                    style={{ display: 'flex', flexDirection: 'column' }}
                  >
                    {chat.role === 'assistant' ? (
                      <div><MarkdownRenderer text={chat.content} /></div>
                    ) : (
                      <MarkdownRenderer text={chat.content} />
                    )}
                    <span style={{
                      fontSize: '0.65rem',
                      opacity: 0.5,
                      marginTop: '0.25rem',
                      alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatChatTime(chat.timestamp)}
                    </span>
                  </div>
                ))
              )}

              {/* Animasi Mengetik */}
              {loadingChat && (
                <div className="chat-bubble companion" style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0.5rem 0.75rem' }}>
                  <div className="pulsing-dot"></div>
                  <div className="pulsing-dot"></div>
                  <div className="pulsing-dot"></div>
                </div>
              )}
            </div>

            {/* Input Form Chat */}
            <input 
              type="file" 
              ref={chatFileInputRef} 
              onChange={handleChatFileChange} 
              style={{ display: 'none' }}
              accept=".txt,.md,.json,.pdf,image/*"
            />

            {chatSelectedFile && (
              <div style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: '#94a3b8',
                borderRadius: '8px 8px 0 0',
                margin: '0 0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <span style={{ fontSize: '1rem' }}>📄</span>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                    {chatSelectedFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChatSelectedFile(null);
                    setChatFileDataUrl(null);
                    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontSize: '0.9rem'
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSendChat} className="companion-chat-input" style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => chatFileInputRef.current?.click()}
                disabled={loadingChat}
                style={{ padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Lampirkan File/Foto"
              >
                <Paperclip size={14} />
              </button>
              
              <textarea
                name="chatMessage"
                autocomplete="off"
                className="input-field"
                placeholder={`Kirim pesan ke ${memexCompanion.name}...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                disabled={loadingChat}
                rows={1}
                style={{ 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '8px', 
                  fontSize: '0.85rem',
                  resize: 'none',
                  flex: 1,
                  height: '36px',
                  lineHeight: '1.4',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)',
                  color: 'white',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loadingChat || (!chatInput.trim() && !chatSelectedFile)}
                style={{ padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Modal Detail & Editor Kartu Jurnal */}
      {editingCard && (
        <div className="memex-modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem'
        }}>
          <div className="memex-modal-content card" style={{
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            margin: 0,
            overflowY: 'auto',
            animation: 'scaleUpFade 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} color="var(--primary)" /> {editingCard.id ? 'Detail & Revisi Kartu' : 'Tambah Kartu Manual'}
              </h3>
              <button 
                onClick={() => setEditingCard(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Selector */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setActiveModalTab('read')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  border: '1px solid var(--border-color)',
                  backgroundColor: activeModalTab === 'read' ? 'var(--primary)' : 'var(--bg-card)',
                  color: activeModalTab === 'read' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Baca (Markdown)
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('edit')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  border: '1px solid var(--border-color)',
                  backgroundColor: activeModalTab === 'edit' ? 'var(--primary)' : 'var(--bg-card)',
                  color: activeModalTab === 'edit' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Edit (Revisi)
              </button>
            </div>

            {/* Tab Content: Baca */}
            {activeModalTab === 'read' && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Meta details */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>Tipe: <strong style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{editingCard.type}</strong></span>
                  <span>Dibuat: <strong>{formatDate(editingCard.createdAt)}</strong></span>
                </div>

                {/* Markdown View Area */}
                <div 
                  className="markdown-preview"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    padding: '1.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    minHeight: '150px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6
                  }}
                  dangerouslySetInnerHTML={
                    (editingCard.type === 'note' || !['task', 'quote', 'contact', 'transaction'].includes(editingCard.type))
                      ? renderMarkdown(editingCard.data?.summary)
                      : editingCard.type === 'task'
                      ? renderMarkdown(editingCard.data?.todo)
                      : editingCard.type === 'quote'
                      ? renderMarkdown(editingCard.data?.quote)
                      : editingCard.type === 'contact'
                      ? renderMarkdown(editingCard.data?.context || `Pertemuan dengan ${editingCard.data?.name}`)
                      : renderMarkdown(`Transaksi ${editingCard.data?.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'} sebesar ${formatCurrency(editingCard.data?.amount)}`)
                  }
                />

                {/* Additional details depending on type */}
                {editingCard.type === 'transaction' && (
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <p style={{ margin: '0 0 0.25rem 0' }}><strong>Nominal:</strong> <span style={{ color: editingCard.data?.type === 'expense' ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{formatCurrency(editingCard.data?.amount)}</span></p>
                    <p style={{ margin: 0 }}><strong>Kategori:</strong> {editingCard.data?.category} | <strong>Jenis:</strong> {editingCard.data?.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</p>
                  </div>
                )}

                {editingCard.type === 'task' && editingCard.data?.dueDate && (
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <p style={{ margin: 0, color: 'var(--danger)' }}><strong>Tenggat Waktu:</strong> {editingCard.data?.dueDate}</p>
                  </div>
                )}

                {editingCard.type === 'quote' && (
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    <p style={{ margin: 0 }}><strong>Penulis:</strong> {editingCard.data?.author || 'Anonim'}</p>
                  </div>
                )}

                {editingCard.type === 'contact' && (
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <p style={{ margin: '0 0 0.25rem 0' }}><strong>Nama Kontak:</strong> {editingCard.data?.name}</p>
                    <p style={{ margin: 0 }}><strong>Hubungan:</strong> {editingCard.data?.relationship}</p>
                  </div>
                )}

                {/* Tags */}
                {editingCard.tags && editingCard.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {editingCard.tags.map(t => (
                      <span key={t} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Edit */}
            {activeModalTab === 'edit' && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Judul Kartu */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Judul Kartu</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingCard.title}
                    onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                  />
                </div>

                {/* Tag Kartu */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Tag (Pisahkan dengan koma)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingCard.tags?.join(', ') || ''}
                    onChange={(e) => setEditingCard({ ...editingCard, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    placeholder="misal: belanja, kopi, bulanan"
                  />
                </div>

                {/* Tipe Kartu */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Tipe Kartu</label>
                   <select
                    className="input-field"
                    value={['note', 'task', 'transaction', 'quote', 'contact'].includes(editingCard.type) ? editingCard.type : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setEditingCard({ ...editingCard, type: 'ide', data: { ...editingCard.data, summary: editingCard.data?.summary || '' } });
                      } else {
                        setEditingCard({ ...editingCard, type: val, data: {} });
                      }
                    }}
                  >
                    <option value="note">Catatan (Note)</option>
                    <option value="task">Tugas (Task)</option>
                    <option value="transaction">Keuangan (Transaction)</option>
                    <option value="quote">Kutipan (Quote)</option>
                    <option value="contact">Kontak (Contact)</option>
                    <option value="custom">Kategori Kustom...</option>
                  </select>
                </div>

                {/* Input Nama Kategori Kustom */}
                {!['note', 'task', 'transaction', 'quote', 'contact'].includes(editingCard.type) && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Nama Kategori Kustom (1 kata, lowercase)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="misal: ide, resep, hobi"
                      value={editingCard.type}
                      onChange={(e) => setEditingCard({ 
                        ...editingCard, 
                        type: e.target.value.toLowerCase().replace(/\s+/g, '') 
                      })}
                    />
                  </div>
                )}

              {/* Spesifik Data Field Editor */}
              {(editingCard.type === 'note' || !['note', 'task', 'transaction', 'quote', 'contact'].includes(editingCard.type)) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Isi Rangkuman / Detail (Format Markdown)</label>
                  <textarea
                    className="input-field"
                    rows={6}
                    value={editingCard.data?.summary || ''}
                    onChange={(e) => setEditingCard({
                      ...editingCard,
                      data: { ...editingCard.data, summary: e.target.value }
                    })}
                    style={{ fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>
              )}

                {editingCard.type === 'task' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Rincian Tugas (Format Markdown)</label>
                      <textarea
                        className="input-field"
                        rows={4}
                        value={editingCard.data?.todo || ''}
                        onChange={(e) => setEditingCard({
                          ...editingCard,
                          data: { ...editingCard.data, todo: e.target.value }
                        })}
                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Tenggat Tanggal (YYYY-MM-DD)</label>
                      <input
                        type="date"
                        className="input-field"
                        value={editingCard.data?.dueDate || ''}
                        onChange={(e) => setEditingCard({
                          ...editingCard,
                          data: { ...editingCard.data, dueDate: e.target.value }
                        })}
                      />
                    </div>
                  </>
                )}

                {editingCard.type === 'transaction' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Nominal (Angka)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={editingCard.data?.amount || 0}
                          onChange={(e) => setEditingCard({
                            ...editingCard,
                            data: { ...editingCard.data, amount: parseInt(e.target.value, 10) || 0 }
                          })}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Jenis Transaksi</label>
                        <select
                          className="input-field"
                          value={editingCard.data?.type || 'expense'}
                          onChange={(e) => setEditingCard({
                            ...editingCard,
                            data: { ...editingCard.data, type: e.target.value }
                          })}
                        >
                          <option value="expense">Pengeluaran (Expense)</option>
                          <option value="income">Pemasukan (Income)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Kategori</label>
                      <input
                        type="text"
                        className="input-field"
                        value={editingCard.data?.category || ''}
                        onChange={(e) => setEditingCard({
                          ...editingCard,
                          data: { ...editingCard.data, category: e.target.value }
                        })}
                      />
                    </div>
                  </>
                )}

                {editingCard.type === 'quote' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Isi Kutipan (Format Markdown)</label>
                      <textarea
                        className="input-field"
                        rows={4}
                        value={editingCard.data?.quote || ''}
                        onChange={(e) => setEditingCard({
                          ...editingCard,
                          data: { ...editingCard.data, quote: e.target.value }
                        })}
                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Penulis (Author)</label>
                      <input
                        type="text"
                        className="input-field"
                        value={editingCard.data?.author || ''}
                        onChange={(e) => setEditingCard({
                          ...editingCard,
                          data: { ...editingCard.data, author: e.target.value }
                        })}
                      />
                    </div>
                  </>
                )}

                {editingCard.type === 'contact' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Nama Kontak</label>
                        <input
                          type="text"
                          className="input-field"
                          value={editingCard.data?.name || ''}
                          onChange={(e) => setEditingCard({
                            ...editingCard,
                            data: { ...editingCard.data, name: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Hubungan</label>
                        <input
                          type="text"
                          className="input-field"
                          value={editingCard.data?.relationship || ''}
                          onChange={(e) => setEditingCard({
                            ...editingCard,
                            data: { ...editingCard.data, relationship: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Keterangan Pertemuan / Catatan (Format Markdown)</label>
                      <textarea
                        className="input-field"
                        rows={4}
                        value={editingCard.data?.context || ''}
                        onChange={(e) => setEditingCard({
                          ...editingCard,
                          data: { ...editingCard.data, context: e.target.value }
                        })}
                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Modal Footer Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setEditingCard(null)}
                style={{ flex: 1, margin: 0 }}
              >
                Batal
              </button>
               <button 
                className="btn btn-primary" 
                onClick={handleSaveEditCard}
                style={{ flex: 1, margin: 0 }}
              >
                {editingCard.id ? 'Simpan Perubahan' : 'Tambah Kartu'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .suki-knowledge-preview h1 { font-size: 1.5rem; margin-top: 0; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--primary); }
        .suki-knowledge-preview h2 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--text-primary); }
        .suki-knowledge-preview h3 { font-size: 1.1rem; margin-top: 1.25rem; margin-bottom: 0.5rem; color: var(--text-primary); }
        .suki-knowledge-preview table th, .suki-knowledge-preview table td { border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; }
        .suki-knowledge-preview table tr:nth-child(even) { background-color: rgba(255,255,255,0.02); }
        .suki-knowledge-preview blockquote { border-left: 4px solid var(--primary); padding-left: 1rem; color: var(--text-secondary); margin: 1rem 0; font-style: italic; }
        .search-highlight {
          background-color: #fef08a !important;
          color: #854d0e !important;
          font-weight: 600;
          border-radius: 2px;
          padding: 0 2px;
          border-bottom: 2px solid #eab308;
        }
      `}</style>
    </div>
  );
}
