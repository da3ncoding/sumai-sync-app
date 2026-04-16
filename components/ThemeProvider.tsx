"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AccentColor = "emerald" | "sky" | "violet" | "rose" | "orange";

const VALID_ACCENTS: AccentColor[] = ["emerald", "sky", "violet", "rose", "orange"];

export const ACCENT_OPTIONS: { value: AccentColor; label: string; hex: string }[] = [
  { value: "emerald", label: "エメラルド", hex: "#34d399" },
  { value: "sky",     label: "スカイ",     hex: "#38bdf8" },
  { value: "violet",  label: "バイオレット", hex: "#a78bfa" },
  { value: "rose",    label: "ローズ",     hex: "#fb7185" },
  { value: "orange",  label: "オレンジ",   hex: "#fb923c" },
];

interface ThemeContextType {
  accent: AccentColor;
  setAccent: (a: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  accent: "emerald",
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>("emerald");

  useEffect(() => {
    const saved = localStorage.getItem("accent") as AccentColor;
    if (saved && VALID_ACCENTS.includes(saved)) {
      setAccentState(saved);
      document.documentElement.setAttribute("data-accent", saved);
    }
  }, []);

  const setAccent = (a: AccentColor) => {
    setAccentState(a);
    localStorage.setItem("accent", a);
    document.documentElement.setAttribute("data-accent", a);
  };

  return (
    <ThemeContext.Provider value={{ accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
