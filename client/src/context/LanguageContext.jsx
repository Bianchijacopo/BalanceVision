import { createContext, useContext, useState, useEffect } from 'react';
import it from '../i18n/it';
import en from '../i18n/en';

const LANG_KEY = 'bv-lang';
const LANGUAGES = { it, en };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(LANG_KEY) || 'it'; } catch { return 'it'; }
  });

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
  }, [lang]);

  const t = (path, fallback) => {
    const keys = path.split('.');
    let val = LANGUAGES[lang];
    for (const k of keys) {
      if (val && typeof val === 'object') val = val[k];
      else return fallback !== undefined ? fallback : path;
    }
    return typeof val === 'string' ? val : (fallback !== undefined ? fallback : path);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
