"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AppJournalEntry,
  AppSignal,
  OriginalSignalSnapshot,
  TradeOutcome,
  TradingSession,
} from "@/lib/data-service";
import type { MarketQuote } from "@/lib/market-prices";
import {
  calculateTradeMetrics,
  detectTradingSessionByTime,
  getContractMultiplier,
  getTradingSessionOptionsForLocalZone,
  type DetectedSessionInfo,
} from "@/lib/trade-calculator";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
  type JournalBook,
  DEFAULT_JOURNAL_BOOKS,
} from "./types";
import { NewJournalModal } from "./NewJournalModal";
import { FloatingDailyTradesHud } from "./FloatingDailyTradesHud";
import {
  BookOpen,
  Plus,
  Pencil,
  Target,
  ShieldAlert,
  AlertTriangle,
  FolderPlus,
  CheckCircle2,
  Sparkles,
  Bot,
} from "lucide-react";

export interface EnrichedJournalEntry extends AppJournalEntry {
  signal: AppSignal | null;
  signalSnapshot?: OriginalSignalSnapshot | null;
  strategyName: string;
  journalBookId?: string;
  confluences?: string[];
}

const SESSION_LABELS: Record<TradingSession, string> = {
  NEW_YORK: "🇺🇸 Nueva York",
  LONDON: "🇬🇧 Londres",
  ASIA: "🇯🇵 Asia",
};

export const SETUP_CONFLUENCES = [
  "⚡ Estructura BOS",
  "🎯 Barrido Liquidez",
  "🧱 Fair Value Gap (FVG)",
  "🏛️ Order Block (OB)",
  "💥 Spike Zone",
  "🛡️ Riesgo ≤ 1%",
  "🛑 SL Inamovible",
];

export const EMOTION_OPTIONS = [
  { label: "Disciplinado", emoji: "🧘", desc: "Plan en calma" },
  { label: "Enfocado", emoji: "🎯", desc: "Paciencia y foco" },
  { label: "FOMO / Ansiedad", emoji: "⚡", desc: "Prisa / Impulso" },
  { label: "Miedo / Duda", emoji: "😨", desc: "Inseguridad" },
  { label: "Sobreconfianza", emoji: "🚀", desc: "Lote excesivo" },
  { label: "Revancha", emoji: "🔥", desc: "Tras pérdida" },
];

interface TradingChallenge {
  question: string;
  formulaLabel: string;
  expectedAnswer: number;
}

const INITIAL_TRASH_CHALLENGE: TradingChallenge = {
  question:
    "Si aseguras +10 puntos en parciales de Volatility 75 y sumas +15 puntos en el runner, ¿cuántos puntos totales sumaste?",
  formulaLabel: "10 + 15 = ?",
  expectedAnswer: 25,
};

const INITIAL_DELETE_CHALLENGE: TradingChallenge = {
  question:
    "Confirmación de Auditoría: Si tu Riesgo 1R es $100 USD y tu Take Profit 2R es $200 USD, ¿cuánto suman (100 + 200)?",
  formulaLabel: "100 + 200 = ?",
  expectedAnswer: 300,
};

const SSR_DEFAULT_SESSION_INFO: DetectedSessionInfo = {
  session: "NEW_YORK",
  sessionLabel: "Sincronizando...",
  killzoneNote: "Sincronizando horario...",
  localTimeStr: "--:--",
  utcTimeStr: "--:-- UTC",
};

const SSR_DEFAULT_SESSION_OPTIONS: {
  value: TradingSession;
  label: string;
  badge: string;
}[] = [
  {
    value: "NEW_YORK",
    label: "🇺🇸 Nueva York (NY Open)",
    badge: "08:00 - 16:00 EST",
  },
  {
    value: "LONDON",
    label: "🇬🇧 Londres (London Open)",
    badge: "02:00 - 10:00 EST",
  },
  {
    value: "ASIA",
    label: "🇯🇵 Asia (Tokyo / Sydney)",
    badge: "16:00 - 02:00 EST",
  },
];

function generateTradingMathChallenge(mode: "TRASH" | "DELETE"): TradingChallenge {
  const a = Math.floor(Math.random() * 14) + 6; // Ej: 6 a 19 pips/puntos
  const b = Math.floor(Math.random() * 15) + 5; // Ej: 5 a 19 pips/puntos

  if (mode === "TRASH") {
    return {
      question: `Si aseguras +${a} puntos en parciales de Volatility 75 y sumas +${b} puntos en el runner, ¿cuántos puntos totales sumaste?`,
      formulaLabel: `${a} + ${b} = ?`,
      expectedAnswer: a + b,
    };
  }

  const risk1R = (Math.floor(Math.random() * 4) + 1) * 50; // 50, 100, 150, 200
  const reward2R = risk1R * 2;
  return {
    question: `Confirmación de Auditoría: Si tu Riesgo 1R es $${risk1R} USD y tu Take Profit 2R es $${reward2R} USD, ¿cuánto suman (${risk1R} + ${reward2R})?`,
    formulaLabel: `${risk1R} + ${reward2R} = ?`,
    expectedAnswer: risk1R + reward2R,
  };
}

export function JournalDashboardClient({
  initialEntries,
  initialQuotes,
}: {
  initialEntries: EnrichedJournalEntry[];
  initialQuotes: Record<string, MarketQuote>;
}) {
  const router = useRouter();
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const trashDialogRef = useRef<HTMLDialogElement>(null);
  const permanentDeleteDialogRef = useRef<HTMLDialogElement>(null);
  const originalSignalDialogRef = useRef<HTMLDialogElement>(null);
  const autoClosingIdsRef = useRef<Set<string>>(new Set());

  const [entries, setEntries] =
    useState<EnrichedJournalEntry[]>(initialEntries);
  const [quotes, setQuotes] =
    useState<Record<string, MarketQuote>>(initialQuotes);
  const [filterOutcome, setFilterOutcome] = useState<
    "ALL" | TradeOutcome | "TRASH"
  >("ALL");
  const [autoCloseAlert, setAutoCloseAlert] = useState<string | null>(null);

  // Detección automática de sesión según horario actual del usuario (sincronizado tras hidratar)
  const [detectedSessionInfo, setDetectedSessionInfo] =
    useState<DetectedSessionInfo>(SSR_DEFAULT_SESSION_INFO);
  const [sessionSelectOptions, setSessionSelectOptions] = useState(
    SSR_DEFAULT_SESSION_OPTIONS
  );

  // Estado del Modal para Inspeccionar la Señal Original Guardada (TP1, TP2, SL, Zona Entrada)
  const [inspectingSignalEntry, setInspectingSignalEntry] =
    useState<EnrichedJournalEntry | null>(null);
  const [copiedSignalField, setCopiedSignalField] = useState<string | null>(
    null
  );

  // Estado del Modal de Edición en Bitácora
  const [editingEntry, setEditingEntry] =
    useState<EnrichedJournalEntry | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TradeOutcome>("OPEN");
  const [lotSize, setLotSize] = useState<string>("0.20");
  const [executionPrice, setExecutionPrice] = useState<string>("");
  const [targetSlPrice, setTargetSlPrice] = useState<string>("");
  const [targetTpPrice, setTargetTpPrice] = useState<string>("");
  const [exitPrice, setExitPrice] = useState<string>("");
  const [tradingSession, setTradingSession] =
    useState<TradingSession>("NEW_YORK");
  const [followedPlan, setFollowedPlan] = useState<boolean>(true);
  const [emotionState, setEmotionState] = useState<string>("Disciplinado");
  const [emotionNote, setEmotionNote] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  // Estado del Modal de Confirmación para Enviar a Papelera (Soft Delete)
  const [targetTrashEntry, setTargetTrashEntry] =
    useState<EnrichedJournalEntry | null>(null);
  const [trashChallenge, setTrashChallenge] = useState<TradingChallenge>(
    INITIAL_TRASH_CHALLENGE
  );
  const [trashAnswerInput, setTrashAnswerInput] = useState<string>("");
  const [isMovingToTrash, setIsMovingToTrash] = useState<boolean>(false);

  // Estado del Modal de Confirmación para Eliminación Definitiva (Hard Delete)
  const [targetDeleteEntry, setTargetDeleteEntry] =
    useState<EnrichedJournalEntry | null>(null);
  const [deleteChallenge, setDeleteChallenge] = useState<TradingChallenge>(
    INITIAL_DELETE_CHALLENGE
  );
  const [deleteAnswerInput, setDeleteAnswerInput] = useState<string>("");
  const [deleteKeywordInput, setDeleteKeywordInput] = useState<string>("");
  const [isDeletingPermanently, setIsDeletingPermanently] =
    useState<boolean>(false);

  useEffect(() => {
    const live = detectTradingSessionByTime();
    setDetectedSessionInfo(live);
    setSessionSelectOptions(getTradingSessionOptionsForLocalZone());
    setTradingSession(live.session);
  }, []);

  // ==========================================
  // MULTI-BITÁCORA Y CONTROL DE ENTRADAS DIARIAS
  // ==========================================
  const [journalBooks, setJournalBooks] = useState<JournalBook[]>(DEFAULT_JOURNAL_BOOKS);
  const [activeJournalId, setActiveJournalId] = useState<string>("jb_main");
  const [isNewJournalOpen, setIsNewJournalOpen] = useState<boolean>(false);
  const [editingJournalBook, setEditingJournalBook] = useState<JournalBook | null>(null);
  const [showFloatingHud, setShowFloatingHud] = useState<boolean>(true);
  const [assignedJournalId, setAssignedJournalId] = useState<string>("jb_main");
  const [selectedConfluences, setSelectedConfluences] = useState<string[]>([]);

  // Cargar bitácoras, selección del usuario y metadatos extendidos de trades
  useEffect(() => {
    try {
      const savedBooks = localStorage.getItem("synth_journal_books");
      if (savedBooks) {
        setJournalBooks(JSON.parse(savedBooks));
      }
      const savedActiveId = localStorage.getItem("synth_active_journal_id");
      if (savedActiveId) {
        setActiveJournalId(savedActiveId);
      }
      const savedMetaStr = localStorage.getItem("synth_trade_meta");
      if (savedMetaStr) {
        const metaMap: Record<
          string,
          {
            journalBookId?: string;
            confluences?: string[];
            targetSlPrice?: number | null;
          }
        > = JSON.parse(savedMetaStr);
        setEntries((prev) =>
          prev.map((e) => {
            const m = metaMap[e.id];
            if (m) {
              return {
                ...e,
                targetSlPrice:
                  m.targetSlPrice !== undefined
                    ? m.targetSlPrice
                    : e.targetSlPrice,
                journalBookId: m.journalBookId || e.journalBookId || "jb_main",
                confluences: m.confluences || e.confluences || [],
              };
            }
            return e;
          })
        );
      }
    } catch {}
  }, []);

  const saveJournalBooks = useCallback((books: JournalBook[]) => {
    setJournalBooks(books);
    try {
      localStorage.setItem("synth_journal_books", JSON.stringify(books));
    } catch {}
  }, []);

  const handleSelectJournal = useCallback((id: string) => {
    setActiveJournalId(id);
    try {
      localStorage.setItem("synth_active_journal_id", id);
    } catch {}
  }, []);

  const currentJournal = useMemo(() => {
    if (activeJournalId === "ALL_BOOKS") {
      return {
        id: "ALL_BOOKS",
        name: "Todas las Bitácoras (Consolidado)",
        description: "Métricas consolidadas de todas tus cuentas y estrategias",
        color: "amber" as const,
        maxDailyTrades: 10,
        targetDailyTrades: 5,
        maxDailyLossUsd: 500,
        createdAt: "",
      };
    }
    return (
      journalBooks.find((b) => b.id === activeJournalId) ||
      journalBooks[0] ||
      DEFAULT_JOURNAL_BOOKS[0]
    );
  }, [journalBooks, activeJournalId]);

  // Opciones para el Listbox de Selección de Bitácora
  const journalListboxOptions = useMemo(() => {
    return [
      ...journalBooks.map((b) => ({
        value: b.id,
        label: b.name,
        badge: `${b.maxDailyTrades}/día`,
        sublabel: b.description,
      })),
      {
        value: "ALL_BOOKS",
        label: "Todas las Bitácoras (Consolidado)",
        badge: `${journalBooks.length} carteras`,
        sublabel: "Métricas consolidadas de todas tus operaciones",
      },
    ];
  }, [journalBooks]);

  // Filtrado de operaciones según la bitácora activa
  const journalScopedEntries = useMemo(() => {
    if (activeJournalId === "ALL_BOOKS") return entries;
    return entries.filter((e) => {
      const bId = (e as any).journalBookId || "jb_main";
      return bId === activeJournalId;
    });
  }, [entries, activeJournalId]);

  // Separar operaciones activas vs en Papelera para la bitácora seleccionada
  const activeEntries = useMemo(
    () => journalScopedEntries.filter((e) => !e.isDeleted),
    [journalScopedEntries]
  );
  const trashedEntries = useMemo(
    () => journalScopedEntries.filter((e) => Boolean(e.isDeleted)),
    [journalScopedEntries]
  );

  // Conteo de entradas realizadas hoy en la bitácora activa
  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayTradesCount = useMemo(() => {
    return activeEntries.filter((e) => {
      const d = e.createdAt ? e.createdAt.slice(0, 10) : "";
      return d === todayIsoDate;
    }).length;
  }, [activeEntries, todayIsoDate]);

  const todayRealizedLoss = useMemo(() => {
    return activeEntries.reduce((sum, e) => {
      const d = e.createdAt ? e.createdAt.slice(0, 10) : "";
      if (d !== todayIsoDate) return sum;
      if (e.outcome === "LOSS") {
        return sum + Math.abs(Math.min(0, e.pnlAmount));
      }
      return sum;
    }, 0);
  }, [activeEntries, todayIsoDate]);

  const isDailyLimitReached =
    currentJournal.id !== "ALL_BOOKS" &&
    todayTradesCount >= currentJournal.maxDailyTrades;

  const dailyTradesPercent = Math.min(
    100,
    Math.round((todayTradesCount / (currentJournal.maxDailyTrades || 1)) * 100)
  );

  const handleSaveJournalBook = useCallback(
    (
      data: Omit<JournalBook, "id" | "checklist" | "createdAt">,
      editBookId?: string
    ) => {
      if (editBookId) {
        const updated = journalBooks.map((b) =>
          b.id === editBookId ? { ...b, ...data } : b
        );
        saveJournalBooks(updated);
      } else {
        const newBook: JournalBook = {
          ...data,
          id: `jb_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        const updated = [...journalBooks, newBook];
        saveJournalBooks(updated);
        handleSelectJournal(newBook.id);
      }
      setEditingJournalBook(null);
    },
    [journalBooks, saveJournalBooks, handleSelectJournal]
  );

  const handleDeleteJournalBook = useCallback(
    (id: string) => {
      const updated = journalBooks.filter((b) => b.id !== id);
      saveJournalBooks(updated);
      handleSelectJournal("jb_main");
      setEditingJournalBook(null);
    },
    [journalBooks, saveJournalBooks, handleSelectJournal]
  );

  // ==========================================
  // FUNCIÓN DE AUTO-CIERRE AUTOMÁTICO AL TOCAR TP O SL
  // ==========================================
  const triggerAutoCloseTrade = useCallback(
    async (
      entry: EnrichedJournalEntry,
      triggeredOutcome: "WIN" | "LOSS",
      triggerExitPrice: number,
      reasonLabel: string
    ) => {
      if (autoClosingIdsRef.current.has(entry.id)) return;
      autoClosingIdsRef.current.add(entry.id);

      const sig = entry.signal;
      const asset = sig?.asset ?? "Volatility 75";
      const direction = sig?.direction ?? "BUY";
      const sl =
        entry.targetSlPrice ??
        entry.signalSnapshot?.stopLoss ??
        sig?.stopLoss ??
        (direction === "BUY"
          ? entry.executionPrice - 10
          : entry.executionPrice + 10);
      const tp =
        entry.targetTpPrice ??
        sig?.takeProfit1 ??
        (direction === "BUY"
          ? entry.executionPrice + 15
          : entry.executionPrice - 15);

      const calc = calculateTradeMetrics({
        asset,
        direction,
        lotSize: entry.lotSize,
        executionPrice: entry.executionPrice,
        exitPrice: triggerExitPrice,
        stopLoss: sl,
        takeProfit1: tp,
        takeProfit2: sig?.takeProfit2 ?? null,
        isStillOpen: false,
      });

      try {
        const res = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signalId: entry.signalId,
            outcome: triggeredOutcome,
            lotSize: entry.lotSize,
            executionPrice: entry.executionPrice,
            targetTpPrice: tp,
            targetSlPrice: sl,
            exitPrice: triggerExitPrice,
            riskAmount: calc.riskUsd,
            pnlAmount: calc.signedPnlUsd,
            tradingSession: entry.session,
            followedPlan: entry.followedPlan,
            emotionState: entry.emotionState,
            emotionNote: entry.emotionNote
              ? `${entry.emotionNote} • [${reasonLabel}]`
              : `[${reasonLabel}]`,
          }),
        });

        if (res.ok) {
          const updated = await res.json();
          setEntries((prev) =>
            prev.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    ...updated,
                    targetSlPrice: item.targetSlPrice ?? updated.targetSlPrice,
                  }
                : item
            )
          );
          setAutoCloseAlert(
            `⚡ Auto-cierre ejecutado en ${asset}: ${reasonLabel} a ${triggerExitPrice.toFixed(
              2
            )} (${
              calc.signedPnlUsd >= 0 ? "+" : "-"
            }$${Math.abs(calc.signedPnlUsd).toFixed(2)} USD)`
          );
          router.refresh();
        }
      } finally {
        autoClosingIdsRef.current.delete(entry.id);
      }
    },
    [router]
  );

  // ==========================================
  // MOTOR DE AUTO-TRADING: TOMA AUTOMÁTICA DE SEÑALES SEGÚN EL PLAN DE CADA BITÁCORA
  // ==========================================
  const autoTradingExecutionLockRef = useRef<Set<string>>(new Set());

  const checkAndExecuteAutoTrades = useCallback(
    async (freshQuotes: Record<string, MarketQuote>) => {
      const autoBooks = journalBooks.filter((b) => b.autoTrade?.enabled);
      if (autoBooks.length === 0) return;

      try {
        const sigRes = await fetch("/api/signals", { cache: "no-store" });
        if (!sigRes.ok) return;
        const sigData = await sigRes.json();
        const activeSignals = (sigData.signals || []) as any[];
        if (activeSignals.length === 0) return;

        for (const book of autoBooks) {
          const cfg = book.autoTrade!;
          if (!cfg.enabled) continue;

          // REGLA 1: Máximo de operaciones al día (Anti-Overtrading)
          const bookTodayTradesCount = entries.filter((e) => {
            if (e.isDeleted) return false;
            const bId = (e as any).journalBookId || "jb_main";
            if (bId !== book.id) return false;
            const d = e.createdAt ? e.createdAt.slice(0, 10) : "";
            return d === todayIsoDate;
          }).length;

          if (bookTodayTradesCount >= book.maxDailyTrades) {
            continue; // Límite diario alcanzado en esta bitácora, saltar
          }

          // REGLA 2: Pérdida máxima diaria permitida (Control de Drawdown)
          if (book.maxDailyLossUsd && book.maxDailyLossUsd > 0) {
            const bookTodayLossUsd = entries
              .filter((e) => {
                if (e.isDeleted) return false;
                const bId = (e as any).journalBookId || "jb_main";
                if (bId !== book.id) return false;
                const d = e.createdAt ? e.createdAt.slice(0, 10) : "";
                return d === todayIsoDate && e.pnlAmount < 0;
              })
              .reduce((sum, e) => sum + Math.abs(e.pnlAmount), 0);

            if (bookTodayLossUsd >= book.maxDailyLossUsd) {
              continue; // Pérdida máxima diaria alcanzada en esta bitácora, pausar
            }
          }

          // Evaluar señales disponibles
          for (const signal of activeSignals) {
            if (signal.status !== "ACTIVE") continue;

            const lockKey = `${book.id}_${signal.id}`;
            if (autoTradingExecutionLockRef.current.has(lockKey)) continue;

            // No duplicar: verificar si ya está tomada en el journal
            const alreadyTaken = entries.some(
              (e) => !e.isDeleted && e.signalId === signal.id
            );
            if (alreadyTaken) continue;

            // Filtro de Calidad: Win Rate mínimo de estrategia
            const winRate = Number(signal.strategyWinRate) || 75;
            if (cfg.minStrategyWinRate && winRate < cfg.minStrategyWinRate) {
              continue;
            }

            // Filtro de Precio Spot y Zona de Entrada
            const spot =
              freshQuotes[signal.asset]?.price ?? Number(signal.entryPrice);
            if (!spot) continue;

            if (cfg.onlyInEntryZone) {
              const dir = signal.direction;
              const entryMin = Number(signal.entryPrice);
              const entryMax = signal.entryZoneMax
                ? Number(signal.entryZoneMax)
                : entryMin;

              const isWithin =
                dir === "BUY"
                  ? spot >= Math.min(entryMin, entryMax) * 0.998 &&
                    spot <= Math.max(entryMin, entryMax) * 1.002
                  : spot <= Math.max(entryMin, entryMax) * 1.002 &&
                    spot >= Math.min(entryMin, entryMax) * 0.998;

              if (!isWithin) {
                continue;
              }
            }

            // Cálculo y validación de riesgo máximo
            const lots = cfg.defaultLotSize || 0.2;
            const slPrice = Number(signal.stopLoss);
            const tpPrice =
              cfg.targetTp === "TP2" && signal.takeProfit2
                ? Number(signal.takeProfit2)
                : Number(signal.takeProfit1);

            const multiplier = getContractMultiplier(signal.asset);
            const riskUsd = Math.abs(spot - slPrice) * lots * multiplier;

            if (cfg.maxRiskPerTradeUsd && riskUsd > cfg.maxRiskPerTradeUsd) {
              continue;
            }

            // EJECUTAR AUTO-TRADE
            autoTradingExecutionLockRef.current.add(lockKey);

            try {
              const res = await fetch("/api/journal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  signalId: signal.id,
                  outcome: "OPEN",
                  lotSize: lots,
                  executionPrice: Number(spot.toFixed(2)),
                  targetTpPrice: Number(tpPrice.toFixed(2)),
                  targetSlPrice: Number(slPrice.toFixed(2)),
                  exitPrice: null,
                  riskAmount: Number(riskUsd.toFixed(2)),
                  pnlAmount: 0,
                  tradingSession: detectedSessionInfo.session,
                  followedPlan: true,
                  emotionState: "🤖 Auto-Trading (Plan)",
                  emotionNote: `🤖 Auto-Trade ejecutado en bitácora [${book.name}] respetando reglas del plan diario (Trade ${bookTodayTradesCount + 1}/${book.maxDailyTrades}).`,
                }),
              });

              if (res.ok) {
                const created = await res.json();
                try {
                  const currentMetaStr = localStorage.getItem("synth_trade_meta");
                  const currentMeta = currentMetaStr ? JSON.parse(currentMetaStr) : {};
                  currentMeta[created.id] = {
                    journalBookId: book.id,
                    confluences: ["🤖 Auto-Trade", "🛡️ Regla Plan Diario", "⚡ Entrada en Zona"],
                    targetSlPrice: slPrice,
                  };
                  localStorage.setItem("synth_trade_meta", JSON.stringify(currentMeta));
                } catch {}

                setEntries((prev) => [
                  {
                    ...created,
                    signal,
                    journalBookId: book.id,
                    confluences: ["🤖 Auto-Trade", "🛡️ Regla Plan Diario", "⚡ Entrada en Zona"],
                    targetSlPrice: slPrice,
                  },
                  ...prev,
                ]);

                setAutoCloseAlert(
                  `🤖 Auto-Trade ejecutado en ${signal.asset}: Señal tomada en "${book.name}" (Entrada: ${spot.toFixed(2)}, SL: ${slPrice.toFixed(2)}, TP: ${tpPrice.toFixed(2)}). Trade ${bookTodayTradesCount + 1} de ${book.maxDailyTrades}.`
                );
                router.refresh();
                break;
              }
            } catch (err) {
              console.error("Error auto-taking trade:", err);
            }
          }
        }
      } catch {}
    },
    [journalBooks, entries, todayIsoDate, detectedSessionInfo.session, router]
  );

  // ==========================================
  // MONITOREO EN TIEMPO REAL DE PRECIOS SPOT Y AUTO-CIERRE POR SL / TP
  // ==========================================
  useEffect(() => {
    const checkAndPoll = async () => {
      try {
        const res = await fetch("/api/market/prices", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.quotes) return;

        const freshQuotes: Record<string, MarketQuote> = data.quotes;
        setQuotes(freshQuotes);

        for (const entry of activeEntries) {
          if (entry.outcome !== "OPEN") continue;
          const sig = entry.signal;
          const asset = sig?.asset ?? "Volatility 75";
          const spot = freshQuotes[asset]?.price;
          if (!spot) continue;

          const direction = sig?.direction ?? "BUY";
          const tp =
            entry.targetTpPrice ??
            sig?.takeProfit1 ??
            (direction === "BUY"
              ? entry.executionPrice + 15
              : entry.executionPrice - 15);
          const sl =
            entry.targetSlPrice ??
            entry.signalSnapshot?.stopLoss ??
            sig?.stopLoss ??
            (direction === "BUY"
              ? entry.executionPrice - 10
              : entry.executionPrice + 10);

          if (direction === "BUY") {
            if (spot >= tp) {
              triggerAutoCloseTrade(
                entry,
                "WIN",
                tp,
                "Alcanzó Take Profit (TP) en Vivo"
              );
            } else if (spot <= sl) {
              triggerAutoCloseTrade(
                entry,
                "LOSS",
                sl,
                "Alcanzó Stop Loss (SL) en Vivo"
              );
            }
          } else {
            if (spot <= tp) {
              triggerAutoCloseTrade(
                entry,
                "WIN",
                tp,
                "Alcanzó Take Profit (TP) en Vivo"
              );
            } else if (spot >= sl) {
              triggerAutoCloseTrade(
                entry,
                "LOSS",
                sl,
                "Alcanzó Stop Loss (SL) en Vivo"
              );
            }
          }
        }

        // Evaluar Auto-Trading de señales según el plan de cada bitácora
        await checkAndExecuteAutoTrades(freshQuotes);
      } catch {
        // Silencioso en caso de error de red
      }
    };

    const interval = setInterval(checkAndPoll, 6000);
    return () => clearInterval(interval);
  }, [activeEntries, triggerAutoCloseTrade, checkAndExecuteAutoTrades]);

  // ==========================================
  // MOTOR DE MÉTRICAS ESTÁNDAR (Excluye entradas en la Papelera)
  // ==========================================
  const metrics = useMemo(() => {
    const totalTrades = activeEntries.length;
    const closedTrades = activeEntries.filter((e) => e.outcome !== "OPEN");
    const wins = activeEntries.filter((e) => e.outcome === "WIN");
    const losses = activeEntries.filter((e) => e.outcome === "LOSS");
    const breakEvens = activeEntries.filter((e) => e.outcome === "BREAKEVEN");
    const openTrades = activeEntries.filter((e) => e.outcome === "OPEN");

    const grossProfit = wins.reduce(
      (sum, e) => sum + Math.max(0, e.pnlAmount),
      0
    );
    const grossLossAbs = losses.reduce(
      (sum, e) => sum + Math.abs(Math.min(0, e.pnlAmount)),
      0
    );
    const netPnl = grossProfit - grossLossAbs;

    let openFloatingPnl = 0;
    let openEstimatedTpProfit = 0;

    for (const op of openTrades) {
      const asset = op.signal?.asset ?? "Volatility 75";
      const dir = op.signal?.direction ?? "BUY";
      const spot = quotes[asset]?.price ?? op.executionPrice;
      const mult = getContractMultiplier(asset);
      const diff =
        dir === "BUY" ? spot - op.executionPrice : op.executionPrice - spot;
      openFloatingPnl += diff * op.lotSize * mult;

      const tp =
        op.targetTpPrice ?? op.signal?.takeProfit1 ?? op.executionPrice + 15;
      openEstimatedTpProfit +=
        Math.abs(tp - op.executionPrice) * op.lotSize * mult;
    }

    const decisiveCount = wins.length + losses.length;
    const winRate =
      decisiveCount > 0 ? (wins.length / decisiveCount) * 100 : 0;
    const lossRate =
      decisiveCount > 0 ? (losses.length / decisiveCount) * 100 : 0;

    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLossAbs / losses.length : 0;

    const profitFactor =
      grossLossAbs > 0
        ? grossProfit / grossLossAbs
        : grossProfit > 0
        ? 99.9
        : 0;

    const expectancyUsd =
      decisiveCount > 0
        ? (winRate / 100) * avgWin - (lossRate / 100) * avgLoss
        : 0;

    const totalR = closedTrades.reduce((sum, e) => sum + (e.rMultiple || 0), 0);
    const avgR = closedTrades.length > 0 ? totalR / closedTrades.length : 0;

    const realizedRR = avgLoss > 0 ? avgWin / avgLoss : 0;

    const followedCount = activeEntries.filter((e) => e.followedPlan).length;
    const disciplineRate =
      totalTrades > 0 ? (followedCount / totalTrades) * 100 : 100;

    return {
      totalTrades,
      winsCount: wins.length,
      lossesCount: losses.length,
      beCount: breakEvens.length,
      openCount: openTrades.length,
      closedCount: closedTrades.length,
      decisiveCount,
      trashCount: trashedEntries.length,
      grossProfit,
      grossLossAbs,
      netPnl,
      openFloatingPnl,
      openEstimatedTpProfit,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancyUsd,
      totalR,
      avgR,
      realizedRR,
      disciplineRate,
    };
  }, [activeEntries, trashedEntries.length, quotes]);

  // Al cambiar el Estado en el modal de edición, rellenar automáticamente el Precio de Salida con TP o SL
  const handleEditStatusChange = (nextStatus: TradeOutcome) => {
    setSelectedStatus(nextStatus);
    const sig = editingEntry?.signal;
    if (nextStatus === "WIN") {
      setExitPrice(
        targetTpPrice || (sig ? sig.takeProfit1.toFixed(2) : executionPrice)
      );
    } else if (nextStatus === "LOSS") {
      setExitPrice(
        targetSlPrice || (sig ? sig.stopLoss.toFixed(2) : executionPrice)
      );
    } else if (nextStatus === "BREAKEVEN") {
      setExitPrice(executionPrice);
    }
  };

  // Autocalculadora en vivo para el modal de edición
  const editAutoCalc = useMemo(() => {
    const sig = editingEntry?.signal;
    const isStillOpen = selectedStatus === "OPEN";
    const parsedTp =
      parseFloat(targetTpPrice) ||
      sig?.takeProfit1 ||
      (parseFloat(executionPrice) || 100) + 15;
    const parsedSl =
      parseFloat(targetSlPrice) ||
      sig?.stopLoss ||
      (parseFloat(executionPrice) || 100) - 10;

    const projectedWhenOpen = calculateTradeMetrics({
      asset: sig?.asset ?? "Volatility 75",
      direction: sig?.direction ?? "BUY",
      lotSize: parseFloat(lotSize) || 0.01,
      executionPrice:
        parseFloat(executionPrice) || editingEntry?.executionPrice || 0,
      exitPrice: parsedTp,
      stopLoss: parsedSl,
      takeProfit1: parsedTp,
      takeProfit2: sig?.takeProfit2 ?? null,
      isStillOpen: false,
    });

    const actual = calculateTradeMetrics({
      asset: sig?.asset ?? "Volatility 75",
      direction: sig?.direction ?? "BUY",
      lotSize: parseFloat(lotSize) || 0.01,
      executionPrice:
        parseFloat(executionPrice) || editingEntry?.executionPrice || 0,
      exitPrice: exitPrice !== "" ? parseFloat(exitPrice) : null,
      stopLoss: parsedSl,
      takeProfit1: parsedTp,
      takeProfit2: sig?.takeProfit2 ?? null,
      isStillOpen,
    });

    return {
      ...actual,
      projectedProfitUsd: Math.abs(projectedWhenOpen.signedPnlUsd),
    };
  }, [
    editingEntry,
    selectedStatus,
    lotSize,
    executionPrice,
    targetTpPrice,
    targetSlPrice,
    exitPrice,
  ]);

  const filteredEntries = useMemo(() => {
    if (filterOutcome === "TRASH") return trashedEntries;
    if (filterOutcome === "ALL") return activeEntries;
    return activeEntries.filter((e) => e.outcome === filterOutcome);
  }, [activeEntries, trashedEntries, filterOutcome]);

  const openOriginalSignalModal = (entry: EnrichedJournalEntry) => {
    setInspectingSignalEntry(entry);
    setCopiedSignalField(null);
    originalSignalDialogRef.current?.showModal();
  };

  const copyOriginalSignalLevel = async (
    value: string | number,
    key: string
  ) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedSignalField(key);
      setTimeout(() => setCopiedSignalField(null), 1500);
    } catch {
      // Silencioso
    }
  };

  const openEditModal = (entry: EnrichedJournalEntry) => {
    const freshSession = detectTradingSessionByTime();
    setDetectedSessionInfo(freshSession);
    setEditingEntry(entry);
    setSelectedStatus(entry.outcome);
    setLotSize(String(entry.lotSize));
    setExecutionPrice(entry.executionPrice.toFixed(2));
    const orig = entry.signalSnapshot ?? entry.signal;
    const defaultTp = entry.targetTpPrice
      ? entry.targetTpPrice.toFixed(2)
      : orig
      ? orig.takeProfit1.toFixed(2)
      : entry.executionPrice.toFixed(2);
    setTargetTpPrice(defaultTp);
    const defaultSl = entry.targetSlPrice
      ? entry.targetSlPrice.toFixed(2)
      : orig
      ? orig.stopLoss.toFixed(2)
      : (entry.executionPrice - 10).toFixed(2);
    setTargetSlPrice(defaultSl);
    setExitPrice(
      entry.exitPrice
        ? entry.exitPrice.toFixed(2)
        : entry.outcome === "LOSS"
        ? defaultSl
        : defaultTp
    );
    setTradingSession(entry.session || freshSession.session);
    setFollowedPlan(entry.followedPlan ?? true);
    setEmotionState(entry.emotionState || "Disciplinado");
    setEmotionNote(entry.emotionNote || "");
    const currentBookId =
      (entry as any).journalBookId ||
      (activeJournalId === "ALL_BOOKS" ? "jb_main" : activeJournalId);
    setAssignedJournalId(currentBookId);
    setSelectedConfluences((entry as any).confluences || []);
    editDialogRef.current?.showModal();
  };

  // ==========================================
  // FLUJO DE PAPELERA (TRASH), RESTAURACIÓN Y ELIMINACIÓN DEFINITIVA
  // ==========================================
  const openTrashConfirmationModal = (entry: EnrichedJournalEntry) => {
    setTargetTrashEntry(entry);
    setTrashChallenge(generateTradingMathChallenge("TRASH"));
    setTrashAnswerInput("");
    trashDialogRef.current?.showModal();
  };

  const isTrashChallengeSolved =
    parseInt(trashAnswerInput.trim(), 10) === trashChallenge.expectedAnswer;

  const handleConfirmMoveToTrash = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!targetTrashEntry || !isTrashChallengeSolved) return;
    setIsMovingToTrash(true);

    try {
      const res = await fetch("/api/journal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: targetTrashEntry.id,
          action: "TRASH",
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEntries((prev) =>
          prev.map((item) =>
            item.id === targetTrashEntry.id
              ? { ...item, isDeleted: true, deletedAt: updated.deletedAt }
              : item
          )
        );
        trashDialogRef.current?.close();
        setAutoCloseAlert(
          `🗑️ Operación de ${
            targetTrashEntry.signal?.asset ?? "Volatility 75"
          } enviada a la Papelera.`
        );
        router.refresh();
      }
    } finally {
      setIsMovingToTrash(false);
    }
  };

  const handleRestoreFromTrash = async (entry: EnrichedJournalEntry) => {
    const res = await fetch("/api/journal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryId: entry.id,
        action: "RESTORE",
      }),
    });

    if (res.ok) {
      setEntries((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? { ...item, isDeleted: false, deletedAt: null }
            : item
        )
      );
      setAutoCloseAlert(
        `↺ Operación de ${
          entry.signal?.asset ?? "Volatility 75"
        } restaurada a tu Bitácora activa.`
      );
      router.refresh();
    }
  };

  const openPermanentDeleteModal = (entry: EnrichedJournalEntry) => {
    setTargetDeleteEntry(entry);
    setDeleteChallenge(generateTradingMathChallenge("DELETE"));
    setDeleteAnswerInput("");
    setDeleteKeywordInput("");
    permanentDeleteDialogRef.current?.showModal();
  };

  const isPermanentDeleteUnlocked =
    parseInt(deleteAnswerInput.trim(), 10) ===
      deleteChallenge.expectedAnswer &&
    deleteKeywordInput.trim().toUpperCase() === "LIQUIDAR";

  const handleConfirmPermanentDelete = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!targetDeleteEntry || !isPermanentDeleteUnlocked) return;
    setIsDeletingPermanently(true);

    try {
      const res = await fetch("/api/journal", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: targetDeleteEntry.id,
        }),
      });

      if (res.ok) {
        setEntries((prev) =>
          prev.filter((item) => item.id !== targetDeleteEntry.id)
        );
        permanentDeleteDialogRef.current?.close();
        setAutoCloseAlert(
          `✕ Operación eliminada definitivamente de la base de datos.`
        );
        router.refresh();
      }
    } finally {
      setIsDeletingPermanently(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEntry) return;
    setSaving(true);

    const finalOutcome: TradeOutcome =
      selectedStatus === "OPEN" ? "OPEN" : editAutoCalc.outcome;

    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalId: editingEntry.signalId,
          outcome: finalOutcome,
          lotSize: parseFloat(lotSize) || 0.1,
          executionPrice: parseFloat(executionPrice) || 0,
          targetTpPrice: targetTpPrice ? parseFloat(targetTpPrice) : null,
          targetSlPrice: targetSlPrice ? parseFloat(targetSlPrice) : null,
          exitPrice:
            selectedStatus !== "OPEN" && exitPrice
              ? parseFloat(exitPrice)
              : null,
          riskAmount: editAutoCalc.riskUsd,
          pnlAmount:
            selectedStatus === "OPEN" ? 0 : editAutoCalc.signedPnlUsd,
          tradingSession,
          followedPlan,
          emotionState,
          emotionNote: emotionNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        const parsedSlVal = targetSlPrice ? parseFloat(targetSlPrice) : null;
        try {
          const currentMetaStr = localStorage.getItem("synth_trade_meta");
          const currentMeta = currentMetaStr ? JSON.parse(currentMetaStr) : {};
          currentMeta[editingEntry.id] = {
            journalBookId: assignedJournalId,
            confluences: selectedConfluences,
            targetSlPrice: parsedSlVal,
          };
          localStorage.setItem("synth_trade_meta", JSON.stringify(currentMeta));
        } catch {}

        setEntries((prev) =>
          prev.map((item) =>
            item.id === editingEntry.id
              ? {
                  ...item,
                  ...updated,
                  targetSlPrice:
                    parsedSlVal !== null
                      ? parsedSlVal
                      : updated.targetSlPrice ?? item.targetSlPrice,
                  journalBookId: assignedJournalId,
                  confluences: selectedConfluences,
                }
              : item
          )
        );
        editDialogRef.current?.close();
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Alerta de Auto-Cierre o Acciones de Papelera */}
      {autoCloseAlert && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-400/50 bg-amber-400/15 px-4 py-3 text-xs font-bold text-amber-300 shadow-lg">
          <span>{autoCloseAlert}</span>
          <button
            type="button"
            onClick={() => setAutoCloseAlert(null)}
            className="ml-3 rounded-lg px-2 py-0.5 text-zinc-300 hover:bg-zinc-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECCIÓN MULTI-BITÁCORA & CONTROL DE ENTRADAS DIARIAS */}
      <section className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-4 space-y-3.5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Selector Listbox de Bitácora y Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-zinc-300">
                Bitácora Activa:
              </span>
            </div>

            <div className="w-64 max-w-full">
              <CustomSelect
                value={activeJournalId}
                onChange={(val) => handleSelectJournal(val)}
                options={journalListboxOptions}
              />
            </div>

            {/* Botón + Nueva Bitácora */}
            <button
              type="button"
              onClick={() => {
                setEditingJournalBook(null);
                setIsNewJournalOpen(true);
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs font-semibold text-amber-300 hover:border-amber-400 hover:bg-amber-400/10 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nueva Bitácora</span>
            </button>

            {/* Botón Editar Bitácora Activa */}
            {activeJournalId !== "ALL_BOOKS" && (
              <button
                type="button"
                onClick={() => {
                  const book = journalBooks.find(
                    (b) => b.id === activeJournalId
                  );
                  if (book) {
                    setEditingJournalBook(book);
                    setIsNewJournalOpen(true);
                  }
                }}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-amber-400/60 hover:text-amber-300 transition-colors"
                title="Editar nombre, metas o límites de esta bitácora"
              >
                <Pencil className="h-3.5 w-3.5 text-amber-400" />
                <span>Editar Bitácora</span>
              </button>
            )}
          </div>

          {/* Botón para Activar/Desactivar Widget Flotante */}
          <button
            type="button"
            onClick={() => setShowFloatingHud((prev) => !prev)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all shadow-sm ${
              showFloatingHud
                ? "border-amber-400/50 bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30"
                : "border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Activar o desactivar el monitor flotante movible"
          >
            <Target className="h-3.5 w-3.5 text-amber-400" />
            <span>Monitor Flotante {showFloatingHud ? "Activo" : "Oculto"}</span>
          </button>
        </div>

        {/* Resumen & Límites de la Bitácora Activa */}
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-850 bg-zinc-900/40 p-3.5 md:flex-row md:items-center md:justify-between text-xs">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-zinc-100 text-sm">
                {currentJournal.name}
              </span>
              <span className="text-xs text-zinc-400">
                • {currentJournal.description}
              </span>
              {activeJournalId !== "ALL_BOOKS" && (
                <button
                  type="button"
                  onClick={() => {
                    const book = journalBooks.find(
                      (b) => b.id === activeJournalId
                    );
                    if (book) {
                      setEditingJournalBook(book);
                      setIsNewJournalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-amber-400 hover:underline text-[11px] ml-1"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              )}
            </div>
            {currentJournal.maxDailyLossUsd && (
              <div className="text-[11px] text-zinc-400 font-mono">
                Límite de pérdida diaria permitida:{" "}
                <strong className="text-rose-400 font-bold">
                  ${currentJournal.maxDailyLossUsd} USD
                </strong>
                {todayRealizedLoss > 0 && (
                  <span className="text-zinc-400 ml-1.5">
                    (Hoy: <span className="text-rose-300 font-semibold">${todayRealizedLoss.toFixed(2)} USD</span>)
                  </span>
                )}
              </div>
            )}
            {currentJournal.autoTrade?.enabled && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isDailyLimitReached ||
                    (currentJournal.maxDailyLossUsd &&
                      todayRealizedLoss >= currentJournal.maxDailyLossUsd)
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" />
                  {isDailyLimitReached ||
                  (currentJournal.maxDailyLossUsd &&
                    todayRealizedLoss >= currentJournal.maxDailyLossUsd)
                    ? "Auto-Trading: Pausado (Límite del plan alcanzado)"
                    : `Auto-Trading: Activo (${currentJournal.autoTrade.defaultLotSize} lotes • ${currentJournal.autoTrade.targetTp})`}
                </span>
                {currentJournal.autoTrade.onlyInEntryZone && (
                  <span className="text-[11px] text-zinc-400">
                    • Esperando precio en Zona Institucional
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Widget de Entradas Hoy Integrado Limpiamente */}
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2 shrink-0">
            <div className="text-left sm:text-right">
              <div className="flex items-center gap-1.5 text-xs">
                <Target className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-zinc-400">Entradas de Hoy:</span>
                <span className="font-mono font-bold text-zinc-100">
                  {todayTradesCount} / {currentJournal.maxDailyTrades} máx
                </span>
              </div>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isDailyLimitReached
                        ? "bg-rose-500"
                        : todayTradesCount >= currentJournal.targetDailyTrades
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                    style={{ width: `${dailyTradesPercent}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] text-zinc-500">
                  {dailyTradesPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerta de Límite Diario Alcanzado (Anti-Overtrading) */}
        {isDailyLimitReached && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-200 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <div className="flex-1">
              <strong>Límite Diario Alcanzado ({todayTradesCount} de {currentJournal.maxDailyTrades} entradas):</strong>{" "}
              Has alcanzado tu cupo de trades diarios en <em>{currentJournal.name}</em>. Detén la operativa para respetar tu plan de trading y proteger tu consistencia institucional contra el overtrading.
            </div>
          </div>
        )}
      </section>

      {/* Cabecera de Bitácora */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Monitoreo Spot en Tiempo Real • Auto-Cierre por TP / SL Activo
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">
              🕒 Tu Hora: {detectedSessionInfo.localTimeStr} • Sesión Activa:{" "}
              <strong className="text-amber-400">
                {detectedSessionInfo.sessionLabel}
              </strong>
            </span>
          </div>
          <h1 className="mt-1 text-base font-extrabold text-zinc-100">
            Bitácora de Trading y Métricas en Vivo
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Cada operación guarda una copia inmutable de la señal original (
            <span className="text-amber-300">📡 Señal Original</span>) y
            selecciona tu sesión automáticamente según tu horario.
          </p>
        </div>

        <Link
          href="/feed"
          className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-amber-300"
        >
          + Registrar desde el Feed
        </Link>
      </div>

      {/* PANEL DE MÉTRICAS RELEVANTES (8 KPIs) */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* 1. PnL Neto Realizado ($) */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3.5">
          <span className="text-[11px] font-medium text-zinc-400">
            PnL Cerrado Neto
          </span>
          <div
            className={`mt-1 font-mono text-lg font-black ${
              metrics.netPnl > 0
                ? "text-emerald-400"
                : metrics.netPnl < 0
                ? "text-rose-400"
                : "text-zinc-200"
            }`}
          >
            {metrics.netPnl >= 0 ? "+" : "-"}$
            {Math.abs(metrics.netPnl).toFixed(2)}
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-zinc-500">
            <span className="text-emerald-400/90">
              +${metrics.grossProfit.toFixed(0)}
            </span>
            <span className="text-rose-400/90">
              -${metrics.grossLossAbs.toFixed(0)}
            </span>
          </div>
        </div>

        {/* 2. PnL Flotante en Vivo & Ganancia Estimada TP */}
        <div className="rounded-2xl border border-sky-500/30 bg-sky-950/10 p-3.5">
          <span className="text-[11px] font-medium text-sky-300">
            Flotante en Vivo ({metrics.openCount} abiertas)
          </span>
          <div
            className={`mt-1 font-mono text-lg font-black ${
              metrics.openFloatingPnl > 0
                ? "text-emerald-400"
                : metrics.openFloatingPnl < 0
                ? "text-rose-400"
                : "text-zinc-200"
            }`}
          >
            {metrics.openFloatingPnl >= 0 ? "+" : "-"}$
            {Math.abs(metrics.openFloatingPnl).toFixed(2)}
          </div>
          <div className="mt-1 font-mono text-[10px] text-emerald-400">
            Meta TP Estimada: +${metrics.openEstimatedTpProfit.toFixed(2)}
          </div>
        </div>

        {/* 3. Tarjeta de % de Efectividad */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3.5 transition-all hover:border-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full theme-accent-bg" />
              % de Efectividad
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                metrics.decisiveCount === 0
                  ? "bg-zinc-900 text-zinc-500 border border-zinc-800"
                  : metrics.winRate >= 60
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                  : metrics.winRate >= 50
                  ? "bg-amber-950/80 text-amber-300 border border-amber-800/50"
                  : "bg-rose-950/80 text-rose-300 border border-rose-800/50"
              }`}
            >
              {metrics.decisiveCount === 0
                ? "SIN TRADES"
                : metrics.winRate >= 60
                ? "ALTA EFECTIVIDAD"
                : metrics.winRate >= 50
                ? "RENTABLE"
                : "EN REVISIÓN"}
            </span>
          </div>

          <div className="mt-1.5 flex items-baseline gap-2">
            <div
              className={`font-mono text-xl font-black ${
                metrics.decisiveCount === 0
                  ? "text-zinc-500"
                  : metrics.winRate >= 60
                  ? "text-emerald-400"
                  : metrics.winRate >= 50
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {metrics.winRate.toFixed(1)}%
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              ({metrics.winsCount} de {metrics.decisiveCount} operaciones)
            </span>
          </div>

          {/* Barra visual de progreso de efectividad */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.decisiveCount === 0
                  ? "bg-zinc-800"
                  : metrics.winRate >= 60
                  ? "bg-emerald-400"
                  : metrics.winRate >= 50
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
              style={{
                width: `${
                  metrics.decisiveCount === 0
                    ? 0
                    : Math.min(100, Math.max(0, metrics.winRate))
                }%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-400">
            <span className="text-emerald-400 font-semibold">
              {metrics.winsCount} Ganadas
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-rose-400 font-semibold">
              {metrics.lossesCount} Pérdidas
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">{metrics.beCount} BE</span>
          </div>
        </div>

        {/* 4. Profit Factor */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3.5">
          <span className="text-[11px] font-medium text-zinc-400">
            Profit Factor
          </span>
          <div
            className={`mt-1 font-mono text-lg font-black ${
              metrics.profitFactor >= 1.5
                ? "text-emerald-400"
                : metrics.profitFactor >= 1.0
                ? "text-amber-400"
                : "text-rose-400"
            }`}
          >
            {metrics.profitFactor === 99.9
              ? "∞"
              : metrics.profitFactor.toFixed(2)}
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            Ratio Ganancia/Pérdida
          </div>
        </div>

        {/* 5. R-Múltiplo Acumulado y Promedio */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3.5">
          <span className="text-[11px] font-medium text-zinc-400">
            R-Múltiplo Total
          </span>
          <div
            className={`mt-1 font-mono text-base font-extrabold ${
              metrics.totalR >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {metrics.totalR >= 0 ? "+" : ""}
            {metrics.totalR.toFixed(2)}R
          </div>
          <div className="mt-1 font-mono text-[10px] text-zinc-400">
            Promedio: {metrics.avgR >= 0 ? "+" : ""}
            {metrics.avgR.toFixed(2)}R / trade
          </div>
        </div>

        {/* 6. Expectativa Matemática por Operación */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3.5">
          <span className="text-[11px] font-medium text-zinc-400">
            Expectativa / Trade
          </span>
          <div
            className={`mt-1 font-mono text-base font-extrabold ${
              metrics.expectancyUsd >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {metrics.expectancyUsd >= 0 ? "+" : "-"}$
            {Math.abs(metrics.expectancyUsd).toFixed(2)}
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            Valor esperado por entrada
          </div>
        </div>

        {/* 7. Promedio Ganancia vs Promedio Pérdida */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3.5">
          <span className="text-[11px] font-medium text-zinc-400">
            Avg Win vs Avg Loss
          </span>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono text-xs font-bold">
            <span className="text-emerald-400">
              +${metrics.avgWin.toFixed(0)}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-rose-400">
              -${metrics.avgLoss.toFixed(0)}
            </span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-zinc-400">
            R:B Promedio Real: 1:{metrics.realizedRR.toFixed(2)}
          </div>
        </div>

        {/* 8. Índice de Disciplina */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3.5">
          <span className="text-[11px] font-medium text-zinc-400">
            Cumplimiento del Plan
          </span>
          <div
            className={`mt-1 font-mono text-base font-extrabold ${
              metrics.disciplineRate >= 80
                ? "text-emerald-400"
                : "text-amber-400"
            }`}
          >
            {metrics.disciplineRate.toFixed(0)}%
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            Disciplina psicológica
          </div>
        </div>
      </section>

      {/* Filtros por Resultado + Pestaña de Papelera */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5">
          {[
            {
              key: "ALL" as const,
              label: `Todas (${activeEntries.length})`,
            },
            {
              key: "OPEN" as const,
              label: `⏳ Abiertas (${metrics.openCount})`,
            },
            {
              key: "WIN" as const,
              label: `✓ Ganadas (${metrics.winsCount})`,
            },
            {
              key: "LOSS" as const,
              label: `✕ Perdidas (${metrics.lossesCount})`,
            },
            {
              key: "BREAKEVEN" as const,
              label: `= BE (${metrics.beCount})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterOutcome(tab.key)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterOutcome === tab.key
                  ? "bg-amber-400 text-zinc-950"
                  : "border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pestaña de Papelera */}
        <button
          type="button"
          onClick={() => setFilterOutcome("TRASH")}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
            filterOutcome === "TRASH"
              ? "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
              : "border border-rose-900/50 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40"
          }`}
        >
          <span>🗑️ Papelera ({metrics.trashCount})</span>
        </button>
      </div>

      {/* Aviso contextual cuando el usuario está viendo la Papelera */}
      {filterOutcome === "TRASH" && (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/15 px-4 py-3 text-xs text-rose-200">
          <strong>🗑️ Papelera de Bitácora:</strong> Las operaciones aquí no
          afectan tus métricas de rendimiento. Puedes{" "}
          <strong>Restaurarlas</strong> a tu bitácora activa en cualquier
          momento o <strong>Eliminarlas Definitivamente</strong>.
        </div>
      )}

      {/* Lista de Operaciones en la Bitácora o Papelera */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-8 text-center">
          <p className="text-sm font-semibold text-zinc-200">
            {filterOutcome === "TRASH"
              ? "Tu papelera de trading está vacía"
              : "No hay operaciones registradas en este filtro"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {filterOutcome === "TRASH"
              ? "Las operaciones que envíes a la papelera aparecerán aquí por si necesitas restaurarlas."
              : "Registra o actualiza tus entradas desde cualquier tarjeta del Feed de Señales."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const sig = entry.signalSnapshot ?? entry.signal;
            const asset = sig?.asset ?? "Volatility 75";
            const direction = sig?.direction ?? "BUY";
            const isBuy = direction === "BUY";

            const tpPrice =
              entry.targetTpPrice ??
              sig?.takeProfit1 ??
              (isBuy ? entry.executionPrice + 15 : entry.executionPrice - 15);
            const slPrice =
              entry.targetSlPrice ??
              sig?.stopLoss ??
              (isBuy ? entry.executionPrice - 10 : entry.executionPrice + 10);

            const mult = getContractMultiplier(asset);
            const estimatedProfitUsd =
              entry.estimatedProfit ??
              Number(
                (
                  Math.abs(tpPrice - entry.executionPrice) *
                  entry.lotSize *
                  mult
                ).toFixed(2)
              );

            const liveSpot = quotes[asset]?.price ?? entry.executionPrice;
            const liveDiff = isBuy
              ? liveSpot - entry.executionPrice
              : entry.executionPrice - liveSpot;
            const liveFloatingUsd = Number(
              (liveDiff * entry.lotSize * mult).toFixed(2)
            );
            const liveFloatingR =
              entry.riskAmount > 0
                ? Number((liveFloatingUsd / entry.riskAmount).toFixed(2))
                : 0;

            const totalRange = Math.max(0.01, Math.abs(tpPrice - slPrice));
            const progressFromSl = isBuy
              ? ((liveSpot - slPrice) / totalRange) * 100
              : ((slPrice - liveSpot) / totalRange) * 100;
            const clampedProgress = Math.max(
              0,
              Math.min(100, progressFromSl)
            );

            const outcomeBadge =
              entry.outcome === "WIN"
                ? {
                    text: "✓ GANADA (TP)",
                    cls: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40",
                  }
                : entry.outcome === "LOSS"
                ? {
                    text: "✕ PERDIDA (SL)",
                    cls: "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40",
                  }
                : entry.outcome === "BREAKEVEN"
                ? {
                    text: "= BREAK EVEN",
                    cls: "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40",
                  }
                : {
                    text: "⏳ ABIERTA / EN CURSO",
                    cls: "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40",
                  };

            return (
              <article
                key={entry.id}
                className={`rounded-2xl border p-4 transition-all ${
                  entry.isDeleted
                    ? "border-rose-900/50 bg-zinc-950/75 opacity-90"
                    : entry.outcome === "OPEN"
                    ? "border-sky-500/40 bg-zinc-950 shadow-lg shadow-sky-500/5"
                    : "border-zinc-800/90 bg-zinc-950"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg px-2.5 py-0.5 text-[10px] font-extrabold ${outcomeBadge.cls}`}
                    >
                      {outcomeBadge.text}
                    </span>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isBuy
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {direction}
                    </span>

                    <span className="font-mono text-sm font-extrabold text-amber-400">
                      {asset}
                    </span>

                    <span className="text-xs text-zinc-400">
                      • {entry.strategyName}
                    </span>
                  </div>

                  {/* Acciones de Tarjeta: Señal Original + En Bitácora Activa vs En Papelera */}
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.outcome === "OPEN" && !entry.isDeleted ? (
                      <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[11px] text-zinc-400">
                          En Vivo:
                        </span>
                        <span
                          className={`font-mono text-sm font-black ${
                            liveFloatingUsd > 0
                              ? "text-emerald-400"
                              : liveFloatingUsd < 0
                              ? "text-rose-400"
                              : "text-zinc-200"
                          }`}
                        >
                          {liveFloatingUsd >= 0 ? "+" : "-"}$
                          {Math.abs(liveFloatingUsd).toFixed(2)} (
                          {liveFloatingR >= 0 ? "+" : ""}
                          {liveFloatingR}R)
                        </span>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`font-mono text-sm font-black ${
                            entry.pnlAmount > 0
                              ? "text-emerald-400"
                              : entry.pnlAmount < 0
                              ? "text-rose-400"
                              : "text-zinc-300"
                          }`}
                        >
                          {entry.pnlAmount > 0
                            ? `+$${entry.pnlAmount.toFixed(2)}`
                            : entry.pnlAmount < 0
                            ? `-$${Math.abs(entry.pnlAmount).toFixed(2)}`
                            : "$0.00"}
                        </span>

                        <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-300 ring-1 ring-zinc-800">
                          {entry.rMultiple > 0 ? "+" : ""}
                          {entry.rMultiple?.toFixed(2) ?? "0.00"}R
                        </span>
                      </>
                    )}

                    {/* Botón con Icono para ver la Señal Original completa (TP1, TP2, SL, Zona) */}
                    <button
                      type="button"
                      onClick={() => openOriginalSignalModal(entry)}
                      title="Ver Señal Original completa (Zona de Entrada, SL, TP1, TP2)"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-400/20"
                    >
                      <span>📡 Señal Original</span>
                    </button>

                    {!entry.isDeleted ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:border-amber-400/50 hover:bg-zinc-800"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openTrashConfirmationModal(entry)}
                          title="Enviar a la Papelera"
                          className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:border-rose-500/50 hover:bg-rose-950/60"
                        >
                          🗑️ Papelera
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRestoreFromTrash(entry)}
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          ↺ Restaurar
                        </button>
                        <button
                          type="button"
                          onClick={() => openPermanentDeleteModal(entry)}
                          className="rounded-lg border border-rose-500/50 bg-rose-500/20 px-3 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/35"
                        >
                          ✕ Eliminar por Completo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Detalles Técnicos + GANANCIA ESTIMADA (TP) Y RIESGO (SL) */}
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-zinc-900 bg-zinc-900/50 p-2.5 text-xs sm:grid-cols-6">
                  <div>
                    <span className="block text-[10px] text-zinc-500">
                      Loteaje
                    </span>
                    <span className="font-mono font-bold text-zinc-100">
                      {entry.lotSize.toFixed(2)} lots
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500">
                      Entrada Real
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {entry.executionPrice.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500">
                      Meta TP / Salida
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {entry.outcome === "OPEN"
                        ? `TP: ${tpPrice.toFixed(2)}`
                        : entry.exitPrice
                        ? entry.exitPrice.toFixed(2)
                        : tpPrice.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-emerald-400/90">
                      Ganancia Estimada (TP)
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      +${estimatedProfitUsd.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-rose-400/90">
                      Riesgo SL ({slPrice.toFixed(2)})
                    </span>
                    <span className="font-mono font-bold text-rose-400">
                      -${(entry.riskAmount ?? 100).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500">
                      Sesión / Plan
                    </span>
                    <span className="font-medium text-zinc-300">
                      {SESSION_LABELS[entry.session || "NEW_YORK"]} •{" "}
                      <span
                        className={
                          entry.followedPlan
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {entry.followedPlan ? "Plan OK" : "Rompió"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* PANEL EN TIEMPO REAL PARA OPERACIONES EN CURSO (OPEN) CON AUTO-CIERRE */}
                {entry.outcome === "OPEN" && !entry.isDeleted && (
                  <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-950/15 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-sky-300">
                          Spot Actual: {liveSpot.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          (Se cerrará sola automáticamente si toca SL{" "}
                          <strong className="font-mono text-rose-400">
                            {slPrice.toFixed(2)}
                          </strong>{" "}
                          o TP{" "}
                          <strong className="font-mono text-emerald-400">
                            {tpPrice.toFixed(2)}
                          </strong>
                          )
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            triggerAutoCloseTrade(
                              entry,
                              liveFloatingUsd >= 0 ? "WIN" : "LOSS",
                              liveSpot,
                              "Cerrada a Precio Spot en Vivo"
                            )
                          }
                          className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-300 hover:bg-amber-400/25"
                        >
                          ⚡ Cerrar a Spot ({liveSpot.toFixed(2)})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            triggerAutoCloseTrade(
                              entry,
                              "WIN",
                              tpPrice,
                              "Auto-Cierre por Toque de TP"
                            )
                          }
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          ✓ Simular Toque TP ({tpPrice.toFixed(2)})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            triggerAutoCloseTrade(
                              entry,
                              "LOSS",
                              slPrice,
                              "Auto-Cierre por Toque de SL"
                            )
                          }
                          className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 font-mono text-[10px] font-bold text-rose-300 hover:bg-rose-500/25"
                        >
                          ✕ Simular Toque SL ({slPrice.toFixed(2)})
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="flex justify-between font-mono text-[10px] text-zinc-400">
                        <span className="text-rose-400">
                          SL: {slPrice.toFixed(2)} (-$
                          {entry.riskAmount.toFixed(0)})
                        </span>
                        <span className="text-zinc-300">
                          Entrada: {entry.executionPrice.toFixed(2)}
                        </span>
                        <span className="text-emerald-400">
                          TP: {tpPrice.toFixed(2)} (+$
                          {estimatedProfitUsd.toFixed(0)})
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            liveFloatingUsd >= 0
                              ? "bg-gradient-to-r from-amber-400 to-emerald-400"
                              : "bg-gradient-to-r from-rose-500 to-amber-400"
                          }`}
                          style={{ width: `${clampedProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Psicología, Confluencias y Nota */}
                <div className="mt-2.5 flex flex-col gap-2 pt-2 border-t border-zinc-850/60 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Badge de Bitácora a la que pertenece */}
                      {(() => {
                        const book = journalBooks.find(
                          (b) =>
                            b.id === ((entry as any).journalBookId || "jb_main")
                        );
                        if (!book) return null;
                        const dotColor =
                          book.color === "emerald"
                            ? "bg-emerald-400"
                            : book.color === "cyan"
                            ? "bg-cyan-400"
                            : book.color === "rose"
                            ? "bg-rose-400"
                            : book.color === "purple"
                            ? "bg-purple-400"
                            : "bg-amber-400";
                        return (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                            />
                            <span>{book.name}</span>
                          </span>
                        );
                      })()}

                      {/* Estado Emocional */}
                      <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-300 ring-1 ring-zinc-800">
                        🧠 {entry.emotionState || "Disciplinado"}
                      </span>

                      {/* Cumplimiento de Reglas */}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          entry.followedPlan
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {entry.followedPlan
                          ? "✓ Plan respetado"
                          : "✕ Fuera de plan"}
                      </span>

                      {entry.emotionNote && (
                        <span className="text-zinc-400 italic text-[11px]">
                          &ldquo;{entry.emotionNote}&rdquo;
                        </span>
                      )}
                    </div>

                    <span className="font-mono text-[10px] text-zinc-500">
                      {new Date(entry.createdAt).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Confluencias Técnicas / Checklist del Setup */}
                  {entry.confluences && entry.confluences.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-zinc-500 font-semibold mr-1">
                        Confluencias:
                      </span>
                      {entry.confluences.map((conf) => (
                        <span
                          key={conf}
                          className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300"
                        >
                          {conf}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =================================================================
          MODAL 0: VISOR DE SEÑAL ORIGINAL GUARDADA EN BITÁCORA (TP1, TP2, SL, ZONA)
         ================================================================= */}
      <dialog
        ref={originalSignalDialogRef}
        closedby="any"
        className="m-auto w-[calc(100%-1.5rem)] max-w-lg rounded-2xl border border-amber-400/35 bg-zinc-950 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-xs"
      >
        {(() => {
          const entry = inspectingSignalEntry;
          const snap = entry?.signalSnapshot;
          const fallbackSig = entry?.signal;
          const asset = snap?.asset ?? fallbackSig?.asset ?? "Volatility 75";
          const direction = snap?.direction ?? fallbackSig?.direction ?? "BUY";
          const isBuyOrig = direction === "BUY";
          const entryMin =
            snap?.entryPrice ??
            fallbackSig?.entryPrice ??
            entry?.executionPrice ??
            4152.5;
          const entryMax =
            snap?.entryZoneMax ?? fallbackSig?.entryZoneMax ?? null;
          const sl =
            snap?.stopLoss ??
            fallbackSig?.stopLoss ??
            (isBuyOrig ? entryMin - 10 : entryMin + 10);
          const tp1 =
            snap?.takeProfit1 ??
            fallbackSig?.takeProfit1 ??
            (isBuyOrig ? entryMin + 15 : entryMin - 15);
          const tp2 = snap?.takeProfit2 ?? fallbackSig?.takeProfit2 ?? null;
          const stratName =
            snap?.strategyName ??
            entry?.strategyName ??
            "Estrategia Institucional";
          const stratDesc = snap?.strategyDescription;
          const stratWr = snap?.strategyWinRate ?? 78.5;
          const stratTf = snap?.strategyTimeframe ?? "M15";

          const origMetrics = calculateTradeMetrics({
            asset,
            direction,
            lotSize: entry?.lotSize ?? 0.2,
            executionPrice: entryMin,
            exitPrice: tp1,
            stopLoss: sl,
            takeProfit1: tp1,
            takeProfit2: tp2,
          });

          const mult = getContractMultiplier(asset);
          const lots = entry?.lotSize ?? 0.2;
          const tp1ProfitUsd = Number(
            (Math.abs(tp1 - entryMin) * lots * mult).toFixed(2)
          );
          const tp2ProfitUsd = tp2
            ? Number((Math.abs(tp2 - entryMin) * lots * mult).toFixed(2))
            : null;
          const slRiskUsd = Number(
            (Math.abs(entryMin - sl) * lots * mult).toFixed(2)
          );

          const userExec = entry?.executionPrice ?? entryMin;
          const insideZone = entryMax
            ? userExec >= Math.min(entryMin, entryMax) &&
              userExec <= Math.max(entryMin, entryMax)
            : Math.abs(userExec - entryMin) <= 0.5;
          const entryDiffPts = Number((userExec - entryMin).toFixed(2));

          return (
            <div className="space-y-4">
              {/* Cabecera del Modal de Señal Original */}
              <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    📡 Copia Inmutable de Señal Original Guardada
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg px-2.5 py-0.5 text-xs font-extrabold ${
                        isBuyOrig
                          ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                          : "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                      }`}
                    >
                      {isBuyOrig ? "COMPRA (BUY)" : "VENTA (SELL)"}
                    </span>
                    <h2 className="font-mono text-lg font-black text-amber-400">
                      {asset}
                    </h2>
                    <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-300 ring-1 ring-zinc-800">
                      {stratTf} • WR {stratWr}%
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => originalSignalDialogRef.current?.close()}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>

              {/* Estrategia y contexto institucional */}
              <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-zinc-100">{stratName}</span>
                  <span className="font-mono text-[11px] text-emerald-400">
                    R:B Original 1:{origMetrics.plannedRR1}
                    {origMetrics.plannedRR2
                      ? ` / 1:${origMetrics.plannedRR2}`
                      : ""}
                  </span>
                </div>
                {stratDesc && (
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    {stratDesc}
                  </p>
                )}
              </div>

              {/* Todos los Niveles Originales (Zona de Entrada, SL, TP1 y TP2) con botón Copiar */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {/* Zona de Entrada Original */}
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Zona de Entrada Original
                    </span>
                    <span className="font-mono text-sm font-black text-zinc-100">
                      {entryMax
                        ? `${entryMin.toFixed(2)} - ${entryMax.toFixed(2)}`
                        : entryMin.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyOriginalSignalLevel(entryMin, "ENTRY")}
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-zinc-300 hover:border-amber-400 hover:text-amber-300"
                  >
                    {copiedSignalField === "ENTRY" ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>

                {/* Stop Loss Original */}
                <div className="flex items-center justify-between rounded-xl border border-rose-950/70 bg-rose-950/20 p-3">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-rose-400/90">
                      Stop Loss Original (SL)
                    </span>
                    <span className="font-mono text-sm font-black text-rose-400">
                      {sl.toFixed(2)}
                    </span>
                    <span className="block font-mono text-[10px] text-rose-300/80">
                      Riesgo 1R ({lots.toFixed(2)} lots): -${slRiskUsd.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyOriginalSignalLevel(sl, "SL")}
                    className="rounded-lg border border-rose-900/60 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-rose-300 hover:border-rose-400"
                  >
                    {copiedSignalField === "SL" ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>

                {/* Take Profit 1 Original (TP1) */}
                <div className="flex items-center justify-between rounded-xl border border-emerald-950/70 bg-emerald-950/20 p-3">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      Take Profit 1 (1:{origMetrics.plannedRR1})
                    </span>
                    <span className="font-mono text-sm font-black text-emerald-400">
                      {tp1.toFixed(2)}
                    </span>
                    <span className="block font-mono text-[10px] text-emerald-300/80">
                      Proyección ({lots.toFixed(2)} lots): +$
                      {tp1ProfitUsd.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyOriginalSignalLevel(tp1, "TP1")}
                    className="rounded-lg border border-emerald-900/60 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-emerald-300 hover:border-emerald-400"
                  >
                    {copiedSignalField === "TP1" ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>

                {/* Take Profit 2 Original (TP2) */}
                <div className="flex items-center justify-between rounded-xl border border-emerald-950/70 bg-emerald-950/20 p-3">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      Take Profit 2{" "}
                      {origMetrics.plannedRR2
                        ? `(1:${origMetrics.plannedRR2})`
                        : ""}
                    </span>
                    <span className="font-mono text-sm font-black text-emerald-300">
                      {tp2 ? tp2.toFixed(2) : "Sin TP2 (Objetivo Único)"}
                    </span>
                    {tp2ProfitUsd !== null && (
                      <span className="block font-mono text-[10px] text-emerald-300/80">
                        Proyección ({lots.toFixed(2)} lots): +$
                        {tp2ProfitUsd.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {tp2 && (
                    <button
                      type="button"
                      onClick={() => copyOriginalSignalLevel(tp2, "TP2")}
                      className="rounded-lg border border-emerald-900/60 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-emerald-300 hover:border-emerald-400"
                    >
                      {copiedSignalField === "TP2" ? "✓ Copiado" : "Copiar"}
                    </button>
                  )}
                </div>
              </div>

              {/* Auditoría Comparativa: Señal Original vs Tu Ejecución en Bitácora */}
              {entry && (
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3.5 text-xs">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    🔍 Comparativa: Señal Original vs. Tu Ejecución Real
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div>
                      <span className="block text-[10px] text-zinc-400">
                        Tu Entrada Real
                      </span>
                      <span className="font-mono text-sm font-bold text-zinc-100">
                        {entry.executionPrice.toFixed(2)}
                      </span>
                      <span
                        className={`block text-[10px] font-semibold ${
                          insideZone ? "text-emerald-400" : "text-amber-300"
                        }`}
                      >
                        {insideZone
                          ? "✓ Dentro de zona oficial"
                          : `Desviación: ${
                              entryDiffPts > 0 ? "+" : ""
                            }${entryDiffPts} pts`}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-rose-400/90">
                        Tu SL Configurado
                      </span>
                      <span className="font-mono text-sm font-bold text-rose-400">
                        {(entry.targetSlPrice ?? sl).toFixed(2)}
                      </span>
                      <span className="block font-mono text-[10px] text-zinc-400">
                        {Math.abs((entry.targetSlPrice ?? sl) - sl) < 0.05
                          ? "= SL de Señal"
                          : "SL Personalizado"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-emerald-400/90">
                        Tu TP Configurado
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        {(entry.targetTpPrice ?? tp1).toFixed(2)}
                      </span>
                      <span className="block font-mono text-[10px] text-zinc-400">
                        {Math.abs((entry.targetTpPrice ?? tp1) - tp1) < 0.05
                          ? "= Apuntó a TP1"
                          : tp2 &&
                            Math.abs((entry.targetTpPrice ?? tp1) - tp2) < 0.05
                          ? "= Apuntó a TP2"
                          : "TP Personalizado"}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-zinc-400">
                        Sesión Registrada
                      </span>
                      <span className="font-semibold text-zinc-200">
                        {SESSION_LABELS[entry.session || "NEW_YORK"]}
                      </span>
                      <span className="block font-mono text-[10px] text-zinc-400">
                        Loteaje: {entry.lotSize.toFixed(2)} lots
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                {entry && !entry.isDeleted && (
                  <button
                    type="button"
                    onClick={() => {
                      originalSignalDialogRef.current?.close();
                      openEditModal(entry);
                    }}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-zinc-800"
                  >
                    Editar Mi Ejecución
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => originalSignalDialogRef.current?.close()}
                  className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-extrabold text-zinc-950 hover:bg-amber-300"
                >
                  Cerrar Vista de Señal
                </button>
              </div>
            </div>
          );
        })()}
      </dialog>

      {/* =================================================================
          MODAL 1: CONFIRMACIÓN DE ENVÍO A PAPELERA (RETO MATEMÁTICO TRADING)
         ================================================================= */}
      <dialog
        ref={trashDialogRef}
        closedby="any"
        className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Control Anti-Impulso • Enviar a Papelera
            </span>
            <h2 className="text-base font-bold text-zinc-100">
              Confirmar envío a la Papelera
            </h2>
          </div>
          <button
            type="button"
            onClick={() => trashDialogRef.current?.close()}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirmMoveToTrash} className="mt-4 space-y-4">
          <p className="text-xs leading-relaxed text-zinc-300">
            Vas a mover la operación de{" "}
            <strong className="font-mono text-amber-400">
              {targetTrashEntry?.signal?.asset ?? "Volatility 75"}
            </strong>{" "}
            a la <strong>Papelera</strong> (podrás restaurarla después si lo
            necesitas).
          </p>

          {/* Reto matemático de trading */}
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Verificación Rápida de Trader
            </span>
            <p className="mt-1 text-xs text-zinc-200">
              {trashChallenge.question}
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <span className="rounded-lg bg-zinc-900 px-3 py-2 font-mono text-sm font-black text-amber-400 ring-1 ring-zinc-800">
                {trashChallenge.formulaLabel}
              </span>
              <input
                type="number"
                inputMode="numeric"
                required
                value={trashAnswerInput}
                onChange={(e) => setTrashAnswerInput(e.target.value)}
                placeholder="Resultado..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm font-bold text-zinc-100 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => trashDialogRef.current?.close()}
              className="w-1/3 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isTrashChallengeSolved || isMovingToTrash}
              className="w-2/3 rounded-xl bg-amber-400 py-2.5 text-xs font-extrabold text-zinc-950 transition-all hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isMovingToTrash
                ? "Moviendo..."
                : "🗑️ Confirmar y Enviar a Papelera"}
            </button>
          </div>
        </form>
      </dialog>

      {/* =================================================================
          MODAL 2: CONFIRMACIÓN DE ELIMINACIÓN DEFINITIVA DESDE PAPELERA
         ================================================================= */}
      <dialog
        ref={permanentDeleteDialogRef}
        closedby="any"
        className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-2xl border border-rose-900/70 bg-zinc-950 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/85 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Acción Irreversible • Auditoría de Cuenta
            </span>
            <h2 className="text-base font-bold text-zinc-100">
              Eliminar Operación por Completo
            </h2>
          </div>
          <button
            type="button"
            onClick={() => permanentDeleteDialogRef.current?.close()}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirmPermanentDelete} className="mt-4 space-y-4">
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/25 p-3 text-xs text-rose-200">
            ⚠️ Estás a punto de borrar definitivamente la operación de{" "}
            <strong className="font-mono text-amber-300">
              {targetDeleteEntry?.signal?.asset ?? "Volatility 75"}
            </strong>
            . Una vez eliminada de la papelera, no se podrá recuperar.
          </div>

          {/* Paso 1: Suma de Riesgo/Beneficio */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Paso 1: Resuelve el Cálculo de Riesgo/Beneficio
            </span>
            <p className="mt-1 text-xs text-zinc-300">
              {deleteChallenge.question}
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <span className="rounded-lg bg-zinc-950 px-3 py-2 font-mono text-sm font-black text-amber-400 ring-1 ring-zinc-800">
                {deleteChallenge.formulaLabel}
              </span>
              <input
                type="number"
                inputMode="numeric"
                required
                value={deleteAnswerInput}
                onChange={(e) => setDeleteAnswerInput(e.target.value)}
                placeholder="Suma..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm font-bold text-zinc-100 focus:border-rose-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Paso 2: Palabra clave de trading LIQUIDAR */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-zinc-300">
                Paso 2: Escribe{" "}
                <strong className="font-mono text-rose-400">LIQUIDAR</strong>{" "}
                para confirmar
              </label>
              <button
                type="button"
                onClick={() => setDeleteKeywordInput("LIQUIDAR")}
                className="font-mono text-[10px] text-amber-400 hover:underline"
              >
                Autocompletar &ldquo;LIQUIDAR&rdquo;
              </button>
            </div>
            <input
              type="text"
              required
              value={deleteKeywordInput}
              onChange={(e) => setDeleteKeywordInput(e.target.value)}
              placeholder="Escribe LIQUIDAR"
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold uppercase text-rose-300 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => permanentDeleteDialogRef.current?.close()}
              className="w-1/3 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isPermanentDeleteUnlocked || isDeletingPermanently}
              className="w-2/3 rounded-xl bg-rose-500 py-2.5 text-xs font-extrabold text-white transition-all hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isDeletingPermanently
                ? "Eliminando..."
                : "✕ Eliminar Definitivamente"}
            </button>
          </div>
        </form>
      </dialog>

      {/* =================================================================
          MODAL 3: EDITAR / ACTUALIZAR ESTADO Y RESULTADO
         ================================================================= */}
      <dialog
        ref={editDialogRef}
        closedby="any"
        className="m-auto w-[calc(100%-1.5rem)] max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Actualizar Estado y Resultado
            </span>
            <h2 className="text-base font-bold text-zinc-100">
              {editingEntry?.signal?.asset ?? "Volatility 75"} (
              {editingEntry?.signal?.direction ?? "BUY"}) •{" "}
              {editingEntry?.strategyName}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => editDialogRef.current?.close()}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400">
              1. Estado de la Operación
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => handleEditStatusChange("OPEN")}
                className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                  selectedStatus === "OPEN"
                    ? "bg-sky-500 text-zinc-950 ring-2 ring-sky-300"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                ⏳ Abierta / En Curso
              </button>

              <button
                type="button"
                onClick={() => handleEditStatusChange("WIN")}
                className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                  selectedStatus === "WIN"
                    ? "bg-emerald-500 text-zinc-950 ring-2 ring-emerald-300"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                ✓ Ganada (TP)
              </button>

              <button
                type="button"
                onClick={() => handleEditStatusChange("LOSS")}
                className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                  selectedStatus === "LOSS"
                    ? "bg-rose-500 text-white ring-2 ring-rose-300"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                ✕ Perdida (SL)
              </button>

              <button
                type="button"
                onClick={() => handleEditStatusChange("BREAKEVEN")}
                className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                  selectedStatus === "BREAKEVEN"
                    ? "bg-amber-400 text-zinc-950 ring-2 ring-amber-300"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                = Break Even
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <label className="block text-[11px] text-zinc-400">
                Loteaje (Lots)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400">
                Precio Entrada
              </label>
              <input
                type="number"
                step="0.01"
                value={executionPrice}
                onChange={(e) => setExecutionPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold text-zinc-100"
              />
            </div>

            {/* Campo Stop Loss (SL) Editable */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-[11px] text-rose-400">
                  Stop Loss (SL)
                </label>
                {(editingEntry?.signalSnapshot || editingEntry?.signal) && (
                  <button
                    type="button"
                    onClick={() => {
                      const origSl = (
                        editingEntry.signalSnapshot?.stopLoss ??
                        editingEntry.signal?.stopLoss ??
                        0
                      ).toFixed(2);
                      setTargetSlPrice(origSl);
                      if (selectedStatus === "LOSS") setExitPrice(origSl);
                    }}
                    title="Restablecer al SL original de la señal"
                    className="font-mono text-[9px] text-rose-400/80 hover:text-rose-300 hover:underline"
                  >
                    Señal:{" "}
                    {(
                      editingEntry.signalSnapshot?.stopLoss ??
                      editingEntry.signal?.stopLoss ??
                      0
                    ).toFixed(2)}
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                value={targetSlPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setTargetSlPrice(val);
                  if (selectedStatus === "LOSS") {
                    setExitPrice(val);
                  }
                }}
                className="mt-1 w-full rounded-xl border border-rose-900/60 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold text-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] text-emerald-400">
                Take Profit (TP)
              </label>
              <input
                type="number"
                step="0.01"
                value={targetTpPrice}
                onChange={(e) => {
                  setTargetTpPrice(e.target.value);
                  if (selectedStatus === "WIN") {
                    setExitPrice(e.target.value);
                  }
                }}
                className="mt-1 w-full rounded-xl border border-emerald-900/60 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold text-emerald-400"
              />
            </div>

            <div className="col-span-2 sm:col-span-1 lg:col-span-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] text-zinc-400">
                  Precio Salida
                </label>
                {(editingEntry?.signalSnapshot || editingEntry?.signal) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus("LOSS");
                      const slVal =
                        targetSlPrice ||
                        (
                          editingEntry.signalSnapshot?.stopLoss ??
                          editingEntry.signal?.stopLoss ??
                          0
                        ).toFixed(2);
                      setExitPrice(slVal);
                    }}
                    className="font-mono text-[9px] text-rose-400 hover:underline"
                  >
                    SL:{" "}
                    {targetSlPrice ||
                      (
                        editingEntry.signalSnapshot?.stopLoss ??
                        editingEntry.signal?.stopLoss ??
                        0
                      ).toFixed(2)}
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                disabled={selectedStatus === "OPEN"}
                value={selectedStatus === "OPEN" ? "" : exitPrice}
                placeholder={selectedStatus === "OPEN" ? "En curso..." : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setExitPrice(val);
                  const num = parseFloat(val);
                  const entryNum = parseFloat(executionPrice);
                  const isBuyDir =
                    (editingEntry?.signal?.direction ?? "BUY") === "BUY";
                  if (!isNaN(num) && !isNaN(entryNum)) {
                    const diff = isBuyDir ? num - entryNum : entryNum - num;
                    if (Math.abs(diff) < 0.01) setSelectedStatus("BREAKEVEN");
                    else if (diff > 0) setSelectedStatus("WIN");
                    else setSelectedStatus("LOSS");
                  }
                }}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold text-zinc-100 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="block text-[10px] text-zinc-400">
                  {selectedStatus === "OPEN"
                    ? "Ganancia Estimada (TP)"
                    : editAutoCalc.signedPnlUsd >= 0
                    ? "Monto Ganado (+)"
                    : "Monto Perdido (-)"}
                </span>
                <span
                  className={`font-mono text-sm font-black ${
                    selectedStatus === "OPEN"
                      ? "text-sky-400"
                      : editAutoCalc.signedPnlUsd > 0
                      ? "text-emerald-400"
                      : editAutoCalc.signedPnlUsd < 0
                      ? "text-rose-400"
                      : "text-zinc-200"
                  }`}
                >
                  {selectedStatus === "OPEN"
                    ? `+$${editAutoCalc.projectedProfitUsd.toFixed(2)}`
                    : editAutoCalc.signedPnlUsd > 0
                    ? `+$${editAutoCalc.signedPnlUsd.toFixed(2)}`
                    : editAutoCalc.signedPnlUsd < 0
                    ? `-$${Math.abs(editAutoCalc.signedPnlUsd).toFixed(2)}`
                    : "$0.00"}
                </span>
              </div>

              <div>
                <span className="block text-[10px] text-zinc-400">
                  Riesgo SL (1R)
                </span>
                <span className="font-mono text-sm font-black text-rose-400">
                  -${editAutoCalc.riskUsd.toFixed(2)}
                </span>
              </div>

              <div>
                <span className="block text-[10px] text-zinc-400">
                  Riesgo : Beneficio
                </span>
                <span className="font-mono text-sm font-black text-amber-400">
                  {selectedStatus === "OPEN"
                    ? `1 : ${editAutoCalc.plannedRR1}`
                    : `1 : ${editAutoCalc.realizedRR} (${
                        editAutoCalc.rMultiple > 0 ? "+" : ""
                      }${editAutoCalc.rMultiple}R)`}
                </span>
              </div>
            </div>
          </div>

          {/* Asignación de Bitácora y Sesión */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Bitácora Asignada
              </label>
              <CustomSelect
                value={assignedJournalId}
                onChange={(val) => setAssignedJournalId(val)}
                options={journalBooks.map((b) => ({
                  value: b.id,
                  label: b.name,
                  badge: `${b.maxDailyTrades}/día`,
                  sublabel: b.description,
                }))}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Sesión de Mercado
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const fresh = detectTradingSessionByTime();
                    setDetectedSessionInfo(fresh);
                    setTradingSession(fresh.session);
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-300 ring-1 ring-amber-400/30 hover:bg-amber-400/25"
                >
                  🕒 Auto ({detectedSessionInfo.localTimeStr})
                </button>
              </div>
              <CustomSelect
                value={tradingSession}
                onChange={(val) => setTradingSession(val as TradingSession)}
                options={sessionSelectOptions}
              />
            </div>
          </div>

          {/* Confluencias Técnicas del Setup (1-Click Tags) */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200">
                Confluencias Técnicas / Checklist del Setup
              </label>
              <span className="font-mono text-[10px] text-amber-400">
                {selectedConfluences.length} seleccionadas
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SETUP_CONFLUENCES.map((conf) => {
                const isSelected = selectedConfluences.includes(conf);
                return (
                  <button
                    key={conf}
                    type="button"
                    onClick={() => {
                      setSelectedConfluences((prev) =>
                        isSelected
                          ? prev.filter((c) => c !== conf)
                          : [...prev, conf]
                      );
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                      isSelected
                        ? "border border-amber-400/80 bg-amber-400/20 text-amber-200 shadow-sm ring-1 ring-amber-400/40"
                        : "border border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {conf}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cumplimiento del Plan de Trading */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              ¿Seguiste tu plan al pie de la letra?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFollowedPlan(true)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                  followedPlan
                    ? "border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>✓ Sí, respeté mis reglas</span>
              </button>
              <button
                type="button"
                onClick={() => setFollowedPlan(false)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                  !followedPlan
                    ? "border border-rose-500/60 bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>✕ No, operé por impulso</span>
              </button>
            </div>
          </div>

          {/* Estado Emocional / Psicología al Operar */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Estado Psicológico / Emocional al operar
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {EMOTION_OPTIONS.map((item) => {
                const isSelected = emotionState === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setEmotionState(item.label)}
                    className={`flex flex-col items-start rounded-xl border p-2 text-left transition-all ${
                      isSelected
                        ? "border-amber-400/80 bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/40"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span>{item.emoji}</span>
                      <span
                        className={
                          isSelected ? "text-amber-300" : "text-zinc-200"
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-0.5">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notas de la Operación */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Notas de la Operación / Lecciones Aprendidas
            </label>
            <textarea
              rows={2}
              value={emotionNote}
              onChange={(e) => setEmotionNote(e.target.value)}
              placeholder="¿Qué viste en el gráfico? ¿Qué puedes mejorar para la siguiente entrada?"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => editDialogRef.current?.close()}
              className="w-1/3 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-2/3 rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-300 transition-colors"
            >
              {saving ? "Actualizando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal de Creación / Edición de Bitácora */}
      <NewJournalModal
        isOpen={isNewJournalOpen}
        onClose={() => {
          setIsNewJournalOpen(false);
          setEditingJournalBook(null);
        }}
        onSaveJournal={handleSaveJournalBook}
        initialBook={editingJournalBook}
        onDeleteJournal={handleDeleteJournalBook}
      />

      {/* Monitor Flotante y Movible de Entradas de Hoy (HUD) */}
      <FloatingDailyTradesHud
        isOpen={showFloatingHud}
        onClose={() => setShowFloatingHud(false)}
        journalName={currentJournal.name}
        todayTradesCount={todayTradesCount}
        maxDailyTrades={currentJournal.maxDailyTrades}
        targetDailyTrades={currentJournal.targetDailyTrades}
        isDailyLimitReached={isDailyLimitReached}
        dailyTradesPercent={dailyTradesPercent}
        autoTradeEnabled={Boolean(currentJournal.autoTrade?.enabled)}
      />
    </div>
  );
}
