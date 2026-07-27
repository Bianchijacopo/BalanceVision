const STORAGE_KEY = 'bv_custom_categories';

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

export function catName(cat, t) {
  return t('categories.names.' + cat, cat);
}