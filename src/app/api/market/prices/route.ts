// src/app/api/market/prices/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLiveMarketQuotes, updateSyntheticBasePrice } from "@/lib/market-prices";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.isActive) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const quotes = await fetchLiveMarketQuotes();
  return NextResponse.json({ quotes });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.isActive) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { asset, price } = body;
    if (asset && typeof price === "number") {
      updateSyntheticBasePrice(asset, price);
      const quotes = await fetchLiveMarketQuotes();
      return NextResponse.json({ success: true, asset, price, quotes });
    }
    return NextResponse.json({ error: "Datos de calibración inválidos" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
