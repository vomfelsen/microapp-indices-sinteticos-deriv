"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type AppThemeId = "crimson" | "emerald" | "amber" | "cyan";

export interface ThemeMeta {
  id: AppThemeId;
  name: string;
  subtitle: string;
  primaryHex: string;
  secondaryHex: string;
}

export const APP_THEMES: ThemeMeta[] = [
  {
    id: "crimson",
    name: "Deriv Crimson",
    subtitle: "Rojo institucional Deriv & energía cuántica",
    primaryHex: "#f43f5e",
    secondaryHex: "#e11d48",
  },
  {
    id: "emerald",
    name: "Quant Emerald",
    subtitle: "Verde neón terminal de trading institucional",
    primaryHex: "#10b981",
    secondaryHex: "#059669",
  },
  {
    id: "amber",
    name: "Gold Prestige",
    subtitle: "Dorado de alta precisión y liquidez ICT",
    primaryHex: "#f59e0b",
    secondaryHex: "#d97706",
  },
  {
    id: "cyan",
    name: "Neon Horizon",
    subtitle: "Cian cibernético y descanso visual nocturno",
    primaryHex: "#06b6d4",
    secondaryHex: "#0891b2",
  },
];

export type IndexCategory =
  | "volatility"
  | "volatility_1s"
  | "boom_crash"
  | "step"
  | "jump"
  | "range_break";

export interface IndexOption {
  symbolCode: string;
  displayName: string;
  category: IndexCategory;
  tag: string;
  description: string;
}

export const ALL_DERIV_INDICES: IndexOption[] = [
  // Volatility Continua (2s)
  {
    symbolCode: "R_10",
    displayName: "Volatility 10",
    category: "volatility",
    tag: "V10",
    description: "Volatilidad constante al 10% • Fluctuación suave y controlada",
  },
  {
    symbolCode: "R_25",
    displayName: "Volatility 25",
    category: "volatility",
    tag: "V25",
    description: "Volatilidad constante al 25% • Tendencias claras e intermedias",
  },
  {
    symbolCode: "R_50",
    displayName: "Volatility 50",
    category: "volatility",
    tag: "V50",
    description: "Volatilidad equilibrada al 50% con patrones de rango y estructura",
  },
  {
    symbolCode: "R_75",
    displayName: "Volatility 75",
    category: "volatility",
    tag: "V75",
    description: "Volatilidad continua al 75% • El favorito para ICT, SMC y Order Blocks",
  },
  {
    symbolCode: "R_100",
    displayName: "Volatility 100",
    category: "volatility",
    tag: "V100",
    description: "Máxima volatilidad estándar al 100% para movimientos altamente expansivos",
  },

  // Volatility (1s) - 1 Tick por Segundo
  {
    symbolCode: "1HZ10V",
    displayName: "Volatility 10 (1s)",
    category: "volatility_1s",
    tag: "V10 (1s)",
    description: "Ticks ultra rápidos cada 1 segundo con 10% de volatilidad",
  },
  {
    symbolCode: "1HZ25V",
    displayName: "Volatility 25 (1s)",
    category: "volatility_1s",
    tag: "V25 (1s)",
    description: "Ticks cada 1 segundo con 25% de volatilidad constante",
  },
  {
    symbolCode: "1HZ50V",
    displayName: "Volatility 50 (1s)",
    category: "volatility_1s",
    tag: "V50 (1s)",
    description: "Ticks cada 1 segundo con 50% de volatilidad y oscilación media",
  },
  {
    symbolCode: "1HZ75V",
    displayName: "Volatility 75 (1s)",
    category: "volatility_1s",
    tag: "V75 (1s)",
    description: "Ticks cada 1 segundo con 75% de volatilidad de alta liquidez",
  },
  {
    symbolCode: "1HZ100V",
    displayName: "Volatility 100 (1s)",
    category: "volatility_1s",
    tag: "V100 (1s)",
    description: "Generación acelerada al 100% de volatilidad para scalping puro",
  },
  {
    symbolCode: "1HZ150V",
    displayName: "Volatility 150 (1s)",
    category: "volatility_1s",
    tag: "V150 (1s)",
    description: "Aceleración cuántica al 150% de volatilidad cada segundo",
  },
  {
    symbolCode: "1HZ250V",
    displayName: "Volatility 250 (1s)",
    category: "volatility_1s",
    tag: "V250 (1s)",
    description: "Volatilidad extrema al 250% con actualización tick a tick",
  },

  // Crash & Boom
  {
    symbolCode: "BOOM1000",
    displayName: "Boom 1000",
    category: "boom_crash",
    tag: "B1000",
    description: "Spikes alcistas institucionales cada ~1000 ticks en promedio",
  },
  {
    symbolCode: "BOOM500",
    displayName: "Boom 500",
    category: "boom_crash",
    tag: "B500",
    description: "Spikes alcistas frecuentes cada ~500 ticks en promedio",
  },
  {
    symbolCode: "BOOM300N",
    displayName: "Boom 300",
    category: "boom_crash",
    tag: "B300",
    description: "Spikes alcistas ultra rápidos cada ~300 ticks en promedio",
  },
  {
    symbolCode: "CRASH1000",
    displayName: "Crash 1000",
    category: "boom_crash",
    tag: "C1000",
    description: "Spikes bajistas institucionales cada ~1000 ticks en promedio",
  },
  {
    symbolCode: "CRASH500",
    displayName: "Crash 500",
    category: "boom_crash",
    tag: "C500",
    description: "Spikes bajistas rápidos cada ~500 ticks en promedio",
  },
  {
    symbolCode: "CRASH300N",
    displayName: "Crash 300",
    category: "boom_crash",
    tag: "C300",
    description: "Spikes bajistas ultra rápidos cada ~300 ticks en promedio",
  },

  // Step Indices
  {
    symbolCode: "stpRNG",
    displayName: "Step Index",
    category: "step",
    tag: "STEP",
    description: "Movimientos matemáticos escalonados de exactamente 0.1 de paso",
  },
  {
    symbolCode: "stpRNG100",
    displayName: "Step Index 100",
    category: "step",
    tag: "STEP 100",
    description: "Estructura escalonada matemática en ventana de 100 ticks",
  },
  {
    symbolCode: "stpRNG200",
    displayName: "Step Index 200",
    category: "step",
    tag: "STEP 200",
    description: "Estructura escalonada matemática en ventana de 200 ticks",
  },
  {
    symbolCode: "stpRNG500",
    displayName: "Step Index 500",
    category: "step",
    tag: "STEP 500",
    description: "Estructura escalonada macro de paso persistente 500 ticks",
  },

  // Jump Indices
  {
    symbolCode: "JD10",
    displayName: "Jump 10",
    category: "jump",
    tag: "J10",
    description: "Saltos súbitos estocásticos promedio cada 20m con volatilidad 10%",
  },
  {
    symbolCode: "JD25",
    displayName: "Jump 25",
    category: "jump",
    tag: "J25",
    description: "Saltos súbitos estocásticos promedio cada 20m con volatilidad 25%",
  },
  {
    symbolCode: "JD50",
    displayName: "Jump 50",
    category: "jump",
    tag: "J50",
    description: "Saltos súbitos estocásticos promedio cada 20m con volatilidad 50%",
  },
  {
    symbolCode: "JD75",
    displayName: "Jump 75",
    category: "jump",
    tag: "J75",
    description: "Saltos súbitos estocásticos promedio cada 20m con volatilidad 75%",
  },
  {
    symbolCode: "JD100",
    displayName: "Jump 100",
    category: "jump",
    tag: "J100",
    description: "Máxima magnitud de saltos de precio estocásticos con volatilidad 100%",
  },

  // Range Break
  {
    symbolCode: "RB100",
    displayName: "Range Break 100",
    category: "range_break",
    tag: "RB 100",
    description: "Rango con rupturas estocásticas tras promedio de 100 intentos",
  },
  {
    symbolCode: "RB200",
    displayName: "Range Break 200",
    category: "range_break",
    tag: "RB 200",
    description: "Rango extendido con rupturas institucionales tras 200 intentos",
  },
];

const DEFAULT_ACTIVE_INDICES = [
  "Volatility 75",
  "Volatility 75 (1s)",
  "Boom 1000",
  "Crash 1000",
  "Step Index",
  "Step Index 100",
  "Volatility 100",
  "Jump 75",
];

interface SettingsContextValue {
  theme: AppThemeId;
  setTheme: (t: AppThemeId) => void;
  activeIndices: string[];
  setActiveIndices: (indices: string[]) => void;
  toggleIndex: (displayName: string) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppThemeId>("crimson");
  const [activeIndices, setActiveIndicesState] = useState<string[]>(
    DEFAULT_ACTIVE_INDICES
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("deriv_app_theme") as AppThemeId;
    if (savedTheme && APP_THEMES.some((t) => t.id === savedTheme)) {
      setThemeState(savedTheme);
      applyThemeToDom(savedTheme);
    } else {
      applyThemeToDom("crimson");
    }

    try {
      const savedIndices = localStorage.getItem("deriv_active_indices");
      if (savedIndices) {
        const parsed = JSON.parse(savedIndices);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveIndicesState(parsed);
        }
      }
    } catch {}
  }, []);

  const applyThemeToDom = (newTheme: AppThemeId) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  const setTheme = (newTheme: AppThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem("deriv_app_theme", newTheme);
    applyThemeToDom(newTheme);
  };

  const setActiveIndices = (indices: string[]) => {
    const safe = indices.length > 0 ? indices : ["Volatility 75"];
    setActiveIndicesState(safe);
    localStorage.setItem("deriv_active_indices", JSON.stringify(safe));
  };

  const toggleIndex = (displayName: string) => {
    setActiveIndicesState((prev) => {
      let updated: string[];
      if (prev.includes(displayName)) {
        // Al menos mantener uno activo
        if (prev.length <= 1) return prev;
        updated = prev.filter((item) => item !== displayName);
      } else {
        updated = [...prev, displayName];
      }
      localStorage.setItem("deriv_active_indices", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        activeIndices,
        setActiveIndices,
        toggleIndex,
        isSettingsOpen,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings debe usarse dentro de un SettingsProvider");
  }
  return ctx;
}
