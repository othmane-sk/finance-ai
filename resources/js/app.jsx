import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Expenses from './pages/Expenses';
import Incomes from './pages/Incomes';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import SavingsGoals from './pages/SavingsGoals';
import Analytics from './pages/Analytics';
import Insights from './pages/Insights';
import Reports from './pages/Reports';
import ChatbotPage from './pages/ChatbotPage';
import Settings from './pages/Settings';
import DashboardLayout from './components/DashboardLayout';
import AuthLayout from './components/AuthLayout';
import api from './services/api';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Logo from './components/Logo';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('finance_ai_intro_shown');
  });
  const [currency, setCurrency] = useState('USD');
  const { theme, setTheme } = useTheme();

  // Fetch current user and settings
  useEffect(() => {
    const token = localStorage.getItem('finance_ai_token');
    if (token) {
      api.get('/user')
        .then((res) => {
          setUser(res.data);
          const userTheme = res.data.setting?.theme || 'dark';
          const userCurrency = res.data.setting?.currency || 'USD';
          localStorage.setItem('finance_ai_theme', userTheme);
          localStorage.setItem('finance_ai_currency', userCurrency);
          setTheme(userTheme);
          setCurrency(userCurrency);
        })
        .catch(() => {
          localStorage.removeItem('finance_ai_token');
          localStorage.removeItem('finance_ai_user');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // Modern Intro timer
    if (!sessionStorage.getItem('finance_ai_intro_shown')) {
      const introTimer = setTimeout(() => {
        setShowIntro(false);
        sessionStorage.setItem('finance_ai_intro_shown', 'true');
      }, 2200);
      return () => clearTimeout(introTimer);
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('finance_ai_token', token);
    localStorage.setItem('finance_ai_user', JSON.stringify(userData));
    setUser(userData);
    const userTheme = userData.setting?.theme || 'dark';
    const userCurrency = userData.setting?.currency || 'USD';
    localStorage.setItem('finance_ai_theme', userTheme);
    localStorage.setItem('finance_ai_currency', userCurrency);
    setTheme(userTheme);
    setCurrency(userCurrency);
  };

  const handleLogout = () => {
    api.post('/logout')
      .catch(() => {})
      .finally(() => {
        localStorage.removeItem('finance_ai_token');
        localStorage.removeItem('finance_ai_user');
        setUser(null);
      });
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    if (updatedUser.setting) {
      localStorage.setItem('finance_ai_theme', updatedUser.setting.theme);
      localStorage.setItem('finance_ai_currency', updatedUser.setting.currency);
      setTheme(updatedUser.setting.theme);
      setCurrency(updatedUser.setting.currency);
    }
  };

  // 1. Intro Animation View
  if (showIntro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white select-none">
        <div className="relative flex flex-col items-center space-y-6 animate-scale-up text-center px-4 max-w-md">
          {/* Logo Finance AI */}
          <Logo className="w-16 h-16 animate-pulse" />
          
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
              Personal Finance AI Assistant
            </h1>
            <p className="text-slate-400 text-xs font-semibold max-w-xs mx-auto leading-relaxed">
              AI-powered financial insights and smart budgeting
            </p>
          </div>

          {/* Progress Loader */}
          <div className="w-40 h-1 bg-slate-800 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-blue-600 rounded-full animate-[loading-bar_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fetch User loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="relative w-12 h-12">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500/10 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const ProtectedRoute = ({ children }) => {
    return user ? children : <Navigate to="/login" replace />;
  };

  const PublicRoute = ({ children }) => {
    return !user ? children : <Navigate to="/dashboard" replace />;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={
          <PublicRoute>
            <AuthLayout>
              <Login onLogin={handleLogin} />
            </AuthLayout>
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <AuthLayout>
              <Register onLogin={handleLogin} />
            </AuthLayout>
          </PublicRoute>
        } />

        {/* Protected app routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={handleLogout} currency={currency} theme={theme} />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard currency={currency} />} />
          <Route path="transactions" element={<Transactions currency={currency} />} />
          <Route path="expenses" element={<Expenses currency={currency} />} />
          <Route path="incomes" element={<Incomes currency={currency} />} />
          <Route path="categories" element={<Categories />} />
          <Route path="budgets" element={<Budgets currency={currency} />} />
          <Route path="savings" element={<SavingsGoals currency={currency} />} />
          <Route path="analytics" element={<Analytics currency={currency} />} />
          <Route path="insights" element={<Insights currency={currency} />} />
          <Route path="reports" element={<Reports currency={currency} />} />
          <Route path="chatbot" element={<ChatbotPage />} />
          <Route path="settings" element={<Settings user={user} onUpdateUser={handleUpdateUser} />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
