import { describe, expect, it } from "vitest";
import {
  loadThemePreference,
  resolveThemePreference,
  saveThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme";

function memoryStorage(initial?: string): Pick<Storage, "getItem" | "setItem"> & {
  value: string | null;
} {
  return {
    value: initial ?? null,
    getItem(key: string) {
      return key === THEME_STORAGE_KEY ? this.value : null;
    },
    setItem(key: string, value: string) {
      if (key === THEME_STORAGE_KEY) {
        this.value = value;
      }
    },
  };
}

const throwingStorage: Pick<Storage, "getItem" | "setItem"> = {
  getItem() {
    throw new Error("storage unavailable");
  },
  setItem() {
    throw new Error("storage unavailable");
  },
};

describe("theme preference storage", () => {
  it("resolves empty storage to system", () => {
    expect(loadThemePreference(memoryStorage())).toBe("system");
  });

  it("resolves invalid storage to system", () => {
    expect(loadThemePreference(memoryStorage("unknown"))).toBe("system");
  });

  it.each<ThemePreference>(["system", "light", "dark"])("round-trips %s", (preference) => {
    const storage = memoryStorage();

    expect(saveThemePreference(preference, storage)).toBe(preference);
    expect(loadThemePreference(storage)).toBe(preference);
  });

  it("resolves system through the media query result", () => {
    expect(resolveThemePreference("system", false)).toBe("light");
    expect(resolveThemePreference("system", true)).toBe("dark");
    expect(resolveThemePreference("light", true)).toBe("light");
    expect(resolveThemePreference("dark", false)).toBe("dark");
  });

  it("does not throw when storage fails", () => {
    expect(loadThemePreference(throwingStorage)).toBe("system");
    expect(saveThemePreference("dark", throwingStorage)).toBe("dark");
  });
});
