// src/app/api/market/prices/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLiveMarketQuotes } from "@/lib/market-prices";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.isActive) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const quotes = await fetchLiveMarketQuotes();
  return NextResponse.json({ quotes });
}
