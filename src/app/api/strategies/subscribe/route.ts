// src/app/api/strategies/subscribe/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService } from "@/lib/data-service";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.isActive) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { strategyId } = await req.json();
    if (!strategyId) {
      return NextResponse.json(
        { error: "ID de estrategia requerido." },
        { status: 400 }
      );
    }

    const result = await DataService.toggleStrategySubscription(
      session.user.id,
      String(strategyId)
    );

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error al actualizar suscripción.",
      },
      { status: 400 }
    );
  }
}
