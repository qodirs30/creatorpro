import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart2, PieChart, List, MessageSquare, Calendar } from 'lucide-react';

const fmtRp = (n = 0) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString('id-ID')}`;
};
const fmtRpFull = (n = 0) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

const CAT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444','#84cc16','#f97316','#64748b','#0ea5e9','#a855f7'];
const getCatColor = (cat, all) => CAT_COLORS[all.indexOf(cat) % CAT_COLORS.length];

function filterByPeriod(cards, period, customFrom, customTo) {
  const now = new Date();
  return cards.filter(c => {
    const d = new Date(c.createdAt || 0);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'last_month') {
      const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === pm && d.getFullYear() === py;
    }
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    if (period === 'custom' && customFrom && customTo) return d >= new Date(customFrom) && d <= new Date(customTo + 'T23:59:59');
    return true;
  });
}

function BarChart({ data }) {
  if (!data.length) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>Belum ada data.</div>;
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  const BAR = 10;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${data.length * (BAR * 2 + 6)} 110`} style={{ width: '100%', minWidth: `${data.length * 28}px`, maxHeight: '180px' }}>
        {data.map((d, i) => {
          const x = i * (BAR * 2 + 6) + 2;
          const H = 80;
          const ih = (d.income / maxVal) * H;
          const eh = (d.expense / maxVal) * H;
          return (
            <g key={d.label}>
              <rect x={x} y={H - ih} width={BAR} height={ih} fill="#10b981" rx="2" opacity="0.85"><title>{d.label} Masuk: {fmtRpFull(d.income)}</title></rect>
              <rect x={x + BAR + 2} y={H - eh} width={BAR} height={eh} fill="#ef4444" rx="2" opacity="0.85"><title>{d.label} Keluar: {fmtRpFull(d.expense)}</title></rect>
              <text x={x + BAR} y={93} textAnchor="middle" fontSize="5.5" fill="var(--text-secondary)">{d.label}</text>
            </g>
          );
        })}
        <rect x={2} y={100} width={7} height={5} fill="#10b981" rx="1"/><text x={11} y={105} fontSize="6" fill="var(--text-secondary)">Masuk</text>
        <rect x={38} y={100} width={7} height={5} fill="#ef4444" rx="1"/><text x={47} y={105} fontSize="6" fill="var(--text-secondary)">Keluar</text>
      </svg>
    </div>
  );
}

function DonutChart({ data }) {
  if (!data.length) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>Tidak ada pengeluaran.</div>;
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 40, cx = 50, cy = 50;
  let cumAngle = -Math.PI / 2;
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cumAngle), y1 = cy + R * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + R * Math.cos(cumAngle), y2 = cy + R * Math.sin(cumAngle);
    return { ...d, x1, y1, x2, y2, large: angle > Math.PI ? 1 : 0 };
  });
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 100 100" style={{ width: '110px', flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={`M ${cx} ${cy} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`} fill={s.color} opacity="0.9"><title>{s.label}: {fmtRpFull(s.value)}</title></path>
        ))}
        <circle cx={cx} cy={cy} r={22} fill="var(--bg-card)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="var(--text-primary)">Total</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize="6" fill="var(--text-secondary)">{fmtRp(total)}</text>
      </svg>
      <div style={{ flex: 1, minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {data.slice(0, 8).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{d.label}</span>
            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{fmtRp(d.value)}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>({((d.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ data, color = '#ef4444' }) {
  if (data.length < 2) return null;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const W = 300, H = 50;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - (d.value / maxV) * H}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: '55px' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - (d.value / maxV) * H;
        return <circle key={i} cx={x} cy={y} r="3.5" fill={color}><title>{d.label}: {fmtRpFull(d.value)}</title></circle>;
      })}
    </svg>
  );
}

export default function NeracaDashboard({ memexCards, addMemexChat, setMobileActiveView }) {
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterType, setFilterType] = useState('all');
  const [filterCat, setFilterCat] = useState('all');

  const allTx = useMemo(() => (memexCards || []).filter(c => c.type === 'transaction'), [memexCards]);
  const periodTx = useMemo(() => filterByPeriod(allTx, period, customFrom, customTo), [allTx, period, customFrom, customTo]);

  const totalMasuk = useMemo(() => periodTx.filter(c => c.data?.type === 'income').reduce((s, c) => s + (c.data?.amount || 0), 0), [periodTx]);
  const totalKeluar = useMemo(() => periodTx.filter(c => c.data?.type !== 'income').reduce((s, c) => s + (c.data?.amount || 0), 0), [periodTx]);
  const saldo = totalMasuk - totalKeluar;

  const barData = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), income: 0, expense: 0 };
    }
    allTx.forEach(c => {
      const d = new Date(c.createdAt || 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) { if (c.data?.type === 'income') months[key].income += (c.data?.amount || 0); else months[key].expense += (c.data?.amount || 0); }
    });
    return Object.values(months);
  }, [allTx]);

  const pieData = useMemo(() => {
    const bycat = {};
    periodTx.filter(c => c.data?.type !== 'income').forEach(c => { const cat = c.data?.category || 'Lainnya'; bycat[cat] = (bycat[cat] || 0) + (c.data?.amount || 0); });
    const cats = Object.keys(bycat);
    return Object.entries(bycat).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: getCatColor(label, cats) }));
  }, [periodTx]);

  const sparkData = useMemo(() => {
    const byDay = {};
    periodTx.filter(c => c.data?.type !== 'income').forEach(c => {
      const d = new Date(c.createdAt || 0);
      const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      byDay[key] = (byDay[key] || 0) + (c.data?.amount || 0);
    });
    return Object.entries(byDay).map(([label, value]) => ({ label, value }));
  }, [periodTx]);

  const allCats = useMemo(() => ['all', ...Array.from(new Set(periodTx.map(c => c.data?.category || 'Lainnya')))], [periodTx]);

  const txList = useMemo(() => {
    let list = [...periodTx];
    if (filterType !== 'all') list = list.filter(c => filterType === 'income' ? c.data?.type === 'income' : c.data?.type !== 'income');
    if (filterCat !== 'all') list = list.filter(c => (c.data?.category || 'Lainnya') === filterCat);
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'date_asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'amount_desc') return (b.data?.amount || 0) - (a.data?.amount || 0);
      if (sortBy === 'amount_asc') return (a.data?.amount || 0) - (b.data?.amount || 0);
      return 0;
    });
    return list;
  }, [periodTx, filterType, filterCat, sortBy]);

  const handleAskSuki = () => {
    const periodLabels = { today: 'hari ini', week: 'minggu ini', month: 'bulan ini', last_month: 'bulan lalu', year: 'tahun ini', all: 'semua waktu', custom: 'periode custom' };
    const label = periodLabels[period] || 'periode ini';
    const topKat = pieData.slice(0, 3).map(d => `${d.label} (${fmtRpFull(d.value)})`).join(', ');
    const msg = `Tolong analisa keuangan gue ${label}. Total masuk: ${fmtRpFull(totalMasuk)}, total keluar: ${fmtRpFull(totalKeluar)}, saldo: ${fmtRpFull(saldo)}. Kategori terbesar: ${topKat || '-'}. Kirim neraca lengkap dan saran penghematan!`;
    addMemexChat({ role: 'user', content: msg });
    setMobileActiveView?.('chat');
  };

  const cs = { background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' };
  const PERIODS = [{ id:'today',label:'Hari Ini'},{id:'week',label:'7 Hari'},{id:'month',label:'Bulan Ini'},{id:'last_month',label:'Bln Lalu'},{id:'year',label:'Tahun Ini'},{id:'all',label:'Semua'},{id:'custom',label:'Custom'}];
  const selectStyle = { padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: period === p.id ? '700' : '400',
            cursor: 'pointer', background: period === p.id ? 'var(--primary)' : 'var(--bg-card)',
            color: period === p.id ? '#fff' : 'var(--text-secondary)',
            border: period === p.id ? '1px solid var(--primary)' : '1px solid var(--border-color)', transition: 'all 0.18s'
          }}>{p.label}</button>
        ))}
        {period === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={selectStyle} />
            <span style={{ color: 'var(--text-secondary)' }}>–</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={selectStyle} />
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        <div style={{ ...cs, borderTop: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={16} color="#10b981" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>PEMASUKAN</span>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#10b981' }}>{fmtRp(totalMasuk)}</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{periodTx.filter(c => c.data?.type === 'income').length} transaksi</div>
        </div>
        <div style={{ ...cs, borderTop: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingDown size={16} color="#ef4444" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>PENGELUARAN</span>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ef4444' }}>{fmtRp(totalKeluar)}</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{periodTx.filter(c => c.data?.type !== 'income').length} transaksi</div>
        </div>
        <div style={{ ...cs, borderTop: `3px solid ${saldo >= 0 ? '#6366f1' : '#f59e0b'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={16} color={saldo >= 0 ? '#6366f1' : '#f59e0b'} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>SALDO BERSIH</span>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: saldo >= 0 ? '#6366f1' : '#f59e0b' }}>{saldo >= 0 ? '+' : ''}{fmtRp(saldo)}</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{periodTx.length} total transaksi</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <div style={cs}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <BarChart2 size={15} color="var(--primary)" />
            <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Masuk vs Keluar (12 Bln)</span>
          </div>
          <BarChart data={barData} />
        </div>
        <div style={cs}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <PieChart size={15} color="var(--primary)" />
            <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Breakdown Kategori</span>
          </div>
          <DonutChart data={pieData} />
        </div>
      </div>

      {/* Sparkline */}
      {sparkData.length > 1 && (
        <div style={cs}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Calendar size={15} color="var(--primary)" />
            <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Trend Pengeluaran Harian</span>
          </div>
          <Sparkline data={sparkData} />
        </div>
      )}

      {/* Daftar Transaksi */}
      <div style={cs}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <List size={15} color="var(--primary)" />
            <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Daftar Transaksi ({txList.length})</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
              <option value="all">Semua Tipe</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={selectStyle}>
              {allCats.map(c => <option key={c} value={c}>{c === 'all' ? 'Semua Kategori' : c}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
              <option value="date_desc">Terbaru</option>
              <option value="date_asc">Terlama</option>
              <option value="amount_desc">Nominal ↓</option>
              <option value="amount_asc">Nominal ↑</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Tanggal & Jam', 'Keterangan', 'Kategori', 'Tipe', 'Nominal'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: h === 'Nominal' ? 'right' : 'left', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.77rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txList.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Tidak ada transaksi untuk filter ini.</td></tr>
              ) : txList.map(c => {
                const isIncome = c.data?.type === 'income';
                const d = new Date(c.createdAt || 0);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.45rem 0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '0.76rem' }}>
                      {d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}<br/>
                      <span style={{ fontSize: '0.68rem' }}>{d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', fontWeight: '500', color: 'var(--text-primary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                    <td style={{ padding: '0.45rem 0.6rem' }}>
                      <span style={{ padding: '0.15rem 0.45rem', borderRadius: '12px', fontSize: '0.73rem', fontWeight: '600', background: 'var(--bg-main)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>{c.data?.category || '-'}</span>
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem' }}>
                      <span style={{ padding: '0.15rem 0.45rem', borderRadius: '12px', fontSize: '0.73rem', fontWeight: '600', background: isIncome ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: isIncome ? '#10b981' : '#ef4444' }}>{isIncome ? '+ Masuk' : '- Keluar'}</span>
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: '700', color: isIncome ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>
                      {isIncome ? '+' : '-'}{fmtRpFull(c.data?.amount || 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {txList.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan={4} style={{ padding: '0.5rem 0.6rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    Masuk: <span style={{ color: '#10b981' }}>{fmtRpFull(totalMasuk)}</span> &nbsp;|&nbsp; Keluar: <span style={{ color: '#ef4444' }}>{fmtRpFull(totalKeluar)}</span>
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: '800', color: saldo >= 0 ? '#6366f1' : '#f59e0b' }}>
                    {saldo >= 0 ? '+' : ''}{fmtRpFull(saldo)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Analisa Suki Button */}
      <button onClick={handleAskSuki} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
        padding: '0.85rem 1.5rem', borderRadius: '12px', cursor: 'pointer',
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        color: '#fff', fontWeight: '700', fontSize: '0.95rem', border: 'none',
        boxShadow: '0 4px 15px rgba(99,102,241,0.35)', transition: 'transform 0.15s, box-shadow 0.15s',
        marginBottom: '1rem'
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99,102,241,0.35)'; }}>
        <MessageSquare size={18} />
        🤖 Analisa Keuangan dengan Suki
      </button>
    </div>
  );
}
