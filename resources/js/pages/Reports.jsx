import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import api from '../services/api';

export default function Reports({ currency }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('June 2026');

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

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const { kpis, recent_transactions } = data;

  return (
    <div className="space-y-6 print:p-0">
      {/* Header controls (hidden in print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">Financial Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate, view, and print standard audit reports.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none"
          >
            <option value="June 2026">June 2026 (Current)</option>
            <option value="May 2026">May 2026</option>
            <option value="April 2026">April 2026</option>
          </select>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Styled Printable Report Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Report Brand Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg font-black tracking-wider text-indigo-600 dark:text-white font-display">FINANCE AI ASSISTANT</span>
            </div>
            <p className="text-xs text-slate-400">Premium B2B Enterprise Audit Statement</p>
          </div>
          <div className="text-right text-xs text-slate-400 space-y-1">
            <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider">Statement Period</div>
            <div>{selectedMonth}</div>
            <div>Generated on {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Report Overview KPIs */}
        <div className="grid grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>Total Income</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {symbol}{kpis.monthly_income.toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">↑ +12% from last month</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Wallet className="w-3.5 h-3.5 text-rose-500" />
              <span>Total Expenses</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {symbol}{kpis.monthly_expense.toLocaleString()}
            </h3>
            <p className="text-[10px] text-rose-500 font-bold mt-1">↓ -4% reduction</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span>Net Savings</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {symbol}{(kpis.monthly_income - kpis.monthly_expense).toLocaleString()}
            </h3>
            <p className="text-[10px] text-blue-500 font-bold mt-1">Savings Rate: {kpis.savings_rate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Detailed Logs */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Recent Cashflow Entries</h3>
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Description</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850/80">
                {recent_transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 font-semibold">
                    <td className="py-3 px-5 uppercase text-[9px] tracking-wider font-bold">
                      {tx.type === 'expense' ? (
                        <span className="text-rose-500">Expense</span>
                      ) : (
                        <span className="text-emerald-500">Income</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-slate-900 dark:text-white">{tx.category?.name || 'Uncategorized'}</td>
                    <td className="py-3 px-5 text-slate-500">{tx.description || '-'}</td>
                    <td className="py-3 px-5 text-slate-400 font-normal">{tx.entry_date}</td>
                    <td className={`py-3 px-5 text-right font-bold ${tx.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{symbol}{parseFloat(tx.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report Footer */}
        <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 leading-relaxed max-w-md mx-auto">
          This document represents an authorized financial ledger transaction summary compiled dynamically for the user. Always reconcile reports with real bank statements.
        </div>
      </div>
    </div>
  );
}
