import React, { useState, useEffect, useRef } from 'react';
import useAppStore from '../store/useAppStore';
import { Plus, Minus, RotateCcw, Edit2, Trash2, Target, Hash, X, Check, Zap } from 'lucide-react';

const COLOR_OPTIONS = [
  '#4f46e5', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b',
  '#10b981', '#14b8a6', '#06b6d4', '#6366f1', '#a855f7', '#0ea5e9',
];

export default function ClickCounter() {
  const { counters, addCounter, updateCounter, incrementCounter, decrementCounter, resetCounter, deleteCounter } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);

  const handleSave = (data) => {
    if (editingCounter?.id) {
      updateCounter(editingCounter.id, data);
    } else {
      addCounter(data);
    }
    setEditingCounter(null);
    setShowAddModal(false);
  };

  // Quick +1 counter if no counters exist
  const handleQuickStart = () => {
    addCounter({ name: 'Counter Cepat', count: 0, step: 1, color: '#4f46e5' });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Hash size={28} color="var(--primary)" /> Click Counter
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Penghitung cepat — tally, sholat, zikir, repetisi, apapun yang perlu dihitung.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Counter Baru
        </button>
      </div>

      {counters.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Zap size={48} color="var(--primary)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Belum ada counter</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Buat counter untuk hitung apapun — dari set push-up, zikir, sampai stok barang.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Counter Custom
            </button>
            <button className="btn btn-secondary" onClick={handleQuickStart}>
              <Zap size={16} /> Mulai Cepat (+1)
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {counters.map(counter => (
            <CounterCard
              key={counter.id}
              counter={counter}
              onIncrement={() => incrementCounter(counter.id)}
              onDecrement={() => decrementCounter(counter.id)}
              onReset={() => {
                if (window.confirm(`Reset "${counter.name}" ke 0?`)) resetCounter(counter.id);
              }}
              onEdit={() => setEditingCounter(counter)}
              onDelete={() => {
                if (window.confirm(`Hapus counter "${counter.name}"?`)) deleteCounter(counter.id);
              }}
            />
          ))}
        </div>
      )}

      {(showAddModal || editingCounter) && (
        <CounterModal
          counter={editingCounter}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setEditingCounter(null); }}
        />
      )}
    </div>
  );
}

// ============== Counter Card ==============
function CounterCard({ counter, onIncrement, onDecrement, onReset, onEdit, onDelete }) {
  const [pulseKey, setPulseKey] = useState(0);
  const progress = counter.target ? Math.min(100, (counter.count / counter.target) * 100) : 0;
  const isComplete = counter.target && counter.count >= counter.target;

  const handleIncrement = () => {
    onIncrement();
    setPulseKey(k => k + 1);
    // Haptic feedback on mobile
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleDecrement = () => {
    if (counter.count > 0) {
      onDecrement();
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        borderTop: `4px solid ${counter.color}`,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes count-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.25 }}>{counter.name}</h3>
          {counter.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
              {counter.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }} title="Edit">
            <Edit2 size={15} />
          </button>
          <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }} title="Hapus">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Info badges */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', background: `${counter.color}15`, color: counter.color, padding: '0.15rem 0.5rem', borderRadius: '99px', fontWeight: 600 }}>
          +{counter.step || 1} per klik
        </span>
        {counter.target && (
          <span style={{ fontSize: '0.7rem', background: isComplete ? '#dcfce7' : '#fef3c7', color: isComplete ? '#065f46' : '#92400e', padding: '0.15rem 0.5rem', borderRadius: '99px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Target size={10} /> Target: {counter.target}
          </span>
        )}
      </div>

      {/* BIG count display */}
      <div
        key={pulseKey}
        style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          textAlign: 'center',
          color: counter.color,
          lineHeight: 1,
          margin: '0.5rem 0 1rem 0',
          animation: pulseKey > 0 ? 'count-pop 0.2s ease-out' : undefined,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {counter.count}
      </div>

      {/* Progress bar if target set */}
      {counter.target && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            height: '6px',
            background: 'var(--border-color)',
            borderRadius: '99px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: isComplete ? '#10b981' : counter.color,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {Math.round(progress)}% ({counter.count}/{counter.target})
          </div>
        </div>
      )}

      {/* Big +1 button */}
      <button
        onClick={handleIncrement}
        style={{
          width: '100%',
          padding: '1.2rem',
          background: `linear-gradient(135deg, ${counter.color}, ${counter.color}dd)`,
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '1.25rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          boxShadow: `0 4px 12px ${counter.color}40`,
          transition: 'transform 0.1s, box-shadow 0.2s',
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
        onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Plus size={22} /> +{counter.step || 1}
      </button>

      {/* Secondary controls */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          onClick={handleDecrement}
          disabled={counter.count === 0}
          style={{
            flex: 1,
            padding: '0.6rem',
            background: 'transparent',
            color: counter.count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: counter.count > 0 ? 'pointer' : 'not-allowed',
            opacity: counter.count > 0 ? 1 : 0.5,
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
          }}
        >
          <Minus size={14} /> -{counter.step || 1}
        </button>
        <button
          onClick={onReset}
          style={{
            flex: 1,
            padding: '0.6rem',
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
          }}
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );
}

// ============== Add/Edit Modal ==============
function CounterModal({ counter, onSave, onClose }) {
  const [name, setName] = useState(counter?.name || '');
  const [description, setDescription] = useState(counter?.description || '');
  const [step, setStep] = useState(counter?.step || 1);
  const [target, setTarget] = useState(counter?.target || '');
  const [color, setColor] = useState(counter?.color || '#4f46e5');
  const [initialCount, setInitialCount] = useState(counter?.count ?? 0);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      step: Math.max(1, parseInt(step) || 1),
      target: target ? Math.max(1, parseInt(target)) : null,
      color,
      count: counter ? counter.count : (parseInt(initialCount) || 0),
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0 }}>{counter ? 'Edit Counter' : 'Counter Baru'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Nama Counter *</label>
            <input
              type="text"
              className="input-field"
              placeholder="misal: Push-up, Dzikir, Stok Barang"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Deskripsi (opsional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="catatan singkat"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Kelipatan per klik</label>
              <input
                type="number"
                className="input-field"
                min="1"
                value={step}
                onChange={(e) => setStep(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Target (opsional)</label>
              <input
                type="number"
                className="input-field"
                min="1"
                placeholder="100"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>

          {!counter && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Nilai Awal</label>
              <input
                type="number"
                className="input-field"
                min="0"
                value={initialCount}
                onChange={(e) => setInitialCount(e.target.value)}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Warna</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: c, cursor: 'pointer',
                    border: color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: color === c ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                  }}
                  title={c}
                >
                  {color === c && <Check size={16} color="white" />}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>
              {counter ? 'Simpan' : 'Buat Counter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
