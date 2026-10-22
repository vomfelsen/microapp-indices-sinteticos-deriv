"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MarketQuote } from "@/lib/market-prices";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface StrategyOption {
  id: string;
  name: string;
  winRate: number;
  timeframe: string;
}

export function AdminEngineClient({
  initialStrategies,
}: {
  initialStrategies: StrategyOption[];
}) {
  const router = useRouter();
  const [strategies, setStrategies] =
    useState<StrategyOption[]>(initialStrategies);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, MarketQuote>>({});

  // Estado formulario Nueva Estrategia
  const [stratName, setStratName] = useState("");
  const [stratDesc, setStratDesc] = useState("");
  const [stratWinRate, setStratWinRate] = useState("75.0");
  const [stratTimeframe, setStratTimeframe] = useState("M15");
  const [savingStrat, setSavingStrat] = useState(false);
  const [stratMsg, setStratMsg] = useState<string | null>(null);

  // Estado formulario Nueva Señal
  const [selectedStrategyId, setSelectedStrategyId] = useState(
    initialStrategies[0]?.id ?? ""
  );
  const [asset, setAsset] = useState("Volatility 75");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [entryPrice, setEntryPrice] = useState("452180.00");
  const [entryZoneMax, setEntryZoneMax] = useState("452400.00");
  const [stopLoss, setStopLoss] = useState("450500.00");
  const [takeProfit1, setTakeProfit1] = useState("455200.00");
  const [takeProfit2, setTakeProfit2] = useState("457500.00");
  const [savingSignal, setSavingSignal] = useState(false);
  const [signalMsg, setSignalMsg] = useState<string | null>(null);

  const applySpotLevels = (
    targetAsset: string,
    targetDir: "BUY" | "SELL",
    spot: number
  ) => {
    const slDist = Math.max(0.5, Number((spot * 0.004).toFixed(2)));
    const zoneWidth = Number((slDist * 0.25).toFixed(2));
    const tp1Dist = Number((slDist * 1.85).toFixed(2));
    const tp2Dist = Number((slDist * 3.25).toFixed(2));

    const base = Number(spot.toFixed(2));
    setEntryPrice(base.toFixed(2));
    setEntryZoneMax((base + zoneWidth).toFixed(2));

    if (targetDir === "BUY") {
      setStopLoss((base - slDist).toFixed(2));
      setTakeProfit1((base + tp1Dist).toFixed(2));
      setTakeProfit2((base + tp2Dist).toFixed(2));
    } else {
      setStopLoss((base + slDist).toFixed(2));
      setTakeProfit1((base - tp1Dist).toFixed(2));
      setTakeProfit2((base - tp2Dist).toFixed(2));
    }
  };

  useEffect(() => {
    fetch("/api/market/prices", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.quotes) {
          setLiveQuotes(d.quotes);
          const firstQuote = (Object.values(d.quotes)[0] as { price?: number } | undefined);
          const initialSpot = d.quotes["Volatility 75"]?.price ?? firstQuote?.price;
          if (initialSpot) {
            applySpotLevels("Volatility 75", "BUY", initialSpot);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleAssetOrDirectionChange = (
    nextAsset: string,
    nextDir: "BUY" | "SELL"
  ) => {
    setAsset(nextAsset);
    setDirection(nextDir);
    const spot = liveQuotes[nextAsset]?.price;
    if (spot) {
      applySpotLevels(nextAsset, nextDir, spot);
    }
  };

  const handleCreateStrategy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingStrat(true);
    setStratMsg(null);

    try {
      const res = await fetch("/api/admin/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: stratName,
          description: stratDesc,
          winRate: parseFloat(stratWinRate),
          timeframe: stratTimeframe,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear estrategia.");

      setStrategies((prev) => [...prev, data]);
      if (!selectedStrategyId) setSelectedStrategyId(data.id);
      setStratName("");
      setStratDesc("");
      setStratMsg("✓ Estrategia creada correctamente.");
      router.refresh();
    } catch (err) {
      setStratMsg(err instanceof Error ? err.message : "Error.");
    } finally {
      setSavingStrat(false);
    }
  };

  const handleCreateSignal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingSignal(true);
    setSignalMsg(null);

    try {
      const res = await fetch("/api/admin/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: selectedStrategyId,
          asset,
          direction,
          entryPrice: parseFloat(entryPrice),
          entryZoneMax: entryZoneMax ? parseFloat(entryZoneMax) : null,
          stopLoss: parseFloat(stopLoss),
          takeProfit1: parseFloat(takeProfit1),
          takeProfit2: takeProfit2 ? parseFloat(takeProfit2) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al publicar señal.");

      setSignalMsg("✓ Señal publicada en vivo en el Feed.");
      router.refresh();
    } catch (err) {
      setSignalMsg(err instanceof Error ? err.message : "Error.");
    } finally {
      setSavingSignal(false);
    }
  };

  const currentSpot = liveQuotes[asset]?.price;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Columna 1: Publicar Señal Activa */}
      <section className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Mesa de Dinero • Señales en Vivo
            </span>
            <h2 className="mt-0.5 text-base font-extrabold text-zinc-100">
              Publicar Nueva Señal
            </h2>
          </div>
          {currentSpot && (
            <button
              type="button"
              onClick={() => applySpotLevels(asset, direction, currentSpot)}
              className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-300 hover:bg-amber-400/20"
            >
              ↻ Spot: {currentSpot.toFixed(2)}
            </button>
          )}
        </div>

        <form onSubmit={handleCreateSignal} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Estrategia Asociada
            </label>
            <CustomSelect
              value={selectedStrategyId}
              onChange={(val) => setSelectedStrategyId(val)}
              options={strategies.map((s) => ({
                value: s.id,
                label: s.name,
                badge: `${s.timeframe} • WR ${s.winRate}%`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Activo
              </label>
              <CustomSelect
                value={asset}
                onChange={(val) => handleAssetOrDirectionChange(val, direction)}
                options={[
                  {
                    value: "Volatility 75",
                    label: "Volatility 75 Index",
                    badge: liveQuotes["Volatility 75"]
                      ? `${liveQuotes["Volatility 75"].price.toFixed(1)}`
                      : "DERIV",
                  },
                  {
                    value: "Boom 1000",
                    label: "Boom 1000 Index",
                    badge: liveQuotes["Boom 1000"]
                      ? `${liveQuotes["Boom 1000"].price.toFixed(1)}`
                      : "SPIKE",
                  },
                  {
                    value: "Crash 1000",
                    label: "Crash 1000 Index",
                    badge: liveQuotes["Crash 1000"]
                      ? `${liveQuotes["Crash 1000"].price.toFixed(1)}`
                      : "SPIKE",
                  },
                  {
                    value: "Step Index",
                    label: "Step Index",
                    badge: liveQuotes["Step Index"]
                      ? `${liveQuotes["Step Index"].price.toFixed(1)}`
                      : "STEP",
                  },
                  {
                    value: "Volatility 100",
                    label: "Volatility 100 Index",
                    badge: liveQuotes["Volatility 100"]
                      ? `${liveQuotes["Volatility 100"].price.toFixed(1)}`
                      : "DERIV",
                  },
                ]}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Dirección
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAssetOrDirectionChange(asset, "BUY")}
                  className={`rounded-xl py-2.5 text-xs font-bold ${
                    direction === "BUY"
                      ? "bg-emerald-500 text-zinc-950"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => handleAssetOrDirectionChange(asset, "SELL")}
                  className={`rounded-xl py-2.5 text-xs font-bold ${
                    direction === "SELL"
                      ? "bg-rose-500 text-white"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-zinc-400">
                Precio Entrada (Min)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400">
                Zona Max (Opcional)
              </label>
              <input
                type="number"
                step="0.01"
                value={entryZoneMax}
                onChange={(e) => setEntryZoneMax(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-rose-400">
                Stop Loss
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 font-mono text-xs text-rose-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-400">
                Take Profit 1
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={takeProfit1}
                onChange={(e) => setTakeProfit1(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 font-mono text-xs text-emerald-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-400">
                Take Profit 2
              </label>
              <input
                type="number"
                step="0.01"
                value={takeProfit2}
                onChange={(e) => setTakeProfit2(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 font-mono text-xs text-emerald-300"
              />
            </div>
          </div>

          {signalMsg && (
            <p className="rounded-xl bg-zinc-900 px-3 py-2 text-xs text-amber-400">
              {signalMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={savingSignal}
            className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-zinc-950 hover:bg-amber-300"
          >
            {savingSignal ? "Publicando..." : "Emitir Señal al Feed"}
          </button>
        </form>
      </section>

      {/* Columna 2: Crear Perfil de Estrategia */}
      <section className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
          Motor de Estrategias • Admin
        </span>
        <h2 className="mt-0.5 text-base font-extrabold text-zinc-100">
          Crear Perfil de Estrategia
        </h2>

        <form onSubmit={handleCreateStrategy} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400">
              Nombre de la Estrategia
            </label>
            <input
              type="text"
              required
              value={stratName}
              onChange={(e) => setStratName(e.target.value)}
              placeholder="Ej. Barrido Asiático Londres M15"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-zinc-400">
                Win-Rate Histórico (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="100"
                required
                value={stratWinRate}
                onChange={(e) => setStratWinRate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-emerald-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Temporalidad
              </label>
              <CustomSelect
                value={stratTimeframe}
                onChange={(val) => setStratTimeframe(val)}
                options={[
                  { value: "M5", label: "M5 (5 Minutos)", badge: "Scalping" },
                  {
                    value: "M15",
                    label: "M15 (15 Minutos)",
                    badge: "Intradía",
                  },
                  {
                    value: "M30",
                    label: "M30 (30 Minutos)",
                    badge: "Intradía",
                  },
                  { value: "H1", label: "H1 (1 Hora)", badge: "Swing / Intra" },
                  { value: "H4", label: "H4 (4 Horas)", badge: "Swing" },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400">
              Descripción Breve
            </label>
            <textarea
              rows={3}
              required
              value={stratDesc}
              onChange={(e) => setStratDesc(e.target.value)}
              placeholder="Describe la lógica operativa y activos principales..."
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
            />
          </div>

          {stratMsg && (
            <p className="rounded-xl bg-zinc-900 px-3 py-2 text-xs text-emerald-400">
              {stratMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={savingStrat}
            className="w-full rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-400/20"
          >
            {savingStrat ? "Guardando..." : "+ Guardar Perfil de Estrategia"}
          </button>
        </form>
      </section>
    </div>
  );
}
