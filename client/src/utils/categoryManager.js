import { apiUrl } from '../context/ApiContext';

const STORAGE_KEY = 'bv_custom_categories';
const TRANS_CACHE_KEY = 'bv_cat_trans_cache';

export const DEFAULT_CATEGORIES = [
  'Cibo', 'Casa', 'Trasporti', 'Salute', 'Svago',
  'Abbigliamento', 'Bolle', 'Stipendi', 'Extra',
];

export function getCustomCategories() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getAllCategories() {
  return [...DEFAULT_CATEGORIES, ...getCustomCategories()];
}

export function addCustomCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const all = getAllCategories();
  if (all.includes(trimmed)) return false;
  const cats = getCustomCategories();
  cats.push(trimmed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
  return true;
}

export function removeCustomCategory(name) {
  if (DEFAULT_CATEGORIES.includes(name)) return false;
  const cats = getCustomCategories().filter(c => c !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
  return true;
}

export function isDefaultCategory(name) {
  return DEFAULT_CATEGORIES.includes(name);
}

export function catName(cat, t, lang) {
  const translated = t('categories.names.' + cat, null);
  if (translated !== null) return translated;
  const cache = getTransCache();
  const cachedLang = cache._lang;
  const curLang = lang || 'it';
  if (cache[cat] && cachedLang === curLang) return cache[cat];
  return cat;
}

function getTransCache() {
  try {
    return JSON.parse(localStorage.getItem(TRANS_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setTransCache(cache) {
  localStorage.setItem(TRANS_CACHE_KEY, JSON.stringify(cache));
}

export function getUntranslatedCategories(lang) {
  const all = getCustomCategories();
  const cache = getTransCache();
  if (cache._lang !== lang) {
    setTransCache({ _lang: lang });
    return all;
  }
  return all.filter(c => !cache[c]);
}

export async function fetchCategoryTranslation(text, from, to, token) {
  try {
    const res = await fetch(apiUrl('/translate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ text, from, to }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const translation = data.translation || text;
    const cache = getTransCache();
    cache[text] = translation;
    cache._lang = to;
    setTransCache(cache);
    return translation;
  } catch {
    return text;
  }
}