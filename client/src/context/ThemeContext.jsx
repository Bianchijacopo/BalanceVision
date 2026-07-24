import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('bv-theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('bv-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggle() {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}