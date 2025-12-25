const THEME_STORAGE_KEY = 'gt7-theme';
const themes = {
  LIGHT: 'light',
  DARK: 'dark'
};

function applyTheme(theme) {
  const body = document.body;
  if (!body) return;
  body.classList.remove('theme-light', 'theme-dark');
  const nextClass = theme === themes.LIGHT ? 'theme-light' : 'theme-dark';
  body.classList.add(nextClass);

  const button = document.getElementById('theme-toggle');
  const icon = button ? button.querySelector('.theme-toggle__icon') : null;
  const actionLabel = theme === themes.DARK ? 'Switch to light mode' : 'Switch to dark mode';
  if (button) {
    button.setAttribute('aria-label', actionLabel);
    button.setAttribute('aria-pressed', theme === themes.LIGHT ? 'true' : 'false');
  }
  if (icon) {
    icon.textContent = theme === themes.DARK ? '☀️' : '🌙';
  }
}

function initThemeToggle() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    storedTheme = null;
  }
  let currentTheme = storedTheme || (prefersDark ? themes.DARK : themes.LIGHT);
  applyTheme(currentTheme);

  button.addEventListener('click', () => {
    currentTheme = currentTheme === themes.DARK ? themes.LIGHT : themes.DARK;
    applyTheme(currentTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    } catch {
      /* ignore storage errors */
    }
  });
}

document.addEventListener('DOMContentLoaded', initThemeToggle);
