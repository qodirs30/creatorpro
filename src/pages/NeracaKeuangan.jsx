import { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2, 
  Search, Filter, Sparkles, AlertTriangle, Calendar, 
  HelpCircle, RefreshCw, Wallet, PiggyBank, ArrowDownRight, ArrowUpRight,
  Coffee, Utensils, ShoppingBag, CreditCard, ChevronRight, CalendarDays, 
  SlidersHorizontal, LayoutDashboard, PlusCircle, CheckCircle, XCircle, Download, Upload, AlertCircle
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
    
    // Check for subheadings
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
    
    // Check for bullet points
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
      const isNumbered = /^\d+\./.test(trimmed);
      const prefix = isNumbered ? trimmed.match(/^\d+\./)[0] : '•';
      const cleanText = trimmed.replace(/^[-*\d.]+\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      
      const boldRegex = /\*\*(.*?)\*\*/g; // standard regex
      const parts = [];
      let lastIndex = 0;
      let match;
      const bRegex = /\*\*(.*?)\*\*/g;
      while ((match = bRegex.exec(cleanText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanText.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{match[1]}</strong>);
        lastIndex = bRegex.lastIndex;
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
    
    // Extended States & Mutators
    financialBudgets = {},
    setFinancialBudgets,
    financialGoals = [],
    addFinancialGoal,
    updateFinancialGoal,
    deleteFinancialGoal,
    recurringBills = [],
    addRecurringBill,
    updateRecurringBill,
    deleteRecurringBill,
    debts = [],
    addDebt,
    updateDebt,
    deleteDebt,
    wallets = [],
    addWallet,
    updateWallet,
    deleteWallet,

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

  // Tab State
  const [activeTab, setActiveTab] = useState('dasbor'); // 'dasbor' | 'anggaran' | 'tagihan' | 'akun' | 'data'

  // Form States - Transaksi Baru
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Makanan');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Form States - Target Anggaran Kategori
  const [budgetCat, setBudgetCat] = useState('Makanan');
  const [budgetVal, setBudgetVal] = useState('');

  // Form States - Goals Keuangan
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');

  // Form States - Tagihan Baru
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState('');

  // Form States - Utang Baru
  const [debtDesc, setDebtDesc] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState('owe');
  const [debtDueDate, setDebtDueDate] = useState('');

  // Form States - Dompet Baru
  const [walletName, setWalletName] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [walletType, setWalletType] = useState('bank');

  // Filtering / Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Date/Period Filter States
  const [filterPeriod, setFilterPeriod] = useState('this-month'); // 'this-month' | 'last-month' | 'this-year' | 'all' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Mutasi Bank Paste Text
  const [importText, setImportText] = useState('');

  // AI Advisor States
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Kategori default
  const categories = {
    expense: ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Lainnya'],
    income: ['Gaji', 'Investasi', 'Freelance', 'Hadiah', 'Lainnya']
  };

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

  // Submit Budget Target
  const handleBudgetSubmit = (e) => {
    e.preventDefault();
    if (!budgetVal || Number(budgetVal) <= 0) return;
    setFinancialBudgets({
      ...financialBudgets,
      [budgetCat]: Number(budgetVal)
    });
    setBudgetVal('');
  };

  // Submit Goal Baru
  const handleGoalSubmit = (e) => {
    e.preventDefault();
    if (!goalName.trim() || !goalTarget || Number(goalTarget) <= 0) return;
    addFinancialGoal({
      name: goalName.trim(),
      target: Number(goalTarget),
      current: Number(goalCurrent || 0),
      deadline: goalDeadline || new Date().toISOString().split('T')[0]
    });
    setGoalName('');
    setGoalTarget('');
    setGoalCurrent('');
    setGoalDeadline('');
  };

  // Submit Tagihan Baru
  const handleBillSubmit = (e) => {
    e.preventDefault();
    if (!billName.trim() || !billAmount || Number(billAmount) <= 0) return;
    addRecurringBill({
      name: billName.trim(),
      amount: Number(billAmount),
      dueDate: billDueDate || new Date().toISOString().split('T')[0]
    });
    setBillName('');
    setBillAmount('');
    setBillDueDate('');
  };

  // Submit Utang Baru
  const handleDebtSubmit = (e) => {
    e.preventDefault();
    if (!debtDesc.trim() || !debtAmount || Number(debtAmount) <= 0) return;
    addDebt({
      description: debtDesc.trim(),
      amount: Number(debtAmount),
      type: debtType,
      dueDate: debtDueDate || new Date().toISOString().split('T')[0]
    });
    setDebtDesc('');
    setDebtAmount('');
    setDebtDueDate('');
  };

  // Submit Dompet Baru
  const handleWalletSubmit = (e) => {
    e.preventDefault();
    if (!walletName.trim() || !walletBalance || Number(walletBalance) < 0) return;
    addWallet({
      name: walletName.trim(),
      balance: Number(walletBalance),
      type: walletType
    });
    setWalletName('');
    setWalletBalance('');
  };

  // Jalankan migrasi satu kali ketika halaman dimuat
  useEffect(() => {
    const transactionsFromMemex = memexCards.filter(c => c.type === 'transaction');
    if (transactionsFromMemex.length === 0) return;

    const toMigrate = [];
    transactionsFromMemex.forEach(c => {
      const isAlreadyMigrated = financialEntries.some(e => 
        e.id === c.id || 
        (e.description === c.title && 
         e.amount === Number(c.data?.amount || 0) && 
         e.date === (c.data?.date || new Date(c.createdAt).toISOString().split('T')[0]))
      );

      if (!isAlreadyMigrated) {
        toMigrate.push({
          id: c.id, 
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

  // Analisis Top 5 Pemasukan Tunggal Terbesar
  const topSingleIncomes = useMemo(() => {
    return selectedEntries
      .filter(e => e.type === 'income')
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
    if (desc.includes('makan') || desc.includes('food') || cat.includes('makanan') || desc.includes('warteg') || desc.includes('gofood') || desc.includes('grabfood') || desc.includes('restoran')) {
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

  // 100% Browser-Proof Monthly Cashflow (6 Bulan Terakhir)
  const monthlyCashflow = useMemo(() => {
    const months = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    // Inisialisasi 6 bulan terakhir secara presisi
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // Hindari bug overflow tanggal 31
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      const yStr = String(d.getFullYear()).slice(-2);
      const key = `${mName} ${yStr}`;
      months[key] = { name: key, income: 0, expense: 0 };
    }

    financialEntries.forEach(entry => {
      if (!entry.date) return;
      const parts = entry.date.split('-');
      if (parts.length < 2) return;
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (isNaN(year) || isNaN(monthIdx)) return;

      const mName = monthNames[monthIdx];
      const yStr = String(year).slice(-2);
      const key = `${mName} ${yStr}`;
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

  // 100% Browser-Proof Daily Expense Trend (15 Hari Terakhir)
  const dailyExpenseTrend = useMemo(() => {
    const dateMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    // Inisialisasi 15 hari terakhir
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      dateMap[dateStr] = { label, amount: 0 };
    }

    financialEntries.forEach(entry => {
      if (entry.type === 'expense' && dateMap[entry.date]) {
        dateMap[entry.date].amount += entry.amount;
      }
    });

    return Object.keys(dateMap).sort().map(key => ({
      date: key,
      label: dateMap[key].label,
      amount: dateMap[key].amount
    }));
  }, [financialEntries]);

  const maxDailyExpense = useMemo(() => {
    return Math.max(...dailyExpenseTrend.map(d => d.amount), 1);
  }, [dailyExpenseTrend]);

  const svgPathData = useMemo(() => {
    if (dailyExpenseTrend.length === 0) return { linePath: '', areaPath: '', points: [] };
    const width = 500;
    const height = 120;
    const points = dailyExpenseTrend.map((item, idx) => {
      const x = (idx / (dailyExpenseTrend.length - 1)) * width;
      const y = height - 10 - (item.amount / maxDailyExpense) * (height - 25);
      return { x, y };
    });

    // Generate smooth path line
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    // Generate closed area path
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { linePath, areaPath, points };
  }, [dailyExpenseTrend, maxDailyExpense]);

  // Filter Transaksi Berdasarkan search / dropdowns
  const filteredEntries = useMemo(() => {
    return selectedEntries.filter(entry => {
      const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            entry.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || entry.type === filterType;
      const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [selectedEntries, searchTerm, filterType, filterCategory]);

  // ================= ANALISIS RASIO IDEAL & PREDIKSI =================
  // 1. Rasio Dana Darurat
  const emergencyFundMonths = useMemo(() => {
    const currentMonthExpenses = financialEntries
      .filter(e => {
        const d = new Date(e.date);
        return e.type === 'expense' && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const netWorth = summary.balance;
    if (currentMonthExpenses === 0) return 'Aman (Biaya Hidup Rp 0)';
    return (netWorth / currentMonthExpenses).toFixed(1);
  }, [financialEntries, summary.balance]);

  // 2. Kebutuhan vs Keinginan
  const needsVsWants = useMemo(() => {
    let needs = 0;
    let wants = 0;
    selectedEntries.filter(e => e.type === 'expense').forEach(e => {
      const cat = e.category.toLowerCase();
      if (['makanan', 'transportasi', 'tagihan', 'kesehatan'].includes(cat)) {
        needs += e.amount;
      } else {
        wants += e.amount;
      }
    });
    const total = needs + wants;
    return {
      needsPct: total > 0 ? Math.round((needs / total) * 100) : 0,
      wantsPct: total > 0 ? Math.round((wants / total) * 100) : 0,
      needsAmount: needs,
      wantsAmount: wants
    };
  }, [selectedEntries]);

  // 3. Perbandingan Month-over-Month
  const momComparison = useMemo(() => {
    const now = new Date();
    const thisMonthExp = financialEntries
      .filter(e => {
        const d = new Date(e.date);
        return e.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonthExp = financialEntries
      .filter(e => {
        const d = new Date(e.date);
        return e.type === 'expense' && d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    if (lastMonthExp === 0) return { changePct: 0, direction: 'none', lastMonthExp: 0 };
    const diff = thisMonthExp - lastMonthExp;
    const pct = Math.round((diff / lastMonthExp) * 100);
    return {
      changePct: Math.abs(pct),
      direction: diff >= 0 ? 'naik' : 'turun',
      lastMonthExp
    };
  }, [financialEntries]);

  // 4. Prediksi Run Rate Finansial Akhir Bulan
  const runRateEstimate = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const thisMonthExp = financialEntries
      .filter(e => {
        const d = new Date(e.date);
        return e.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const dailyAvg = thisMonthExp / today;
    return Math.round(dailyAvg * daysInMonth);
  }, [financialEntries]);

  // 5. Alokasi Aset (Liquid vs Investment)
  const assetAllocation = useMemo(() => {
    let liquid = 0;
    let investment = 0;

    wallets.forEach(w => {
      if (w.type === 'investment') {
        investment += w.balance;
      } else {
        liquid += w.balance;
      }
    });

    const total = liquid + investment;
    return {
      liquidPct: total > 0 ? Math.round((liquid / total) * 100) : 100,
      investmentPct: total > 0 ? Math.round((investment / total) * 100) : 0,
      liquid,
      investment,
      total
    };
  }, [wallets]);

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

      const budgetList = Object.entries(financialBudgets)
        .map(([cat, limit]) => {
          const spent = expenseByCategory.find(c => c.category === cat)?.amount || 0;
          return `- Kategori ${cat}: Terpakai Rp ${spent.toLocaleString()} / Target Maksimal Rp ${limit.toLocaleString()} (${limit > 0 ? Math.round((spent/limit)*100) : 0}%)`;
        }).join('\n');

      const systemPrompt = `Anda adalah Suki, konsultan keuangan pribadi cerdas dan humoris dari qodirsAi Studio. 
Tugas Anda adalah menganalisis ringkasan finansial pengguna dan memberikan nasihat keuangan yang tajam, praktis, sarkastik secara positif, dan berfokus pada tips hemat. Gunakan bahasa gaul santai (lo, gue) dan berikan saran anggaran yang nyata.`;

      const prompt = `Berikut adalah data keuangan saya saat ini:
- Total Pendapatan: Rp ${summary.income.toLocaleString()}
- Total Pengeluaran: Rp ${summary.expense.toLocaleString()}
- Saldo Bersih: Rp ${summary.balance.toLocaleString()}
- Tingkat Rasio Tabungan: ${summary.savingsRate}%
- Rasio Emergency Fund: ${emergencyFundMonths} bulan biaya hidup
- Rasio Kebutuhan vs Keinginan: ${needsVsWants.needsPct}% Needs vs ${needsVsWants.wantsPct}% Wants
- Bandingan Pengeluaran Bulan Ini vs Bulan Lalu: ${momComparison.direction === 'none' ? 'Belum ada data pembanding' : `${momComparison.direction} ${momComparison.changePct}%`}
- Estimasi Run Rate Pengeluaran Akhir Bulan: Rp ${runRateEstimate.toLocaleString()}

Rincian Pengeluaran berdasarkan kategori:
${categoryList || 'Belum ada data pengeluaran.'}

Pencapaian Anggaran Kategori:
${budgetList || 'Belum ada target anggaran per kategori.'}

5 Transaksi Terakhir:
${recentList || 'Belum ada transaksi.'}

Tolong berikan ulasan ringkas neraca keuangan saya, roasting tipis jika pengeluaran melebihi batas anggaran/boros, analisis rasio darurat saya, dan berikan 3 langkah aksi konkret minggu ini!`;

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

  // Export ke CSV
  const handleExportCSV = () => {
    if (financialEntries.length === 0) {
      alert("Belum ada data transaksi untuk diekspor.");
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Tanggal,Tipe,Kategori,Nominal,Deskripsi,Waktu Pembuatan\n";
    financialEntries.forEach(e => {
      const row = [
        e.id,
        e.date,
        e.type,
        e.category,
        e.amount,
        `"${e.description.replace(/"/g, '""')}"`,
        e.createdAt
      ].join(",");
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_keuangan_qodirsai_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Impor Mutasi Bank Parser
  const handleImportBankStatement = () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n');
    const imported = [];
    let count = 0;
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      const amountMatch = line.replace(/\./g, '').match(/\d+/);
      const amount = amountMatch ? parseInt(amountMatch[0], 10) : 0;
      if (amount <= 0) return;

      let type = 'expense';
      if (/cr|kredit|credit|masuk|pemasukan|gaji|income/i.test(line)) {
        type = 'income';
      }

      let category = type === 'income' ? 'Gaji' : 'Lainnya';
      if (/makan|warteg|kopi|starbucks|boba|kuliner/i.test(line)) category = 'Makanan';
      else if (/transport|gojek|grab|bensin|tol/i.test(line)) category = 'Transportasi';
      else if (/belanja|tokopedia|shopee|beli/i.test(line)) category = 'Belanja';
      else if (/listrik|wifi|internet|pulsa|telkom/i.test(line)) category = 'Tagihan';

      let date = new Date().toISOString().split('T')[0];
      const dateMatch = line.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
      if (dateMatch) {
        date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      } else {
        const shortDateMatch = line.match(/(\d{2})[-/](\d{2})/);
        if (shortDateMatch) {
          date = `${new Date().getFullYear()}-${shortDateMatch[2]}-${shortDateMatch[1]}`;
        }
      }

      const description = line.replace(/rp|debet|kredit|credit|debit/ig, '').trim().substring(0, 50) || 'Impor Mutasi';

      imported.push({
        type,
        category,
        amount,
        date,
        description
      });
      count++;
    });

    if (imported.length > 0) {
      addMultipleFinancialEntries(imported);
      alert(`Berhasil mengimpor ${count} transaksi dari mutasi!`);
      setImportText('');
    } else {
      alert("Format mutasi tidak dikenali. Pastikan terdapat nominal angka di setiap baris.");
    }
  };

  // Palet Warna Grafik Kategori
  const catColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  // Style helper for segmented control tab bar
  const getTabStyle = (tabId) => ({
    padding: '0.65rem 1.25rem',
    borderRadius: '12px',
    backgroundColor: activeTab === tabId ? 'var(--primary-light)' : 'transparent',
    color: activeTab === tabId ? 'var(--primary)' : 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    border: 'none',
  });

  const getPillStyle = (active) => ({
    padding: '0.45rem 1rem',
    borderRadius: '999px',
    border: '1px solid',
    borderColor: active ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.04)',
    backgroundColor: active ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.01)',
    color: active ? 'var(--primary)' : 'var(--text-secondary)',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    boxShadow: active ? '0 4px 12px rgba(99, 102, 241, 0.12)' : 'none',
  });

  return (
    <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', height: '100%' }}>
      {/* Header */}
      <div className="page-header flex-between flex-wrap gap-2" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title flex-align gap-2" style={{ fontSize: '1.85rem' }}>
            <Wallet className="icon-accent" size={26} /> Neraca Keuangan Studio
          </h1>
          <p className="page-subtitle">Kelola dompet kas, target anggaran bulanan, tagihan rutin, utang, dan analisis AI Suki.</p>
        </div>
      </div>

      {/* Tabs Navigation Segmented Control */}
      <div className="card" style={{ padding: '0.5rem', marginBottom: '1.5rem', transform: 'none', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button style={getTabStyle('dasbor')} onClick={() => setActiveTab('dasbor')}>
          <LayoutDashboard size={16} /> Dasbor Utama
        </button>
        <button style={getTabStyle('anggaran')} onClick={() => setActiveTab('anggaran')}>
          <PiggyBank size={16} /> Anggaran & Target
        </button>
        <button style={getTabStyle('tagihan')} onClick={() => setActiveTab('tagihan')}>
          <CalendarDays size={16} /> Tagihan & Utang
        </button>
        <button style={getTabStyle('akun')} onClick={() => setActiveTab('akun')}>
          <Wallet size={16} /> Akun & Aset
        </button>
        <button style={getTabStyle('data')} onClick={() => setActiveTab('data')}>
          <SlidersHorizontal size={16} /> Data & Impor
        </button>
      </div>

      {/* ========================================================================================= */}
      {/* TAB 1: DASBOR UTAMA */}
      {/* ========================================================================================= */}
      {activeTab === 'dasbor' && (
        <div className="tab-pane animate-fadeIn">
          {/* Sleek Period Filter Bar */}
          <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', transform: 'none' }}>
            <div className="flex-between flex-wrap gap-3">
              <div className="flex-align gap-2 flex-wrap">
                <CalendarDays size={16} className="text-secondary" />
                <span className="text-xs font-bold text-secondary mr-2 text-uppercase tracking-wider" style={{ marginRight: '0.75rem' }}>Filter Periode:</span>
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
                <span className="neraca-val text-emerald" style={{ color: 'var(--success)' }}>
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
                <span className="neraca-val text-danger" style={{ color: 'var(--danger)' }}>
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

          {/* QUICK INSIGHTS CARD - HIGHLY VISUAL */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', transform: 'none' }}>
            <h3 className="section-title mb-3" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} className="text-accent" /> Ringkasan Kesehatan Finansial (Visual Indicators)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
              
              {/* Gauge 1: Emergency Fund */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1rem' }}>
                <span className="text-xs text-muted font-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>🛡️ Dana Darurat (Target 6 Bln)</span>
                <span className="font-bold text-lg" style={{ color: Number(emergencyFundMonths) >= 6 ? 'var(--success)' : Number(emergencyFundMonths) >= 3 ? 'var(--warning)' : 'var(--danger)', marginTop: '2px' }}>
                  {emergencyFundMonths} Bulan Biaya Hidup
                </span>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px', position: 'relative' }}>
                  {/* Minimum 3 Months line marker */}
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1.5px', backgroundColor: 'rgba(255,255,255,0.2)', zIndex: 1 }} />
                  <div style={{ 
                    width: `${Math.min(100, Math.round((Number(emergencyFundMonths) || 0) / 6 * 100))}%`, 
                    height: '100%', 
                    backgroundColor: Number(emergencyFundMonths) >= 6 ? 'var(--success)' : Number(emergencyFundMonths) >= 3 ? 'var(--warning)' : 'var(--danger)',
                    borderRadius: '4px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <div className="flex-between text-xs text-muted" style={{ marginTop: '2px' }}>
                  <span>Min: 3 Bln</span>
                  <span>Ideal: 6 Bln</span>
                </div>
              </div>

              {/* Gauge 2: Needs vs Wants */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1rem' }}>
                <span className="text-xs text-muted font-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>⚖️ Kebutuhan vs Keinginan</span>
                <div className="flex-between text-xs font-semibold text-secondary" style={{ marginTop: '4px' }}>
                  <span style={{ color: 'var(--primary)' }}>Needs: {needsVsWants.needsPct}%</span>
                  <span style={{ color: 'var(--accent)' }}>Wants: {needsVsWants.wantsPct}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', marginTop: '4px' }}>
                  <div style={{ width: `${needsVsWants.needsPct}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.4s ease' }} />
                  <div style={{ width: `${needsVsWants.wantsPct}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.4s ease' }} />
                </div>
                <div className="flex-between text-xs text-muted" style={{ marginTop: '2px' }}>
                  <span>Ideal: 50% / 30% / 20%</span>
                  <span>Selisih: {Math.abs(needsVsWants.needsPct - needsVsWants.wantsPct)}%</span>
                </div>
              </div>

              {/* Gauge 3: Month-over-Month Trend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1rem' }}>
                <span className="text-xs text-muted font-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>📈 Trend Belanja Bulanan</span>
                {momComparison.direction === 'none' ? (
                  <span className="font-bold text-md text-muted" style={{ marginTop: '2px' }}>Belum ada pembanding</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      backgroundColor: momComparison.direction === 'naik' ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', 
                      color: momComparison.direction === 'naik' ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {momComparison.direction === 'naik' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                    </div>
                    <span className="font-bold text-lg" style={{ color: momComparison.direction === 'naik' ? 'var(--danger)' : 'var(--success)' }}>
                      {momComparison.direction === 'naik' ? 'Naik' : 'Turun'} {momComparison.changePct}%
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted" style={{ margin: '2px 0 0 0' }}>Dibanding pengeluaran bulan lalu.</p>
              </div>

              {/* Gauge 4: Projected Run Rate vs Income */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1rem' }}>
                <span className="text-xs text-muted font-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>🔮 Prediksi Akhir Bulan</span>
                <span className="font-bold text-lg text-gradient" style={{ marginTop: '2px' }}>
                  Rp {runRateEstimate.toLocaleString()}
                </span>
                {(() => {
                  const consumePct = summary.income > 0 ? Math.round((runRateEstimate / summary.income) * 100) : 0;
                  return (
                    <>
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ 
                          width: `${Math.min(100, consumePct)}%`, 
                          height: '100%', 
                          backgroundColor: consumePct > 100 ? 'var(--danger)' : consumePct > 80 ? 'var(--warning)' : 'var(--primary)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <div className="flex-between text-xs text-muted" style={{ marginTop: '2px' }}>
                        <span>Laju Penggunaan Gaji</span>
                        <span>{consumePct}% Gaji</span>
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="dashboard-content-grid">
            {/* Left Column */}
            <div className="dashboard-col flex-column gap-3">
              {/* Form Transaksi Baru */}
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

              {/* Donut Chart */}
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-4" style={{ fontSize: '1.1rem' }}>Distribusi Pengeluaran</h3>
                {expenseByCategory.length === 0 ? (
                  <div className="empty-box p-4 text-center">
                    <AlertTriangle size={28} className="text-muted mb-2" />
                    <p className="text-muted text-sm">Belum ada data pengeluaran terdaftar pada periode ini.</p>
                  </div>
                ) : (
                  <div className="flex-column gap-4">
                    <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto' }}>
                      <svg width="100%" height="100%" viewBox="0 0 42 42" className="donut-svg">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="4.2" />
                        {(() => {
                          let accumulatedPercentage = 0;
                          return expenseByCategory.map((item, idx) => {
                            const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                            const strokeDashoffset = 100 - accumulatedPercentage + 25;
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
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Keluar</span>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>Rp {summary.expense.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex-column gap-3 mt-2">
                      <span className="text-xs font-bold text-muted text-uppercase tracking-wider">Breakdown Pengeluaran</span>
                      {expenseByCategory.map((item, idx) => (
                        <div key={item.category} className="flex-column gap-1">
                          <div className="flex-between text-sm">
                            <div className="flex-align gap-2">
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: catColors[idx % catColors.length] }} />
                              <span className="font-semibold" style={{ fontSize: '0.85rem' }}>{item.category}</span>
                            </div>
                            <span className="font-semibold text-secondary" style={{ fontSize: '0.85rem' }}>
                              Rp {item.amount.toLocaleString()} ({item.percentage}%)
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${item.percentage}%`, height: '100%', backgroundColor: catColors[idx % catColors.length], borderRadius: '10px', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Cashflow Bar Chart - Collapsing Fixed */}
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Arus Kas Bulanan (6 Bulan Terakhir)</h3>
                <div className="chart-bar-container mt-3" style={{ height: '140px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
                  {monthlyCashflow.map(month => {
                    const maxVal = Math.max(...monthlyCashflow.map(m => Math.max(m.income, m.expense)), 1);
                    const incomeHeightPct = Math.max(5, Math.round((month.income / maxVal) * 100));
                    const expenseHeightPct = Math.max(5, Math.round((month.expense / maxVal) * 100));

                    return (
                      <div key={month.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1, height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3.5px', flex: 1, width: '100%', paddingBottom: '4px' }}>
                          <div 
                            className="bar-income" 
                            title={`Pemasukan: Rp ${month.income.toLocaleString()}`}
                            style={{ 
                              flex: 1, 
                              height: `${incomeHeightPct}%`, 
                              background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                              borderRadius: '4px 4px 0 0',
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
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s ease'
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{month.name}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex-align gap-3 justify-center mt-3 text-xs text-secondary" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10b981', display: 'inline-block' }} /> Pemasukan
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#ef4444', display: 'inline-block' }} /> Pengeluaran
                  </div>
                </div>
              </div>

              {/* Trend Pengeluaran Harian (15 Hari Terakhir) - NEW */}
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Trend Pengeluaran Harian (15 Hari Terakhir)</h3>
                <div style={{ position: 'relative', width: '100%', height: '140px', marginTop: '1rem', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', padding: '10px 0' }}>
                  {maxDailyExpense === 1 ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Belum ada data pengeluaran dalam 15 hari terakhir.
                    </div>
                  ) : (
                    <svg viewBox="0 0 500 120" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="var(--primary)" />
                          <stop offset="100%" stopColor="var(--accent)" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid Lines */}
                      <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                      <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                      <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

                      {/* Area Path */}
                      <path d={svgPathData.areaPath} fill="url(#areaGrad)" />
                      
                      {/* Line Path */}
                      <path d={svgPathData.linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" />
                      
                      {/* Glow Line */}
                      <path d={svgPathData.linePath} fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" opacity="0.15" style={{ filter: 'blur(3px)' }} />

                      {/* Highlight Dots */}
                      {svgPathData.points.map((pt, idx) => {
                        const item = dailyExpenseTrend[idx];
                        if (item.amount === 0) return null;
                        return (
                          <g key={idx}>
                            <circle cx={pt.x} cy={pt.y} r="4.5" fill="var(--bg-main)" stroke="var(--accent)" strokeWidth="2" />
                            <circle cx={pt.x} cy={pt.y} r="8" fill="var(--accent)" opacity="0.15" />
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
                
                {/* X-Axis labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', padding: '0 0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{dailyExpenseTrend[0]?.label}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{dailyExpenseTrend[Math.floor(dailyExpenseTrend.length / 2)]?.label}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{dailyExpenseTrend[dailyExpenseTrend.length - 1]?.label}</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="dashboard-col flex-column gap-3">
              {/* Suki Advisor */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'rgba(139, 92, 246, 0.25)', transform: 'none' }}>
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

              {/* Side-by-Side Top Expenses & Incomes Leaderboard - HIGHLY VISUAL */}
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3 flex-align gap-2" style={{ fontSize: '1.1rem' }}>
                  <SlidersHorizontal size={18} className="icon-accent" /> Top Transaksi Terbesar (Relative Scale)
                </h3>
                <p className="text-xs text-muted mb-4">Daftar transaksi nominal terbesar pada periode terpilih dengan intensitas warna berdasarkan perbandingan skala.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                  
                  {/* Top Expenses */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span className="text-xs font-bold text-danger text-uppercase tracking-wider mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} /> Top 5 Pengeluaran
                    </span>
                    {topSingleExpenses.length === 0 ? (
                      <p className="text-muted text-xs text-center py-4">Belum ada pengeluaran.</p>
                    ) : (
                      (() => {
                        const maxExpense = Math.max(...topSingleExpenses.map(e => e.amount), 1);
                        return topSingleExpenses.map((entry, idx) => {
                          const relativePct = Math.round((entry.amount / maxExpense) * 100);
                          const styleMeta = getExpenseIcon(entry);
                          return (
                            <div 
                              key={entry.id} 
                              style={{ 
                                position: 'relative', 
                                overflow: 'hidden', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.03)', 
                                backgroundColor: 'rgba(255,255,255,0.01)',
                                padding: '0.65rem 0.85rem'
                              }}
                            >
                              {/* Relative background visual scale */}
                              <div style={{ 
                                position: 'absolute', 
                                left: 0, 
                                top: 0, 
                                bottom: 0, 
                                width: `${relativePct}%`, 
                                backgroundColor: 'rgba(244,63,94,0.05)', 
                                zIndex: 0,
                                transition: 'width 0.4s ease'
                              }} />
                              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', width: '12px' }}>{idx + 1}</span>
                                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: styleMeta.bg, color: styleMeta.color }}>
                                    {styleMeta.icon}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>{entry.description}</span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{entry.date}</span>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)' }}>
                                  -Rp {entry.amount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>

                  {/* Top Incomes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span className="text-xs font-bold text-success text-uppercase tracking-wider mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} /> Top 5 Pemasukan
                    </span>
                    {topSingleIncomes.length === 0 ? (
                      <p className="text-muted text-xs text-center py-4">Belum ada pemasukan.</p>
                    ) : (
                      (() => {
                        const maxIncome = Math.max(...topSingleIncomes.map(e => e.amount), 1);
                        return topSingleIncomes.map((entry, idx) => {
                          const relativePct = Math.round((entry.amount / maxIncome) * 100);
                          return (
                            <div 
                              key={entry.id} 
                              style={{ 
                                position: 'relative', 
                                overflow: 'hidden', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.03)', 
                                backgroundColor: 'rgba(255,255,255,0.01)',
                                padding: '0.65rem 0.85rem'
                              }}
                            >
                              {/* Relative background visual scale */}
                              <div style={{ 
                                position: 'absolute', 
                                left: 0, 
                                top: 0, 
                                bottom: 0, 
                                width: `${relativePct}%`, 
                                backgroundColor: 'rgba(16,185,129,0.05)', 
                                zIndex: 0,
                                transition: 'width 0.4s ease'
                              }} />
                              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', width: '12px' }}>{idx + 1}</span>
                                  <div style={{ width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                                    <ArrowUpRight size={14} />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>{entry.description}</span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{entry.date}</span>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>
                                  +Rp {entry.amount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>

                </div>
              </div>

              {/* Riwayat Transaksi */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', transform: 'none' }}>
                <h3 className="section-title" style={{ fontSize: '1.1rem' }}>Riwayat Transaksi</h3>

                <div className="toolbar-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, background: 'none', border: 'none' }}>
                  <div className="search-input-box w-full" style={{ padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <Search size={16} className="search-icon" style={{ marginRight: '0.5rem' }} />
                    <input
                      type="text"
                      placeholder="Cari deskripsi atau kategori..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-primary)', width: '100%' }}
                    />
                  </div>

                  <div className="flex-align gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                      value={filterType} 
                      onChange={(e) => setFilterType(e.target.value)}
                      className="text-xs"
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}
                    >
                      <option value="all">Semua Tipe</option>
                      <option value="income">📈 Pemasukan</option>
                      <option value="expense">📉 Pengeluaran</option>
                    </select>

                    <select 
                      value={filterCategory} 
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="text-xs"
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '10px', backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}
                    >
                      <option value="all">Semua Kategori</option>
                      {[...new Set(financialEntries.map(e => e.category))].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="transaction-history-list mt-2" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {filteredEntries.length === 0 ? (
                    <div className="empty-box p-4 text-center">
                      <p className="text-muted text-sm">Tidak ada transaksi ditemukan.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop View Table */}
                      <div className="desktop-only-table" style={{ width: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}>
                              <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontWeight: 600 }}>Tanggal & Jam</th>
                              <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontWeight: 600 }}>Keterangan</th>
                              <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontWeight: 600 }}>Kategori</th>
                              <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontWeight: 600 }}>Tipe</th>
                              <th style={{ textAlign: 'right', padding: '0.6rem 0.5rem', fontWeight: 600 }}>Nominal</th>
                              <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', width: '40px' }}>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEntries.map(entry => {
                              const dateObj = new Date(entry.createdAt || entry.date);
                              const formattedDate = dateObj.toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit'
                              });
                              const formattedTime = dateObj.toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                              const isIncome = entry.type === 'income';

                              return (
                                <tr 
                                  key={entry.id} 
                                  className="table-row-hover"
                                  style={{ 
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                    transition: 'background-color 0.2s'
                                  }}
                                >
                                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                    {formattedDate} {formattedTime !== '00.00' && formattedTime !== '00:00' && formattedTime !== '00.00.00' ? formattedTime : ''}
                                  </td>
                                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {entry.description}
                                  </td>
                                  <td style={{ padding: '0.75rem 0.5rem' }}>
                                    <span style={{ 
                                      padding: '2px 8px', 
                                      borderRadius: '6px', 
                                      backgroundColor: 'rgba(255,255,255,0.03)', 
                                      color: 'var(--text-secondary)',
                                      fontSize: '0.72rem',
                                      fontWeight: 500
                                    }}>
                                      {entry.category}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem 0.5rem' }}>
                                    <span style={{ 
                                      padding: '2px 8px', 
                                      borderRadius: '6px', 
                                      backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)', 
                                      color: isIncome ? 'var(--success)' : 'var(--danger)',
                                      fontSize: '0.72rem',
                                      fontWeight: 600
                                    }}>
                                      {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                                    </span>
                                  </td>
                                  <td style={{ 
                                    padding: '0.75rem 0.5rem', 
                                    textAlign: 'right', 
                                    fontWeight: 700,
                                    color: isIncome ? 'var(--success)' : 'var(--danger)'
                                  }}>
                                    {isIncome ? '+' : '-'} Rp {entry.amount.toLocaleString()}
                                  </td>
                                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                    <button
                                      className="btn-icon"
                                      onClick={() => deleteFinancialEntry(entry.id)}
                                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.7 }}
                                      title="Hapus Transaksi"
                                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                                    >
                                      <Trash2 size={13} className="text-danger" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View Stacked Cards */}
                      <div className="mobile-only-list" style={{ width: '100%' }}>
                        {filteredEntries.map(entry => {
                          const dateObj = new Date(entry.createdAt || entry.date);
                          const formattedDate = dateObj.toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short'
                          });
                          const formattedTime = dateObj.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          const isIncome = entry.type === 'income';

                          return (
                            <div 
                              key={entry.id} 
                              style={{
                                background: 'rgba(255, 255, 255, 0.01)',
                                border: '1px solid rgba(255, 255, 255, 0.03)',
                                borderRadius: '14px',
                                padding: '0.75rem 0.85rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.4rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                                <div style={{ 
                                  width: '30px', 
                                  height: '30px', 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  backgroundColor: isIncome ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', 
                                  color: isIncome ? 'var(--success)' : 'var(--danger)',
                                  flexShrink: 0
                                }}>
                                  {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                    {entry.description}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '2px' }}>
                                    <span style={{ padding: '0px 4px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.04)' }}>{entry.category}</span>
                                    <span>•</span>
                                    <span>{formattedDate} {formattedTime !== '00.00' && formattedTime !== '00:00' ? formattedTime : ''}</span>
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: isIncome ? 'var(--success)' : 'var(--danger)' }}>
                                  {isIncome ? '+' : '-'} Rp {entry.amount.toLocaleString()}
                                </span>
                                <button
                                  onClick={() => deleteFinancialEntry(entry.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                                  title="Hapus"
                                >
                                  <Trash2 size={13} className="text-danger" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 2: ANGGARAN & TARGET (BUDGETS & GOALS) */}
      {/* ========================================================================================= */}
      {activeTab === 'anggaran' && (
        <div className="tab-pane animate-fadeIn">
          <div className="dashboard-content-grid">
            
            {/* Left: Budget limits per Category */}
            <div className="dashboard-col flex-column gap-3">
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Batas Anggaran Kategori</h3>
                <p className="text-xs text-muted mb-4">Set batas maksimal belanja Anda per kategori. Progress bar akan berubah warna jika pengeluaran melampaui batas target.</p>
                
                {/* Form targets */}
                <form onSubmit={handleBudgetSubmit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <select 
                    className="input-field text-sm"
                    style={{ flex: 1, minWidth: '130px', height: '40px' }}
                    value={budgetCat}
                    onChange={(e) => setBudgetCat(e.target.value)}
                  >
                    {categories.expense.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="number"
                    className="input-field text-sm"
                    style={{ flex: 1.5, minWidth: '150px', height: '40px' }}
                    placeholder="Batas nominal bulanan..."
                    value={budgetVal}
                    onChange={(e) => setBudgetVal(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 1rem', height: '40px', borderRadius: '10px' }}>
                    Pasang
                  </button>
                </form>

                {/* List categories with budget vs spent */}
                <div className="flex-column gap-3">
                  {categories.expense.map(cat => {
                    const limit = financialBudgets[cat] || 0;
                    const spent = expenseByCategory.find(c => c.category === cat)?.amount || 0;
                    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                    
                    let barColor = 'var(--success)';
                    if (pct >= 100) barColor = 'var(--danger)';
                    else if (pct >= 75) barColor = 'var(--warning)';

                    return (
                      <div key={cat} className="flex-column gap-1" style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <div className="flex-between text-sm">
                          <span className="font-semibold">{cat}</span>
                          <span className="text-secondary font-medium">
                            Rp {spent.toLocaleString()} / <span style={{ color: limit > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{limit > 0 ? `Rp ${limit.toLocaleString()}` : 'Belum diset'}</span>
                          </span>
                        </div>
                        
                        {limit > 0 ? (
                          <>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden', marginTop: '2px' }}>
                              <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', backgroundColor: barColor, borderRadius: '10px', transition: 'width 0.4s ease' }} />
                            </div>
                            <div className="flex-between text-xs text-muted" style={{ marginTop: '2px' }}>
                              <span>Penggunaan: {pct}%</span>
                              <span>{pct >= 100 ? '⚠️ Overbudget!' : pct >= 75 ? '⚠️ Mendekati batas!' : '✅ Anggaran aman'}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-muted">Belum ada batas maksimal pengeluaran yang diatur.</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Saving goals tracker */}
            <div className="dashboard-col flex-column gap-3">
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Target Keuangan (Goals)</h3>
                <p className="text-xs text-muted mb-4">Lacak tabungan khusus Anda untuk liburan, dana darurat, atau pembelian barang idaman.</p>

                {/* Form saving goal */}
                <form onSubmit={handleGoalSubmit} className="flex-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="input-field text-sm"
                      style={{ flex: 1.5, minWidth: '150px' }}
                      placeholder="Nama target (misal: Laptop Baru)..."
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      className="input-field text-sm"
                      style={{ flex: 1, minWidth: '100px' }}
                      placeholder="Total target..."
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      className="input-field text-sm"
                      style={{ flex: 1, minWidth: '100px' }}
                      placeholder="Terkumpul saat ini..."
                      value={goalCurrent}
                      onChange={(e) => setGoalCurrent(e.target.value)}
                    />
                    <input
                      type="date"
                      className="input-field text-sm"
                      style={{ flex: 1, minWidth: '130px' }}
                      value={goalDeadline}
                      onChange={(e) => setGoalDeadline(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0 1.25rem', borderRadius: '10px', height: '42px', fontSize: '0.85rem', fontWeight: 600 }}>
                      Tambah
                    </button>
                  </div>
                </form>

                {/* List goals */}
                <div className="flex-column gap-3">
                  {financialGoals.length === 0 ? (
                    <div className="empty-box p-4 text-center">
                      <p className="text-muted text-sm">Belum ada target keuangan terdaftar.</p>
                    </div>
                  ) : (
                    financialGoals.map(g => {
                      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
                      return (
                        <div key={g.id} className="p-3" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                          <div className="flex-between">
                            <div>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{g.name}</h4>
                              <span className="text-xs text-muted">Jatuh tempo: {g.deadline}</span>
                            </div>
                            <button
                              className="btn-icon delete-card-btn"
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                              onClick={() => deleteFinancialGoal(g.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          
                          <div className="flex-between text-xs text-secondary mt-3">
                            <span>Terkumpul: Rp {g.current.toLocaleString()}</span>
                            <span>Target: Rp {g.target.toLocaleString()}</span>
                          </div>

                          <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden', marginTop: '4px' }}>
                            <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '10px' }} />
                          </div>

                          <div className="flex-between text-xs text-muted mt-2">
                            <span>Progres: {pct}%</span>
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                              <input 
                                type="number" 
                                className="input-field text-xs px-1 py-0" 
                                style={{ width: '90px', height: '22px', textAlign: 'center' }} 
                                placeholder="Ubah saldo..."
                                onBlur={(e) => {
                                  if (e.target.value !== '') {
                                    updateFinancialGoal(g.id, { current: Number(e.target.value) });
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 3: TAGIHAN & UTANG (BILLS & DEBTS) */}
      {/* ========================================================================================= */}
      {activeTab === 'tagihan' && (
        <div className="tab-pane animate-fadeIn">
          <div className="dashboard-content-grid">
            
            {/* Left: Recurring Bills */}
            <div className="dashboard-col flex-column gap-3">
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Tagihan Rutin (Recurring Bills)</h3>
                <p className="text-xs text-muted mb-4">Catat biaya langganan bulanan atau tagihan cicilan Anda untuk menghindari denda keterlambatan.</p>

                {/* Form bills */}
                <form onSubmit={handleBillSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="input-field text-sm"
                    style={{ flex: 1.5, minWidth: '150px' }}
                    placeholder="Nama tagihan (misal: WiFi)..."
                    value={billName}
                    onChange={(e) => setGoalName(e.target.value)} // reuse goalName state for convenience
                    required
                  />
                  <input
                    type="number"
                    className="input-field text-sm"
                    style={{ flex: 1, minWidth: '100px' }}
                    placeholder="Nominal..."
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    required
                  />
                  <input
                    type="date"
                    className="input-field text-sm"
                    style={{ flex: 1, minWidth: '130px' }}
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 1.25rem', borderRadius: '10px', height: '42px', fontSize: '0.85rem', fontWeight: 600 }}>
                    Tambah
                  </button>
                </form>

                {/* List bills */}
                <div className="flex-column gap-2">
                  {recurringBills.length === 0 ? (
                    <div className="empty-box p-4 text-center">
                      <p className="text-muted text-sm">Belum ada tagihan rutin terdaftar.</p>
                    </div>
                  ) : (
                    recurringBills.map(b => (
                      <div key={b.id} className="flex-between p-3" style={{ background: b.isPaid ? 'rgba(16,185,129,0.02)' : 'rgba(255, 255, 255, 0.01)', border: b.isPaid ? '1px solid rgba(16,185,129,0.1)' : '1px solid rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: b.isPaid ? 'var(--success)' : 'var(--text-secondary)' }}
                            onClick={() => updateRecurringBill(b.id, { isPaid: !b.isPaid })}
                          >
                            {b.isPaid ? <CheckCircle size={20} /> : <XCircle size={20} />}
                          </button>
                          <div className="flex-column" style={{ minWidth: 0 }}>
                            <span className="font-semibold text-sm" style={{ textDecoration: b.isPaid ? 'line-through' : 'none', color: b.isPaid ? 'var(--text-secondary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '130px' }}>{b.name}</span>
                            <span className="text-xs text-muted">Jatuh Tempo: {b.dueDate}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="font-bold text-sm" style={{ color: b.isPaid ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                            Rp {b.amount.toLocaleString()}
                          </span>
                          <button
                            className="btn-icon delete-card-btn"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            onClick={() => deleteRecurringBill(b.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Debts Tracker */}
            <div className="dashboard-col flex-column gap-3">
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Pelacak Utang & Piutang (Debts)</h3>
                <p className="text-xs text-muted mb-4">Pantau catatan uang yang Anda pinjam dari orang lain (Utang) atau uang yang Anda pinjamkan (Piutang).</p>

                {/* Form debts */}
                <form onSubmit={handleDebtSubmit} className="flex-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="input-field text-sm"
                      style={{ flex: 1.5, minWidth: '150px' }}
                      placeholder="Keterangan (misal: Pinjam Budi)..."
                      value={debtDesc}
                      onChange={(e) => setDebtDesc(e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      className="input-field text-sm"
                      style={{ flex: 1, minWidth: '100px' }}
                      placeholder="Nominal..."
                      value={debtAmount}
                      onChange={(e) => setDebtAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select 
                      className="input-field text-sm"
                      style={{ flex: 1, minWidth: '110px' }}
                      value={debtType}
                      onChange={(e) => setDebtType(e.target.value)}
                    >
                      <option value="owe">🔴 Utang Saya</option>
                      <option value="lend">🟢 Piutang (Lent)</option>
                    </select>
                    <input
                      type="date"
                      className="input-field text-sm"
                      style={{ flex: 1, minWidth: '130px' }}
                      value={debtDueDate}
                      onChange={(e) => setDebtDueDate(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0 1.25rem', borderRadius: '10px', height: '42px', fontSize: '0.85rem', fontWeight: 600 }}>
                      Tambah
                    </button>
                  </div>
                </form>

                {/* List debts */}
                <div className="flex-column gap-2">
                  {debts.length === 0 ? (
                    <div className="empty-box p-4 text-center">
                      <p className="text-muted text-sm">Belum ada catatan utang/piutang terdaftar.</p>
                    </div>
                  ) : (
                    debts.map(d => (
                      <div key={d.id} className="flex-between p-3" style={{ background: d.isResolved ? 'rgba(255,255,255,0.01)' : 'rgba(255, 255, 255, 0.02)', border: d.isResolved ? '1px solid rgba(255,255,255,0.03)' : d.type === 'owe' ? '1px solid rgba(244,63,94,0.1)' : '1px solid rgba(16,185,129,0.1)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: d.isResolved ? 'var(--success)' : 'var(--text-secondary)' }}
                            onClick={() => updateDebt(d.id, { isResolved: !d.isResolved })}
                          >
                            {d.isResolved ? <CheckCircle size={20} /> : <XCircle size={20} />}
                          </button>
                          <div className="flex-column" style={{ minWidth: 0 }}>
                            <span className="font-semibold text-sm" style={{ textDecoration: d.isResolved ? 'line-through' : 'none', color: d.isResolved ? 'var(--text-secondary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '130px' }}>
                              {d.type === 'owe' ? '🔴 Utang: ' : '🟢 Piutang: '} {d.description}
                            </span>
                            <span className="text-xs text-muted">Jatuh Tempo: {d.dueDate}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="font-bold text-sm" style={{ color: d.isResolved ? 'var(--text-secondary)' : d.type === 'owe' ? 'var(--danger)' : 'var(--success)' }}>
                            Rp {d.amount.toLocaleString()}
                          </span>
                          <button
                            className="btn-icon delete-card-btn"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            onClick={() => deleteDebt(d.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 4: AKUN & ASET (WALLETS & ASSETS) */}
      {/* ========================================================================================= */}
      {activeTab === 'akun' && (
        <div className="tab-pane animate-fadeIn">
          <div className="dashboard-content-grid">
            
            {/* Left: Account Wallets */}
            <div className="dashboard-col flex-column gap-3">
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Daftar Dompet / Akun Kas</h3>
                <p className="text-xs text-muted mb-4">Pisahkan alokasi kas riil Anda ke berbagai akun bank, e-wallet, uang tunai, atau instrumen investasi.</p>

                {/* Form wallets */}
                <form onSubmit={handleWalletSubmit} className="flex-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="input-field text-sm"
                      style={{ flex: 1.5, minWidth: '150px' }}
                      placeholder="Nama akun (misal: BCA, LinkAja)..."
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      className="input-field text-sm"
                      style={{ flex: 1, minWidth: '100px' }}
                      placeholder="Saldo kas..."
                      value={walletBalance}
                      onChange={(e) => setWalletBalance(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                      className="input-field text-sm"
                      style={{ flex: 1 }}
                      value={walletType}
                      onChange={(e) => setWalletType(e.target.value)}
                    >
                      <option value="bank">🏦 Rekening Bank</option>
                      <option value="e-wallet">📱 Dompet Digital (E-Wallet)</option>
                      <option value="cash">💵 Kas Tunai</option>
                      <option value="investment">📈 Investasi / Saham / Kripto</option>
                    </select>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0 1.25rem', borderRadius: '10px', height: '42px', fontSize: '0.85rem', fontWeight: 600 }}>
                      Tambah Akun
                    </button>
                  </div>
                </form>

                {/* List wallets */}
                <div className="flex-column gap-2">
                  {wallets.length === 0 ? (
                    <div className="empty-box p-4 text-center">
                      <p className="text-muted text-sm">Belum ada akun dompet terdaftar.</p>
                    </div>
                  ) : (
                    wallets.map(w => (
                      <div key={w.id} className="flex-between p-3" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: w.type === 'investment' ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)', color: w.type === 'investment' ? 'var(--accent)' : 'var(--primary)' }}>
                            {w.type === 'bank' ? '🏦' : w.type === 'e-wallet' ? '📱' : w.type === 'cash' ? '💵' : '📈'}
                          </div>
                          <div className="flex-column" style={{ minWidth: 0 }}>
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '130px' }}>{w.name}</span>
                            <span className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>{w.type}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            Rp {w.balance.toLocaleString()}
                          </span>
                          <button
                            className="btn-icon delete-card-btn"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            onClick={() => deleteWallet(w.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Asset Allocation Visualizer */}
            <div className="dashboard-col flex-column gap-3">
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Alokasi Aset</h3>
                <p className="text-xs text-muted mb-4">Rasio alokasi kekayaan cair (Liquid) dibanding instrumen investasi jangka panjang.</p>

                <div className="flex-column gap-4" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="flex-between text-sm font-semibold">
                      <span>Kas Cair (Liquid): Rp {assetAllocation.liquid.toLocaleString()} ({assetAllocation.liquidPct}%)</span>
                      <span>Investasi: Rp {assetAllocation.investment.toLocaleString()} ({assetAllocation.investmentPct}%)</span>
                    </div>

                    <div style={{ width: '100%', height: '18px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden', display: 'flex', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: `${assetAllocation.liquidPct}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.4s ease' }} />
                      <div style={{ width: `${assetAllocation.investmentPct}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  <div className="flex-column gap-2 text-xs text-muted" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <div className="flex-align gap-2">
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--primary)', display: 'inline-block' }} />
                      <span><strong>Kas Cair (Liquid)</strong>: Termasuk rekening tabungan bank, saldo dompet digital, dan uang tunai fisik. Aset ini mudah ditarik kapan saja.</span>
                    </div>
                    <div className="flex-align gap-2" style={{ marginTop: '0.4rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
                      <span><strong>Instrumen Investasi</strong>: Saham, reksadana, obligasi, emas, atau kripto yang ditujukan untuk pertumbuhan dana jangka panjang.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 5: EKSPOR & IMPOR */}
      {/* ========================================================================================= */}
      {activeTab === 'data' && (
        <div className="tab-pane animate-fadeIn">
          <div className="dashboard-content-grid">
            
            {/* Left: Export CSV */}
            <div className="dashboard-col flex-column gap-3">
              <div className="card" style={{ transform: 'none', height: '100%' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Ekspor Laporan Keuangan</h3>
                <p className="text-xs text-muted mb-4">Unduh seluruh catatan transaksi keuangan Anda dalam format file CSV (.csv) untuk pencatatan mandiri atau dibuka di Microsoft Excel.</p>
                
                <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '20px', gap: '1rem' }}>
                  <Download size={42} className="text-muted" style={{ color: 'var(--primary)' }} />
                  <div className="text-center">
                    <span className="font-semibold text-sm" style={{ display: 'block' }}>Format Berkas: Comma Separated Values (.csv)</span>
                    <span className="text-xs text-muted">Mencakup ID transaksi, Tanggal, Jenis, Kategori, Nominal, dan Deskripsi.</span>
                  </div>
                  <button className="btn btn-primary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600 }}>
                    <Download size={16} /> Mulai Ekspor CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Import mutasi bank */}
            <div className="dashboard-col flex-column gap-3">
              <div className="card" style={{ transform: 'none' }}>
                <h3 className="section-title mb-3" style={{ fontSize: '1.1rem' }}>Impor Mutasi Rekening</h3>
                <p className="text-xs text-muted mb-4">Tempel teks salinan mutasi bank Anda dari mobile banking/e-wallet. Parser qodirsAi akan memindai dan mencatatnya otomatis.</p>

                <div className="flex-column gap-3">
                  <textarea
                    className="input-field p-3 text-xs"
                    rows={8}
                    placeholder="Tempel catatan mutasi Anda di sini... Contoh:&#10;04/08/2026 Belanja Bulanan Rp 250.000&#10;05/08/2026 TRANSFER KREDIT GAJI Rp 5.000.000"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'monospace' }}
                  />
                  <button className="btn btn-primary w-full flex-align gap-2 justify-center" onClick={handleImportBankStatement} style={{ padding: '0.75rem', borderRadius: '12px', fontWeight: 600 }}>
                    <Upload size={16} /> Jalankan Parser Impor
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        .page-container {
          padding: 2rem 1.5rem;
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
        }
        @media (max-width: 768px) {
          .page-container {
            padding: 1rem 0.5rem !important;
          }
        }
        .desktop-only-table {
          display: block;
        }
        .mobile-only-list {
          display: none;
        }
        @media (max-width: 768px) {
          .desktop-only-table {
            display: none !important;
          }
          .mobile-only-list {
            display: flex !important;
            flex-direction: column;
            gap: 0.4rem;
          }
        }
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
        .table-row-hover:hover {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }
        .leaderboard-item {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
        }
        .leaderboard-item:hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.2) !important;
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
        .period-filter-pill {
          padding: 0.4rem 0.85rem;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .period-filter-pill:hover {
          border-color: var(--primary-light);
          color: var(--text-primary);
        }
        .period-filter-pill.active {
          background: var(--primary-light);
          color: var(--primary);
          border-color: var(--primary);
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
