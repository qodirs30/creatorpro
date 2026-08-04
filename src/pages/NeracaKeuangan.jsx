import { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2, 
  Search, Filter, Sparkles, AlertTriangle, Calendar, 
  HelpCircle, RefreshCw, Wallet, PiggyBank, ArrowDownRight, ArrowUpRight,
  Coffee, Utensils, ShoppingBag, CreditCard, ChevronRight, CalendarDays, SlidersHorizontal
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { generateContent } from '../utils/ai';

// Helper to format Suki AI Advice dynamically as rich react components
const renderFormattedAdvice = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} style={{ height: '0.75rem' }} />;
    
    // Check for subheadings (e.g. ### atau ## atau **judul**)
    if (trimmed.startsWith('###') || trimmed.startsWith('##') || (trimmed.startsWith('**') && trimmed.endsWith('**'))) {
      const cleanText = trimmed.replace(/[#*]/g, '');
      return (
        <h4 
          key={idx} 
          style={{ 
            fontSize: '0.95rem', 
            fontWeight: 700, 
            margin: '1.25rem 0 0.5rem 0', 
            color: 'var(--primary)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}
        >
          <Sparkles size={14} className="text-accent" /> {cleanText}
        </h4>
      );
    }
    
    // Check for bullet points (e.g. - atau * atau angka 1.)
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
      const isNumbered = /^\d+\./.test(trimmed);
      const prefix = isNumbered ? trimmed.match(/^\d+\./)[0] : '•';
      const cleanText = trimmed.replace(/^[-*\d.]+\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(cleanText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanText.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < cleanText.length) {
        parts.push(cleanText.substring(lastIndex));
      }

      return (
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)', alignItems: 'flex-start', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 'bold', marginTop: isNumbered ? '1px' : '2px', fontSize: isNumbered ? '0.75rem' : '1rem' }}>
            {prefix}
          </span>
          <div style={{ flex: 1 }}>{parts.length > 0 ? parts : cleanText}</div>
        </div>
      );
    }

    // Normal paragraph with markdown bold translation
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = boldRegex.exec(trimmed)) !== null) {
      if (match.index > lastIndex) {
        parts.push(trimmed.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    if (lastIndex < trimmed.length) {
      parts.push(trimmed.substring(lastIndex));
    }

    return (
      <p key={idx} style={{ fontSize: '0.875rem', lineHeight: 1.55, margin: '0.6rem 0', color: 'var(--text-secondary)' }}>
        {parts.length > 0 ? parts : trimmed}
      </p>
    );
  });
};

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

  // Filtering / Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Date/Period Filter States
  const [filterPeriod, setFilterPeriod] = useState('this-month'); // 'this-month' | 'last-month' | 'this-year' | 'all' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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

  // Saring transaksi berdasarkan periode waktu yang dipilih
  const selectedEntries = useMemo(() => {
    const now = new Date();
    return financialEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      if (isNaN(entryDate.getTime())) return true;

      if (filterPeriod === 'this-month') {
        return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
      }
      if (filterPeriod === 'last-month') {
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return entryDate.getMonth() === prevMonth && entryDate.getFullYear() === prevYear;
      }
      if (filterPeriod === 'this-year') {
        return entryDate.getFullYear() === now.getFullYear();
      }
      if (filterPeriod === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return entryDate >= start && entryDate <= end;
      }
      return true; // 'all'
    });
  }, [financialEntries, filterPeriod, customStartDate, customEndDate]);

  // Perhitungan Keuangan Dinamis Berdasarkan selectedEntries
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    selectedEntries.forEach(entry => {
      if (entry.type === 'income') {
        income += entry.amount;
      } else {
        expense += entry.amount;
      }
    });

    const balance = income - expense;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

    return { income, expense, balance, savingsRate };
  }, [selectedEntries]);

  // Breakdown Kategori Pengeluaran untuk Donut Chart & Progress Bars
  const expenseByCategory = useMemo(() => {
    const breakdown = {};
    let totalExpense = 0;

    selectedEntries.forEach(entry => {
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
  }, [selectedEntries]);

  // Analisis Top 5 Pengeluaran Tunggal Terbesar
  const topSingleExpenses = useMemo(() => {
    return selectedEntries
      .filter(e => e.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [selectedEntries]);

  // Helper Ikon Deskriptif Pengeluaran
  const getExpenseIcon = (entry) => {
    const desc = entry.description.toLowerCase();
    const cat = entry.category.toLowerCase();
    
    if (desc.includes('kopi') || desc.includes('coffee') || desc.includes('starbucks') || desc.includes('cafe') || desc.includes('boba')) {
      return { icon: <Coffee size={15} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    }
    if (desc.includes('makan') || desc.includes('food') || cat.includes('makanan') || desc.includes('warteg') || desc.includes('go-food') || desc.includes('grabfood') || desc.includes('restoran')) {
      return { icon: <Utensils size={15} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    }
    if (desc.includes('belanja') || desc.includes('shopping') || cat.includes('belanja') || desc.includes('beli') || desc.includes('baju') || desc.includes('gadget') || desc.includes('sepatu')) {
      return { icon: <ShoppingBag size={15} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    }
    if (desc.includes('tagihan') || desc.includes('listrik') || cat.includes('tagihan') || desc.includes('pulsa') || desc.includes('wifi') || desc.includes('kuota') || desc.includes('kos')) {
      return { icon: <CreditCard size={15} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
    }
    return { icon: <DollarSign size={15} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
  };

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

  // Filter Transaksi Berdasarkan selectedEntries
  const filteredEntries = useMemo(() => {
    return selectedEntries.filter(entry => {
      const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            entry.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || entry.type === filterType;
      const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [selectedEntries, searchTerm, filterType, filterCategory]);

  // Panggil Suki AI Advisor
  const handleRequestAiAdvice = async () => {
    setLoadingAi(true);
    setAiAnalysis('');
    try {
      const recentList = selectedEntries.slice(0, 5).map(e => 
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

  // Style helper for filter pills
  const getPillStyle = (active) => ({
    padding: '0.45rem 1rem',
    borderRadius: '999px',
    border: '1px solid',
    borderColor: active ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.04)',
    backgroundColor: active ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.01)',
    color: active ? 'var(--primary)' : 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    boxShadow: active ? '0 4px 12px rgba(99, 102, 241, 0.12)' : 'none',
  });

  return (
    <div className="page-container" style={{ padding: '2rem 1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header flex-between flex-wrap gap-2" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title flex-align gap-2" style={{ fontSize: '1.85rem' }}>
            <Wallet className="icon-accent" size={26} /> Neraca Keuangan Studio
          </h1>
          <p className="page-subtitle">Kelola kas bulanan, lacak pengeluaran, dan dapatkan analisis anggaran dari AI Suki.</p>
        </div>
      </div>

      {/* Sleek Period Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', transform: 'none' }}>
        <div className="flex-between flex-wrap gap-3">
          <div className="flex-align gap-2 flex-wrap">
            <CalendarDays size={16} className="text-secondary" />
            <span className="text-xs font-bold text-secondary mr-2 text-uppercase tracking-wider">Filter Periode:</span>
            {[
              { id: 'all', label: 'Semua Waktu' },
              { id: 'this-month', label: 'Bulan Ini' },
              { id: 'last-month', label: 'Bulan Lalu' },
              { id: 'this-year', label: 'Tahun Ini' },
              { id: 'custom', label: 'Kustom Tanggal' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setFilterPeriod(p.id)}
                style={getPillStyle(filterPeriod === p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {filterPeriod === 'custom' && (
            <div className="flex-align gap-2 animate-fadeIn">
              <input
                type="date"
                className="input-field py-1 px-2 text-xs"
                style={{ width: '130px', height: '32px' }}
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <span className="text-xs text-muted">s/d</span>
              <input
                type="date"
                className="input-field py-1 px-2 text-xs"
                style={{ width: '130px', height: '32px' }}
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bento Grid Summary Cards */}
      <div className="neraca-grid">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: '90px' }}>
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

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: '90px' }}>
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

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: '90px' }}>
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

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', minHeight: '90px' }}>
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
      <div className="dashboard-content-grid" style={{ marginTop: '1.5rem' }}>
        {/* Left Column: Entry Form & Analytics Charts */}
        <div className="dashboard-col flex-column gap-3">
          
          {/* Form Pencatatan Cepat */}
          <div className="card" style={{ transform: 'none' }}>
            <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Catat Transaksi Baru</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="auth-tabs-container" style={{ marginBottom: '0.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div 
                  className="auth-tab-active-pill" 
                  style={{
                    width: '50%',
                    transform: `translateX(${type === 'expense' ? '0%' : '100%'})`,
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
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
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nominal (Rupiah)</label>
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
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Kategori</label>
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
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tanggal</label>
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
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Deskripsi / Catatan (Opsional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Keperluan belanja bulanan, jajan boba, dll..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2" style={{ padding: '0.85rem', borderRadius: '14px', fontSize: '0.9rem', fontWeight: 600 }}>
                <Plus size={18} /> Tambah Transaksi
              </button>
            </form>
          </div>

          {/* Grafik Pengeluaran Kategori (Donut SVG Premium) */}
          <div className="card" style={{ transform: 'none' }}>
            <h3 className="section-title mb-4" style={{ fontSize: '1.1rem' }}>Distribusi Pengeluaran</h3>
            {expenseByCategory.length === 0 ? (
              <div className="empty-box p-4 text-center">
                <AlertTriangle size={28} className="text-muted mb-2" />
                <p className="text-muted text-sm">Belum ada data pengeluaran terdaftar pada periode ini.</p>
              </div>
            ) : (
              <div className="flex-column gap-4">
                {/* SVG Donut Chart with Center Text */}
                <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto' }}>
                  <svg width="100%" height="100%" viewBox="0 0 42 42" className="donut-svg">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="4.2" />
                    
                    {(() => {
                      let accumulatedPercentage = 0;
                      return expenseByCategory.map((item, idx) => {
                        const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                        const strokeDashoffset = 100 - accumulatedPercentage + 25; // Start from top
                        accumulatedPercentage += item.percentage;

                        return (
                          <circle
                            key={item.category}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke={catColors[idx % catColors.length]}
                            strokeWidth="4.2"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="donut-segment"
                            style={{ transition: 'stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease' }}
                          />
                        );
                      });
                    })()}
                  </svg>
                  {/* Center Hole Display */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Keluar</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>Rp {summary.expense.toLocaleString()}</span>
                  </div>
                </div>

                {/* Progress-bar Style Category Distribution */}
                <div className="flex-column gap-3 mt-2">
                  <span className="text-xs font-bold text-muted text-uppercase tracking-wider">Breakdown Pengeluaran</span>
                  {expenseByCategory.map((item, idx) => (
                    <div key={item.category} className="flex-column gap-1">
                      <div className="flex-between text-sm">
                        <div className="flex-align gap-2">
                          <span 
                            style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              backgroundColor: catColors[idx % catColors.length] 
                            }} 
                          />
                          <span className="font-semibold" style={{ fontSize: '0.85rem' }}>{item.category}</span>
                        </div>
                        <span className="font-semibold text-secondary" style={{ fontSize: '0.85rem' }}>
                          Rp {item.amount.toLocaleString()} ({item.percentage}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${item.percentage}%`, 
                            height: '100%', 
                            backgroundColor: catColors[idx % catColors.length],
                            borderRadius: '10px',
                            transition: 'width 0.4s ease'
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Grafik Batang Perbandingan Cashflow Bulanan */}
          <div className="card" style={{ transform: 'none' }}>
            <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Arus Kas Bulanan (6 Bulan Terakhir)</h3>
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

        {/* Right Column: Transaction History, Suki Advisor, and Top Transactions */}
        <div className="dashboard-col flex-column gap-3">

          {/* AI Suki Financial Advisor (Chat/Terminal Style UI) */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(139, 92, 246, 0.25)', transform: 'none' }}>
            {/* Terminal Header */}
            <div className="flex-between px-4 py-3" style={{ background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)', borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
              <div className="flex-align gap-2">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>🐱 Suki Financial Advisor</span>
                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '5px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>gemini-2.5</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm py-1 px-3 flex-align gap-1"
                style={{ fontSize: '0.75rem', height: '28px', margin: 0 }}
                onClick={handleRequestAiAdvice}
                disabled={loadingAi}
              >
                <RefreshCw size={12} className={loadingAi ? 'spin-anim' : ''} /> Minta Analisis
              </button>
            </div>

            <div className="p-4 flex-column gap-3" style={{ background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.03) 0%, transparent 100%)' }}>
              {aiAnalysis ? (
                <div className="ai-chat-bubble p-4 glass-panel animate-fadeIn" style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {renderFormattedAdvice(aiAnalysis)}
                </div>
              ) : (
                <div className="empty-box p-4 text-center">
                  <PiggyBank size={42} className="icon-accent mb-2" style={{ animation: 'logoPulse 2.5s infinite ease-in-out', color: 'var(--primary)' }} />
                  <p className="text-secondary text-sm font-semibold">Butuh Analisis Keuangan Lo?</p>
                  <p className="text-muted text-xs mt-1">Suki bakal scan data pengeluaran lo pada periode ini dan kasih insight budget gokil!</p>
                  <button 
                    className="btn btn-primary btn-sm mt-3"
                    style={{ borderRadius: '12px', padding: '0.5rem 1.25rem' }}
                    onClick={handleRequestAiAdvice}
                    disabled={loadingAi}
                  >
                    Minta Analisis Keuangan Suki
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Top 5 Single Expenses Leaderboard (Analisis Top Pengeluaran) */}
          <div className="card" style={{ transform: 'none' }}>
            <h3 className="section-title mb-3 flex-align gap-2" style={{ fontSize: '1.1rem' }}>
              <SlidersHorizontal size={18} className="icon-accent" /> Top Pengeluaran Terbesar
            </h3>
            {topSingleExpenses.length === 0 ? (
              <div className="empty-box p-3 text-center">
                <p className="text-muted text-xs">Belum ada pengeluaran terdaftar pada periode ini.</p>
              </div>
            ) : (
              <div className="flex-column gap-2">
                {topSingleExpenses.map((entry, idx) => {
                  const styleMeta = getExpenseIcon(entry);
                  return (
                    <div 
                      key={entry.id} 
                      className="flex-between p-3"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.01)', 
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                        borderRadius: '16px',
                        transition: 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                    >
                      <div className="flex-align gap-3">
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', width: '15px' }}>{idx + 1}.</span>
                        <div 
                          style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: styleMeta.bg,
                            color: styleMeta.color
                          }}
                        >
                          {styleMeta.icon}
                        </div>
                        <div className="flex-column">
                          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{entry.description}</span>
                          <span className="text-xs text-muted">{entry.category} • {entry.date}</span>
                        </div>
                      </div>
                      <span className="font-bold text-sm text-danger">
                        - Rp {entry.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Riwayat Transaksi */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', transform: 'none' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem' }}>Riwayat Transaksi</h3>

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
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}
                >
                  <option value="all">Semua Tipe</option>
                  <option value="income">📈 Pemasukan</option>
                  <option value="expense">📉 Pengeluaran</option>
                </select>

                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="text-xs"
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}
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
                  <div 
                    key={entry.id} 
                    className="transaction-list-item flex-between p-3"
                    style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255, 255, 255, 0.03)',
                      borderRadius: '16px',
                      padding: '0.85rem 1.25rem',
                      transition: 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1), border-color 0.2s ease',
                    }}
                  >
                    <div className="flex-align gap-2">
                      <div className={`transaction-icon-indicator ${entry.type === 'income' ? 'icon-emerald' : 'icon-destructive'}`} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {entry.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div className="flex-column">
                        <span className="transaction-item-title font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{entry.description}</span>
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
        .transaction-list-item:hover {
          transform: translateX(4px) !important;
          border-color: rgba(99, 102, 241, 0.25) !important;
        }
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 40%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
