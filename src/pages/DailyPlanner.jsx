import { useState, useEffect, useMemo } from 'react';
import { Play, Square, Timer } from 'lucide-react';
import useAppStore from '../store/useAppStore';

export default function DailyPlanner() {
  const { 
    memexCards, 
    addMemexCard, 
    updateMemexCard, 
    logActivity, 
    removeActivityLog 
  } = useAppStore();

  const [newTask, setNewTask] = useState('');
  
  // Pomodoro State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      alert('Sesi Pomodoro selesai! Istirahatlah 5 menit.');
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Mendapatkan tanggal hari ini format YYYY-MM-DD local time
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-CA');
  }, []);

  // Filter tugas hari ini dari memexCards
  const todayTasks = useMemo(() => {
    return (memexCards || []).filter(c => 
      c.type === 'task' && 
      (c.data?.dueDate === todayStr || (!c.data?.dueDate && new Date(c.createdAt).toDateString() === new Date().toDateString()))
    );
  }, [memexCards, todayStr]);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    // Tambahkan tugas ke memexCards (Database tersinkronisasi)
    addMemexCard({
      type: 'task',
      title: newTask.substring(0, 25), // Gunakan potongan teks sebagai judul
      tags: ['daily-planner'],
      data: {
        todo: newTask,
        dueDate: todayStr,
        completed: false
      }
    });

    setNewTask('');
  };

  const toggleTask = (id, currentDone, text) => {
    const isNowDone = !currentDone;
    const card = memexCards.find(c => c.id === id);
    if (!card) return;

    // Update status completed di memexCards
    updateMemexCard(id, {
      data: {
        ...card.data,
        completed: isNowDone
      }
    });

    // Catat/hapus log aktivitas harian
    if (isNowDone) {
      logActivity({ id, type: 'task', title: text });
    } else {
      removeActivityLog(id, 'task');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Jadwal Harian & Fokus</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Pomodoro Timer */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
          <Timer size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
            {formatTime(timeLeft)}
          </h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={toggleTimer} style={{ width: '130px' }}>
              {isActive ? <><Square size={18} /> Jeda</> : <><Play size={18} /> Mulai</>}
            </button>
            <button className="btn btn-secondary" onClick={resetTimer}>
              Reset
            </button>
          </div>
          <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
            25 menit fokus penuh. Tanpa gangguan.
          </p>
        </div>

        {/* Daily Tasks */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Prioritas Hari Ini</h2>
          
          <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Apa yang harus diselesaikan?" 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Tambah</button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {todayTasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>Jadwal Anda kosong.</p>
            ) : (
              todayTasks.map(task => {
                const isCompleted = !!task.data?.completed;
                return (
                  <div 
                    key={task.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-main)',
                      borderRadius: '8px',
                      opacity: isCompleted ? 0.6 : 1
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isCompleted} 
                      onChange={() => toggleTask(task.id, isCompleted, task.data?.todo || task.title)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', fontWeight: '500' }}>
                        {task.data?.todo || task.title}
                      </span>
                      {task.data?.dueTime && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          ⏰ Pengingat: pukul {task.data.dueTime}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
