import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Get initial theme from localStorage or fallback to dark
    return localStorage.getItem('finance_ai_theme') || 'dark';
  });

  const applyTheme = (themeName) => {
    const root = window.document.documentElement;
    if (themeName === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('finance_ai_theme', newTheme);
    applyTheme(newTheme);

    // Sync theme settings with backend if logged in
    const token = localStorage.getItem('finance_ai_token');
    if (token) {
      try {
        await api.put('/settings', {
          theme: newTheme,
          currency: localStorage.getItem('finance_ai_currency') || 'USD',
          email_notifications: true
        });
      } catch (err) {
        console.error('Failed to sync theme settings with server', err);
      }
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

