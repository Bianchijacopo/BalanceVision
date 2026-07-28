const API = 'https://api.frankfurter.app';
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 3600000;

export async function getRates() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;
  try {
    const res = await fetch(`${API}/latest?from=EUR`);
    if (!res.ok) throw new Error('Failed to fetch rates');
    const data = await res.json();
    cache = data.rates;
    cacheTime = Date.now();
    return cache;
  } catch (e) {
    if (cache) return cache;
    throw e;
  }
}

export async function getHistoricalRate(from, to, date) {
  try {
    const res = await fetch(`${API}/${date}?from=${from}&to=${to}`);
    if (!res.ok) throw new Error('Failed to fetch historical rate');
    const data = await res.json();
    return data.rates[to];
  } catch {
    return null;
  }
}

const tickerPrev = {};

export async function getTicker(from, to) {
  const res = await fetch(`${API}/latest?from=${from}&to=${to}`);
  if (!res.ok) throw new Error('Failed to fetch ticker rate');
  const data = await res.json();
  const currentRate = data.rates[to];

  const key = `${from}_${to}`;
  const prevRate = tickerPrev[key] != null ? tickerPrev[key] : null;
  tickerPrev[key] = currentRate;

  const change = prevRate != null ? currentRate - prevRate : 0;
  const changePct = prevRate != null && prevRate !== 0 ? (change / prevRate) * 100 : 0;

  return { rate: currentRate, change, changePct, prevRate };
}

export async function convert(amount, from, to) {
  if (from === to) return amount;
  const rates = await getRates();
  if (from === 'EUR') return amount * (rates[to] || 1);
  if (to === 'EUR') return amount / (rates[from] || 1);
  const inEur = amount / (rates[from] || 1);
  return inEur * (rates[to] || 1);
}

export async function getRate(from, to) {
  if (from === to) return 1;
  const rates = await getRates();
  if (from === 'EUR') return rates[to] || 1;
  if (to === 'EUR') return 1 / (rates[from] || 1);
  return rates[to] / rates[from] || 1;
}

export const SUPPORTED = [
  'EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'CNY', 'INR', 'BRL',
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'ILS', 'ZAR', 'MXN',
  'SGD', 'HKD', 'KRW', 'NZD', 'THB', 'MYR', 'PHP', 'IDR', 'RON', 'BGN',
];

export function formatAmount(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
