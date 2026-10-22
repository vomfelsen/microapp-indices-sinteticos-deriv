export type JournalColor = "emerald" | "amber" | "cyan" | "rose" | "purple";

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  category: "technical" | "risk" | "psychology" | "custom";
}

export interface JournalAutoTradeSettings {
  enabled: boolean;
  defaultLotSize: number;
  targetTp: "TP1" | "TP2";
  maxRiskPerTradeUsd?: number;
  onlyInEntryZone?: boolean;
  minStrategyWinRate?: number;
}

export interface JournalBook {
  id: string;
  name: string;
  description: string;
  color: JournalColor;
  maxDailyTrades: number;
  targetDailyTrades: number;
  maxDailyLossUsd?: number;
  autoTrade?: JournalAutoTradeSettings;
  checklist?: ChecklistItem[];
  createdAt: string;
  isDefault?: boolean;
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: "chk_1",
    text: "Sesgo y Estructura H1/M15: ¿La dirección del mercado está confirmada (BOS / ChoCH)?",
    checked: false,
    category: "technical",
  },
  {
    id: "chk_2",
    text: "Toma de Liquidez Previa: ¿Hubo barrido de BSL/SSL o zona de spikes (Boom/Crash)?",
    checked: false,
    category: "technical",
  },
  {
    id: "chk_3",
    text: "Punto de Interés (POI): ¿La entrada está en un Fair Value Gap (FVG) u Order Block mitigado?",
    checked: false,
    category: "technical",
  },
  {
    id: "chk_4",
    text: "Gestión de Riesgo: ¿El lotaje y distancia al SL representan ≤ 1% - 2% del balance?",
    checked: false,
    category: "risk",
  },
  {
    id: "chk_5",
    text: "Stop Loss Inamovible: ¿El SL está en un nivel que invalida completamente la hipótesis?",
    checked: false,
    category: "risk",
  },
  {
    id: "chk_6",
    text: "Psicología y Calma: ¿Operas sin sed de revancha tras pérdida previa ni euforia/FOMO?",
    checked: false,
    category: "psychology",
  },
];

export const DEFAULT_JOURNAL_BOOKS: JournalBook[] = [
  {
    id: "jb_main",
    name: "Bitácora Principal (Live Deriv)",
    description: "Operaciones principales en cuenta real de Índices Sintéticos",
    color: "amber",
    maxDailyTrades: 4,
    targetDailyTrades: 2,
    maxDailyLossUsd: 150,
    checklist: DEFAULT_CHECKLIST,
    createdAt: "2026-09-01T10:00:00.000Z",
    isDefault: true,
  },
  {
    id: "jb_eval",
    name: "Cuenta Reto / Fondeo ($25k)",
    description: "Control estricto de drawdown institucional y 3 trades máx / día",
    color: "emerald",
    maxDailyTrades: 3,
    targetDailyTrades: 2,
    maxDailyLossUsd: 300,
    checklist: DEFAULT_CHECKLIST,
    createdAt: "2026-09-15T10:00:00.000Z",
  },
  {
    id: "jb_scalp",
    name: "Laboratorio Scalping (1s Series)",
    description: "Operativa de alta frecuencia en V75 (1s), V100 (1s) y Spikes Boom/Crash",
    color: "cyan",
    maxDailyTrades: 6,
    targetDailyTrades: 4,
    maxDailyLossUsd: 100,
    checklist: DEFAULT_CHECKLIST,
    createdAt: "2026-10-01T10:00:00.000Z",
  },
];
