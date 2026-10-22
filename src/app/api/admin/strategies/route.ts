// src/app/api/admin/strategies/route.ts
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
    const { name, description, winRate, timeframe } = body;

    if (!name || !description || winRate === undefined) {
      return NextResponse.json(
        { error: "Nombre, descripción y win-rate son obligatorios." },
        { status: 400 }
      );
    }

    const strategy = await DataService.createStrategy({
      name: String(name),
      description: String(description),
      winRate: Number(winRate),
      timeframe: String(timeframe || "M15"),
    });

    return NextResponse.json(strategy, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Error al crear estrategia.",
      },
      { status: 400 }
    );
  }
}
