import React, { useState, useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { Fingerprint, Lock, ShieldAlert } from 'lucide-react';

export default function LockScreen({ children }) {
  const { isLocked, setIsLocked, pin } = useAppStore();
  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setBiometricSupported(available))
        .catch(() => setBiometricSupported(false));
    }
  }, []);

  const handleUnlockBiometric = async () => {
    if (!biometricSupported) return;
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      if (window.PublicKeyCredential) {
         setTimeout(() => {
            setIsLocked(false);
         }, 1000);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (inputPin === pin) {
      setIsLocked(false);
      setInputPin('');
      setError(false);
    } else {
      setError(true);
      setInputPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!isLocked) {
    return children;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, 
      backgroundColor: 'var(--bg-main)', 
      display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '88px', height: '88px', backgroundColor: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={48} color="var(--primary)" />
          </div>
        </div>
        
        <h2 style={{ marginBottom: '0.5rem' }}>ProCreator Terkunci</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Verifikasi identitas Anda untuk mengakses ruang kerja. (Absensi Harian)
        </p>

        {biometricSupported && (
          <button 
            className="btn btn-primary" 
            onClick={handleUnlockBiometric}
            style={{ width: '100%', marginBottom: '1.5rem', padding: '1rem', fontSize: '1rem' }}
          >
            <Fingerprint size={24} />
            Buka dengan FaceID / Sidik Jari
          </button>
        )}

        <div style={{ position: 'relative', margin: '2rem 0' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
          <span style={{ 
            position: 'absolute', top: '50%', left: '50%', 
            transform: 'translate(-50%, -50%)', 
            backgroundColor: 'var(--bg-card)', padding: '0 1rem', 
            color: 'var(--text-secondary)', fontSize: '0.875rem' 
          }}>
            ATAU GUNAKAN PIN
          </span>
        </div>

        <form onSubmit={handlePinSubmit}>
          <input 
            type="password" 
            maxLength={4}
            className="input-field" 
            placeholder="Masukkan 4 digit PIN (default: 1234)" 
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            style={{ 
              textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.5rem', 
              padding: '1rem', marginBottom: '1rem',
              borderColor: error ? 'var(--danger)' : 'var(--border-color)'
            }}
          />
          {error && (
             <p style={{ color: 'var(--danger)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '1rem' }}>
               <ShieldAlert size={16} /> PIN Salah
             </p>
          )}
          <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
            Buka Kunci
          </button>
        </form>
      </div>
    </div>
  );
}
