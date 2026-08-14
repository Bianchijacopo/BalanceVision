import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

function getAutoTheme() {
  const hour = new Date().getHours();
  return (hour >= 7 && hour < 20) ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('bv-theme-mode') || 'dark');

  const resolvedTheme = mode === 'auto' ? getAutoTheme() : mode;

  useEffect(() => {
    localStorage.setItem('bv-theme-mode', mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (mode !== 'auto') return;
    const interval = setInterval(() => {
      const next = getAutoTheme();
      document.documentElement.setAttribute('data-theme', next);
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'auto';
      return 'dark';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}