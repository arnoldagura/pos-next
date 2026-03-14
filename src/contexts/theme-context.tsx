'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ColorScheme = 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink';

const SCHEME_CLASSES: ColorScheme[] = [
  'default',
  'blue',
  'green',
  'purple',
  'orange',
  'red',
  'pink',
];

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const dummyContext: ThemeContextType = {
  theme: 'system',
  colorScheme: 'default',
  setTheme: () => {
    throw new Error('setTheme called outside of ThemeProvider');
  },
  setColorScheme: () => {
    throw new Error('setColorScheme called outside of ThemeProvider');
  },
};

const ThemeContext = createContext<ThemeContextType>(dummyContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(getInitialColorScheme);

  function getInitialTheme(): Theme {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const savedTheme = localStorage.getItem('theme') as Theme | null;
    return savedTheme || 'light';
  }

  function getInitialColorScheme(): ColorScheme {
    if (typeof window === 'undefined') {
      return 'default';
    }

    const savedColorScheme = localStorage.getItem('colorScheme') as ColorScheme | null;
    return savedColorScheme || 'default';
  }

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

    const resolvedTheme = theme === 'system' ? systemTheme : theme;

    root.classList.add(resolvedTheme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;

    const classesToRemove = SCHEME_CLASSES.map((scheme) => `scheme-${scheme}`);
    root.classList.remove(...classesToRemove);

    root.classList.add(`scheme-${colorScheme}`);
    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  const contextValue: ThemeContextType = {
    theme,
    colorScheme,
    setTheme: setThemeState,
    setColorScheme: setColorSchemeState,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === dummyContext) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
