// src/app/api/signals/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.isActive) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const signals = await DataService.listSignalsForUser(session.user.id, true);
    return NextResponse.json({ signals });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener señales." },
      { status: 500 }
    );
  }
}
