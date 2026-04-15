import { createContext, useContext, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => setIsDark(prev => !prev);

  const theme = {
    isDark,
    toggleTheme,

    // Backgrounds
    pageBg: isDark
      ? "radial-gradient(ellipse at 20% 50%, #0d1f3c 0%, #050d1a 60%, #020810 100%)"
      : "radial-gradient(ellipse at 20% 50%, #dce8f8 0%, #eef4fc 60%, #f5f8ff 100%)",

    headerBg: isDark
      ? "linear-gradient(180deg, rgba(10,20,45,0.98) 0%, rgba(8,16,36,0.95) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,247,255,0.95) 100%)",

    headerBorder: isDark
      ? "1px solid rgba(100,150,255,0.15)"
      : "1px solid rgba(0,80,200,0.12)",

    tableBg: isDark
      ? "rgba(10,20,45,0.7)"
      : "rgba(255,255,255,0.85)",

    tableBorder: isDark
      ? "1px solid rgba(100,150,255,0.1)"
      : "1px solid rgba(0,80,200,0.1)",

    tableHeaderBg: isDark
      ? "rgba(255,255,255,0.02)"
      : "rgba(0,60,160,0.04)",

    tableHeaderColor: isDark
      ? "rgba(150,190,255,0.5)"
      : "rgba(0,60,160,0.45)",

    rowBorder: isDark
      ? "1px solid rgba(255,255,255,0.06)"
      : "1px solid rgba(0,60,160,0.07)",

    rowHover: isDark
      ? "rgba(255,255,255,0.03)"
      : "rgba(0,60,160,0.04)",

    rowExpanded: isDark
      ? "rgba(255,255,255,0.04)"
      : "rgba(0,60,160,0.06)",

    // Text
    textPrimary: isDark ? "#e8eef7" : "#0d1f3c",
    textSecondary: isDark ? "rgba(200,215,235,0.75)" : "rgba(30,60,120,0.7)",
    textMuted: isDark ? "rgba(150,180,220,0.35)" : "rgba(0,60,160,0.3)",
    textAccent: isDark ? "#90caf9" : "#1565c0",
    textLink: isDark ? "#4fc3f7" : "#1565c0",
    logoSub: isDark ? "rgba(180,200,235,0.5)" : "rgba(0,60,160,0.4)",

    // Input
    inputBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    inputBorder: isDark ? "rgba(100,150,255,0.2)" : "rgba(0,80,200,0.2)",
    inputBorderFocus: isDark ? "rgba(100,150,255,0.5)" : "rgba(0,80,200,0.5)",
    inputColor: isDark ? "#e8eef7" : "#0d1f3c",
    inputPlaceholder: isDark ? "rgba(150,180,220,0.4)" : "rgba(0,60,160,0.35)",

    // Dropdown
    dropdownBg: isDark ? "rgba(8,18,40,0.98)" : "rgba(255,255,255,0.98)",
    dropdownBorder: isDark ? "rgba(100,150,255,0.2)" : "rgba(0,80,200,0.15)",
    dropdownHover: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,60,160,0.05)",
    dropdownSelected: isDark ? "rgba(100,150,255,0.1)" : "rgba(0,80,200,0.08)",

    // Avatar
    avatarBg: isDark
      ? "linear-gradient(135deg, #1a2a4a, #0d1b35)"
      : "linear-gradient(135deg, #dce8f8, #c5d8f0)",
    avatarBorder: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,80,200,0.2)",
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
