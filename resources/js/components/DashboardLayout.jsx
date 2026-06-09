import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Chatbot from './Chatbot';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import {
  Home,
  LayoutGrid,
  Tag,
  Globe,
  PieChart,
  Settings,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  BarChart3,
  FileText,
  Brain
} from 'lucide-react';

export default function DashboardLayout({ user, onLogout, currency, theme: currentTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'USD');

  const menuItems = [
    { name: t('dashboard') || 'Dashboard', path: '/dashboard', icon: Home },
    { name: t('transactions') || 'Transactions', path: '/transactions', icon: LayoutGrid },
    { name: t('categories') || 'Categories', path: '/categories', icon: Tag },
    { name: t('budgets') || 'Budgets', path: '/budgets', icon: PieChart },
    { name: t('savings') || 'Savings Goals', path: '/savings', icon: Globe },
    { name: t('insights') || 'Financial Insights', path: '/insights', icon: Sparkles },
    { name: t('analytics') || 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: t('reports') || 'Reports', path: '/reports', icon: FileText },
    { name: t('chatbot') || 'AI Chatbot', path: '/chatbot', icon: Brain },
    { name: t('settings') || 'Settings', path: '/settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const item = menuItems.find(m => location.pathname.startsWith(m.path));
    return item ? item.name : 'Finance AI';
  };

  const handleCurrencyChange = async (e) => {
    const newCurr = e.target.value;
    setSelectedCurrency(newCurr);
    localStorage.setItem('finance_ai_currency', newCurr);
    
    try {
      await api.put('/settings', {
        theme: theme,
        currency: newCurr,
        email_notifications: true
      });
      window.location.reload();
    } catch (err) {
      console.error('Failed to update currency setting', err);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300 font-sans">
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-screen sticky top-0 flex-shrink-0 z-20">
        {/* Brand Header */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 space-x-2">
          <Logo className="w-6 h-6 text-indigo-600 dark:text-white" showText={false} />
          <span className="font-extrabold text-[11px] tracking-wider text-indigo-950 dark:text-white uppercase font-display">
            Finance AI Assistant
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer (Sign Out) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('sign_out')}</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Area (Topbar + Content) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Current Page Title */}
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-white">
            {getPageTitle()}
          </h2>

          {/* Right Area Controls */}
          <div className="flex items-center space-x-4">
            {/* Currency Selector */}
            <div className="relative flex items-center text-xs font-bold text-slate-700 dark:text-slate-300">
              <select
                value={selectedCurrency}
                onChange={handleCurrencyChange}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase focus:outline-none cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="MAD">MAD (DH)</option>
              </select>
            </div>

            {/* Language Selector */}
            <div className="relative group">
              <button
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-bold uppercase text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
              >
                {language === 'en' ? 'English' : language === 'fr' ? 'Français' : 'العربية'}
              </button>
              {/* Dropdown list overlay */}
              <div className="absolute right-0 top-full mt-1 w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 overflow-hidden text-xs">
                <button
                  onClick={() => setLanguage('en')}
                  className={`w-full py-2 px-3 text-left font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 block ${language === 'en' ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('fr')}
                  className={`w-full py-2 px-3 text-left font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 block ${language === 'fr' ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  Français
                </button>
                <button
                  onClick={() => setLanguage('ar')}
                  className={`w-full py-2 px-3 text-left font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 block ${language === 'ar' ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  العربية
                </button>
              </div>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* AI Chatbot Overlay Component */}
      <Chatbot />
    </div>
  );
}
