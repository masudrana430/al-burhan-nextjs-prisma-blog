'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'sepia' | 'dark' | 'system';

const themes: Theme[] = ['light', 'sepia', 'dark', 'system'];
const labels: Record<Theme, string> = {
  light: 'Light',
  sepia: 'Sepia',
  dark: 'Dark',
  system: 'System',
};

export function ArticleThemeShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('al_burhan_theme');
      if (saved && themes.includes(saved as Theme)) setTheme(saved as Theme);
    } catch {
      // Keep the accessible light default when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('al_burhan_theme', theme);
    } catch {
      // The selected theme still applies for this page session.
    }
  }, [theme]);

  const activeTheme = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  function cycleTheme() {
    setTheme((current) => themes[(themes.indexOf(current) + 1) % themes.length]);
  }

  return (
    <div className={`article-page theme-${activeTheme}`} data-theme-choice={theme}>
      <div className="article-theme-bar">
        <button type="button" onClick={cycleTheme} className="article-theme-toggle"
          aria-label={`Current theme: ${labels[theme]}. Change reading theme`}
          title="Light → Sepia → Dark → System">
          <span aria-hidden="true">{theme === 'dark' ? '☾' : theme === 'sepia' ? '▤' : theme === 'system' ? '◐' : '☼'}</span>
          <span>{labels[theme]}</span>
          <span className="article-theme-caret" aria-hidden="true">⌄</span>
        </button>
      </div>
      {children}
    </div>
  );
}
