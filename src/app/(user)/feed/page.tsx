import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { fetchLiveMarketQuotes } from "@/lib/market-prices";
import { SignalCard } from "@/components/signals/SignalCard";
import { LiveMarketTicker } from "@/components/signals/LiveMarketTicker";
import { LiveSignalScannerBar } from "@/components/signals/LiveSignalScannerBar";

export const dynamic = "force-dynamic";

export default async function SignalFeedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isActive) {
    return (
      <div className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-6 text-center">
        <h1 className="text-base font-bold text-rose-400">
          Acceso Restringido
        </h1>
        <p className="mt-2 text-xs text-zinc-400">
          Tu acceso a la terminal de señales ha sido desactivado por el
          administrador.
        </p>
      </div>
    );
  }

  const [signals, strategies, liveQuotes] = await Promise.all([
    DataService.listSignalsForUser(session.user.id, true),
    DataService.listStrategiesWithUserSubscription(session.user.id),
    fetchLiveMarketQuotes(),
  ]);

  const subscribedStrategies = strategies.filter((s) => s.isSubscribed);

  return (
    <div className="space-y-4">
      {/* Barra de Cotización Spot en Tiempo Real (Swissquote Interbank + Índices) */}
      <LiveMarketTicker initialQuotes={liveQuotes} />

      {/* Reloj Institucional de Cierre de Velas (M5 / M15 / H1) + Escáner de Nueva Señal en Vivo */}
      <LiveSignalScannerBar />

      {/* Cabecera del Feed + Filtro activo de estrategias */}
      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-zinc-100">
              Feed de Señales en Vivo
            </h1>
            <p className="text-xs text-zinc-400">
              Solo señales accionables de tus estrategias suscritas.
            </p>
          </div>
          <Link
            href="/strategies"
            className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-400/20"
          >
            Filtrar Estrategias ({subscribedStrategies.length}/
            {strategies.length})
          </Link>
        </div>

        {/* Chips de estrategias suscritas */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {subscribedStrategies.length > 0 ? (
            subscribedStrategies.map((strat) => (
              <span
                key={strat.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {strat.name}
                <span className="font-mono text-[10px] text-amber-400">
                  {strat.winRate}%
                </span>
              </span>
            ))
          ) : (
            <span className="text-xs text-amber-400">
              No estás suscrito a ninguna estrategia activa.
            </span>
          )}
        </div>
      </section>

      {/* Lista de tarjetas SignalCard */}
      {signals.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-8 text-center">
          <p className="text-sm font-semibold text-zinc-200">
            No hay señales activas para tu filtro actual
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Suscríbete a más estrategias institucionales para ver sus señales en
            tiempo real.
          </p>
          <Link
            href="/strategies"
            className="mt-4 inline-block rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-300"
          >
            Explorar Estrategias Disponibles
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {signals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={{
                ...signal,
                liveSpotPrice: liveQuotes[signal.asset]?.price,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
