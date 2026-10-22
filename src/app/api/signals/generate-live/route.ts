import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService, type SignalDirection } from "@/lib/data-service";
import { fetchLiveMarketQuotes } from "@/lib/market-prices";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.isActive) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedAsset = body.asset || "Volatility 75";
    const requestedDirection: SignalDirection | "AUTO" =
      body.direction === "BUY" || body.direction === "SELL"
        ? body.direction
        : "AUTO";
    const requestedStrategyId: string | undefined = body.strategyId;

    // 1. Obtener precio Spot en tiempo real
    const quotes = await fetchLiveMarketQuotes();
    const quote = quotes[requestedAsset] ?? quotes["Volatility 75"] ?? Object.values(quotes)[0];
    const spotPrice = quote.price;

    // 2. Determinar dirección según flujo o selección (Boom suele buscar BUY spikes, Crash suele buscar SELL spikes)
    let direction: SignalDirection;
    if (requestedDirection !== "AUTO") {
      direction = requestedDirection;
    } else if (requestedAsset.includes("Boom")) {
      direction = "BUY";
    } else if (requestedAsset.includes("Crash")) {
      direction = "SELL";
    } else {
      direction = Math.round(spotPrice * 100) % 2 === 0 ? "BUY" : "SELL";
    }

    // 3. Seleccionar estrategia suscrita del usuario (o la primera disponible)
    const strategies = await DataService.listStrategiesWithUserSubscription(
      session.user.id
    );
    const subscribed = strategies.filter((s) => s.isSubscribed);
    const chosenStrategy =
      (requestedStrategyId
        ? strategies.find((s) => s.id === requestedStrategyId)
        : undefined) ??
      subscribed[0] ??
      strategies[0];

    const strategyId = chosenStrategy?.id ?? "strat_ict_silver";

    // 4. Calcular niveles institucionales calibrados al precio del índice
    // SL ~ 0.35% a 0.5% del activo, TP1 = 1.8R, TP2 = 3.2R
    const slDistance = Math.max(0.2, Number((spotPrice * 0.004).toFixed(2)));
    const zoneWidth = Number((slDistance * 0.25).toFixed(2));
    const tp1Distance = Number((slDistance * 1.85).toFixed(2));
    const tp2Distance = Number((slDistance * 3.25).toFixed(2));

    const entryPrice = Number(spotPrice.toFixed(2));
    const entryZoneMax =
      direction === "BUY"
        ? Number((spotPrice + zoneWidth).toFixed(2))
        : Number((spotPrice - zoneWidth).toFixed(2));

    const stopLoss =
      direction === "BUY"
        ? Number((spotPrice - slDistance).toFixed(2))
        : Number((spotPrice + slDistance).toFixed(2));

    const takeProfit1 =
      direction === "BUY"
        ? Number((spotPrice + tp1Distance).toFixed(2))
        : Number((spotPrice - tp1Distance).toFixed(2));

    const takeProfit2 =
      direction === "BUY"
        ? Number((spotPrice + tp2Distance).toFixed(2))
        : Number((spotPrice - tp2Distance).toFixed(2));

    const createdSignal = await DataService.createSignal({
      strategyId,
      asset: requestedAsset,
      direction,
      entryPrice: Math.min(entryPrice, entryZoneMax),
      entryZoneMax: Math.max(entryPrice, entryZoneMax),
      stopLoss,
      takeProfit1,
      takeProfit2,
    });

    return NextResponse.json({
      signal: createdSignal,
      spotPrice,
      strategyName: chosenStrategy?.name ?? "Estrategia Deriv 24/7",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error al escanear y generar señal en vivo.",
      },
      { status: 500 }
    );
  }
}
