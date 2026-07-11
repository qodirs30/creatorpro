import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Edit3, Settings, LogOut, LayoutDashboard, Target, Wand2, Menu, X, Hash, Sparkles, Code, Video, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import useAppStore from './store/useAppStore';
import './index.css';

import { onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  loginWithGoogle, 
  registerWithEmail, 
  loginWithEmail, 
  sendPasswordReset, 
  uploadBackupToDatabase, 
  downloadBackupFromDatabase,
  logoutFirebase
} from './utils/firebase';

// Seamless migration from procreator-storage-v2 to qodirsai-storage-v1
if (!localStorage.getItem('qodirsai-storage-v1') && localStorage.getItem('procreator-storage-v2')) {
  localStorage.setItem('qodirsai-storage-v1', localStorage.getItem('procreator-storage-v2'));
}

// Components
import LockScreen from './components/LockScreen';
import FloatingSuki from './components/FloatingSuki';
import Dashboard from './pages/Dashboard';
import ContentScripting from './pages/ContentScripting';
import DailyPlanner from './pages/DailyPlanner';
import AppSettings from './pages/Settings';
import SocialPlanner from './pages/SocialPlanner';
import HabitTracker from './pages/HabitTracker';
import MegaPrompt from './pages/MegaPrompt';
import ClickCounter from './pages/ClickCounter';
import MemexJournal from './pages/MemexJournal';
import VibeCoder from './pages/VibeCoder';
import MegaCreator from './pages/MegaCreator';

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { setIsLocked, enablePinLock } = useAppStore();

  const handleLogoutClick = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari akun?')) {
      try {
        await logoutFirebase();
      } catch (err) {
        console.error('Gagal keluar:', err);
      }
    }
  };

  const navItems = [
    { name: 'Beranda', path: '/', icon: <Home size={20} /> },
    { name: 'Card Cloud Journal', path: '/memex', icon: <Sparkles size={20} /> },
    { name: 'Pelacak Kebiasaan', path: '/habits', icon: <Target size={20} /> },
    { name: 'Mega Prompt', path: '/mega-prompt', icon: <Wand2 size={20} /> },
    { name: 'Click Counter', path: '/counter', icon: <Hash size={20} /> },
    { name: 'Penulis Naskah', path: '/scripting', icon: <Edit3 size={20} /> },
    { name: 'Mega Creator Studio', path: '/mega-creator', icon: <Video size={20} /> },
    { name: 'Perencana Konten', path: '/social', icon: <LayoutDashboard size={20} /> },
    { name: 'Jadwal Harian', path: '/planner', icon: <Calendar size={20} /> },
    { name: 'Vibe Coding Hub', path: '/vibe-generator', icon: <Code size={20} /> },
    { name: 'Pengaturan', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo-wrapper">
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="sidebar-logo-img"
          />
          <h2 className="sidebar-logo-title">
            qodirs<span className="sidebar-logo-accent">Ai</span>
          </h2>
        </div>
        {/* Close button visible only on mobile */}
        <button
          onClick={onClose}
          className="sidebar-close-btn"
          aria-label="Tutup menu"
        >
          <X size={22} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-nav-icon">
                {item.icon}
              </span>
              <span className="sidebar-nav-label">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1.25rem' }}>
        {enablePinLock && (
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsLocked(true)}
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
          >
            <Lock size={16} style={{ marginRight: '0.5rem' }} />
            Kunci Aplikasi
          </button>
        )}
        <button 
          className="btn btn-secondary" 
          onClick={handleLogoutClick}
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
        >
          <LogOut size={16} style={{ marginRight: '0.5rem' }} />
          Keluar
        </button>
      </div>

      <style>{`
        .sidebar-close-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 0.5rem;
        }
        @media (max-width: 768px) {
          .sidebar-close-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { firebaseUser, memexCards, updateMemexCard } = useAppStore();
  const lastStateRef = useRef();
  const lastPathnameRef = useRef(location.pathname);

  // Handle SPA path redirection from 404
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('redirect_path');
    if (redirectPath) {
      sessionStorage.removeItem('redirect_path');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);

  // Register Service Worker for Push Notifications
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('Service Worker registered successfully for Web Push:', reg.scope);
        })
        .catch(err => {
          console.error('Service Worker registration failed:', err);
        });
    }
  }, []);

  // Real-time task alarm/reminder scheduler
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      // Format YYYY-MM-DD local time
      const todayStr = now.toLocaleDateString('en-CA');
      // Format HH:MM 24 jam local time
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hour}:${minute}`;

      (memexCards || []).forEach(card => {
        if (
          card.type === 'task' &&
          !card.data?.completed &&
          !card.data?.notified &&
          (card.data?.dueDate === todayStr || (!card.data?.dueDate && new Date(card.createdAt).toDateString() === now.toDateString())) &&
          card.data?.dueTime === currentTimeStr
        ) {
          // Tandai kartu sebagai sudah dikirimi notifikasi agar tidak berulang
          updateMemexCard(card.id, {
            data: { ...card.data, notified: true }
          });

          // Tampilkan notifikasi
          const title = `Reminder: ${card.title || 'Tugas'}`;
          const options = {
            body: card.data?.todo || 'Saatnya menyelesaikan tugas Anda!',
            icon: '/logo.svg',
            badge: '/favicon.svg',
            tag: card.id,
            requireInteraction: true
          };

          // Tampilkan notifikasi menggunakan Service Worker jika terdaftar, atau fallback
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification(title, options);
            });
          } else if (Notification.permission === 'granted') {
            new Notification(title, options);
          } else {
            console.log('Notification permission not granted or SW not ready.');
          }
        }
      });
    };

    // Jalankan pemeriksaan setiap 15 detik
    const intervalId = setInterval(checkReminders, 15000);
    return () => clearInterval(intervalId);
  }, [memexCards, updateMemexCard]);

  // Close sidebar when route changes (on mobile)
  useEffect(() => {
    if (location.pathname !== lastPathnameRef.current) {
      lastPathnameRef.current = location.pathname;
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Auto-save Zustand data to Firebase Realtime Database
  useEffect(() => {
    if (!firebaseUser) return;
    
    // Initialize lastStateRef with current values
    lastStateRef.current = {
      memexCards: useAppStore.getState().memexCards || [],
      habits: useAppStore.getState().habits || [],
      scripts: useAppStore.getState().scripts || [],
      socialPosts: useAppStore.getState().socialPosts || [],
      counters: useAppStore.getState().counters || [],
      activityLog: useAppStore.getState().activityLog || [],
      history: useAppStore.getState().history || [],
      sukiKnowledge: useAppStore.getState().sukiKnowledge || { content: '', updatedAt: new Date(0).toISOString() },
      geminiKey: useAppStore.getState().geminiKey || '',
      groqKey: useAppStore.getState().groqKey || '',
      openAiKey: useAppStore.getState().openAiKey || '',
      klingAccessKey: useAppStore.getState().klingAccessKey || '',
      klingSecretKey: useAppStore.getState().klingSecretKey || '',
      aiProvider: useAppStore.getState().aiProvider || 'gemini',
      aiModel: useAppStore.getState().aiModel || 'gemini-2.5-flash',
      enablePinLock: useAppStore.getState().enablePinLock ?? false,
      pin: useAppStore.getState().pin || '1234',
    };

    let timeoutId;
    const unsubscribe = useAppStore.subscribe((state) => {
      const keysToCheck = [
        'memexCards', 'habits', 'scripts', 'socialPosts', 'counters', 'activityLog', 'history', 'sukiKnowledge', 'memexChats',
        'geminiKey', 'groqKey', 'openAiKey', 'klingAccessKey', 'klingSecretKey', 'aiProvider', 'aiModel', 'enablePinLock', 'pin'
      ];
      const hasChanged = keysToCheck.some(key => state[key] !== lastStateRef.current[key]);
      
      if (hasChanged) {
        // Update ref
        lastStateRef.current = {
          memexCards: state.memexCards || [],
          habits: state.habits || [],
          scripts: state.scripts || [],
          socialPosts: state.socialPosts || [],
          counters: state.counters || [],
          activityLog: state.activityLog || [],
          history: state.history || [],
          sukiKnowledge: state.sukiKnowledge || { content: '', updatedAt: new Date(0).toISOString() },
          memexChats: state.memexChats || [],
          geminiKey: state.geminiKey || '',
          groqKey: state.groqKey || '',
          openAiKey: state.openAiKey || '',
          klingAccessKey: state.klingAccessKey || '',
          klingSecretKey: state.klingSecretKey || '',
          aiProvider: state.aiProvider || 'gemini',
          aiModel: state.aiModel || 'gemini-2.5-flash',
          enablePinLock: state.enablePinLock ?? false,
          pin: state.pin || '1234',
        };

        clearTimeout(timeoutId);
        // Debounce upload by 2.5 seconds to avoid flooding writes
        timeoutId = setTimeout(async () => {
          try {
            await uploadBackupToDatabase(firebaseUser.uid, lastStateRef.current);
            console.log('Firebase Cloud auto-sync success.');
          } catch (err) {
            console.error('Firebase auto-sync error:', err);
          }
        }, 2500);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [firebaseUser]);

  return (
    <div className="app-container">
      {/* Mobile hamburger button - hidden when sidebar is open */}
      {!sidebarOpen && (
        <button
          className="mobile-menu-toggle"
          onClick={() => setSidebarOpen(true)}
          aria-label="Buka menu"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Overlay backdrop for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/memex" element={<MemexJournal />} />
          <Route path="/habits" element={<HabitTracker />} />
          <Route path="/mega-prompt" element={<MegaPrompt />} />
          <Route path="/counter" element={<ClickCounter />} />
          <Route path="/scripting" element={<ContentScripting />} />
          <Route path="/social" element={<SocialPlanner />} />
          <Route path="/planner" element={<DailyPlanner />} />
          <Route path="/vibe-generator" element={<VibeCoder />} />
          <Route path="/mega-creator" element={<MegaCreator />} />
          <Route path="/settings" element={<AppSettings />} />
        </Routes>
      </main>

      {/* Global Suki Floating Chat Bubble */}
      <FloatingSuki />
    </div>
  );
}

// Helper to merge data by ID with timestamp conflict resolution
const mergeData = (local, cloud) => {
  if (!cloud) return local;
  
  const mergeArray = (localArr, cloudArr, key = 'id') => {
    const lArr = Array.isArray(localArr) ? localArr : [];
    const cArr = Array.isArray(cloudArr) ? cloudArr : [];
    const map = new Map();
    // Add all cloud items
    cArr.forEach(item => {
      if (item && item[key]) map.set(item[key], item);
    });
    // Merge local items
    lArr.forEach(item => {
      if (item && item[key]) {
        const cloudItem = map.get(item[key]);
        if (!cloudItem) {
          map.set(item[key], item);
        } else {
          // Compare timestamps
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

  const mergeVal = (localVal, cloudVal, defaultVal) => {
    if (cloudVal !== undefined && cloudVal !== null && cloudVal !== '') return cloudVal;
    return localVal !== undefined && localVal !== null && localVal !== '' ? localVal : defaultVal;
  };

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
    geminiKey: mergeVal(local?.geminiKey, cloud?.geminiKey, ''),
    groqKey: mergeVal(local?.groqKey, cloud?.groqKey, ''),
    openAiKey: mergeVal(local?.openAiKey, cloud?.openAiKey, ''),
    klingAccessKey: mergeVal(local?.klingAccessKey, cloud?.klingAccessKey, ''),
    klingSecretKey: mergeVal(local?.klingSecretKey, cloud?.klingSecretKey, ''),
    aiProvider: mergeVal(local?.aiProvider, cloud?.aiProvider, 'gemini'),
    aiModel: mergeVal(local?.aiModel, cloud?.aiModel, 'gemini-2.5-flash'),
    enablePinLock: cloud?.enablePinLock !== undefined ? cloud.enablePinLock : (local?.enablePinLock ?? false),
    pin: mergeVal(local?.pin, cloud?.pin, '1234'),
  };
};

function AuthGate({ children }) {
  const { 
    firebaseUser, 
    setFirebaseUser, 
    setIsAuthActive,
    restoreBackup
  } = useAppStore();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  
  // Separate states for forms
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  
  const [forgotEmail, setForgotEmail] = useState('');
  
  // Password toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [initLoading, setInitLoading] = useState(true);

  // Listen for Auth status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || 'https://www.gravatar.com/avatar?d=mp'
        });
        setIsAuthActive(true);
        
        // Sync database
        setSyncing(true);
        try {
          const state = useAppStore.getState();
          const localData = {
            memexCards: state.memexCards || [],
            habits: state.habits || [],
            scripts: state.scripts || [],
            socialPosts: state.socialPosts || [],
            counters: state.counters || [],
            activityLog: state.activityLog || [],
            history: state.history || [],
            sukiKnowledge: state.sukiKnowledge || { content: '', updatedAt: new Date(0).toISOString() },
            geminiKey: state.geminiKey || '',
            groqKey: state.groqKey || '',
            openAiKey: state.openAiKey || '',
            klingAccessKey: state.klingAccessKey || '',
            klingSecretKey: state.klingSecretKey || '',
            aiProvider: state.aiProvider || 'gemini',
            aiModel: state.aiModel || 'gemini-2.5-flash',
            enablePinLock: state.enablePinLock ?? false,
            pin: state.pin || '1234',
          };
          
          const cloudData = await downloadBackupFromDatabase(user.uid);
          if (cloudData) {
            const merged = mergeData(localData, cloudData);
            restoreBackup(merged);
            await uploadBackupToDatabase(user.uid, merged);
          } else {
            // No backup in cloud yet, upload local data
            await uploadBackupToDatabase(user.uid, localData);
          }
        } catch (syncErr) {
          console.error("Gagal sinkronisasi data Firebase:", syncErr);
        } finally {
          setSyncing(false);
        }
      } else {
        setFirebaseUser(null);
        setIsAuthActive(false);
      }
      setInitLoading(false);
    });
    return () => unsubscribe();
  }, [restoreBackup, setFirebaseUser, setIsAuthActive]);



  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal masuk menggunakan Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await loginWithEmail(loginEmail, loginPassword);
    } catch (err) {
      console.error(err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        friendlyMessage = 'Email atau Kata Sandi salah.';
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (!registerName.trim()) {
        throw new Error('Nama Lengkap wajib diisi.');
      }
      await registerWithEmail(registerEmail, registerPassword, registerName);
    } catch (err) {
      console.error(err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'Email ini sudah terdaftar.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Kata Sandi minimal 6 karakter.';
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (!forgotEmail.trim()) {
        throw new Error('Alamat Email wajib diisi.');
      }
      await sendPasswordReset(forgotEmail);
      setSuccessMsg('Email instruksi reset kata sandi telah dikirim!');
      setForgotEmail('');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengirim email reset kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="welcome-gate-backdrop">
        <div className="auth-card-wrapper" style={{ padding: 0 }}>
          <div className="auth-logo-header" style={{ marginBottom: 0 }}>
            <img src="/logo.svg" alt="qodirsAi Logo" className="auth-logo-image" style={{ width: '84px', height: '84px', animation: 'logoPulse 2s infinite ease-in-out' }} />
            <p style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '1.1rem', marginTop: '1.25rem', letterSpacing: '0.02em' }}>Memuat Ruang Kerja...</p>
          </div>
        </div>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="welcome-gate-backdrop">
        <div className="auth-card-wrapper" style={{ padding: 0 }}>
          <div className="auth-logo-header" style={{ marginBottom: 0 }}>
            <img src="/logo.svg" alt="qodirsAi Logo" className="auth-logo-image" style={{ width: '84px', height: '84px', animation: 'logoPulse 1.5s infinite ease-in-out' }} />
            <p style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '1.1rem', marginTop: '1.25rem', letterSpacing: '0.02em' }}>Menyelaraskan data cloud...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="welcome-gate-backdrop">
        {/* Floating background blur blobs */}
        <div className="auth-bg-blob auth-bg-blob-1" />
        <div className="auth-bg-blob auth-bg-blob-2" />
        <div className="auth-bg-blob auth-bg-blob-3" />

        <div className="auth-card-wrapper">
          <div className="auth-glass-card">
          {/* Logo Branding */}
          <div className="auth-logo-header">
            <img src="/logo.svg" alt="qodirsAi Logo" className="auth-logo-image" />
            <div className="auth-logo-text">
              qodirsAi <span className="auth-logo-version">v3.0</span>
            </div>
          </div>

          <h1 className="auth-title" style={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #ffffff 30%, #c084fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            {authMode === 'login' ? 'Masuk ke qodirsAi' : authMode === 'register' ? 'Buat Akun qodirsAi' : 'Reset Kata Sandi'}
          </h1>
          <p className="auth-description" style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.5 }}>
            {authMode === 'login' ? 'Kelola Jurnal Memex dan Habit dengan sinkronisasi cloud terenkripsi.' :
             authMode === 'register' ? 'Daftar sekarang untuk sinkronisasi data instan di semua perangkat.' :
             'Masukkan email Anda untuk menerima tautan pemulihan kata sandi.'}
          </p>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="auth-alert auth-alert-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert auth-alert-success">
              <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab Switches */}
          {authMode !== 'forgot' && (
            <div className="auth-tabs-container">
              <div 
                className="auth-tab-active-pill" 
                style={{
                  transform: `translateX(${authMode === 'register' ? '100%' : '0%'})`
                }}
              />
              <button 
                type="button" 
                onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
              >
                Masuk
              </button>
              <button 
                type="button" 
                onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              >
                Daftar
              </button>
            </div>
          )}

          {/* Form Content */}
          <div style={{ width: '100%', marginTop: '0.25rem' }}>
            {authMode === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Alamat Email</label>
                  <div className="auth-input-wrapper">
                    <input 
                      type="email" 
                      name="email"
                      autocomplete="email"
                      className="auth-input-field" 
                      placeholder="nama@domain.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required 
                    />
                    <Mail size={18} className="auth-input-icon" />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Kata Sandi</label>
                    <button 
                      type="button" 
                      onClick={() => { setAuthMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                      style={{ background: 'transparent', color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', padding: 0 }}
                    >
                      Lupa sandi?
                    </button>
                  </div>
                  <div className="auth-input-wrapper">
                    <input 
                      type={showLoginPassword ? 'text' : 'password'} 
                      name="password"
                      autocomplete="current-password"
                      className="auth-input-field" 
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required 
                    />
                    <Lock size={18} className="auth-input-icon" />
                    <button 
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Masuk Sekarang'}
                </button>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Nama Lengkap</label>
                  <div className="auth-input-wrapper">
                    <input 
                      type="text" 
                      name="name"
                      autocomplete="name"
                      className="auth-input-field" 
                      placeholder="Masukkan nama lengkap Anda"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required 
                    />
                    <User size={18} className="auth-input-icon" />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Alamat Email</label>
                  <div className="auth-input-wrapper">
                    <input 
                      type="email" 
                      name="email"
                      autocomplete="email"
                      className="auth-input-field" 
                      placeholder="nama@domain.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required 
                    />
                    <Mail size={18} className="auth-input-icon" />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Kata Sandi</label>
                  <div className="auth-input-wrapper">
                    <input 
                      type={showRegisterPassword ? 'text' : 'password'} 
                      name="password"
                      autocomplete="new-password"
                      className="auth-input-field" 
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required 
                    />
                    <Lock size={18} className="auth-input-icon" />
                    <button 
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      aria-label={showRegisterPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Buat Akun'}
                </button>
              </form>
            )}

            {authMode === 'forgot' && (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>Alamat Email</label>
                  <div className="auth-input-wrapper">
                    <input 
                      type="email" 
                      name="email"
                      autocomplete="email"
                      className="auth-input-field" 
                      placeholder="nama@domain.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required 
                    />
                    <Mail size={18} className="auth-input-icon" />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Kirim Link Reset'}
                </button>

                <button 
                  type="button" 
                  onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{ background: 'transparent', color: '#cbd5e1', fontSize: '0.9rem', marginTop: '1.25rem', fontWeight: 600, border: 'none', cursor: 'pointer', alignSelf: 'center' }}
                >
                  Kembali ke Halaman Masuk
                </button>
              </form>
            )}
          </div>

          {/* Google Sign In Section */}
          {authMode !== 'forgot' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0 1rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>ATAU MASUK DENGAN</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              </div>

              <button 
                type="button"
                className="auth-btn-google" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google Account</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    );
  }

  return children;
}

function App() {
  return (
    <LockScreen>
      <BrowserRouter>
        <AuthGate>
          <AppLayout />
        </AuthGate>
      </BrowserRouter>
    </LockScreen>
  );
}

export default App;
