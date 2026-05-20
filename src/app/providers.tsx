import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { BrowserRouter } from "react-router-dom";
import type { ConvexReactClient } from "convex/react";
import { useThemePreference } from "../hooks/useThemePreference";

type ThemeContextValue = ReturnType<typeof useThemePreference>;

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error("useTheme must be used within AppProviders.");
  }

  return context;
}

type AppProvidersProps = {
  children: ReactNode;
  convexClient?: ConvexReactClient | null;
};

export function AppProviders({ children, convexClient }: AppProvidersProps) {
  const theme = useThemePreference();
  const app = (
    <ThemeContext.Provider value={theme}>
      <BrowserRouter>{children}</BrowserRouter>
    </ThemeContext.Provider>
  );

  if (!convexClient) {
    return app;
  }

  return <ConvexAuthProvider client={convexClient}>{app}</ConvexAuthProvider>;
}
