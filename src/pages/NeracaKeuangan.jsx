import { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2, 
  Search, Filter, Sparkles, AlertTriangle, Calendar, 
  HelpCircle, RefreshCw, Wallet, PiggyBank, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { generateContent } from '../utils/ai';

export default function NeracaKeuangan() {
  const { 
    financialEntries = [], 
    addFinancialEntry, 
    addMultipleFinancialEntries,
    deleteFinancialEntry,
    geminiKey, 
    groqKey,
    openAiKey,
    aiProvider,
    aiModel,
    memexCards = []
  } = useAppStore();

  const getApiKey = () => {
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return geminiKey;
  };

  // Form States
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Jalankan migrasi satu kali ketika halaman dimuat
  useEffect(() => {
    const transactionsFromMemex = memexCards.filter(c => c.type === 'transaction');
    if (transactionsFromMemex.length === 0) return;

    const toMigrate = [];
    transactionsFromMemex.forEach(c => {
      // Periksa apakah transaksi ini sudah dimigrasi ke financialEntries
      const isAlreadyMigrated = financialEntries.some(e => 
        e.id === c.id || 
        (e.description === c.title && 
         e.amount === Number(c.data?.amount || 0) && 
         e.date === (c.data?.date || new Date(c.createdAt).toISOString().split('T')[0]))
      );

      if (!isAlreadyMigrated) {
        toMigrate.push({
          id: c.id, // Pertahankan ID asli
          type: c.data?.type || 'expense',
          category: c.data?.category || 'Lainnya',
          amount: Number(c.data?.amount || 0),
          date: c.data?.date || new Date(c.createdAt).toISOString().split('T')[0],
          description: c.title || c.data?.summary || 'Transaksi Migrasi',
          createdAt: c.createdAt || new Date().toISOString()
        });
      }
    });

    if (toMigrate.length > 0) {
      addMultipleFinancialEntries(toMigrate);
    }
  }, [memexCards, financialEntries, addMultipleFinancialEntries]);

  // Filtering / Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // AI Advisor States
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Kategori default
  const categories = {
    expense: ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Lainnya'],
    income: ['Gaji', 'Investasi', 'Freelance', 'Hadiah', 'Lainnya']
  };

  // Sesuaikan pilihan kategori jika tipe input berganti
  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(categories[newType][0]);
  };

  // Submit Transaksi Baru
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    addFinancialEntry({
      type,
      category,
      amount: Number(amount),
      date,
      description: description.trim() || `${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${category}`
    });

    setAmount('');
    setDescription('');
  };

  // Perhitungan Keuangan Dinamis
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    financialEntries.forEach(entry => {
      if (entry.type === 'income') {
        income += entry.amount;
      } else {
        expense += entry.amount;
      }
    });

    const balance = income - expense;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

    return { income, expense, balance, savingsRate };
  }, [financialEntries]);

  // Breakdown Kategori Pengeluaran untuk Donut Chart
  const expenseByCategory = useMemo(() => {
    const breakdown = {};
    let totalExpense = 0;

    financialEntries.forEach(entry => {
      if (entry.type === 'expense') {
        breakdown[entry.category] = (breakdown[entry.category] || 0) + entry.amount;
        totalExpense += entry.amount;
      }
    });

    return Object.keys(breakdown).map(cat => ({
      category: cat,
      amount: breakdown[cat],
      percentage: totalExpense > 0 ? Math.round((breakdown[cat] / totalExpense) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [financialEntries]);

  // Data Kas Arus Bulanan untuk Chart Batang
  const monthlyCashflow = useMemo(() => {
    const months = {};
    
    // Inisialisasi 6 bulan terakhir
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      months[key] = { name: key, income: 0, expense: 0 };
    }

    financialEntries.forEach(entry => {
      const d = new Date(entry.date);
      const key = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      if (months[key]) {
        if (entry.type === 'income') {
          months[key].income += entry.amount;
        } else {
          months[key].expense += entry.amount;
        }
      }
    });

    return Object.values(months);
  }, [financialEntries]);

  // Filter Transaksi
  const filteredEntries = useMemo(() => {
    return financialEntries.filter(entry => {
      const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            entry.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || entry.type === filterType;
      const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [financialEntries, searchTerm, filterType, filterCategory]);

  // Panggil Suki AI Advisor
  const handleRequestAiAdvice = async () => {
    setLoadingAi(true);
    setAiAnalysis('');
    try {
      const recentList = financialEntries.slice(0, 5).map(e => 
        `- [${e.date}] ${e.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${e.category} senilai Rp ${e.amount.toLocaleString()} (${e.description})`
      ).join('\n');

      const categoryList = expenseByCategory.map(c => 
        `- Kategori ${c.category}: Rp ${c.amount.toLocaleString()} (${c.percentage}%)`
      ).join('\n');

      const systemPrompt = `Anda adalah Suki, konsultan keuangan pribadi cerdas dan humoris dari qodirsAi Studio. 
Tugas Anda adalah menganalisis ringkasan finansial pengguna dan memberikan nasihat keuangan yang tajam, praktis, sarkastik secara positif, dan berfokus pada tips hemat. Gunakan bahasa gaul santai (lo, gue) dan berikan saran anggaran yang nyata.`;

      const prompt = `Berikut adalah data keuangan saya saat ini:
- Total Pendapatan: Rp ${summary.income.toLocaleString()}
- Total Pengeluaran: Rp ${summary.expense.toLocaleString()}
- Saldo Bersih: Rp ${summary.balance.toLocaleString()}
- Tingkat Rasio Tabungan: ${summary.savingsRate}%

Rincian Pengeluaran berdasarkan kategori:
${categoryList || 'Belum ada data pengeluaran.'}

5 Transaksi Terakhir:
${recentList || 'Belum ada transaksi.'}

Tolong berikan ulasan ringkas neraca keuangan saya, identifikasi kategori pengeluaran terbesar, beri 'roasting' ringan jika saya boros, dan berikan 3 langkah aksi hemat minggu ini!`;

      const combinedPrompt = `${systemPrompt}\n\n${prompt}`;
      const response = await generateContent(
        getApiKey(),
        combinedPrompt,
        aiProvider,
        aiModel || 'gemini-2.5-flash'
      );

      setAiAnalysis(response);
    } catch (e) {
      setAiAnalysis('Aduh, Suki lagi pusing ngitungnya. Coba klik tombol analisis lagi ya!');
    } finally {
      setLoadingAi(false);
    }
  };

  // Palet Warna Grafik Kategori
  const catColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex-align gap-2">
            <Wallet className="icon-accent" size={26} /> Neraca Keuangan Studio
          </h1>
          <p className="page-subtitle">Kelola kas bulanan, lacak pengeluaran, dan dapatkan analisis anggaran dari AI Suki.</p>
        </div>
      </div>

      {/* Bento Grid Summary Cards */}
      <div className="neraca-grid">
        <div className="neraca-card">
          <div className="neraca-card-icon icon-purple">
            <Wallet size={22} />
          </div>
          <div className="neraca-card-info">
            <span className="neraca-lbl">Saldo Bersih (Net Worth)</span>
            <span className="neraca-val text-gradient">
              Rp {summary.balance.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="neraca-card">
          <div className="neraca-card-icon icon-emerald">
            <ArrowUpRight size={22} />
          </div>
          <div className="neraca-card-info">
            <span className="neraca-lbl">Total Pendapatan</span>
            <span className="neraca-val text-emerald">
              Rp {summary.income.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="neraca-card">
          <div className="neraca-card-icon icon-destructive">
            <ArrowDownRight size={22} />
          </div>
          <div className="neraca-card-info">
            <span className="neraca-lbl">Total Pengeluaran</span>
            <span className="neraca-val text-danger">
              Rp {summary.expense.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="neraca-card">
          <div className="neraca-card-icon icon-blue">
            <PiggyBank size={22} />
          </div>
          <div className="neraca-card-info">
            <span className="neraca-lbl">Rasio Menabung</span>
            <span className="neraca-val text-blue">
              {summary.savingsRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="dashboard-content-grid">
        {/* Left Column: Entry Form & Analytics Charts */}
        <div className="dashboard-col flex-column gap-3">
          
          {/* Form Pencatatan Cepat */}
          <div className="section-card glass-panel p-4">
            <h3 className="section-title mb-3">Catat Transaksi Baru</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="auth-tabs-container" style={{ marginBottom: '0.5rem' }}>
                <div 
                  className="auth-tab-active-pill" 
                  style={{
                    width: '50%',
                    transform: `translateX(${type === 'expense' ? '0%' : '100%'})`
                  }}
                />
                <button 
                  type="button" 
                  className={`auth-tab-btn ${type === 'expense' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('expense')}
                >
                  📉 Pengeluaran
                </button>
                <button 
                  type="button" 
                  className={`auth-tab-btn ${type === 'income' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('income')}
                >
                  📈 Pemasukan
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nominal (Rupiah)</label>
                <input
                  type="number"
                  className="input-field"
                  required
                  placeholder="Masukkan jumlah uang..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ fontSize: '1.1rem', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Kategori</label>
                  <select 
                    className="input-field"
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ height: '45px' }}
                  >
                    {categories[type].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tanggal</label>
                  <input
                    type="date"
                    className="input-field"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ height: '45px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Deskripsi / Catatan (Opsional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Keperluan belanja bulanan, jajan boba, dll..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2" style={{ padding: '0.85rem' }}>
                <Plus size={18} /> Tambah Transaksi
              </button>
            </form>
          </div>

          {/* Grafik Pengeluaran Kategori (Donut SVG) */}
          <div className="section-card glass-panel p-4">
            <h3 className="section-title mb-3">Distribusi Pengeluaran</h3>
            {expenseByCategory.length === 0 ? (
              <div className="empty-box p-4 text-center">
                <AlertTriangle size={28} className="text-muted mb-2" />
                <p className="text-muted text-sm">Belum ada data pengeluaran terdaftar untuk dianalisis.</p>
              </div>
            ) : (
              <div className="flex-align gap-3 flex-wrap">
                {/* SVG Donut Chart */}
                <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                  <svg width="100%" height="100%" viewBox="0 0 42 42" className="donut-svg">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                    
                    {(() => {
                      let accumulatedPercentage = 0;
                      return expenseByCategory.map((item, idx) => {
                        const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                        const strokeDashoffset = 100 - accumulatedPercentage + 25; // Mulai dari atas (+25)
                        accumulatedPercentage += item.percentage;

                        return (
                          <circle
                            key={item.category}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke={catColors[idx % catColors.length]}
                            strokeWidth="4"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="donut-segment"
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>

                {/* Donut Legend */}
                <div className="flex-column gap-1 flex-1" style={{ minWidth: '160px' }}>
                  {expenseByCategory.slice(0, 5).map((item, idx) => (
                    <div key={item.category} className="flex-between text-sm">
                      <div className="flex-align gap-2">
                        <span 
                          style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: catColors[idx % catColors.length] 
                          }} 
                        />
                        <span className="text-secondary">{item.category}</span>
                      </div>
                      <span className="font-semibold">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Grafik Batang Perbandingan Cashflow Bulanan */}
          <div className="section-card glass-panel p-4">
            <h3 className="section-title mb-3">Arus Kas Bulanan</h3>
            <div className="chart-bar-container mt-3" style={{ height: '140px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
              {monthlyCashflow.map(month => {
                const maxVal = Math.max(...monthlyCashflow.map(m => Math.max(m.income, m.expense)), 1);
                const incomeHeightPct = Math.max(5, Math.round((month.income / maxVal) * 100));
                const expenseHeightPct = Math.max(5, Math.round((month.expense / maxVal) * 100));

                return (
                  <div key={month.name} className="flex-column items-center gap-1" style={{ flex: 1, height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', flex: 1, width: '100%', paddingBottom: '4px' }}>
                      <div 
                        className="bar-income" 
                        title={`Pemasukan: Rp ${month.income.toLocaleString()}`}
                        style={{ 
                          flex: 1, 
                          height: `${incomeHeightPct}%`, 
                          background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease'
                        }} 
                      />
                      <div 
                        className="bar-expense" 
                        title={`Pengeluaran: Rp ${month.expense.toLocaleString()}`}
                        style={{ 
                          flex: 1, 
                          height: `${expenseHeightPct}%`, 
                          background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease'
                        }} 
                      />
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{month.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex-align gap-3 justify-center mt-3 text-xs text-secondary">
              <div className="flex-align gap-1">
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10b981' }} /> Pemasukan
              </div>
              <div className="flex-align gap-1">
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#ef4444' }} /> Pengeluaran
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Transaction History & Suki Advisor */}
        <div className="dashboard-col flex-column gap-3">

          {/* AI Suki Financial Advisor */}
          <div className="section-card glass-panel p-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
            <div className="flex-between mb-3">
              <h3 className="section-title flex-align gap-2">
                <Sparkles className="icon-accent" size={18} /> Suki Financial Advisor
              </h3>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleRequestAiAdvice}
                disabled={loadingAi}
              >
                <RefreshCw size={14} className={loadingAi ? 'spin-anim' : ''} /> {loadingAi ? 'Menganalisis...' : 'Minta Saran'}
              </button>
            </div>

            {aiAnalysis ? (
              <div className="ai-response-box p-3 glass-panel" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <pre style={{ 
                  fontFamily: 'var(--font-sans)', 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '0.9rem', 
                  lineHeight: 1.5,
                  color: 'var(--text-primary)'
                }}>
                  {aiAnalysis}
                </pre>
              </div>
            ) : (
              <div className="empty-box p-4 text-center">
                <PiggyBank size={38} className="icon-accent mb-2" style={{ animation: 'logoPulse 2s infinite ease-in-out' }} />
                <p className="text-secondary text-sm font-semibold">Tanya Keadaan Keuanganmu ke Suki!</p>
                <p className="text-muted text-xs mt-1">Suki akan memindai riwayat transaksi lo dan kasih saran anggaran gokil biar tabungan lo aman.</p>
                <button 
                  className="btn btn-primary btn-sm mt-3"
                  onClick={handleRequestAiAdvice}
                  disabled={loadingAi}
                >
                  Minta Analisis Keuangan Suki
                </button>
              </div>
            )}
          </div>
          
          {/* Riwayat Transaksi */}
          <div className="section-card glass-panel p-4 flex-column gap-2" style={{ flex: 1 }}>
            <h3 className="section-title">Riwayat Transaksi</h3>

            <div className="toolbar-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, background: 'none', border: 'none' }}>
              {/* Pencarian */}
              <div className="search-input-box w-full">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Cari deskripsi atau kategori..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter */}
              <div className="flex-align gap-2">
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-xs"
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '10px' }}
                >
                  <option value="all">Semua Tipe</option>
                  <option value="income">📈 Pemasukan</option>
                  <option value="expense">📉 Pengeluaran</option>
                </select>

                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="text-xs"
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '10px' }}
                >
                  <option value="all">Semua Kategori</option>
                  {[...new Set(financialEntries.map(e => e.category))].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Transaksi */}
            <div className="transaction-history-list mt-2 flex-column gap-2" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {filteredEntries.length === 0 ? (
                <div className="empty-box p-4 text-center">
                  <p className="text-muted text-sm">Tidak ada transaksi ditemukan.</p>
                </div>
              ) : (
                filteredEntries.map(entry => (
                  <div key={entry.id} className="transaction-list-item flex-between p-3 glass-panel">
                    <div className="flex-align gap-2">
                      <div className={`transaction-icon-indicator ${entry.type === 'income' ? 'icon-emerald' : 'icon-destructive'}`} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifycontent: 'center' }}>
                        {entry.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div className="flex-column">
                        <span className="transaction-item-title font-semibold text-sm">{entry.description}</span>
                        <span className="transaction-item-meta text-xs text-muted flex-align gap-1">
                          <span>{entry.category}</span> • <Calendar size={10} /> <span>{entry.date}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex-align gap-3">
                      <span className={`transaction-item-val font-bold text-sm ${entry.type === 'income' ? 'text-emerald' : 'text-danger'}`}>
                        {entry.type === 'income' ? '+' : '-'} Rp {entry.amount.toLocaleString()}
                      </span>
                      <button
                        className="btn-icon delete-card-btn"
                        onClick={() => deleteFinancialEntry(entry.id)}
                        title="Hapus Transaksi"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
      
      {/* Custom Styles */}
      <style>{`
        .donut-svg {
          transform: rotate(-90deg);
        }
        .donut-segment {
          transition: stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease;
        }
        .spin-anim {
          animation: refreshSpin 1.2s infinite linear;
        }
        @keyframes refreshSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .transaction-list-item {
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .transaction-list-item:hover {
          transform: translateX(2px);
          border-color: var(--border-highlight);
        }
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 40%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
}
