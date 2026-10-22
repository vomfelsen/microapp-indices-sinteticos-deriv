"use client";

import React, { useEffect, useState } from "react";
import type { MarketQuote } from "@/lib/market-prices";
import { useAppSettings } from "@/components/providers/SettingsProvider";

export function LiveMarketTicker({
  initialQuotes,
}: {
  initialQuotes: Record<string, MarketQuote>;
}) {
  const [quotes, setQuotes] =
    useState<Record<string, MarketQuote>>(initialQuotes);
  const [lastFlash, setLastFlash] = useState<boolean>(false);

  const [feedType, setFeedType] = useState<"REAL" | "DEMO" | "LIVE_PUBLIC" | "BASE">("BASE");

  useEffect(() => {
    // 1. Polling de respaldo cada 4s
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/market/prices", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.quotes) {
            setQuotes((prev) => ({ ...prev, ...data.quotes }));
            setLastFlash(true);
            setTimeout(() => setLastFlash(false), 600);
          }
        }
      } catch {
        // Silencioso en caso de desconexión temporal
      }
    }, 4000);

    // 2. Suscripción en Tiempo Real directa al WebSocket de Deriv
    let unsubTicks: (() => void) | undefined;
    let unsubStatus: (() => void) | undefined;

    import("@/lib/deriv-ws").then(({ getDerivClient, DERIV_SYMBOLS }) => {
      const client = getDerivClient();

      unsubStatus = client.subscribeStatus((st, acc) => {
        if (st === "authorized" && acc) {
          setFeedType(acc.isVirtual ? "DEMO" : "REAL");
        } else if (st === "connected_live") {
          setFeedType("LIVE_PUBLIC");
        } else {
          setFeedType("BASE");
        }
      });

      unsubTicks = client.subscribeTicks((tick) => {
        const meta = DERIV_SYMBOLS[tick.symbol];
        if (meta) {
          setQuotes((prev) => {
            const current = prev[meta.displayName] || {
              asset: meta.displayName,
              price: tick.price,
              source: tick.source ?? "Deriv WebSocket Live",
              updatedAt: new Date().toISOString(),
            };
            return {
              ...prev,
              [meta.displayName]: {
                ...current,
                price: tick.price,
                source: tick.source ?? "Deriv WebSocket Live (Real-Time)",
                updatedAt: new Date().toISOString(),
              },
            };
          });
          setLastFlash(true);
          setTimeout(() => setLastFlash(false), 300);
        }
      });
    });

    return () => {
      clearInterval(interval);
      if (unsubTicks) unsubTicks();
      if (unsubStatus) unsubStatus();
    };
  }, []);

  const { activeIndices, openSettings } = useAppSettings();
  const orderedAssets = activeIndices;

  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-400">
            <span
              className={`h-2 w-2 rounded-full transition-transform ${
                lastFlash
                  ? "scale-125 theme-accent-bg"
                  : feedType === "REAL"
                  ? "bg-rose-500 animate-pulse"
                  : feedType === "DEMO"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-emerald-400 animate-pulse"
              }`}
            />
            Mercado Deriv • Índices Sintéticos ({orderedAssets.length} activos)
          </span>

          {/* Badge de Verificación de Servidor */}
          <span
            className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded border ${
              feedType === "REAL"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                : feedType === "DEMO"
                ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                : feedType === "LIVE_PUBLIC"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400"
            }`}
          >
            {feedType === "REAL"
              ? "🔴 SERVIDOR REAL OFICIAL"
              : feedType === "DEMO"
              ? "🟡 SERVIDOR DEMO (INDEPENDIENTE)"
              : feedType === "LIVE_PUBLIC"
              ? "🟢 DERIV WS PÚBLICO"
              : "⚠️ BASE CALIBRADO"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSettings}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 underline"
          >
            ⚙️ Filtrar Índices
          </button>
          <span className="font-mono text-[10px] text-zinc-500">
            En vivo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {orderedAssets.map((symbol) => {
          const q = quotes[symbol];
          if (!q) return null;
          const isV75 = symbol.includes("75");
          const isBoom = symbol.includes("Boom");
          const isCrash = symbol.includes("Crash");

          const badgeColor = isBoom
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
            : isCrash
            ? "border-rose-500/30 bg-rose-500/5 text-rose-400"
            : isV75
            ? "border-amber-400/30 bg-amber-400/5 text-amber-400"
            : "border-zinc-800/80 bg-zinc-900/60 text-zinc-300";

          return (
            <div
              key={symbol}
              className={`rounded-xl border px-3 py-2 transition-colors ${
                isBoom
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : isCrash
                  ? "border-rose-500/30 bg-rose-500/5"
                  : isV75
                  ? "border-amber-400/30 bg-amber-400/5"
                  : "border-zinc-800/80 bg-zinc-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-[11px] font-bold ${
                    isBoom
                      ? "text-emerald-400"
                      : isCrash
                      ? "text-rose-400"
                      : isV75
                      ? "text-amber-400"
                      : "text-zinc-300"
                  }`}
                >
                  {symbol}
                </span>
                <span className="text-[9px] uppercase font-mono text-zinc-500">
                  {q.symbolCode ?? "DERIV"}
                </span>
              </div>
              <div className="mt-0.5 font-mono text-sm font-extrabold tracking-tight text-zinc-100">
                {q.price.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              {q.bid && q.ask && (
                <div className="mt-0.5 font-mono text-[10px] text-zinc-400">
                  B: {q.bid.toLocaleString("en-US")} | A: {q.ask.toLocaleString("en-US")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
