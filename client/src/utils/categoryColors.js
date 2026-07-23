const STORAGE_KEY = 'bv-category-colors';

const DEFAULT_COLORS = [
  '#00FF5A',
  '#3B82F6',
  '#A855F7',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#8B5CF6',
  '#10B981',
  '#6366F1'
];

const DEFAULT_MAP = {
  'Cibo': '#00FF5A',
  'Casa': '#3B82F6',
  'Trasporti': '#A855F7',
  'Salute': '#10B981',
  'Svago': '#F59E0B',
  'Abbigliamento': '#EC4899',
  'Bolle': '#06B6D4',
  'Stipendi': '#00FF5A',
  'Extra': '#6366F1',
  'Extra': '#8B5CF6'
};

export function getCategoryColors() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_MAP, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_MAP };
}

export function setCategoryColor(category, color) {
  const current = getCategoryColors();
  current[category] = color;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

export function getColorForCategory(category, colors) {
  return colors[category] || DEFAULT_COLORS[0];
}

export function getUnusedColor(colors) {
  const used = Object.values(colors);
  for (const c of DEFAULT_COLORS) {
    if (!used.includes(c)) return c;
  }
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
}

export { DEFAULT_COLORS, DEFAULT_MAP };