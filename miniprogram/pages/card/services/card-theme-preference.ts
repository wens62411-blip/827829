export type CardTheme = 'ivory' | 'ink' | 'champagne' | 'stone';

const CARD_THEME_STORAGE_KEY = 'ab.club.card.theme.v1';
const CARD_THEMES = new Set<CardTheme>(['ivory', 'ink', 'champagne', 'stone']);

export function normalizeCardTheme(value: unknown, fallback: CardTheme = 'ivory'): CardTheme {
  return typeof value === 'string' && CARD_THEMES.has(value as CardTheme)
    ? value as CardTheme
    : fallback;
}

export function readCardThemePreference(fallback: CardTheme = 'ivory'): CardTheme {
  try {
    return normalizeCardTheme(wx.getStorageSync(CARD_THEME_STORAGE_KEY), fallback);
  } catch (_error) {
    return fallback;
  }
}

export function writeCardThemePreference(theme: CardTheme): boolean {
  try {
    wx.setStorageSync(CARD_THEME_STORAGE_KEY, normalizeCardTheme(theme));
    return true;
  } catch (_error) {
    return false;
  }
}

