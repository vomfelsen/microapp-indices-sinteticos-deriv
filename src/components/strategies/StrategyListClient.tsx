"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface StrategyItem {
  id: string;
  name: string;
  description: string;
  winRate: number;
  timeframe: string;
  isSubscribed: boolean;
  activeSignalsCount: number;
}

export function StrategyListClient({
  initialStrategies,
}: {
  initialStrategies: StrategyItem[];
}) {
  const router = useRouter();
  const [strategies, setStrategies] =
    useState<StrategyItem[]>(initialStrategies);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleSubscription = async (strategyId: string) => {
    setLoadingId(strategyId);
    try {
      const res = await fetch("/api/strategies/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId }),
      });

      if (res.ok) {
        const { subscribed } = await res.json();
        setStrategies((prev) =>
          prev.map((s) =>
            s.id === strategyId ? { ...s, isSubscribed: subscribed } : s
          )
        );
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {strategies.map((strat) => {
        const isBusy = loadingId === strat.id;
        return (
          <article
            key={strat.id}
            className={`rounded-2xl border p-4 transition-all ${
              strat.isSubscribed
                ? "border-amber-400/40 bg-zinc-950"
                : "border-zinc-800/80 bg-zinc-950/60"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-400 ring-1 ring-zinc-800">
                    {strat.timeframe}
                  </span>
                  <h2 className="text-base font-bold text-zinc-100">
                    {strat.name}
                  </h2>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  {strat.description}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="block font-mono text-base font-extrabold text-emerald-400">
                  {strat.winRate.toFixed(1)}%
                </span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Win-Rate
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-zinc-900 pt-3">
              <span className="text-xs text-zinc-400">
                Señales activas ahora:{" "}
                <strong className="font-mono text-zinc-200">
                  {strat.activeSignalsCount}
                </strong>
              </span>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleToggleSubscription(strat.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                  strat.isSubscribed
                    ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    : "bg-amber-400 text-zinc-950 hover:bg-amber-300"
                }`}
              >
                {isBusy
                  ? "Actualizando..."
                  : strat.isSubscribed
                  ? "✓ Suscrito (En tu Feed)"
                  : "+ Suscribirme"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
