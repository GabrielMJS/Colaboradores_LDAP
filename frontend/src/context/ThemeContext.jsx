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
      : "linear-gradient(135deg, #d4e3f5 0%, #b8d0ee 100%)",

    headerBg: isDark
      ? "linear-gradient(180deg, rgba(10,20,45,0.98) 0%, rgba(8,16,36,0.95) 100%)"
      : "rgba(255, 255, 255, 0.98)",

    headerBorder: isDark
      ? "1px solid rgba(100,150,255,0.15)"
      : "1px solid rgba(21,101,192,0.3)",

    tableBg: isDark
      ? "rgba(10,20,45,0.7)"
      : "rgba(255, 255, 255, 0.95)",

    tableBorder: isDark
      ? "1px solid rgba(150, 160, 170, 0.35)"
      : "1px solid rgba(21,101,192,0.3)",

    tableHeaderBg: isDark
      ? "rgba(255,255,255,0.04)"
      : "rgba(21,101,192,0.12)",

    tableHeaderColor: isDark
      ? "rgba(180,200,220,0.8)"
      : "#0d47a1",

    rowBorder: isDark
      ? "1px solid rgba(150, 160, 170, 0.25)"
      : "1px solid rgba(21,101,192,0.15)",

    rowHover: isDark
      ? "rgba(255,255,255,0.03)"
      : "rgba(21,101,192,0.08)",

    rowExpanded: isDark
      ? "rgba(255,255,255,0.04)"
      : "rgba(21,101,192,0.05)",

    // Text
    textPrimary: isDark ? "#e8eef7" : "#0d1f3c",
    textSecondary: isDark ? "rgba(200,215,235,0.75)" : "#1565c0",
    textMuted: isDark ? "rgba(150,180,220,0.35)" : "rgba(13,31,60,0.6)",
    textAccent: isDark ? "#90caf9" : "#1a56d6",
    textLink: isDark ? "#4fc3f7" : "#1a56d6",
    logoSub: isDark ? "rgba(180,200,235,0.5)" : "#0d47a1",

    // Input
    inputBg: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
    inputBorder: isDark ? "rgba(100,150,255,0.2)" : "rgba(21,101,192,0.3)",
    inputBorderFocus: isDark ? "rgba(100,150,255,0.5)" : "#1565c0",
    inputColor: isDark ? "#e8eef7" : "#0d1f3c",
    inputPlaceholder: isDark ? "rgba(150,180,220,0.4)" : "rgba(13,31,60,0.5)",

    // Dropdown
    dropdownBg: isDark ? "rgba(8,18,40,0.98)" : "#ffffff",
    dropdownBorder: isDark ? "rgba(100,150,255,0.2)" : "rgba(21,101,192,0.3)",
    dropdownHover: isDark ? "rgba(255,255,255,0.05)" : "rgba(21,101,192,0.08)",
    dropdownSelected: isDark ? "rgba(100,150,255,0.1)" : "rgba(21,101,192,0.15)",

    // Avatar
    avatarBg: isDark
      ? "linear-gradient(135deg, #1a2a4a, #0d1b35)"
      : "linear-gradient(135deg, #c5d8f0, #a9c5e8)",
    avatarBorder: isDark ? "rgba(255,255,255,0.15)" : "rgba(21,101,192,0.4)",
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
