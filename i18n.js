const SUPPORTED_LOCALES = ['en', 'nl'];
const DEFAULT_LOCALE = 'en';
const LOCALE_STORAGE_KEY = 'gt7-language';
const LANGUAGE_TOGGLE_ID = 'language-toggle';
const LANGUAGE_FLAGS = {
  en: '🇺🇸',
  nl: '🇳🇱'
};

let currentLocale = DEFAULT_LOCALE;
let translations = {};
let fallbackTranslations = {};
let pluralRules = new Intl.PluralRules(DEFAULT_LOCALE);

function cacheBustedUrl(url) {
  const stamp = Math.floor(Date.now() / 60000);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${stamp}`;
}

function normalizeLocale(locale) {
  if (!locale) return DEFAULT_LOCALE;
  const value = locale.toLowerCase();
  if (value.startsWith('nl')) return 'nl';
  return DEFAULT_LOCALE;
}

function getStoredLocale() {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredLocale(locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore storage errors */
  }
}

function getBrowserLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const candidate = navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;
  return normalizeLocale(candidate);
}

function resolveKey(source, key) {
  if (!source || !key) return undefined;
  const parts = key.split('.');
  let value = source;
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !(part in value)) return undefined;
    value = value[part];
  }
  return value;
}

function interpolate(value, vars = {}) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name]);
    }
    return match;
  });
}

function t(key, vars = {}) {
  const raw = resolveKey(translations, key) ?? resolveKey(fallbackTranslations, key) ?? key;
  return interpolate(raw, vars);
}

function get(key) {
  return resolveKey(translations, key) ?? resolveKey(fallbackTranslations, key);
}

function tPlural(keyBase, count, vars = {}) {
  const form = pluralRules.select(count);
  return t(`${keyBase}.${form}`, { ...vars, count });
}

function formatDate(dateStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!dateStr) return t('dates.tbc');
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat(currentLocale, options).format(date);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return value;
  return new Intl.NumberFormat(currentLocale).format(value);
}

async function loadTranslations(locale) {
  const url = cacheBustedUrl(`data/i18n/${locale}.json`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${response.url}`);
  }
  return response.json();
}

function applyTranslations() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = currentLocale;

  const nodes = document.querySelectorAll('[data-i18n]');
  nodes.forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (!key) return;
    const htmlMode = node.hasAttribute('data-i18n-html');
    if (htmlMode) {
      node.innerHTML = t(key);
    } else {
      node.textContent = t(key);
    }
  });

  const attrNodes = document.querySelectorAll('[data-i18n-attr]');
  attrNodes.forEach((node) => {
    const attr = node.getAttribute('data-i18n-attr');
    const key = node.getAttribute('data-i18n-attr-key') || node.getAttribute('data-i18n');
    if (!attr || !key) return;
    node.setAttribute(attr, t(key));
  });

  const placeholderNodes = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderNodes.forEach((node) => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (!key) return;
    node.setAttribute('placeholder', t(key));
  });
}

function getLanguageName(locale) {
  return t(`language.${locale}`) || locale;
}

function updateLanguageSwitcher() {
  const toggle = document.getElementById(LANGUAGE_TOGGLE_ID);
  if (!toggle) return;
  const flag = toggle.querySelector('.hero__language-flag');
  const label = toggle.querySelector('.hero__language-label');
  if (flag) {
    flag.textContent = LANGUAGE_FLAGS[currentLocale] || '🌐';
  }
  const languageName = getLanguageName(currentLocale);
  if (label) {
    label.textContent = languageName;
  }
  const controlsLabel = t('controls.languageSelect');
  toggle.setAttribute('aria-label', `${controlsLabel} · ${languageName}`);
  toggle.setAttribute('title', languageName);
  toggle.setAttribute('data-language', currentLocale);
}

function initLanguageSwitcher() {
  const toggle = document.getElementById(LANGUAGE_TOGGLE_ID);
  if (!toggle) return;
  if (!toggle.dataset.languageListener) {
    toggle.addEventListener('click', () => {
      const nextLocale = currentLocale === 'en' ? 'nl' : 'en';
      setLocale(nextLocale);
    });
    toggle.dataset.languageListener = '1';
  }
  updateLanguageSwitcher();
}

async function setLocale(locale, { persist = true } = {}) {
  const normalized = SUPPORTED_LOCALES.includes(locale) ? locale : normalizeLocale(locale);
  if (normalized === currentLocale && Object.keys(translations).length) {
    applyTranslations();
    initLanguageSwitcher();
    return;
  }
  currentLocale = normalized;
  pluralRules = new Intl.PluralRules(currentLocale);
  translations = await loadTranslations(currentLocale);
  if (currentLocale !== DEFAULT_LOCALE) {
    fallbackTranslations = await loadTranslations(DEFAULT_LOCALE);
  } else {
    fallbackTranslations = translations;
  }
  if (persist) setStoredLocale(currentLocale);
  const apply = () => {
    applyTranslations();
    initLanguageSwitcher();
    document.dispatchEvent(new CustomEvent('i18n:change', { detail: { locale: currentLocale } }));
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
}

const readyPromise = (async () => {
  const stored = getStoredLocale();
  const initial = normalizeLocale(stored || getBrowserLocale());
  await setLocale(initial, { persist: false });
  return currentLocale;
})();

window.I18n = {
  get,
  t,
  tPlural,
  formatDate,
  formatNumber,
  setLocale,
  getLocale: () => currentLocale,
  whenReady: () => readyPromise
};
