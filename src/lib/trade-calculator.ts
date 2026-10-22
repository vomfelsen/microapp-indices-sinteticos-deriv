// src/lib/trade-calculator.ts
import type {
  SignalDirection,
  TradeOutcome,
  TradingSession,
} from "@/lib/data-service";

export interface DetectedSessionInfo {
  session: TradingSession;
  sessionLabel: string;
  killzoneNote: string;
  localTimeStr: string;
  utcTimeStr: string;
}

/**
 * Convierte una hora UTC (0-23) a la hora equivalente en el huso horario local del usuario.
 */
function formatUtcHourToLocal(utcHour: number, referenceDate = new Date()): string {
  const d = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      utcHour,
      0,
      0
    )
  );
  return d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Devuelve las opciones del selector de Sesión de Mercado con los rangos horarios
 * convertidos automáticamente a la hora local del usuario.
 */
export function getTradingSessionOptionsForLocalZone(referenceDate = new Date()): {
  value: TradingSession;
  label: string;
  badge: string;
}[] {
  const nyStart = formatUtcHourToLocal(13, referenceDate);
  const nyEnd = formatUtcHourToLocal(21, referenceDate);

  const lonStart = formatUtcHourToLocal(7, referenceDate);
  const lonEnd = formatUtcHourToLocal(16, referenceDate);

  const asiaStart = formatUtcHourToLocal(21, referenceDate);
  const asiaEnd = formatUtcHourToLocal(7, referenceDate);

  return [
    {
      value: "NEW_YORK",
      label: "🇺🇸 Nueva York (NY Open)",
      badge: `${nyStart} - ${nyEnd} Local`,
    },
    {
      value: "LONDON",
      label: "🇬🇧 Londres (London Open)",
      badge: `${lonStart} - ${lonEnd} Local`,
    },
    {
      value: "ASIA",
      label: "🇯🇵 Asia (Tokyo / Sydney)",
      badge: `${asiaStart} - ${asiaEnd} Local`,
    },
  ];
}

/**
 * Detecta automáticamente la sesión institucional activa según la hora exacta del usuario:
 * - 07:00 UTC a 12:59 UTC -> LONDON (Apertura Europea / Killzone Londres)
 * - 13:00 UTC a 20:59 UTC -> NEW_YORK (Apertura Americana + Overlap Londres/NY)
 * - 21:00 UTC a 06:59 UTC -> ASIA (Sídney / Tokio)
 */
export function detectTradingSessionByTime(
  date: Date = new Date()
): DetectedSessionInfo {
  const utcHour = date.getUTCHours();
  const utcMin = date.getUTCMinutes();
  const utcDecimal = utcHour + utcMin / 60;

  const localTimeStr = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const utcTimeStr = `${String(utcHour).padStart(2, "0")}:${String(
    utcMin
  ).padStart(2, "0")} UTC`;

  if (utcDecimal >= 7 && utcDecimal < 13) {
    return {
      session: "LONDON",
      sessionLabel: "🇬🇧 Londres (London Open)",
      killzoneNote:
        utcDecimal < 10
          ? "Killzone de Apertura Londres activa"
          : "Sesión Europea en curso",
      localTimeStr,
      utcTimeStr,
    };
  }

  if (utcDecimal >= 13 && utcDecimal < 21) {
    return {
      session: "NEW_YORK",
      sessionLabel: "🇺🇸 Nueva York (NY Open)",
      killzoneNote:
        utcDecimal < 16
          ? "Overlap Institucional Londres + Nueva York"
          : "Sesión Americana en curso",
      localTimeStr,
      utcTimeStr,
    };
  }

  return {
    session: "ASIA",
    sessionLabel: "🇯🇵 Asia (Tokyo / Sydney)",
    killzoneNote: "Sesión Asiática (Acumulación / Rango Tokio-Sídney)",
    localTimeStr,
    utcTimeStr,
  };
}

export interface AutoTradeCalculation {
  outcome: TradeOutcome;
  signedPnlUsd: number;      // Ej: +362.50 o -110.00
  riskUsd: number;           // Riesgo monetario automático hasta el SL (1R en USD)
  rMultiple: number;         // Ej: +2.42 o -1.00
  plannedRR1: number;        // Ratio Riesgo:Beneficio proyectado a TP1 (Ej: 1.85 -> 1:1.85)
  plannedRR2: number | null; // Ratio Riesgo:Beneficio proyectado a TP2
  realizedRR: number;        // Ratio Riesgo:Beneficio real alcanzado
  pointsMoved: number;       // Puntos/dólares de recorrido a favor (+) o en contra (-)
}

/**
 * Multiplicador estándar de valor por punto en Deriv Synthetic Indices:
 * - Volatility / Boom / Crash / Jump: 1 lote = $1 USD por punto de movimiento.
 * - Step Index: 1 lote = $10 USD por punto (step 0.1).
 */
export function getContractMultiplier(asset: string): number {
  const normalized = asset.toUpperCase().trim();
  if (normalized.includes("STEP")) {
    return 10;
  }
  return 1;
}

/**
 * Calcula automáticamente:
 * - Si la operación es Ganancia (+), Pérdida (-) o Break Even (0) según BUY/SELL, Entrada y Salida
 * - El monto exacto en USD ganado o perdido (+ / -)
 * - El riesgo monetario (1R en USD) según la distancia entre Entrada Real y Stop Loss
 * - El R-Múltiplo y el Ratio Riesgo:Beneficio (R:B) tanto planificado como real
 */
export function calculateTradeMetrics(params: {
  asset: string;
  direction: SignalDirection;
  lotSize: number;
  executionPrice: number;
  exitPrice?: number | null;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number | null;
  isStillOpen?: boolean;
}): AutoTradeCalculation {
  const {
    asset,
    direction,
    lotSize,
    executionPrice,
    exitPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    isStillOpen = false,
  } = params;

  const safeLots = Math.max(0.01, Number(lotSize) || 0.01);
  const entry = Number(executionPrice) || 0;
  const sl = Number(stopLoss) || entry;
  const tp1 = Number(takeProfit1) || entry;
  const tp2 = takeProfit2 ? Number(takeProfit2) : null;
  const multiplier = getContractMultiplier(asset);

  // 1. Distancia al Stop Loss y Riesgo Monetario 1R ($)
  const slDistance = Math.max(0.01, Math.abs(entry - sl));
  const riskUsd = Number((slDistance * safeLots * multiplier).toFixed(2));

  // 2. Ratios Riesgo:Beneficio (R:B) planificados desde el precio de entrada real
  const tp1Distance =
    direction === "BUY" ? Math.max(0, tp1 - entry) : Math.max(0, entry - tp1);
  const plannedRR1 = Number((tp1Distance / slDistance).toFixed(2));

  const plannedRR2 =
    tp2 !== null
      ? Number(
          (
            (direction === "BUY"
              ? Math.max(0, tp2 - entry)
              : Math.max(0, entry - tp2)) / slDistance
          ).toFixed(2)
        )
      : null;

  // 3. Si sigue abierta o no hay precio de salida aún
  if (isStillOpen || exitPrice === undefined || exitPrice === null || isNaN(exitPrice)) {
    return {
      outcome: "OPEN",
      signedPnlUsd: 0,
      riskUsd,
      rMultiple: 0,
      plannedRR1,
      plannedRR2,
      realizedRR: 0,
      pointsMoved: 0,
    };
  }

  const exit = Number(exitPrice);

  // 4. Recorrido con signo automático según dirección (BUY gana si sube, SELL gana si baja)
  const pointsMoved =
    direction === "BUY"
      ? Number((exit - entry).toFixed(4))
      : Number((entry - exit).toFixed(4));

  const signedPnlUsd = Number((pointsMoved * safeLots * multiplier).toFixed(2));

  // 5. Determinar WIN / LOSS / BREAKEVEN automáticamente por el signo del PnL
  let outcome: TradeOutcome = "BREAKEVEN";
  if (Math.abs(signedPnlUsd) < 0.05 || Math.abs(pointsMoved) < 0.001) {
    outcome = "BREAKEVEN";
  } else if (signedPnlUsd > 0) {
    outcome = "WIN";
  } else {
    outcome = "LOSS";
  }

  const rMultiple =
    riskUsd > 0 ? Number((signedPnlUsd / riskUsd).toFixed(2)) : 0;
  const realizedRR = Number(Math.abs(rMultiple).toFixed(2));

  return {
    outcome,
    signedPnlUsd: outcome === "BREAKEVEN" ? 0 : signedPnlUsd,
    riskUsd,
    rMultiple: outcome === "BREAKEVEN" ? 0 : rMultiple,
    plannedRR1,
    plannedRR2,
    realizedRR,
    pointsMoved,
  };
}
