export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "germstack.theme.v1";

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

const VALID_THEME_PREFERENCES = new Set<ThemePreference>(["system", "light", "dark"]);

function defaultStorage(): ThemeStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && VALID_THEME_PREFERENCES.has(value as ThemePreference);
}

export function loadThemePreference(storage = defaultStorage()): ThemePreference {
  try {
    const storedPreference = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedPreference) ? storedPreference : "system";
  } catch {
    return "system";
  }
}

export function saveThemePreference(preference: ThemePreference, storage = defaultStorage()): ThemePreference {
  const normalizedPreference = isThemePreference(preference) ? preference : "system";

  try {
    storage?.setItem(THEME_STORAGE_KEY, normalizedPreference);
  } catch {
    // Theme persistence should never prevent the app from rendering.
  }

  return normalizedPreference;
}

export function resolveThemePreference(
  preference: ThemePreference,
  mediaQueryMatchesDark: boolean,
): ResolvedTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return mediaQueryMatchesDark ? "dark" : "light";
}
