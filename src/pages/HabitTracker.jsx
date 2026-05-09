import React, { useState, useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { CheckCircle2, Circle, AlertTriangle, Target, BellRing } from 'lucide-react';

export default function HabitTracker() {
  const { habits, addHabit, updateHabit, deleteHabit, logActivity, removeActivityLog } = useAppStore();
  const [newHabit, setNewHabit] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setNotificationPermission);
      }
    }
  }, []);

  // Fitur Spam Notifikasi untuk Kewajiban yang belum selesai
  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const intervalId = setInterval(() => {
      const uncompletedMandatory = habits.filter(h => h.isMandatory && !h.completedToday);
      
      if (uncompletedMandatory.length > 0) {
        new Notification("⚠️ JANGAN MALAS!", {
          body: `Anda masih memiliki ${uncompletedMandatory.length} kewajiban yang belum diselesaikan! Segera lakukan sekarang!`,
          icon: '/vite.svg', // Ikon bawaan Vite
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: true
        });
      }
    }, 60000 * 5); // Spam setiap 5 menit jika ada kewajiban belum selesai

    return () => clearInterval(intervalId);
  }, [habits, notificationPermission]);

  const handleAddHabit = (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    
    addHabit({
      id: Date.now().toString(),
      title: newHabit,
      isMandatory: isMandatory,
      completedToday: false,
      streak: 0,
      lastCompleted: null
    });
    setNewHabit('');
    setIsMandatory(false);
  };

  const toggleHabit = (id, currentStatus, currentStreak, title) => {
    const isNowCompleted = !currentStatus;
    const newStreak = isNowCompleted ? currentStreak + 1 : Math.max(0, currentStreak - 1);
    
    updateHabit(id, { 
      completedToday: isNowCompleted,
      streak: newStreak,
      lastCompleted: isNowCompleted ? new Date().toISOString() : null
    });

    if (isNowCompleted) {
      logActivity({ id, type: 'habit', title });
    } else {
      removeActivityLog(id, 'habit');
    }
  };

  const mandatoryHabits = habits.filter(h => h.isMandatory);
  const normalHabits = habits.filter(h => !h.isMandatory);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Pelacak Kebiasaan & Kewajiban</h1>
      
      {/* Peringatan Notifikasi */}
      {notificationPermission !== 'granted' && (
        <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: '#fffbeb', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <BellRing size={24} color="var(--warning)" />
            <p style={{ margin: 0, color: '#92400e' }}>
              Untuk mengaktifkan fitur "Spam Anti-Malas", izinkan browser menampilkan notifikasi.
            </p>
          </div>
        </div>
      )}

      {/* Kewajiban (Mandatory) */}
      <div className="card" style={{ marginBottom: '2rem', border: '2px solid var(--danger)' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertTriangle size={20} />
          Kewajiban Wajib (Anti-Malas)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Tugas di bawah ini harus diselesaikan setiap hari. Jika terlewat, perangkat Anda akan di-spam dengan peringatan.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {mandatoryHabits.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Belum ada kewajiban. Tambahkan di bawah.</p>
          ) : (
            mandatoryHabits.map(habit => (
              <HabitItem key={habit.id} habit={habit} onToggle={toggleHabit} onDelete={deleteHabit} />
            ))
          )}
        </div>
      </div>

      {/* Kebiasaan Normal */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Target size={20} color="var(--primary)" />
          Kebiasaan Tambahan
        </h2>

        <form onSubmit={handleAddHabit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Tambah kebiasaan (mis: Baca 10 halaman)" 
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isMandatory} 
                onChange={(e) => setIsMandatory(e.target.checked)} 
              />
              Tandai sebagai <strong>Kewajiban Wajib</strong> (Akan memicu Spam Notifikasi)
            </label>
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Tambah</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {normalHabits.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem 0' }}>Belum ada kebiasaan.</p>
          ) : (
            normalHabits.map(habit => (
              <HabitItem key={habit.id} habit={habit} onToggle={toggleHabit} onDelete={deleteHabit} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function HabitItem({ habit, onToggle, onDelete }) {
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '1rem', 
        border: '1px solid var(--border-color)', 
        borderRadius: '8px',
        backgroundColor: habit.completedToday ? 'var(--primary-light)' : 'var(--bg-card)',
        transition: 'all 0.2s',
        opacity: habit.completedToday ? 0.7 : 1
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={() => onToggle(habit.id, habit.completedToday, habit.streak, habit.title)}
          style={{ background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {habit.completedToday ? (
            <CheckCircle2 size={24} color="var(--primary)" />
          ) : (
            <Circle size={24} color={habit.isMandatory ? "var(--danger)" : "var(--text-secondary)"} />
          )}
        </button>
        <span style={{ 
          fontSize: '1rem', 
          fontWeight: '500',
          textDecoration: habit.completedToday ? 'line-through' : 'none',
          color: habit.completedToday ? 'var(--text-secondary)' : 'var(--text-primary)'
        }}>
          {habit.title}
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ 
          fontSize: '0.875rem', 
          padding: '0.25rem 0.5rem', 
          backgroundColor: habit.streak > 0 ? 'var(--warning)' : '#e2e8f0',
          color: habit.streak > 0 ? 'white' : 'var(--text-secondary)',
          borderRadius: '99px',
          fontWeight: 'bold'
        }}>
          🔥 {habit.streak}
        </span>
        <button 
          onClick={() => onDelete(habit.id)}
          style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'none', cursor: 'pointer' }}
        >
          Hapus
        </button>
      </div>
    </div>
  );
}
