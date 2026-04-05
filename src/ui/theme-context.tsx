import React, { createContext, useContext } from "react";
import type { UiTheme } from "./theme.js";

const ThemeContext = createContext<UiTheme | null>(null);

interface ThemeProviderProps {
  theme: UiTheme;
  children: React.ReactNode;
}

/**
 * UI-layer theme provider. Bootstrap resolves the theme config; components
 * consume it through this context without prop drilling.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

/**
 * Stable hook for reading the current UI theme inside Ink components.
 */
export function useTheme() {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return theme;
}
