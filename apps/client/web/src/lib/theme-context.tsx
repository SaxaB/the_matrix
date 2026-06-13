"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_THEME,
  isDarkTheme,
  isThemeId,
  THEME_STORAGE_KEY,
  themeClass,
  THEMES,
  type ThemeId,
} from "./theme";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

const ALL_CLASSES = THEMES.map((t) => themeClass(t.id));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  // Lee lo que el script anti-flash ya aplicó (o localStorage).
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) setThemeState(stored);
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* almacenamiento no disponible: el tema dura la sesión */
    }
    const root = document.documentElement.classList;
    ALL_CLASSES.forEach((c) => root.remove(c));
    root.add(themeClass(id));
    if (isDarkTheme(id)) root.add("dark");
    else root.remove("dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
