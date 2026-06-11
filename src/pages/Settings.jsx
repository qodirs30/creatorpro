import React, { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { Key, Save, Shield, ExternalLink, Cpu, Image as ImageIcon, Video } from 'lucide-react';

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

  const [localGemini, setLocalGemini] = useState(geminiKey);
  const [localGroq, setLocalGroq] = useState(groqKey);
  const [localOpenAi, setLocalOpenAi] = useState(openAiKey);
  const [localKlingAccess, setLocalKlingAccess] = useState(klingAccessKey);
  const [localKlingSecret, setLocalKlingSecret] = useState(klingSecretKey);
  
  const [localProvider, setLocalProvider] = useState(aiProvider || 'gemini');
  const [localModel, setLocalModel] = useState(aiModel || 'gemini-2.5-flash');
  const [localEnablePinLock, setLocalEnablePinLock] = useState(enablePinLock);
  const [localPin, setLocalPin] = useState(pin);
  const [saved, setSaved] = useState(false);

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

  const handleSave = () => {
    if (localEnablePinLock && localPin.length !== 4) {
      alert('PIN harus berupa 4 digit angka!');
      return;
    }
    setGeminiKey(localGemini);
    setGroqKey(localGroq);
    setOpenAiKey(localOpenAi);
    setKlingAccessKey(localKlingAccess);
    setKlingSecretKey(localKlingSecret);
    setAiProvider(localProvider);
    setAiModel(localModel);
    setEnablePinLock(localEnablePinLock);
    setPin(localPin);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
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
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Key size={20} color="var(--primary)" /> Brankas API Keys
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Gemini */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '600' }}>
            <span>Google Gemini (Veo/Teks)</span>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Dapatkan <ExternalLink size={12} />
            </a>
          </label>
          <input type="password" className="input-field" placeholder="AIzaSy..." value={localGemini} onChange={(e) => setLocalGemini(e.target.value)} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Wajib untuk Veo 3 Video Studio dan fitur RPG.</p>
        </div>

        {/* Kling - Access Key */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '600' }}>
            <span>Kling AI — Access Key</span>
            <a href="https://app.klingai.com/global/dev/document-api/quickStart/tokenBuild" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Dapatkan <ExternalLink size={12} />
            </a>
          </label>
          <input type="password" className="input-field" placeholder="Access Key (ak-...)" value={localKlingAccess} onChange={(e) => setLocalKlingAccess(e.target.value)} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Kunci publik dari dashboard Kling AI.</p>
        </div>

        {/* Kling - Secret Key */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '600' }}>
            <span>Kling AI — Secret Key</span>
            <a href="https://app.klingai.com/global/dev/document-api/quickStart/tokenBuild" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Docs <ExternalLink size={12} />
            </a>
          </label>
          <input type="password" className="input-field" placeholder="Secret Key (sk-...)" value={localKlingSecret} onChange={(e) => setLocalKlingSecret(e.target.value)} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Secret Key — dipakai bareng Access Key untuk generate JWT token.</p>
        </div>

        {/* Groq */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '600' }}>
            <span>Groq Cloud</span>
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Dapatkan <ExternalLink size={12} />
            </a>
          </label>
          <input type="password" className="input-field" placeholder="gsk_..." value={localGroq} onChange={(e) => setLocalGroq(e.target.value)} />
        </div>

        {/* OpenAI */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '600' }}>
            <span>OpenAI (GPT)</span>
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Dapatkan <ExternalLink size={12} />
            </a>
          </label>
          <input type="password" className="input-field" placeholder="sk-..." value={localOpenAi} onChange={(e) => setLocalOpenAi(e.target.value)} />
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
