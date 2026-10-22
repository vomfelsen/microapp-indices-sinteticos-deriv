"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AppJournalEntry,
  TradeOutcome,
  TradingSession,
} from "@/lib/data-service";
import {
  calculateTradeMetrics,
  detectTradingSessionByTime,
  getTradingSessionOptionsForLocalZone,
  type DetectedSessionInfo,
} from "@/lib/trade-calculator";
import { CustomSelect } from "@/components/ui/CustomSelect";

export type SignalDirection = "BUY" | "SELL";
export type SignalStatus =
  | "ACTIVE"
  | "HIT_TP1"
  | "HIT_TP2"
  | "HIT_SL"
  | "CANCELLED";

export interface SignalData {
  id: string;
  asset: string; // Ej: "XAU/USD"
  direction: SignalDirection;
  strategyName: string;
  strategyWinRate: number;
  entryPrice: number;
  entryZoneMax?: number | null;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number | null;
  status: SignalStatus;
  createdAt: string;
  hasJournalEntry?: boolean;
  journalEntry?: AppJournalEntry | null;
  liveSpotPrice?: number;
}

interface SignalCardProps {
  signal: SignalData;
}

const EMOTION_STATES = [
  "Disciplinado",
  "Enfocado",
  "FOMO / Ansiedad",
  "Miedo / Duda",
  "Sobreconfianza",
  "Revancha",
];

const QUICK_NOTES = [
  "Seguí el plan al 100%",
  "Entré tarde por 5 pips",
  "Cerré parcial en TP1 y BE",
  "Moví SL antes de tiempo",
];

const SSR_DEFAULT_SESSION_INFO: DetectedSessionInfo = {
  session: "NEW_YORK",
  sessionLabel: "🇺🇸 Nueva York (NY Open)",
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

export function SignalCard({ signal }: SignalCardProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();

  const existing = signal.journalEntry;
  const defaultExecPrice =
    existing?.executionPrice ?? signal.liveSpotPrice ?? signal.entryPrice;

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 1. Estado explícito de la operación (Abierta/En Curso, Ganada, Perdida, Break Even)
  const [selectedStatus, setSelectedStatus] = useState<TradeOutcome>(
    existing?.outcome ?? "OPEN"
  );

  // 2. Inputs de Ejecución: Loteaje, Entrada, TP Objetivo y Precio de Salida
  const [lotSize, setLotSize] = useState<string>(
    existing ? String(existing.lotSize) : "0.20"
  );
  const [executionPrice, setExecutionPrice] = useState<string>(
    defaultExecPrice.toFixed(2)
  );
  const [targetTpPrice, setTargetTpPrice] = useState<string>(
    signal.takeProfit1.toFixed(2)
  );
  const [exitPrice, setExitPrice] = useState<string>(
    existing?.exitPrice
      ? existing.exitPrice.toFixed(2)
      : signal.takeProfit1.toFixed(2)
  );

  const [detectedSessionInfo, setDetectedSessionInfo] =
    useState<DetectedSessionInfo>(SSR_DEFAULT_SESSION_INFO);
  const [tradingSession, setTradingSession] = useState<TradingSession>(
    existing?.session ?? "NEW_YORK"
  );
  const [sessionSelectOptions, setSessionSelectOptions] = useState(
    SSR_DEFAULT_SESSION_OPTIONS
  );

  useEffect(() => {
    const live = detectTradingSessionByTime();
    setDetectedSessionInfo(live);
    setSessionSelectOptions(getTradingSessionOptionsForLocalZone());
    if (!existing?.session) {
      setTradingSession(live.session);
    }
  }, [existing?.session]);

  const [followedPlan, setFollowedPlan] = useState<boolean>(
    existing?.followedPlan ?? true
  );
  const [emotionState, setEmotionState] = useState<string>(
    existing?.emotionState ?? "Disciplinado"
  );
  const [emotionNote, setEmotionNote] = useState<string>(
    existing?.emotionNote ?? ""
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLogged, setIsLogged] = useState<boolean>(
    Boolean(signal.hasJournalEntry)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBuy = signal.direction === "BUY";

  // Al cambiar el Estado (Abierta / Ganada / Perdida / BE), rellenar automáticamente el Precio de Salida con TP o SL
  const handleStatusChange = (nextStatus: TradeOutcome) => {
    setSelectedStatus(nextStatus);
    if (nextStatus === "WIN") {
      // Si fue Ganada -> Poner automáticamente el valor del TP seleccionado en Precio de Salida
      setExitPrice(targetTpPrice || signal.takeProfit1.toFixed(2));
    } else if (nextStatus === "LOSS") {
      // Si fue Perdida (SL) -> Poner automáticamente el valor del Stop Loss de la señal en Precio de Salida
      setExitPrice(signal.stopLoss.toFixed(2));
    } else if (nextStatus === "BREAKEVEN") {
      // Si fue Break Even -> Poner el mismo precio de entrada
      setExitPrice(executionPrice);
    }
  };

  // Ratio R:B intrínseco de la tarjeta de señal
  const signalPlannedMetrics = useMemo(
    () =>
      calculateTradeMetrics({
        asset: signal.asset,
        direction: signal.direction,
        lotSize: 0.1,
        executionPrice: signal.entryPrice,
        exitPrice: signal.takeProfit1,
        stopLoss: signal.stopLoss,
        takeProfit1: signal.takeProfit1,
        takeProfit2: signal.takeProfit2,
      }),
    [signal]
  );

  // Cálculo automático en vivo de Monto (+/-), Riesgo 1R y Ratio R:B
  const autoCalc = useMemo(() => {
    const isStillOpen = selectedStatus === "OPEN";
    const parsedTp = parseFloat(targetTpPrice) || signal.takeProfit1;

    // Si está "Abierta / En Curso", también calculamos cuánto ganaría si toca su TP objetivo
    const projectedWhenOpen = calculateTradeMetrics({
      asset: signal.asset,
      direction: signal.direction,
      lotSize: parseFloat(lotSize) || 0.01,
      executionPrice: parseFloat(executionPrice) || signal.entryPrice,
      exitPrice: parsedTp,
      stopLoss: signal.stopLoss,
      takeProfit1: parsedTp,
      takeProfit2: signal.takeProfit2,
      isStillOpen: false,
    });

    const actual = calculateTradeMetrics({
      asset: signal.asset,
      direction: signal.direction,
      lotSize: parseFloat(lotSize) || 0.01,
      executionPrice: parseFloat(executionPrice) || signal.entryPrice,
      exitPrice: exitPrice !== "" ? parseFloat(exitPrice) : null,
      stopLoss: signal.stopLoss,
      takeProfit1: parsedTp,
      takeProfit2: signal.takeProfit2,
      isStillOpen,
    });

    return {
      ...actual,
      projectedProfitUsd: Math.abs(projectedWhenOpen.signedPnlUsd),
    };
  }, [
    signal,
    selectedStatus,
    lotSize,
    executionPrice,
    targetTpPrice,
    exitPrice,
  ]);

  const copyToClipboard = async (value: string | number, label: string) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1600);
    } catch {
      // Fallback silencioso
    }
  };

  const openJournalModal = () => {
    setErrorMessage(null);
    const liveDetected = detectTradingSessionByTime();
    setDetectedSessionInfo(liveDetected);
    if (!existing) {
      const startEntry = (signal.liveSpotPrice ?? signal.entryPrice).toFixed(2);
      setExecutionPrice(startEntry);
      setTargetTpPrice(signal.takeProfit1.toFixed(2));
      setSelectedStatus("OPEN");
      setExitPrice(signal.takeProfit1.toFixed(2));
      setTradingSession(liveDetected.session);
    }
    dialogRef.current?.showModal();
  };

  const closeJournalModal = () => {
    dialogRef.current?.close();
  };

  const handleDialogBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;
    if (e.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();
    const clickedInsideContent =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!clickedInsideContent) {
      dialog.close();
    }
  };

  const handleSubmitJournal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedLot = parseFloat(lotSize);
    const parsedPrice = parseFloat(executionPrice);

    if (isNaN(parsedLot) || parsedLot <= 0) {
      setErrorMessage("Ingresa un loteaje válido mayor a 0.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMessage("Ingresa un precio de entrada real válido.");
      return;
    }

    const finalOutcome: TradeOutcome =
      selectedStatus === "OPEN" ? "OPEN" : autoCalc.outcome;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalId: signal.id,
          outcome: finalOutcome,
          lotSize: parsedLot,
          executionPrice: parsedPrice,
          targetTpPrice: targetTpPrice ? parseFloat(targetTpPrice) : signal.takeProfit1,
          exitPrice:
            selectedStatus !== "OPEN" && exitPrice
              ? parseFloat(exitPrice)
              : null,
          riskAmount: autoCalc.riskUsd,
          pnlAmount: selectedStatus === "OPEN" ? 0 : autoCalc.signedPnlUsd,
          tradingSession,
          followedPlan,
          emotionState,
          emotionNote: emotionNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar la operación.");

      setIsLogged(true);
      closeJournalModal();
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error al registrar la operación."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const entryDisplay = signal.entryZoneMax
    ? `${signal.entryPrice.toFixed(2)} - ${signal.entryZoneMax.toFixed(2)}`
    : signal.entryPrice.toFixed(2);

  // Semáforo en tiempo real: ¿Todavía debo tomar esta señal o ya pasó / se invalidó?
  const signalValidity = useMemo(() => {
    const spot = signal.liveSpotPrice ?? signal.entryPrice;
    const zMin = Math.min(
      signal.entryPrice,
      signal.entryZoneMax ?? signal.entryPrice
    );
    const zMax = Math.max(
      signal.entryPrice,
      signal.entryZoneMax ?? signal.entryPrice
    );
    const tolerance = Math.max(0.5, signal.entryPrice * 0.0008);

    if (isBuy) {
      if (spot <= signal.stopLoss) {
        return {
          code: "EXPIRED_SL" as const,
          badge: "🔴 NO TOMAR • TOCÓ STOP LOSS",
          detail: `El precio Spot (${spot.toFixed(
            2
          )}) ya perforó el SL (${signal.stopLoss.toFixed(
            2
          )}). Señal invalidada.`,
          cls: "border-rose-500/40 bg-rose-950/30 text-rose-300",
        };
      }
      if (spot >= signal.takeProfit1) {
        return {
          code: "EXPIRED_TP" as const,
          badge: "🔴 NO TOMAR • YA ALCANZÓ TP1",
          detail: `El movimiento ya se dio y alcanzó el TP1 (${signal.takeProfit1.toFixed(
            2
          )}). No persigas el precio.`,
          cls: "border-rose-500/40 bg-rose-950/30 text-rose-300",
        };
      }
      if (spot >= zMin - tolerance && spot <= zMax + tolerance) {
        return {
          code: "OPTIMAL" as const,
          badge: "🟢 EN ZONA ÓPTIMA • VÁLIDA PARA ENTRAR",
          detail: `Spot (${spot.toFixed(
            2
          )}) dentro del rango institucional (${entryDisplay}). R:B intacto.`,
          cls: "border-emerald-500/40 bg-emerald-950/25 text-emerald-300",
        };
      }
      if (spot > zMax + tolerance) {
        const diff = (spot - zMax).toFixed(2);
        return {
          code: "WAIT_PULLBACK" as const,
          badge: `🟡 PRECIO ADELANTADO (+${diff} pts) • ESPERAR RETROCESO`,
          detail: `El precio ya salió de la zona (${entryDisplay}). Espera pullback a zona para no reducir tu R:B.`,
          cls: "border-amber-400/40 bg-amber-950/25 text-amber-300",
        };
      }
      return {
        code: "PULLBACK_DEEP" as const,
        badge: "🟡 EN DESCUENTO PROFUNDO • VIGILAR RECHAZO",
        detail: `Spot (${spot.toFixed(
          2
        )}) por debajo de zona pero sobre SL (${signal.stopLoss.toFixed(
          2
        )}). Espera vela de rechazo.`,
        cls: "border-amber-400/40 bg-amber-950/25 text-amber-300",
      };
    } else {
      // SELL
      if (spot >= signal.stopLoss) {
        return {
          code: "EXPIRED_SL" as const,
          badge: "🔴 NO TOMAR • TOCÓ STOP LOSS",
          detail: `El precio Spot (${spot.toFixed(
            2
          )}) superó el SL (${signal.stopLoss.toFixed(2)}). Señal invalidada.`,
          cls: "border-rose-500/40 bg-rose-950/30 text-rose-300",
        };
      }
      if (spot <= signal.takeProfit1) {
        return {
          code: "EXPIRED_TP" as const,
          badge: "🔴 NO TOMAR • YA ALCANZÓ TP1",
          detail: `El impulso bajista ya alcanzó el TP1 (${signal.takeProfit1.toFixed(
            2
          )}). No entres tarde.`,
          cls: "border-rose-500/40 bg-rose-950/30 text-rose-300",
        };
      }
      if (spot >= zMin - tolerance && spot <= zMax + tolerance) {
        return {
          code: "OPTIMAL" as const,
          badge: "🟢 EN ZONA ÓPTIMA • VÁLIDA PARA ENTRAR",
          detail: `Spot (${spot.toFixed(
            2
          )}) dentro del rango institucional (${entryDisplay}). R:B intacto.`,
          cls: "border-emerald-500/40 bg-emerald-950/25 text-emerald-300",
        };
      }
      if (spot < zMin - tolerance) {
        const diff = (zMin - spot).toFixed(2);
        return {
          code: "WAIT_PULLBACK" as const,
          badge: `🟡 PRECIO ADELANTADO (-${diff} pts) • ESPERAR RETROCESO`,
          detail: `El precio ya cayó desde la zona (${entryDisplay}). Espera pullback antes de vender.`,
          cls: "border-amber-400/40 bg-amber-950/25 text-amber-300",
        };
      }
      return {
        code: "PULLBACK_DEEP" as const,
        badge: "🟡 EN PREMIUM PROFUNDO • VIGILAR RECHAZO",
        detail: `Spot (${spot.toFixed(
          2
        )}) sobre zona pero debajo de SL (${signal.stopLoss.toFixed(
          2
        )}). Espera confirmación.`,
        cls: "border-amber-400/40 bg-amber-950/25 text-amber-300",
      };
    }
  }, [signal, isBuy, entryDisplay]);

  return (
    <>
      <article className="w-full rounded-2xl border border-zinc-800/90 bg-zinc-950 p-4 text-zinc-100 shadow-lg transition-colors hover:border-zinc-700/80">
        {/* Cabecera: Activo, Dirección, Precio Spot Real y Tiempo */}
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold tracking-wider uppercase ${
                isBuy
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30"
              }`}
            >
              {isBuy ? "COMPRA (BUY)" : "VENTA (SELL)"}
            </span>
            <h3 className="text-lg font-extrabold tracking-tight text-amber-400">
              {signal.asset}
            </h3>
            {signal.liveSpotPrice && (
              <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                Spot: {signal.liveSpotPrice.toFixed(2)}
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {signal.createdAt}
          </span>
        </header>

        {/* Subcabecera: Estrategia, Ratio R:B Automático y Win-Rate */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <span className="truncate font-medium text-zinc-300">
            {signal.strategyName}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-emerald-400 ring-1 ring-zinc-800">
              R:B 1:{signalPlannedMetrics.plannedRR1}
              {signalPlannedMetrics.plannedRR2
                ? ` / 1:${signalPlannedMetrics.plannedRR2}`
                : ""}
            </span>
            <span className="shrink-0 font-mono text-amber-400/90">
              WR {signal.strategyWinRate}%
            </span>
          </div>
        </div>

        {/* Semáforo de Validez en Vivo: ¿Debo tomar esta operación ahora o ya no? */}
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-xs ${signalValidity.cls}`}
        >
          <div className="font-mono text-[11px] font-extrabold">
            {signalValidity.badge}
          </div>
          <p className="mt-0.5 text-[11px] opacity-90">
            {signalValidity.detail}
          </p>
        </div>

        {/* Niveles accionables con botón de copiar al portapapeles */}
        <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <PriceLevelRow
            label="Zona de Entrada"
            value={entryDisplay}
            copyValue={signal.entryPrice}
            fieldKey="ENTRY"
            copiedField={copiedField}
            onCopy={copyToClipboard}
            accentClass="text-zinc-100 border-zinc-800 bg-zinc-900/70"
          />

          <PriceLevelRow
            label="Stop Loss (SL)"
            value={signal.stopLoss.toFixed(2)}
            copyValue={signal.stopLoss}
            fieldKey="SL"
            copiedField={copiedField}
            onCopy={copyToClipboard}
            accentClass="text-rose-400 border-rose-950/60 bg-rose-950/20"
          />

          <PriceLevelRow
            label={`Take Profit 1 (1:${signalPlannedMetrics.plannedRR1})`}
            value={signal.takeProfit1.toFixed(2)}
            copyValue={signal.takeProfit1}
            fieldKey="TP1"
            copiedField={copiedField}
            onCopy={copyToClipboard}
            accentClass="text-emerald-400 border-emerald-950/60 bg-emerald-950/20"
          />

          {signal.takeProfit2 && (
            <PriceLevelRow
              label={`Take Profit 2 (1:${signalPlannedMetrics.plannedRR2})`}
              value={signal.takeProfit2.toFixed(2)}
              copyValue={signal.takeProfit2}
              fieldKey="TP2"
              copiedField={copiedField}
              onCopy={copyToClipboard}
              accentClass="text-emerald-300 border-emerald-950/60 bg-emerald-950/20"
            />
          )}
        </div>

        {/* Botón de Bitácora Rápida */}
        <footer className="mt-4 pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={openJournalModal}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99] ${
              isLogged
                ? "bg-zinc-900 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-zinc-800"
                : signalValidity.code === "EXPIRED_SL" ||
                  signalValidity.code === "EXPIRED_TP"
                ? "border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-950/50"
                : "theme-accent-btn font-bold text-white shadow-md"
            }`}
          >
            {isLogged ? (
              <>
                <CheckIcon />
                Operación en Bitácora (Actualizar Estado / Resultado)
              </>
            ) : signalValidity.code === "EXPIRED_SL" ||
              signalValidity.code === "EXPIRED_TP" ? (
              <>
                <span>⚠️ Señal Finalizada (Registrar solo como Historial)</span>
              </>
            ) : (
              <>
                <JournalIcon />
                Tomar Operación / Registrar en Bitácora
              </>
            )}
          </button>
        </footer>
      </article>

      {/* Modal Nativo (<dialog>) con Estado Explícito + Campo TP + Autocompletado de SL/TP */}
      <dialog
        ref={dialogRef}
        closedby="any"
        aria-labelledby={dialogTitleId}
        onClick={handleDialogBackdropClick}
        className="m-auto w-[calc(100%-1.5rem)] max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-xs"
      >
        <div className="max-h-[90vh] overflow-y-auto p-5 custom-scrollbar">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                Bitácora Rápida • {signal.asset} ({isBuy ? "BUY" : "SELL"})
              </span>
              <h2
                id={dialogTitleId}
                className="text-base font-bold text-zinc-100"
              >
                Registrar Operación y Resultado Automático
              </h2>
            </div>
            <button
              type="button"
              onClick={closeJournalModal}
              aria-label="Cerrar modal"
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmitJournal} className="mt-4 space-y-4">
            {/* 1. Selector de Estado: Abierta / En Curso, Ganada (TP), Perdida (SL), Break Even */}
            <div>
              <label className="block text-xs font-medium text-zinc-400">
                1. Estado de la Operación (Al elegir Ganada o Perdida se rellena
                el Precio de Salida con TP o SL automáticamente)
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => handleStatusChange("OPEN")}
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
                  onClick={() => handleStatusChange("WIN")}
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
                  onClick={() => handleStatusChange("LOSS")}
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
                  onClick={() => handleStatusChange("BREAKEVEN")}
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

            {/* 2. Campos: Loteaje, Precio Entrada Real, Campo de TP y Precio de Salida (SL o TP) */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {/* Loteaje */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400">
                  Loteaje (Lots)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold text-zinc-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Precio Entrada Real */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-medium text-zinc-400">
                    Precio Entrada
                  </label>
                  {signal.liveSpotPrice && (
                    <button
                      type="button"
                      onClick={() =>
                        setExecutionPrice(signal.liveSpotPrice!.toFixed(2))
                      }
                      className="font-mono text-[9px] text-amber-400 hover:underline"
                    >
                      Spot
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  required
                  value={executionPrice}
                  onChange={(e) => setExecutionPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold text-zinc-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Campo de Take Profit (TP) con selector rápido TP1 / TP2 */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-medium text-emerald-400">
                    Take Profit (TP)
                  </label>
                  {signal.takeProfit2 && (
                    <div className="flex gap-1 font-mono text-[9px]">
                      <button
                        type="button"
                        onClick={() => {
                          const tp1Str = signal.takeProfit1.toFixed(2);
                          setTargetTpPrice(tp1Str);
                          if (selectedStatus === "WIN") setExitPrice(tp1Str);
                        }}
                        className="text-emerald-400 hover:underline"
                      >
                        TP1
                      </button>
                      <span className="text-zinc-600">/</span>
                      <button
                        type="button"
                        onClick={() => {
                          const tp2Str = signal.takeProfit2!.toFixed(2);
                          setTargetTpPrice(tp2Str);
                          if (selectedStatus === "WIN") setExitPrice(tp2Str);
                        }}
                        className="text-emerald-300 hover:underline"
                      >
                        TP2
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={targetTpPrice}
                  onChange={(e) => {
                    setTargetTpPrice(e.target.value);
                    if (selectedStatus === "WIN") {
                      setExitPrice(e.target.value);
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-emerald-900/60 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold text-emerald-400 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {/* Precio de Salida (Si es SL pone automáticamente el valor del Stop Loss) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-medium text-zinc-400">
                    Precio Salida
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus("LOSS");
                      setExitPrice(signal.stopLoss.toFixed(2));
                    }}
                    className="font-mono text-[9px] text-rose-400 hover:underline"
                  >
                    SL: {signal.stopLoss.toFixed(2)}
                  </button>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  disabled={selectedStatus === "OPEN"}
                  value={selectedStatus === "OPEN" ? "" : exitPrice}
                  placeholder={
                    selectedStatus === "OPEN" ? "En curso..." : signal.stopLoss.toFixed(2)
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setExitPrice(val);
                    const num = parseFloat(val);
                    const entryNum = parseFloat(executionPrice);
                    if (!isNaN(num) && !isNaN(entryNum)) {
                      const diff = isBuy ? num - entryNum : entryNum - num;
                      if (Math.abs(diff) < 0.01) setSelectedStatus("BREAKEVEN");
                      else if (diff > 0) setSelectedStatus("WIN");
                      else setSelectedStatus("LOSS");
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs font-bold text-zinc-100 focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* 3. Tarjeta de Cálculo Automático de Monto (+ / -), Riesgo SL y Riesgo:Beneficio */}
            <div
              className={`rounded-2xl border p-3.5 transition-colors ${
                selectedStatus === "OPEN"
                  ? "border-sky-500/30 bg-sky-950/15"
                  : autoCalc.signedPnlUsd > 0
                  ? "border-emerald-500/40 bg-emerald-950/20"
                  : autoCalc.signedPnlUsd < 0
                  ? "border-rose-500/40 bg-rose-950/20"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                {/* Columna 1: Monto Autocalculado (+ o -) */}
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-400">
                    {selectedStatus === "OPEN"
                      ? "Beneficio Proyectado (TP)"
                      : autoCalc.signedPnlUsd >= 0
                      ? "Monto Ganado (+)"
                      : "Monto Perdido (-)"}
                  </span>
                  <span
                    className={`mt-1 block font-mono text-base font-black ${
                      selectedStatus === "OPEN"
                        ? "text-sky-400"
                        : autoCalc.signedPnlUsd > 0
                        ? "text-emerald-400"
                        : autoCalc.signedPnlUsd < 0
                        ? "text-rose-400"
                        : "text-zinc-200"
                    }`}
                  >
                    {selectedStatus === "OPEN"
                      ? `+$${autoCalc.projectedProfitUsd.toFixed(2)}`
                      : autoCalc.signedPnlUsd > 0
                      ? `+$${autoCalc.signedPnlUsd.toFixed(2)}`
                      : autoCalc.signedPnlUsd < 0
                      ? `-$${Math.abs(autoCalc.signedPnlUsd).toFixed(2)}`
                      : "$0.00"}
                  </span>
                </div>

                {/* Columna 2: Riesgo SL Automático (1R) */}
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-400">
                    Riesgo si toca SL ({signal.stopLoss.toFixed(2)})
                  </span>
                  <span className="mt-1 block font-mono text-base font-black text-rose-400">
                    -${autoCalc.riskUsd.toFixed(2)}
                  </span>
                </div>

                {/* Columna 3: Ratio Riesgo : Beneficio Automático */}
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-400">
                    Riesgo : Beneficio Auto
                  </span>
                  <span className="mt-1 block font-mono text-base font-black text-amber-400">
                    {selectedStatus === "OPEN"
                      ? `1 : ${autoCalc.plannedRR1}`
                      : `1 : ${autoCalc.realizedRR} (${
                          autoCalc.rMultiple > 0 ? "+" : ""
                        }${autoCalc.rMultiple}R)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Respaldo de la Señal Original que se guardará en la Bitácora */}
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-3 py-2 text-[11px] text-zinc-300">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-amber-400">
                  📡 Señal Original que se guardará en tu Bitácora:
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {signal.strategyName} (WR {signal.strategyWinRate}%)
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px]">
                <span>
                  Entrada:{" "}
                  <strong className="text-zinc-100">{entryDisplay}</strong>
                </span>
                <span>
                  SL:{" "}
                  <strong className="text-rose-400">
                    {signal.stopLoss.toFixed(2)}
                  </strong>
                </span>
                <span>
                  TP1:{" "}
                  <strong className="text-emerald-400">
                    {signal.takeProfit1.toFixed(2)}
                  </strong>
                </span>
                {signal.takeProfit2 && (
                  <span>
                    TP2:{" "}
                    <strong className="text-emerald-300">
                      {signal.takeProfit2.toFixed(2)}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* 4. Sesión Operativa (Auto-detectada por horario) + Cumplimiento del Plan */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between gap-1">
                  <label className="text-xs font-medium text-zinc-400">
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
                    title={detectedSessionInfo.killzoneNote}
                  >
                    🕒 Auto ({detectedSessionInfo.localTimeStr})
                  </button>
                </div>
                <CustomSelect
                  value={tradingSession}
                  onChange={(val) => setTradingSession(val as TradingSession)}
                  options={sessionSelectOptions}
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  {tradingSession === detectedSessionInfo.session
                    ? `✓ Seleccionada automáticamente por tu horario (${detectedSessionInfo.killzoneNote})`
                    : `Cambiada manualmente (Tu hora ${detectedSessionInfo.localTimeStr} corresponde a ${detectedSessionInfo.sessionLabel})`}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400">
                  Disciplina Operativa
                </label>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFollowedPlan(true)}
                    className={`rounded-xl py-2 text-xs font-bold ${
                      followedPlan
                        ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    ✓ Seguí el Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowedPlan(false)}
                    className={`rounded-xl py-2 text-xs font-bold ${
                      !followedPlan
                        ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    ⚠ Rompí Reglas
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Estado Psicológico / Emoción y Nota */}
            <div>
              <label className="block text-xs font-medium text-zinc-400">
                Estado Emocional Predominante
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {EMOTION_STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => setEmotionState(state)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      emotionState === state
                        ? "border-amber-400 bg-amber-400/15 text-amber-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor={`note-${signal.id}`}
                className="block text-xs font-medium text-zinc-400"
              >
                Lección Aprendida / Nota de Ejecución
              </label>
              <input
                id={`note-${signal.id}`}
                type="text"
                value={emotionNote}
                onChange={(e) => setEmotionNote(e.target.value)}
                placeholder="Ej. Entré en retroceso al OB M15, respeté SL..."
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_NOTES.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setEmotionNote(chip)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/90 px-2 py-1 text-[10px] text-zinc-400 hover:border-amber-400/50 hover:text-amber-300"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <p className="rounded-lg bg-rose-950/50 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-800">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeJournalModal}
                className="w-1/3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="theme-accent-btn w-2/3 rounded-xl px-4 py-2.5 text-xs font-bold shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : "Guardar en Bitácora"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}

interface PriceLevelRowProps {
  label: string;
  value: string;
  copyValue: string | number;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (val: string | number, key: string) => void;
  accentClass: string;
}

function PriceLevelRow({
  label,
  value,
  copyValue,
  fieldKey,
  copiedField,
  onCopy,
  accentClass,
}: PriceLevelRowProps) {
  const isCopied = copiedField === fieldKey;

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${accentClass}`}
    >
      <div>
        <span className="block text-[11px] font-medium text-zinc-400">
          {label}
        </span>
        <span className="font-mono text-sm font-bold tracking-tight">
          {value}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onCopy(copyValue, fieldKey)}
        aria-label={`Copiar ${label}`}
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-800/80 bg-zinc-950/80 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white active:scale-95"
      >
        {isCopied ? (
          <>
            <CheckIcon />
            <span className="text-emerald-400">Copiado</span>
          </>
        ) : (
          <>
            <CopyIcon />
            <span>Copiar</span>
          </>
        )}
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-zinc-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-emerald-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}
