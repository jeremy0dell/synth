import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadThemePreference,
  resolveThemePreference,
  saveThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "../lib/theme";

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(COLOR_SCHEME_QUERY).matches;
}

function applyResolvedTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => loadThemePreference());
  const [systemMatchesDark, setSystemMatchesDark] = useState(systemPrefersDark);

  const resolvedTheme = useMemo(
    () => resolveThemePreference(preference, systemMatchesDark),
    [preference, systemMatchesDark],
  );

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
    const handleChange = () => setSystemMatchesDark(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY) {
        setPreferenceState(loadThemePreference());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(saveThemePreference(nextPreference));
  }, []);

  return {
    preference,
    resolvedTheme,
    setPreference,
  };
}
