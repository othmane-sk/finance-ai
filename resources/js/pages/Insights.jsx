import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, Lightbulb, Trash2, Eye } from 'lucide-react';
import api from '../services/api';

export default function Insights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get('/insights');
      setInsights(res.data);
    } catch (err) {
      setError('Failed to load financial insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError('');
      const res = await api.post('/insights/refresh');
      setInsights(res.data);
    } catch (err) {
      setError('Failed to refresh financial recommendations.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/insights/${id}/read`);
      setInsights(insights.map(i => i.id === id ? { ...i, read_at: new Date().toISOString() } : i));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/insights/${id}`);
      setInsights(insights.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success':
        return <Lightbulb className="w-5 h-5 text-emerald-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-display">AI Financial Insights</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Automated financial advice generated based on your logs.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/15 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Regenerating...' : 'Refresh Insights'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      {insights.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">No AI Insights Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Add some expenses, incomes, or budget targets and click refresh!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => {
            const isRead = insight.read_at !== null;
            return (
              <div
                key={insight.id}
                className={`p-5 rounded-3xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                  isRead
                    ? 'bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 opacity-85'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center flex-shrink-0">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{insight.title}</h4>
                      {!isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">{insight.content}</p>
                    <p className="text-[9px] text-slate-400">
                      Generated {new Date(insight.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 sm:self-center flex-shrink-0 self-end">
                  {!isRead && (
                    <button
                      onClick={() => handleMarkRead(insight.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                      title="Mark as Read"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(insight.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
