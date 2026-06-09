import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('finance_ai_language') || 'en';
  });

  const applyLanguage = (lang) => {
    const root = window.document.documentElement;
    root.setAttribute('lang', lang);
    if (lang === 'ar') {
      root.setAttribute('dir', 'rtl');
    } else {
      root.setAttribute('dir', 'ltr');
    }
  };

  const changeLanguage = async (newLang) => {
    setLanguageState(newLang);
    localStorage.setItem('finance_ai_language', newLang);
    applyLanguage(newLang);

    // Sync with backend if logged in
    const token = localStorage.getItem('finance_ai_token');
    if (token) {
      try {
        await api.put('/user/language', { language: newLang });
      } catch (err) {
        console.error('Failed to sync language settings with server', err);
      }
    }
  };

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
