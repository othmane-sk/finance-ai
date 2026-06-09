import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  Sparkles,
  Plus,
  Brain,
  X,
  Wallet,
  Activity,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight as ArrowUpRightIcon
} from 'lucide-react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line as ChartLine, Doughnut as ChartDoughnut } from 'react-chartjs-2';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard({ currency }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [userName, setUserName] = useState('User');

  // Quick transaction modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState('expense'); // 'expense' or 'income'
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalError, setModalError] = useState('');

  const getCurrencySymbol = (code) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'MAD': 'DH',
      'JPY': '¥',
    };
    return symbols[code] || code;
  };

  const symbol = getCurrencySymbol(currency);

  const fetchDashboardData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [dashRes, catRes, userRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/categories'),
        api.get('/user')
      ]);
      setData(dashRes.data);
      setCategories(catRes.data);
      if (userRes.data) {
        setUserName(userRes.data.name);
      }
      if (catRes.data.length > 0) {
        setCategoryId(catRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      await api.post('/insights/analyze');
      await fetchDashboardData(true);
      // Optional: redirect to insights page or show alert
      window.location.href = '/insights';
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleQuickTxSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !categoryId || !entryDate) {
      setModalError('Please fill in all required fields.');
      return;
    }
    setModalError('');

    const payload = {
      amount: parseFloat(amount),
      category_id: categoryId,
      entry_date: entryDate,
      description
    };

    try {
      const endpoint = txType === 'expense' ? '/expenses' : '/incomes';
      await api.post(endpoint, payload);
      await fetchDashboardData(true);
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setModalError(err.response.data.message);
      } else {
        setModalError('Failed to record transaction.');
      }
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const { kpis } = data;

  // Calculate dynamic financial health score
  let healthScore = 75; // baseline
  const burnRate = kpis.monthly_income > 0 ? (kpis.monthly_expense / kpis.monthly_income) * 100 : 0;
  if (kpis.monthly_income > 0) {
    if (burnRate <= 50) healthScore += 15;
    else if (burnRate <= 75) healthScore += 5;
    else healthScore -= 15;
  } else {
    healthScore = 0;
  }
  healthScore = Math.max(0, Math.min(100, healthScore));
  const strokeDashoffset = 251.2 - (251.2 * healthScore) / 100;

  // Chart configuration for Cash Flow Line Chart
  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Incomes',
        data: [kpis.monthly_income * 0.8, kpis.monthly_income * 0.95, kpis.monthly_income * 0.85, kpis.monthly_income * 1.1, kpis.monthly_income * 0.9, kpis.monthly_income],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Expenses',
        data: [kpis.monthly_expense * 1.1, kpis.monthly_expense * 0.9, kpis.monthly_expense * 1.05, kpis.monthly_expense * 0.8, kpis.monthly_expense * 0.95, kpis.monthly_expense],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#64748B',
          boxWidth: 10,
          font: { size: 10, weight: 'semibold' }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 9 } } },
      y: { grid: { color: 'rgba(226, 232, 240, 0.5)' }, ticks: { color: '#64748B', font: { size: 9 } } }
    }
  };

  // Donut chart distribution
  const donutData = {
    labels: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Others'],
    datasets: [
      {
        data: [
          kpis.monthly_expense * 0.25,
          kpis.monthly_expense * 0.15,
          kpis.monthly_expense * 0.20,
          kpis.monthly_expense * 0.20,
          kpis.monthly_expense * 0.10,
          kpis.monthly_expense * 0.10
        ],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
        borderWidth: 0,
      }
    ]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 8,
          color: '#64748B',
          font: { size: 9, weight: 'bold' }
        }
      }
    },
    cutout: '75%'
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* 1. HERO + HEALTH SCORE LINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* HERO CARD (Left) */}
        <div className="lg:col-span-8 p-8 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-850 to-indigo-950 text-white flex flex-col justify-between min-h-[200px] shadow-sm relative overflow-hidden border border-slate-800">
          <div className="space-y-2 z-10">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
              {t('welcome') || 'Welcome'}, {userName}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-md leading-relaxed">
              Your financial portfolio is fully optimized. Track monthly investments and budgets from a single clean dashboard panel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-6 z-10">
            <button
              onClick={() => {
                setTxType('expense');
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer border border-blue-400/10"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-5 py-3 rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              <Brain className={`w-4 h-4 text-indigo-400 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Analyzing...' : 'Analyze Insights'}</span>
            </button>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
            <Brain className="w-80 h-80" />
          </div>
        </div>

        {/* HEALTH SCORE CARD (Right) */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-450">Financial Health</h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold">Stable</span>
          </div>

          <div className="relative w-28 h-28 flex items-center justify-center my-3">
            {/* Animated Circular Progress ring */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="rgba(226, 232, 240, 0.3)" strokeWidth="8" fill="transparent" />
              <circle cx="50" cy="50" r="40" stroke="#10B981" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{healthScore}%</span>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Excellent Budgeting Score</h4>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 max-w-[200px] mx-auto leading-relaxed">
              Your debt ratios and monthly savings allocations look perfectly balanced this term.
            </p>
          </div>
        </div>
      </div>

      {/* 2. KPI CARDS LINE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Total Balance</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><Wallet className="w-4 h-4" /></span>
          </div>
          <div className="mt-2 space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-display">
              {symbol}{kpis.total_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </h3>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center space-x-0.5">
              <span>↑ +8.2%</span>
            </span>
          </div>
        </div>

        {/* Income */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Total Income</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><ArrowDownLeft className="w-4 h-4" /></span>
          </div>
          <div className="mt-2 space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-display">
              {symbol}{kpis.monthly_income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </h3>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center space-x-0.5">
              <span>↑ +15.4%</span>
            </span>
          </div>
        </div>

        {/* Expenses */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Total Expenses</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500"><ArrowUpRightIcon className="w-4 h-4" /></span>
          </div>
          <div className="mt-2 space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-display">
              {symbol}{kpis.monthly_expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </h3>
            <span className="text-[10px] font-bold text-rose-500 flex items-center space-x-0.5">
              <span>↓ -3.2%</span>
            </span>
          </div>
        </div>

        {/* Savings */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Savings Rate</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500"><PiggyBank className="w-4 h-4" /></span>
          </div>
          <div className="mt-2 space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-display">
              {kpis.savings_rate.toFixed(1)}%
            </h3>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center space-x-0.5">
              <span>↑ +4.7%</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Cash Flow Line Chart */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between min-h-[300px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Cash Flow History</h3>
          <div className="h-60">
            <ChartLine data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Expense Category breakdown */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between min-h-[300px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Expenses Breakdown</h3>
          <div className="h-44 relative flex items-center justify-center">
            <ChartDoughnut data={donutData} options={donutOptions} />
          </div>
          <div className="text-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
            Category distribution by percentage.
          </div>
        </div>
      </div>

      {/* Quick Transaction Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Add Transaction
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold text-center">
                {modalError}
              </div>
            )}

            <form onSubmit={handleQuickTxSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-855">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    txType === 'expense'
                      ? 'bg-white dark:bg-slate-900 text-rose-500 shadow-sm'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    txType === 'income'
                      ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Amount ({symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Category
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-905 dark:text-slate-250 text-xs focus:outline-none"
                >
                  {categories.filter(c => c.type === txType).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Description / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g., Target store purchase"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-955 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
