// src/app/api/admin/signals/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService } from "@/lib/data-service";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await req.json();
    const {
      strategyId,
      asset,
      direction,
      entryPrice,
      entryZoneMax,
      stopLoss,
      takeProfit1,
      takeProfit2,
    } = body;

    if (!strategyId || !asset || !direction || !entryPrice || !stopLoss || !takeProfit1) {
      return NextResponse.json(
        { error: "Completa los parámetros obligatorios de la señal." },
        { status: 400 }
      );
    }

    const signal = await DataService.createSignal({
      strategyId: String(strategyId),
      asset: String(asset),
      direction: direction === "SELL" ? "SELL" : "BUY",
      entryPrice: Number(entryPrice),
      entryZoneMax: entryZoneMax ? Number(entryZoneMax) : null,
      stopLoss: Number(stopLoss),
      takeProfit1: Number(takeProfit1),
      takeProfit2: takeProfit2 ? Number(takeProfit2) : null,
    });

    return NextResponse.json(signal, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Error al publicar señal.",
      },
      { status: 400 }
    );
  }
}
