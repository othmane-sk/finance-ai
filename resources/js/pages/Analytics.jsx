import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line as ChartLine, Doughnut as ChartDoughnut } from 'react-chartjs-2';
import { DollarSign, Wallet, TrendingUp, Sparkles } from 'lucide-react';
import api from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics({ currency }) {
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [dashRes, chartsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/charts')
      ]);
      setKpis(dashRes.data.kpis);
      setChartData(chartsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !kpis || !chartData) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Setup Trend Chart
  const trendData = {
    labels: chartData.monthly_trends.map(t => t.month),
    datasets: [
      {
        label: 'Income',
        data: chartData.monthly_trends.map(t => t.income),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Expenses',
        data: chartData.monthly_trends.map(t => t.expense),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#64748B',
          font: { weight: 'bold', size: 10 }
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 9 } } },
      y: { ticks: { color: '#64748B', font: { size: 9 } } }
    }
  };

  // Setup Expense Distribution Chart
  const hasExpenses = chartData.expense_distribution.length > 0;
  const expenseData = {
    labels: hasExpenses ? chartData.expense_distribution.map(d => d.name) : ['No Expenses'],
    datasets: [
      {
        data: hasExpenses ? chartData.expense_distribution.map(d => d.total) : [1],
        backgroundColor: hasExpenses ? chartData.expense_distribution.map(d => d.color || '#3B82F6') : ['#E2E8F0'],
        borderWidth: 0,
      }
    ]
  };

  const expenseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#64748B',
          font: { weight: 'semibold', size: 10 }
        }
      }
    },
    cutout: '70%'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Monthly Income</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {symbol}{kpis.monthly_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/10">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Monthly Expenses</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {symbol}{kpis.monthly_expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/10">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Net Monthly Savings</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {symbol}{kpis.monthly_savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend comparison */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Monthly Cashflow Trends</h3>
          <div className="h-80">
            <ChartLine data={trendData} options={trendOptions} />
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Expense Breakdown</h3>
            <p className="text-[10px] text-slate-400">Current month distribution by category.</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            <ChartDoughnut data={expenseData} options={expenseOptions} />
          </div>
          <div className="pt-2 text-center text-xs font-semibold text-slate-500">
            {hasExpenses ? 'Optimized categories distribution' : 'No expenses logged this month.'}
          </div>
        </div>
      </div>
    </div>
  );
}