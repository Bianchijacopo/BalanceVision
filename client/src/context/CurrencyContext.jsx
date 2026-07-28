import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const { token } = useAuth();
  const [currency, setCurrency] = useState('EUR');
  const [rate, setRate] = useState(1);
  const [supported, setSupported] = useState(['EUR']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:3001/api/settings/currency', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(r => r.json())
      .then(d => {
        setCurrency(d.currency || 'EUR');
        setSupported(d.supported || ['EUR']);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || currency === 'EUR') { setRate(1); return; }
    fetch('http://localhost:3001/api/settings/rate?to=' + currency, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(r => r.json())
      .then(d => setRate(d.rate || 1))
      .catch(() => setRate(1));
  }, [token, currency]);

  const changeCurrency = useCallback(async (newCurrency) => {
    const res = await fetch('http://localhost:3001/api/settings/currency', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ currency: newCurrency }),
    });
    const data = await res.json();
    if (res.ok) {
      setCurrency(data.currency);
      setRate(data.rate || 1);
    }
    return data;
  }, [token]);

  const fmt = useCallback((amount) => {
    const converted = amount * rate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  }, [currency, rate]);

  return (
    <CurrencyContext.Provider value={{ currency, rate, supported, loading, changeCurrency, fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
