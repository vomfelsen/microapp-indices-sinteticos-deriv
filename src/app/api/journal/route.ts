// src/app/api/journal/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  DataService,
  type TradeOutcome,
  type TradingSession,
} from "@/lib/data-service";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.isActive) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const {
      signalId,
      outcome,
      lotSize,
      executionPrice,
      targetTpPrice,
      targetSlPrice,
      exitPrice,
      riskAmount,
      pnlAmount,
      tradingSession,
      followedPlan,
      emotionState,
      emotionNote,
    } = body;

    if (!signalId || !lotSize || !executionPrice) {
      return NextResponse.json(
        { error: "Señal, loteaje y precio de entrada son obligatorios." },
        { status: 400 }
      );
    }

    const validOutcomes: TradeOutcome[] = ["OPEN", "WIN", "LOSS", "BREAKEVEN"];
    const safeOutcome: TradeOutcome = validOutcomes.includes(outcome)
      ? outcome
      : "OPEN";

    const validSessions: TradingSession[] = ["NEW_YORK", "LONDON", "ASIA"];
    const safeSession: TradingSession = validSessions.includes(tradingSession)
      ? tradingSession
      : "NEW_YORK";

    const entry = await DataService.saveJournalEntry({
      userId: session.user.id,
      signalId: String(signalId),
      outcome: safeOutcome,
      lotSize: Number(lotSize),
      executionPrice: Number(executionPrice),
      targetTpPrice:
        targetTpPrice !== undefined &&
        targetTpPrice !== null &&
        targetTpPrice !== ""
          ? Number(targetTpPrice)
          : null,
      targetSlPrice:
        targetSlPrice !== undefined &&
        targetSlPrice !== null &&
        targetSlPrice !== ""
          ? Number(targetSlPrice)
          : null,
      exitPrice:
        exitPrice !== undefined && exitPrice !== null && exitPrice !== ""
          ? Number(exitPrice)
          : null,
      riskAmount: Number(riskAmount) || 100,
      pnlAmount: Number(pnlAmount) || 0,
      session: safeSession,
      followedPlan: followedPlan !== undefined ? Boolean(followedPlan) : true,
      emotionState: emotionState ? String(emotionState) : "Disciplinado",
      emotionNote: emotionNote ? String(emotionNote) : undefined,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error al registrar operación en bitácora.",
      },
      { status: 400 }
    );
  }
}

// PATCH /api/journal -> Enviar a la Papelera ("TRASH") o Restaurar ("RESTORE")
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.isActive) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { entryId, action } = await req.json();
    if (!entryId || !action) {
      return NextResponse.json(
        { error: "ID de operación y acción requeridos." },
        { status: 400 }
      );
    }

    if (action === "TRASH") {
      const trashed = await DataService.moveJournalEntryToTrash(
        session.user.id,
        String(entryId)
      );
      return NextResponse.json(trashed);
    }

    if (action === "RESTORE") {
      const restored = await DataService.restoreJournalEntry(
        session.user.id,
        String(entryId)
      );
      return NextResponse.json(restored);
    }

    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error al actualizar estado en papelera.",
      },
      { status: 400 }
    );
  }
}

// DELETE /api/journal -> Eliminación Definitiva desde la Papelera
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.isActive) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { entryId } = await req.json();
    if (!entryId) {
      return NextResponse.json(
        { error: "ID de operación requerido." },
        { status: 400 }
      );
    }

    const result = await DataService.permanentlyDeleteJournalEntry(
      session.user.id,
      String(entryId)
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error al eliminar definitivamente la operación.",
      },
      { status: 400 }
    );
  }
}
