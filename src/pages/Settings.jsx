import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { Key, Save, Shield, ExternalLink, Cpu, Trash2, RefreshCw, Plus, Eye, EyeOff, Download, Upload, Database, LogOut } from 'lucide-react';
import { 
  logoutFirebase, 
  updateUserProfile, 
  sendPasswordReset 
} from '../utils/firebase';

export default function Settings() {
  const { 
    geminiKey, setGeminiKey, 
    groqKey, setGroqKey, 
    openAiKey, setOpenAiKey, 
    klingAccessKey, setKlingAccessKey,
    klingSecretKey, setKlingSecretKey,
    aiProvider, setAiProvider, 
    aiModel, setAiModel,
    enablePinLock, setEnablePinLock,
    pin, setPin,
    firebaseUser, setFirebaseUser,
  } = useAppStore();

  const splitKeys = (keyStr) => {
    if (!keyStr) return [''];
    const arr = keyStr.split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
    return arr.length > 0 ? arr : [''];
  };

  const [localGemini, setLocalGemini] = useState(() => splitKeys(geminiKey));
  const [localGroq, setLocalGroq] = useState(() => splitKeys(groqKey));
  const [localOpenAi, setLocalOpenAi] = useState(() => splitKeys(openAiKey));
  
  const [localKlingAccess, setLocalKlingAccess] = useState(klingAccessKey);
  const [localKlingSecret, setLocalKlingSecret] = useState(klingSecretKey);
  
  const [localProvider, setLocalProvider] = useState(aiProvider || 'gemini');
  const [localModel, setLocalModel] = useState(aiModel || 'gemini-2.5-flash');
  const [localEnablePinLock, setLocalEnablePinLock] = useState(enablePinLock);
  const [localPin, setLocalPin] = useState(pin);
  const [saved, setSaved] = useState(false);
  const [proxyTesting, setProxyTesting] = useState(false);
  const [proxyStatus, setProxyStatus] = useState('');

  // State Profil Firebase
  const [profileName, setProfileName] = useState(firebaseUser?.displayName || '');
  const [profilePhoto, setProfilePhoto] = useState(firebaseUser?.photoURL || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const handleUpdateProfile = async () => {
    if (!profileName.trim()) {
      setProfileMessage({ type: 'error', text: 'Nama tampilan tidak boleh kosong.' });
      return;
    }
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const updatedUser = await updateUserProfile(profileName, profilePhoto);
      setFirebaseUser({
        uid: updatedUser.uid,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        photoURL: updatedUser.photoURL
      });
      setProfileMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
    } catch (err) {
      console.error(err);
      setProfileMessage({ type: 'error', text: err.message || 'Gagal memperbarui profil.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await sendPasswordReset(firebaseUser.email);
      setProfileMessage({ type: 'success', text: 'Instruksi reset kata sandi telah dikirim ke email Anda!' });
    } catch (err) {
      console.error(err);
      setProfileMessage({ type: 'error', text: err.message || 'Gagal mengirim email reset kata sandi.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Apakah Anda yakin ingin keluar dari akun qodirsAi?")) {
      try {
        await logoutFirebase();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const [showKeys, setShowKeys] = useState({});
  const [keyStatuses, setKeyStatuses] = useState({});

  // Handler Ekspor & Impor Cadangan Data
  const handleExportData = () => {
    const allData = localStorage.getItem('qodirsai-storage-v1');
    if (!allData) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }
    const blob = new Blob([allData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qodirsai-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json || typeof json !== 'object') {
          throw new Error("Format JSON tidak valid.");
        }
        
        // Simpan langsung ke local storage
        localStorage.setItem('qodirsai-storage-v1', event.target.result);
        alert("Data berhasil diimpor! Aplikasi akan memuat ulang halaman.");
        window.location.reload();
      } catch (error) {
        alert("Gagal mengimpor berkas: Pastikan berkas berupa JSON backup yang valid.");
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const textProviders = {
    qodirsai: {
      name: 'qodirsAi Proxy',
      tag: 'Gratis & Tanpa API Key (Rekomendasi)',
      models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Default)' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
      ]
    },
    gemini: {
      name: 'Google Gemini',
      tag: 'Pakai Key Pribadi',
      models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Super Cepat)' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Lebih Pintar)' }
      ]
    }
  };

  const handleProviderChange = (e) => {
    const newProv = e.target.value;
    setLocalProvider(newProv);
    setLocalModel(textProviders[newProv].models[0].id);
  };

  const handleAddKeyField = (provider) => {
    if (provider === 'gemini') {
      setLocalGemini([...localGemini, '']);
    } else if (provider === 'groq') {
      setLocalGroq([...localGroq, '']);
    } else if (provider === 'openai') {
      setLocalOpenAi([...localOpenAi, '']);
    }
  };

  const handleRemoveKeyField = (provider, index) => {
    if (provider === 'gemini') {
      const updated = localGemini.filter((_, i) => i !== index);
      setLocalGemini(updated.length > 0 ? updated : ['']);
    } else if (provider === 'groq') {
      const updated = localGroq.filter((_, i) => i !== index);
      setLocalGroq(updated.length > 0 ? updated : ['']);
    } else if (provider === 'openai') {
      const updated = localOpenAi.filter((_, i) => i !== index);
      setLocalOpenAi(updated.length > 0 ? updated : ['']);
    }
    // Clean up status
    const statusKey = `${provider}-${index}`;
    if (keyStatuses[statusKey]) {
      const updatedStatuses = { ...keyStatuses };
      delete updatedStatuses[statusKey];
      setKeyStatuses(updatedStatuses);
    }
  };

  const handleKeyFieldChange = (provider, index, value) => {
    if (provider === 'gemini') {
      const updated = [...localGemini];
      updated[index] = value;
      setLocalGemini(updated);
    } else if (provider === 'groq') {
      const updated = [...localGroq];
      updated[index] = value;
      setLocalGroq(updated);
    } else if (provider === 'openai') {
      const updated = [...localOpenAi];
      updated[index] = value;
      setLocalOpenAi(updated);
    }
  };

  const checkKeyConnection = async (provider, index, apiKey) => {
    const keyId = `${provider}-${index}`;
    if (!apiKey) {
      setKeyStatuses(prev => ({
        ...prev,
        [keyId]: { status: 'error', message: 'API Key kosong.' }
      }));
      return;
    }

    setKeyStatuses(prev => ({
      ...prev,
      [keyId]: { status: 'checking' }
    }));

    const startTime = performance.now();
    try {
      let response;
      if (provider === 'gemini') {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] })
        });
      } else if (provider === 'groq') {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5
          })
        });
      } else if (provider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5
          })
        });
      }

      const latency = Math.round(performance.now() - startTime);

      if (response && response.ok) {
        setKeyStatuses(prev => ({
          ...prev,
          [keyId]: { status: 'active', latency }
        }));
      } else {
        const errData = response ? await response.json().catch(() => ({})) : {};
        const msg = errData.error?.message || `HTTP ${response?.status || 'Error'}`;
        setKeyStatuses(prev => ({
          ...prev,
          [keyId]: { status: 'error', message: msg }
        }));
      }
    } catch (err) {
      setKeyStatuses(prev => ({
        ...prev,
        [keyId]: { status: 'error', message: err.message || 'Gagal terhubung ke API' }
      }));
    }
  };

  const handleSave = () => {
    if (localEnablePinLock && localPin.length !== 4) {
      alert('PIN harus berupa 4 digit angka!');
      return;
    }
    
    // Join arrays with newlines to store them back in useAppStore
    const geminiStr = localGemini.map(k => k.trim()).filter(Boolean).join('\n');
    const groqStr = localGroq.map(k => k.trim()).filter(Boolean).join('\n');
    const openaiStr = localOpenAi.map(k => k.trim()).filter(Boolean).join('\n');

    setGeminiKey(geminiStr);
    setGroqKey(groqStr);
    setOpenAiKey(openaiStr);
    setKlingAccessKey(localKlingAccess);
    setKlingSecretKey(localKlingSecret);
    setAiProvider(localProvider);
    setAiModel(localModel);
    setEnablePinLock(localEnablePinLock);
    setPin(localPin);


    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestProxy = async () => {
    setProxyTesting(true);
    setProxyStatus('Menghubungkan ke Proxy...');
    try {
      const startTime = performance.now();
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Say: Proxy Active', model: 'gemini-1.5-flash-latest' })
      });
      const latency = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        setProxyStatus(`Sukses! Latency: ${latency}ms`);
      } else {
        const err = await response.json().catch(() => ({}));
        setProxyStatus(`Gagal: ${err.message || 'HTTP ' + response.status}`);
      }
    } catch (err) {
      setProxyStatus(`Gagal terhubung: ${err.message}`);
    } finally {
      setProxyTesting(false);
    }
  };

  const renderKeySection = (provider, title, keysList, helpText, getUrl) => {
    return (
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="var(--primary)" /> {title}
          </span>
          <a href={getUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', textDecoration: 'none' }}>
            Dapatkan Key <ExternalLink size={14} />
          </a>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {keysList.map((key, idx) => {
            const keyId = `${provider}-${idx}`;
            const statusInfo = keyStatuses[keyId];
            const isVisible = showKeys[keyId];
            
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      type={isVisible ? 'text' : 'password'}
                      name="apiKey"
                      autocomplete="off"
                      className="input-field" 
                      placeholder={`Masukkan API Key #${idx + 1}`} 
                      value={key} 
                      onChange={(e) => handleKeyFieldChange(provider, idx, e.target.value)} 
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.85rem',
                        paddingRight: '2.5rem',
                        margin: 0
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }))}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={isVisible ? "Sembunyikan" : "Tampilkan"}
                      aria-label={isVisible ? "Sembunyikan API Key" : "Tampilkan API Key"}
                    >
                      {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  
                  {/* Ping check button */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => checkKeyConnection(provider, idx, key)}
                    style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, height: '42px', width: '42px' }}
                    disabled={statusInfo?.status === 'checking'}
                    title="Cek Koneksi"
                    aria-label="Cek koneksi API Key"
                  >
                    <RefreshCw size={16} className={statusInfo?.status === 'checking' ? 'animate-spin' : ''} />
                  </button>
                  
                  {/* Delete button */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleRemoveKeyField(provider, idx)}
                    style={{ padding: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, height: '42px', width: '42px' }}
                    disabled={keysList.length <= 1 && !key}
                    title="Hapus Key"
                    aria-label="Hapus API Key"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {/* Ping results badge */}
                {statusInfo && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    width: 'fit-content',
                    marginTop: '0.1rem',
                    backgroundColor: statusInfo.status === 'checking' ? 'var(--bg-main)' :
                                     statusInfo.status === 'active' ? '#ecfdf5' : '#fef2f2',
                    color: statusInfo.status === 'checking' ? 'var(--text-secondary)' :
                           statusInfo.status === 'active' ? '#059669' : '#dc2626',
                    border: statusInfo.status === 'checking' ? '1px solid var(--border-color)' :
                            statusInfo.status === 'active' ? '1px solid #10b981' : '1px solid #ef4444'
                  }}>
                    <span style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: statusInfo.status === 'checking' ? '#94a3b8' :
                                  statusInfo.status === 'active' ? '#10b981' : '#ef4444',
                      display: 'inline-block'
                    }} />
                    {statusInfo.status === 'checking' && 'Menghubungkan...'}
                    {statusInfo.status === 'active' && `Aktif (${statusInfo.latency} ms)`}
                    {statusInfo.status === 'error' && `Error: ${statusInfo.message}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAddKeyField(provider)}
          style={{ width: '100%', borderStyle: 'dashed', borderWidth: '1.5px', justifyContent: 'center', padding: '0.6rem', marginTop: '0.25rem' }}
        >
          <Plus size={16} /> Tambah Key Baru
        </button>
        
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
          {helpText}
        </p>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '3rem' }}>
      <h1 className="text-gradient" style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>Card Cloud Journal — API & Konfigurasi</h1>
      
      <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
        Pusat kontrol multi-model. Simpan semua kunci rahasia Anda di sini secara aman (Offline-First). Aplikasi akan cerdas memilih kunci yang tepat sesuai alat yang Anda gunakan.
      </p>

      {/* ===================== KARTU PROFIL PENGGUNA ===================== */}
      {firebaseUser && (
        <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary-light)'
            }}>
              <img 
                src={profilePhoto || 'https://www.gravatar.com/avatar?d=mp'} 
                alt="Profile Preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.src = 'https://www.gravatar.com/avatar?d=mp'; }}
              />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Profil Pengguna qodirsAi</h2>
          </div>
          
          {profileMessage && (
            <div style={{
              background: profileMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: profileMessage.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              color: profileMessage.type === 'error' ? '#fca5a5' : '#a7f3d0',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              {profileMessage.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Nama Tampilan</label>
              <input 
                type="text" 
                name="displayName"
                autocomplete="name"
                className="input-field" 
                value={profileName} 
                onChange={(e) => setProfileName(e.target.value)} 
                placeholder="Nama Anda"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Foto Profil</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  name="profilePhotoUrl"
                  className="input-field" 
                  value={profilePhoto.startsWith('data:') ? 'Foto dari Galeri (Base64)' : profilePhoto} 
                  onChange={(e) => setProfilePhoto(e.target.value)} 
                  placeholder="https://link-foto-anda.jpg atau pilih berkas..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => document.getElementById('profile-file-input').click()}
                  style={{ whiteSpace: 'nowrap', padding: '0 1rem', fontSize: '0.85rem' }}
                >
                  Pilih Foto
                </button>
                <input 
                  type="file" 
                  id="profile-file-input" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) {
                      alert('Berkas harus berupa gambar.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 200;
                        const MAX_HEIGHT = 200;
                        let width = img.width;
                        let height = img.height;
                        if (width > height) {
                          if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                          }
                        } else {
                          if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                          }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL('image/webp', 0.8) || canvas.toDataURL('image/jpeg', 0.8);
                        setProfilePhoto(dataUrl);
                      };
                      img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                  }} 
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Email terdaftar: <strong>{firebaseUser.email}</strong>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleUpdateProfile}
              disabled={profileSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, cursor: 'pointer' }}
            >
              Simpan Profil
            </button>
            
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleResetPassword}
              disabled={profileSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, cursor: 'pointer' }}
            >
              Kirim Link Reset Kata Sandi
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--danger)', borderColor: 'var(--danger)', cursor: 'pointer' }}
            >
              <LogOut size={16} /> Keluar Akun
            </button>
          </div>
        </div>
      )}

      {/* ===================== KARTU DEFAULT TEXT PROVIDER ===================== */}
      <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Cpu size={24} color="var(--accent)" />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Mesin Pemikir Utama (Teks)</h2>
        </div>
        
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Pilih AI yang akan digunakan secara default untuk fitur teks seperti Penulis Naskah, RPG Engine, dan Prompt Engineer.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {Object.entries(textProviders).map(([key, data]) => (
            <label 
              key={key} 
              style={{ 
                display: 'flex', flexDirection: 'column', padding: '1rem',
                border: localProvider === key ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                borderRadius: '8px', cursor: 'pointer',
                backgroundColor: localProvider === key ? 'var(--primary-light)' : 'var(--bg-main)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <input type="radio" name="provider" value={key} checked={localProvider === key} onChange={handleProviderChange} style={{ cursor: 'pointer' }} />
                <span style={{ fontWeight: '600' }}>{data.name}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '1.5rem' }}>{data.tag}</span>
            </label>
          ))}
        </div>

        <div style={{ maxWidth: '400px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Pilih Spesifikasi Model</label>
          <select className="input-field" value={localModel} onChange={(e) => setLocalModel(e.target.value)}>
            {textProviders[localProvider].models.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
          {localProvider === 'qodirsai' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestProxy}
              disabled={proxyTesting}
              style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', width: 'auto' }}
            >
              <RefreshCw size={14} className={proxyTesting ? 'animate-spin' : ''} />
              {proxyStatus || 'Tes Koneksi Proxy'}
            </button>
          )}
        </div>
      </div>
      {/* ===================== KARTU EKSPOR & IMPOR DATA ===================== */}
      <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--success)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Database size={24} color="var(--success)" />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Ekspor & Impor Cadangan Data</h2>
        </div>
        
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Simpan seluruh data aplikasi Anda (kartu jurnal, kebiasaan, chat companion, penghitung, naskah, dan pengaturan) ke dalam file JSON lokal untuk dicadangkan atau dipindahkan ke perangkat lain.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleExportData}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}
          >
            <Download size={16} /> Ekspor Data ke JSON
          </button>
          
          <label 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}
          >
            <Upload size={16} /> Impor Data dari JSON
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportData} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </div>



      {/* ===================== KARTU KEAMANAN & PIN LOCK ===================== */}
      <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--danger)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Shield size={24} color="var(--danger)" />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Keamanan & Kunci PIN Aplikasi</h2>
        </div>
        
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Aktifkan perlindungan PIN untuk mengunci aplikasi saat dimuat ulang atau ketika Anda meninggalkan layar kerja.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={localEnablePinLock} 
              onChange={(e) => setLocalEnablePinLock(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Aktifkan PIN Kunci saat Masuk</span>
          </label>

          {localEnablePinLock && (
            <div style={{ marginTop: '0.5rem', animation: 'slideUpFade 0.2s ease-out forwards' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Atur 4 Digit PIN Baru</label>
              <input 
                type="password" 
                name="pinCode"
                autocomplete="off"
                maxLength={4}
                className="input-field" 
                placeholder="PIN Baru" 
                value={localPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, ''); // Hapus non-digit
                  setLocalPin(val);
                }}
                style={{ letterSpacing: '0.2rem', fontSize: '1.1rem', padding: '0.75rem 1rem', maxWidth: '150px', textAlign: 'center' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Hanya angka yang diperbolehkan. PIN default saat ini adalah <strong>{pin || '1234'}</strong>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===================== BRANKAS API KEYS ===================== */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
        <Key size={24} color="var(--primary)" /> Brankas API Keys
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Gemini API Key */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} color="var(--primary)" /> Google Gemini API Key
            </span>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', textDecoration: 'none' }}>
              Dapatkan Key <ExternalLink size={14} />
            </a>
          </div>
          
          <div style={{ position: 'relative' }}>
            <input 
              type={showKeys['gemini-0'] ? 'text' : 'password'}
              name="geminiApiKey"
              autocomplete="off"
              className="input-field" 
              placeholder="Masukkan API Key Gemini Anda" 
              value={localGemini[0] || ''} 
              onChange={(e) => {
                const updated = [...localGemini];
                updated[0] = e.target.value;
                setLocalGemini(updated);
              }} 
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '0.85rem',
                paddingRight: '2.5rem',
                margin: 0
              }}
            />
            <button
              type="button"
              onClick={() => setShowKeys(prev => ({ ...prev, 'gemini-0': !prev['gemini-0'] }))}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={showKeys['gemini-0'] ? "Sembunyikan" : "Tampilkan"}
              aria-label={showKeys['gemini-0'] ? "Sembunyikan API Key" : "Tampilkan API Key"}
            >
              {showKeys['gemini-0'] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            Hanya diperlukan jika Anda memilih provider "Google Gemini (Pakai Key Pribadi)" di atas.
          </p>
        </div>

        {/* Kling - Access Key */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>Kling AI — Access Key</span>
            <a href="https://app.klingai.com/global/dev/document-api/quickStart/tokenBuild" target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', textDecoration: 'none' }}>
              Dapatkan <ExternalLink size={14} />
            </a>
          </div>
          <input 
            type="password" 
            name="klingAccessKey"
            autocomplete="off"
            className="input-field" 
            placeholder="Access Key (ak-...)" 
            value={localKlingAccess} 
            onChange={(e) => setLocalKlingAccess(e.target.value)} 
            style={{ margin: 0 }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>Kunci publik dari dashboard Kling AI.</p>
        </div>

        {/* Kling - Secret Key */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>Kling AI — Secret Key</span>
            <a href="https://app.klingai.com/global/dev/document-api/quickStart/tokenBuild" target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', textDecoration: 'none' }}>
              Docs <ExternalLink size={14} />
            </a>
          </div>
          <input 
            type="password" 
            name="klingSecretKey"
            autocomplete="off"
            className="input-field" 
            placeholder="Secret Key (sk-...)" 
            value={localKlingSecret} 
            onChange={(e) => setLocalKlingSecret(e.target.value)} 
            style={{ margin: 0 }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>Secret Key — dipakai bareng Access Key untuk generate JWT token.</p>
        </div>

      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={handleSave}>
          <Save size={20} />
          {saved ? 'Semua Kunci Tersimpan!' : 'Simpan Semua Konfigurasi'}
        </button>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <Shield size={20} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '0.875rem', margin: 0 }}>
          <strong>Keamanan Lapis Baja:</strong> API Key Anda diamankan murni di penyimpanan lokal perangkat ini (*localStorage*). Kami tidak memiliki peladen (server) pusat untuk menyadap kunci Anda.
        </p>
      </div>
      
    </div>
  );
}
