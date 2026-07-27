const STORAGE_KEY = 'bv_custom_categories';
const TRANS_CACHE_KEY = 'bv_cat_translations';

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
  // clean up translation cache
  try {
    const cache = JSON.parse(localStorage.getItem(TRANS_CACHE_KEY) || '{}');
    delete cache[name];
    localStorage.setItem(TRANS_CACHE_KEY, JSON.stringify(cache));
  } catch {}
  return true;
}

export function isDefaultCategory(name) {
  return DEFAULT_CATEGORIES.includes(name);
}

export function catName(cat, t) {
  // 1. try default translation keys
  const translated = t('categories.names.' + cat, null);
  if (translated !== null) return translated;
  // 2. try cached translation
  const cache = getTransCache();
  if (cache[cat]) return cache[cat];
  // 3. return original
  return cat;
}

function getTransCache() {
  try {
    return JSON.parse(localStorage.getItem(TRANS_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getUntranslatedCategories(cats, lang) {
  const cache = getTransCache();
  return cats.filter(c =>
    !isDefaultCategory(c) &&
    !cache[c] &&
    !c.startsWith('categories.names.')
  );
}

export async function fetchCategoryTranslation(name, token, lang) {
  const target = lang === 'en' ? 'English' : 'Italian';
  const source = lang === 'en' ? 'Italian' : 'English';
  try {
    const res = await fetch('http://localhost:3001/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ text: name, from: source, to: target }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const translation = json.translation;
    if (translation && translation !== name) {
      const cache = getTransCache();
      cache[name] = translation;
      try { localStorage.setItem(TRANS_CACHE_KEY, JSON.stringify(cache)); } catch {}
      return translation;
    }
    return null;
  } catch {
    return null;
  }
}