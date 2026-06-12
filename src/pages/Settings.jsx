import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { Key, Save, Shield, ExternalLink, Cpu, Image as ImageIcon, Video, Trash2, RefreshCw, Plus, Eye, EyeOff } from 'lucide-react';

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
    pin, setPin
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

  const [showKeys, setShowKeys] = useState({});
  const [keyStatuses, setKeyStatuses] = useState({});

  const textProviders = {
    gemini: {
      name: 'Google Gemini',
      tag: 'Gratis / Berbayar',
      models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Super Cepat)' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Lebih Pintar)' }
      ]
    },
    groq: {
      name: 'Groq',
      tag: 'Gratis & Super Cepat',
      models: [
        { id: 'llama3-8b-8192', name: 'Llama 3 8B' },
        { id: 'llama3-70b-8192', name: 'Llama 3 70B' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7b' }
      ]
    },
    openai: {
      name: 'OpenAI',
      tag: 'Berbayar',
      models: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        { id: 'gpt-4o', name: 'GPT-4o (Terbaru)' }
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
      <h1 className="text-gradient" style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>qodirs pro creator — API & Konfigurasi</h1>
      
      <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
        Pusat kontrol multi-model. Simpan semua kunci rahasia Anda di sini secara aman (Offline-First). Aplikasi akan cerdas memilih kunci yang tepat sesuai alat yang Anda gunakan.
      </p>

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
        
        {/* Gemini */}
        {renderKeySection(
          'gemini',
          'Google Gemini (Veo/Teks)',
          localGemini,
          'Wajib untuk Veo 3, RPG, dan Memex. Beberapa key yang terdaftar akan dirotasi secara otomatis.',
          'https://aistudio.google.com/app/apikey'
        )}

        {/* Groq */}
        {renderKeySection(
          'groq',
          'Groq Cloud (Llama/Mixtral)',
          localGroq,
          'Kunci API Groq. Beberapa key yang terdaftar akan dirotasi secara otomatis.',
          'https://console.groq.com/keys'
        )}

        {/* OpenAI */}
        {renderKeySection(
          'openai',
          'OpenAI (GPT-4o/3.5)',
          localOpenAi,
          'Kunci API OpenAI. Beberapa key yang terdaftar akan dirotasi secara otomatis.',
          'https://platform.openai.com/api-keys'
        )}

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
