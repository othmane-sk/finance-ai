import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  X,
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar
} from 'lucide-react';
import api from '../services/api';

export default function Transactions({ currency }) {
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' or 'income'
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Modals / Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

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

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'expense' ? '/expenses' : '/incomes';
      
      const params = {
        page,
        search: search || undefined,
        category_id: categoryId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      const res = await api.get(endpoint, { params });
      setTransactions(res.data.data);
      setPagination({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
      });
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [activeTab, search, categoryId, startDate, endDate]);

  const handleOpenCreateModal = () => {
    setIsEdit(false);
    setEditId(null);
    setAmount('');
    setDescription('');
    
    const activeCats = categories.filter(c => c.type === activeTab);
    setSelectedCategoryId(activeCats.length > 0 ? activeCats[0].id : '');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx) => {
    setIsEdit(true);
    setEditId(tx.id);
    setAmount(tx.amount);
    setDescription(tx.description || '');
    setSelectedCategoryId(tx.category_id || '');
    setEntryDate(tx.entry_date);
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    try {
      const endpoint = activeTab === 'expense' ? `/expenses/${id}` : `/incomes/${id}`;
      await api.delete(endpoint);
      fetchTransactions(pagination.current_page);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !selectedCategoryId || !entryDate) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');

    const payload = {
      amount: parseFloat(amount),
      category_id: selectedCategoryId,
      entry_date: entryDate,
      description,
    };

    try {
      const endpointBase = activeTab === 'expense' ? '/expenses' : '/incomes';
      if (isEdit) {
        await api.put(`${endpointBase}/${editId}`, payload);
      } else {
        await api.post(endpointBase, payload);
      }
      fetchTransactions(pagination.current_page);
      setIsModalOpen(false);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to save log. Please try again.');
      }
    }
  };

  const filteredCategoriesForDropdown = categories.filter(c => c.type === activeTab);
  const { t } = useLanguage ? useLanguage() : { t: (k) => k };

  return (
    <div className="space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-display text-slate-900 dark:text-white">Transaction Logs</h1>
          <p className="text-xs text-slate-700 dark:text-slate-350">Record and structure cashflow items.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Tab selector */}
          <div className="flex bg-slate-200/50 dark:bg-slate-905 border border-slate-200/60 dark:border-slate-800 p-1 rounded-2xl w-full sm:w-48">
            <button
              onClick={() => { setActiveTab('expense'); setCategoryId(''); }}
              className={`flex-1 py-2 text-center text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'expense'
                  ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t('add_expense') || 'Expenses'}
            </button>
            <button
              onClick={() => { setActiveTab('income'); setCategoryId(''); }}
              className={`flex-1 py-2 text-center text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'income'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t('add_income') || 'Incomes'}
            </button>
          </div>
          
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/15 whitespace-nowrap transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'expense' ? (t('add_expense') || 'Add Expense') : (t('add_income') || 'Add Income')}</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 text-slate-900 dark:text-white text-xs placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs focus:outline-none"
        >
          <option value="">All Categories</option>
          {filteredCategoriesForDropdown.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Date fields */}
        <input
          type="date"
          placeholder="Start Date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
        />
        <input
          type="date"
          placeholder="End Date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
        />
      </div>

      {/* Grid listing */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center">
                    <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-500 dark:text-slate-400">
                    No transactions found matching the filter options.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all font-semibold">
                    <td className="py-4 px-6 flex items-center space-x-2.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tx.category?.color || '#cbd5e1' }} />
                      <span className="text-slate-900 dark:text-white">{tx.category?.name || 'Uncategorized'}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-800 dark:text-slate-200">{tx.description || '-'}</td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-350 font-normal">{tx.entry_date}</td>
                    <td className={`py-4 px-6 text-right font-bold ${activeTab === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {activeTab === 'expense' ? '-' : '+'}{symbol}{parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(tx)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-200"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {pagination.last_page > 1 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-700 dark:text-slate-300">
              Page {pagination.current_page} of {pagination.last_page}
            </span>
            <div className="flex space-x-2">
              <button
                disabled={pagination.current_page === 1 || loading}
                onClick={() => fetchTransactions(pagination.current_page - 1)}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.current_page === pagination.last_page || loading}
                onClick={() => fetchTransactions(pagination.current_page + 1)}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {isEdit ? 'Edit Log Entry' : 'New Log Entry'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Amount Limit ({symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Category
                </label>
                <select
                  required
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs focus:outline-none"
                >
                  {filteredCategoriesForDropdown.map((c) => (
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
                  Transaction Date
                </label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-all"
                >
                  {isEdit ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
