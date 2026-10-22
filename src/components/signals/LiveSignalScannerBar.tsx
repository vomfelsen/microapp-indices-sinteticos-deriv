"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSettings } from "@/components/providers/SettingsProvider";
import {
  detectTradingSessionByTime,
  type DetectedSessionInfo,
} from "@/lib/trade-calculator";

interface CandleCountdowns {
  m5Seconds: number;
  m15Seconds: number;
  h1Seconds: number;
  localClock: string;
}

const INITIAL_SSR_COUNTDOWNS: CandleCountdowns = {
  m5Seconds: 300,
  m15Seconds: 900,
  h1Seconds: 3600,
  localClock: "--:--:--",
};

const INITIAL_SSR_SESSION: DetectedSessionInfo = {
  session: "NEW_YORK",
  sessionLabel: "Sincronizando sesión...",
  killzoneNote: "Sincronizando reloj con el servidor",
  localTimeStr: "--:--",
  utcTimeStr: "--:-- UTC",
};

function computeCandleCountdowns(now = new Date()): CandleCountdowns {
  const min = now.getUTCMinutes();
  const sec = now.getUTCSeconds();

  const m5Remaining = (5 - (min % 5)) * 60 - sec;
  const m15Remaining = (15 - (min % 15)) * 60 - sec;
  const h1Remaining = (60 - min) * 60 - sec;

  return {
    m5Seconds: m5Remaining,
    m15Seconds: m15Remaining,
    h1Seconds: h1Remaining,
    localClock: now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
}

function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function LiveSignalScannerBar() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [countdowns, setCountdowns] = useState<CandleCountdowns>(
    INITIAL_SSR_COUNTDOWNS
  );
  const [sessionInfo, setSessionInfo] =
    useState<DetectedSessionInfo>(INITIAL_SSR_SESSION);

  const { activeIndices } = useAppSettings();
  const [selectedAsset, setSelectedAsset] = useState<string>(
    activeIndices[0] || "Volatility 75"
  );
  const [selectedDirection, setSelectedDirection] = useState<
    "AUTO" | "BUY" | "SELL"
  >("AUTO");
  const [autoGenerateOnM15, setAutoGenerateOnM15] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (activeIndices.length > 0 && !activeIndices.includes(selectedAsset)) {
      setSelectedAsset(activeIndices[0]);
    }
  }, [activeIndices, selectedAsset]);

  const handleGenerateLiveSignal = useCallback(
    async (triggerSource: "MANUAL" | "AUTO_M15" = "MANUAL") => {
      if (isScanning) return;
      setIsScanning(true);
      setScanFeedback(null);

      try {
        const res = await fetch("/api/signals/generate-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset: selectedAsset,
            direction: selectedDirection,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const sig = data.signal;
          setScanFeedback(
            `${
              triggerSource === "AUTO_M15"
                ? "⏱️ Cierre de Vela M15:"
                : "⚡ Escaneo completado:"
            } Nueva señal ${sig.direction} en ${sig.asset} generada a Spot ${Number(
              data.spotPrice
            ).toFixed(2)} (TP1: ${Number(sig.takeProfit1).toFixed(
              2
            )} / SL: ${Number(sig.stopLoss).toFixed(2)})`
          );
          router.refresh();
        }
      } finally {
        setIsScanning(false);
      }
    },
    [isScanning, router, selectedAsset, selectedDirection]
  );

  useEffect(() => {
    setMounted(true);
    const syncClock = () => {
      const now = new Date();
      const next = computeCandleCountdowns(now);
      setCountdowns(next);
      setSessionInfo(detectTradingSessionByTime(now));

      if (autoGenerateOnM15 && next.m15Seconds === 1) {
        handleGenerateLiveSignal("AUTO_M15");
      }
    };

    syncClock();
    const timer = setInterval(syncClock, 1000);
    return () => clearInterval(timer);
  }, [autoGenerateOnM15, handleGenerateLiveSignal]);

  return (
    <section className="rounded-2xl border border-amber-400/30 bg-zinc-950 p-4 shadow-lg">
      {/* Fila 1: Reloj Institucional de Cierre de Velas (M5, M15, H1) y Sesión Activa */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Reloj Institucional de Velas ({countdowns.localClock})
            </span>
            <span
              suppressHydrationWarning
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-300"
            >
              {sessionInfo.sessionLabel} • {sessionInfo.killzoneNote}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            En <strong className="text-rose-400">Índices Sintéticos Deriv</strong> las entradas
            se confirman con algoritmos 24/7 en{" "}
            <strong className="text-zinc-200">M1/M5</strong> (Spikes & Scalping),{" "}
            <strong className="text-zinc-200">M15</strong> (Order Blocks / FVG)
            o <strong className="text-zinc-200">H1</strong> (Tendencia Macro).
          </p>
        </div>

        {/* Tres Relojes Regresivos en Tiempo Real: M5, M15 y H1 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-center">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              Vela M5
            </span>
            <span
              suppressHydrationWarning
              className={`font-mono text-sm font-black ${
                mounted && countdowns.m5Seconds <= 30
                  ? "text-rose-400 animate-pulse"
                  : "text-zinc-100"
              }`}
            >
              {mounted ? formatMmSs(countdowns.m5Seconds) : "--:--"}
            </span>
          </div>

          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-center">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-rose-300">
              Vela M15 (Deriv)
            </span>
            <span
              suppressHydrationWarning
              className={`font-mono text-sm font-black ${
                mounted && countdowns.m15Seconds <= 45
                  ? "text-emerald-400 animate-pulse"
                  : "text-rose-400"
              }`}
            >
              {mounted ? formatMmSs(countdowns.m15Seconds) : "--:--"}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-center">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              Vela H1
            </span>
            <span
              suppressHydrationWarning
              className="font-mono text-sm font-black text-zinc-100"
            >
              {mounted ? formatMmSs(countdowns.h1Seconds) : "--:--"}
            </span>
          </div>
        </div>
      </div>

      {/* Fila 2: Escáner / Generador de Nueva Señal en Vivo al Precio Spot Actual */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Activo Dinámico (según índices configurados) */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            {activeIndices.map((asset) => (
              <button
                key={asset}
                type="button"
                onClick={() => setSelectedAsset(asset)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${
                  selectedAsset === asset
                    ? "theme-accent-btn font-extrabold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {asset}
              </button>
            ))}
          </div>

          {/* Selector de Dirección o Automático */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            {[
              { key: "AUTO" as const, label: "Auto Spot" },
              { key: "BUY" as const, label: "BUY" },
              { key: "SELL" as const, label: "SELL" },
            ].map((dir) => (
              <button
                key={dir.key}
                type="button"
                onClick={() => setSelectedDirection(dir.key)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                  selectedDirection === dir.key
                    ? dir.key === "BUY"
                      ? "bg-emerald-500 text-zinc-950"
                      : dir.key === "SELL"
                      ? "bg-rose-500 text-white"
                      : "bg-zinc-200 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {dir.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switch Auto-Escanear cada 15m */}
          <button
            type="button"
            onClick={() => setAutoGenerateOnM15((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition-colors ${
              autoGenerateOnM15
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoGenerateOnM15 ? "bg-emerald-400 animate-ping" : "bg-zinc-600"
              }`}
            />
            {autoGenerateOnM15
              ? "Auto-Señal al Cierre M15: ON"
              : "Auto-Señal al Cierre M15: OFF"}
          </button>

          {/* Botón para Generar / Escanear Nueva Señal al Spot Real Ahora */}
          <button
            type="button"
            onClick={() => handleGenerateLiveSignal("MANUAL")}
            disabled={isScanning}
            className="theme-accent-btn inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <span>
              {isScanning
                ? "Escaneando Spot..."
                : `⚡ Escanear Señal ${selectedAsset}`}
            </span>
          </button>
        </div>
      </div>

      {scanFeedback && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/25 px-3 py-2 text-xs font-semibold text-emerald-300">
          <span>{scanFeedback}</span>
          <button
            type="button"
            onClick={() => setScanFeedback(null)}
            className="ml-2 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
