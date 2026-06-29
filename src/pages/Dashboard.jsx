import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { Activity, Calendar, CalendarDays, CheckCircle, History, Wand2, Edit3, Target, LayoutDashboard, Trash2, Copy, ChevronDown, ChevronUp, Search } from 'lucide-react';

const TYPE_META = {
  'mega-prompt': { label: 'Mega Prompt', icon: Wand2, color: '#8b5cf6' },
  'script': { label: 'Naskah', icon: Edit3, color: '#06b6d4' },
  'habit': { label: 'Kebiasaan', icon: Target, color: '#10b981' },
  'task': { label: 'Tugas', icon: CheckCircle, color: '#10b981' },
  'social': { label: 'Konten Sosial', icon: LayoutDashboard, color: '#f59e0b' },
};

function HistoryItem({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[item.type] || { label: item.type, icon: Activity, color: 'var(--text-secondary)' };
  const Icon = meta.icon;

  const handleCopy = (e) => {
    e.stopPropagation();
    if (item.content) {
      navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const timeAgo = (dateStr) => {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return `${mins}m lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}j lalu`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}h lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      overflow: 'hidden',
      transition: 'all 0.2s',
      background: 'var(--bg-card)',
      flexShrink: 0,
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.85rem 1rem', cursor: item.content ? 'pointer' : 'default'
        }}
        onClick={() => item.content && setExpanded(!expanded)}
      >
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: `${meta.color}15`, color: meta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              color: meta.color, letterSpacing: '0.05em',
            }}>
              {meta.label}
            </span>
            {item.category && (
              <span style={{
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px',
                background: 'var(--bg-main)', color: 'var(--text-secondary)',
              }}>
                {item.category}
              </span>
            )}
          </div>
          <div style={{
            fontSize: '0.9rem', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', color: 'var(--text-primary)',
            marginTop: '2px',
          }}>
            {item.title || '(tanpa judul)'}
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
          {timeAgo(item.date)}
        </span>
        {item.content && (
          expanded
            ? <ChevronUp size={18} color="var(--text-secondary)" />
            : <ChevronDown size={18} color="var(--text-secondary)" />
        )}
      </div>

      {expanded && item.content && (
        <div style={{
          padding: '0 1rem 1rem 1rem',
          borderTop: '1px dashed var(--border-color)',
          background: 'var(--bg-main)',
        }}>
          <div style={{
            padding: '0.75rem',
            marginTop: '0.75rem',
            background: 'var(--bg-card)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            maxHeight: '280px',
            overflowY: 'auto',
            color: 'var(--text-primary)',
          }}>
            {item.content}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={handleCopy}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              <Copy size={14} /> {copied ? 'Tersalin!' : 'Salin'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="btn"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)', border: '1px solid var(--border-color)', marginLeft: 'auto' }}
            >
              <Trash2 size={14} /> Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { activityLog, habits, history, deleteHistory, clearHistory } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Rentang waktu
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const day = now.getDay() || 7;
  const startOfWeekDate = new Date(now);
  startOfWeekDate.setDate(now.getDate() - day + 1);
  startOfWeekDate.setHours(0, 0, 0, 0);
  const startOfWeek = startOfWeekDate.toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const dailyCount = activityLog.filter(log => log.date >= startOfDay).length;
  const weeklyCount = activityLog.filter(log => log.date >= startOfWeek).length;
  const monthlyCount = activityLog.filter(log => log.date >= startOfMonth).length;

  const mandatoryHabits = habits.filter(h => h.isMandatory);
  const uncompletedMandatory = mandatoryHabits.filter(h => !h.completedToday).length;

  // Filter history
  const filteredHistory = history.filter(h => {
    if (filter !== 'all' && h.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (h.title || '').toLowerCase().includes(q) ||
             (h.content || '').toLowerCase().includes(q) ||
             (h.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  const availableTypes = [...new Set(history.map(h => h.type))];

  const handleClearAll = () => {
    if (window.confirm('Hapus SEMUA history? Tindakan ini tidak bisa dibatalkan.')) {
      clearHistory();
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Beranda — Ringkasan & Jejak Aktivitas</h1>

      {/* Peringatan Kewajiban */}
      {uncompletedMandatory > 0 ? (
        <div className="card card-danger" style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Awas! Ada Kewajiban yang Belum Selesai!</h3>
          <p style={{ margin: 0, color: 'var(--text-primary)' }}>
            Anda memiliki {uncompletedMandatory} kewajiban wajib yang harus diselesaikan hari ini. Segera buka halaman Pelacak Kebiasaan!
          </p>
        </div>
      ) : mandatoryHabits.length > 0 && (
        <div className="card card-success" style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Semua Kewajiban Selesai!</h3>
          <p style={{ margin: 0, color: 'var(--text-primary)' }}>
            Kerja bagus! Anda telah menyelesaikan semua kewajiban wajib hari ini. Pertahankan!
          </p>
        </div>
      )}

      {/* Kartu Analitik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={28} color="var(--primary)" />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem' }}>Aktivitas Hari Ini</p>
            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{dailyCount}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={28} color="var(--success)" />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem' }}>Minggu Ini</p>
            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{weeklyCount}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#fdf4ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarDays size={28} color="#c026d3" />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem' }}>Bulan Ini</p>
            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{monthlyCount}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#ede9fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <History size={28} color="#7c3aed" />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem' }}>Total History</p>
            <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{history.length}</h2>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="#7c3aed" />
            Jejak Aktivitas (Tersimpan Lokal)
          </h2>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="btn"
              style={{ fontSize: '0.8rem', color: 'var(--danger)', padding: '0.35rem 0.75rem', border: '1px solid var(--border-color)' }}
            >
              <Trash2 size={14} /> Hapus Semua
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <History size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p>Belum ada aktivitas. Mulai bikin prompt atau naskah dan jejaknya akan muncul di sini.</p>
          </div>
        ) : (
          <>
            {/* Filter + Search */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Cari history..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
              <select
                className="input-field"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '140px' }}
              >
                <option value="all">Semua Tipe</option>
                {availableTypes.map(t => (
                  <option key={t} value={t}>{TYPE_META[t]?.label || t}</option>
                ))}
              </select>
            </div>

            {/* History list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '600px', overflowY: 'auto' }}>
              {filteredHistory.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                  Tidak ada history yang cocok dengan filter/pencarian.
                </p>
              ) : (
                filteredHistory.map(item => (
                  <HistoryItem key={item.id} item={item} onDelete={deleteHistory} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
