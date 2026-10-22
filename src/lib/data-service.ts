// src/lib/data-service.ts
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getContractMultiplier } from "@/lib/trade-calculator";

export type Role = "ADMIN" | "USER";
export type SignalDirection = "BUY" | "SELL";
export type SignalStatus = "ACTIVE" | "HIT_TP1" | "HIT_TP2" | "HIT_SL" | "CANCELLED";
export type TradeOutcome = "OPEN" | "WIN" | "LOSS" | "BREAKEVEN";
export type TradingSession = "NEW_YORK" | "LONDON" | "ASIA";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  passwordHash?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface AppStrategy {
  id: string;
  name: string;
  description: string;
  winRate: number;
  timeframe: string;
  isActive: boolean;
  createdAt: string;
}

export interface AppSubscription {
  userId: string;
  strategyId: string;
  subscribedAt: string;
}

export interface AppSignal {
  id: string;
  strategyId: string;
  asset: string;
  direction: SignalDirection;
  entryPrice: number;
  entryZoneMax?: number | null;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number | null;
  status: SignalStatus;
  createdAt: string;
}

export interface OriginalSignalSnapshot {
  signalId: string;
  asset: string;
  direction: SignalDirection;
  strategyName: string;
  strategyDescription?: string;
  strategyWinRate: number;
  strategyTimeframe: string;
  entryPrice: number;
  entryZoneMax?: number | null;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number | null;
  signalCreatedAt: string;
  capturedAt: string;
}

export interface AppJournalEntry {
  id: string;
  userId: string;
  signalId: string;
  outcome: TradeOutcome;
  lotSize: number;
  executionPrice: number;
  targetTpPrice?: number | null;  // Nivel de Take Profit objetivo del trader
  targetSlPrice?: number | null;  // Nivel de Stop Loss editable/objetivo del trader
  estimatedProfit?: number;       // Ganancia estimada en USD si toca el TP objetivo
  exitPrice?: number | null;
  riskAmount: number;             // Riesgo en USD si toca el SL (1R)
  pnlAmount: number;              // Ganancia (+) o Pérdida (-) neta realizada en USD
  rMultiple: number;              // PnL / Riesgo (Ej: +2.4R, -1.0R)
  session: TradingSession;
  followedPlan: boolean;
  emotionState: string;
  emotionNote?: string;
  signalSnapshot?: OriginalSignalSnapshot | null; // Copia inmutable de la señal original tomada
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

interface LocalDatabase {
  users: AppUser[];
  strategies: AppStrategy[];
  subscriptions: AppSubscription[];
  signals: AppSignal[];
  journal: AppJournalEntry[];
}

const DB_FILE = process.env.VERCEL
  ? path.join("/tmp", "local-db.json")
  : path.join(process.cwd(), "data", "local-db.json");

function getInitialSeed(): LocalDatabase {
  const adminHash =
    process.env.SEED_ADMIN_PASSWORD_HASH ||
    "$2b$10$2WWkU9mutybdnLpbUNeVSugj12XoyQb6/N/wwEqD0rT/ksxsuUnpu";
  const traderHash =
    process.env.SEED_USER_PASSWORD_HASH ||
    "$2b$10$g3tkuaMFxGer93NjcAOdYu8GBxNu118MNwcj7.agWYtyCBaWLNNj6";

  return {
    users: [
      {
        id: "usr_admin_1",
        name: "Will Admin (Head Trader)",
        email: "admin@synthetics.pro",
        passwordHash: adminHash,
        role: "ADMIN",
        isActive: true,
        createdAt: "2026-09-01T10:00:00.000Z",
      },
      {
        id: "usr_admin_2",
        name: "Will Admin",
        email: "admin@deriv.pro",
        passwordHash: adminHash,
        role: "ADMIN",
        isActive: true,
        createdAt: "2026-09-01T10:00:00.000Z",
      },
      {
        id: "usr_trader_1",
        name: "Alex Rivera",
        email: "trader@synthetics.pro",
        passwordHash: traderHash,
        role: "USER",
        isActive: true,
        createdAt: "2026-09-14T14:30:00.000Z",
      },
      {
        id: "usr_trader_2",
        name: "Sofía Vargas",
        email: "sofia.vargas@gmail.com",
        passwordHash: traderHash,
        role: "USER",
        isActive: true,
        createdAt: "2026-10-02T09:15:00.000Z",
      },
      {
        id: "usr_trader_3",
        name: "Diego Morales (Suscripción Vencida)",
        email: "inactivo@aurum.trade",
        passwordHash: traderHash,
        role: "USER",
        isActive: false,
        createdAt: "2026-08-19T18:20:00.000Z",
      },
    ],
    strategies: [
      {
        id: "strat_ict_silver",
        name: "ICT Silver Bullet + FVG + OTE",
        description:
          "Algoritmo cuántico 24/7 para Fair Value Gaps (FVG) y Optimal Trade Entry (OTE) sobre Volatility 75 y 100.",
        winRate: 76.8,
        timeframe: "M5",
        isActive: true,
        createdAt: "2026-09-01T10:00:00.000Z",
      },
      {
        id: "strat_mss_ob",
        name: "Market Structure Shift (MSS) + Order Block",
        description:
          "Detección de quiebre de estructura institucional y mitigación de bloques de órdenes en Volatility 75.",
        winRate: 74.2,
        timeframe: "M15",
        isActive: true,
        createdAt: "2026-09-02T10:00:00.000Z",
      },
      {
        id: "strat_spike_hunter",
        name: "Boom & Crash Institutional Spike Hunter",
        description:
          "Cazador de spikes institucionales en Boom 1000/500 (BUY) y Crash 1000/500 (SELL) en microacumulación M1.",
        winRate: 78.4,
        timeframe: "M1",
        isActive: true,
        createdAt: "2026-09-05T10:00:00.000Z",
      },
      {
        id: "strat_step_squeeze",
        name: "Step & Jump Volatility Breakout",
        description:
          "Explosión de compresión de volatilidad y continuación de tendencia en Step Index y Jump 75.",
        winRate: 72.5,
        timeframe: "M15",
        isActive: true,
        createdAt: "2026-09-08T10:00:00.000Z",
      },
    ],
    subscriptions: [
      {
        userId: "usr_trader_1",
        strategyId: "strat_ict_silver",
        subscribedAt: "2026-09-15T10:00:00.000Z",
      },
      {
        userId: "usr_trader_1",
        strategyId: "strat_spike_hunter",
        subscribedAt: "2026-09-15T10:05:00.000Z",
      },
      {
        userId: "usr_admin_1",
        strategyId: "strat_ict_silver",
        subscribedAt: "2026-09-01T10:00:00.000Z",
      },
      {
        userId: "usr_admin_1",
        strategyId: "strat_mss_ob",
        subscribedAt: "2026-09-01T10:00:00.000Z",
      },
      {
        userId: "usr_admin_1",
        strategyId: "strat_spike_hunter",
        subscribedAt: "2026-09-01T10:00:00.000Z",
      },
      {
        userId: "usr_admin_1",
        strategyId: "strat_step_squeeze",
        subscribedAt: "2026-09-01T10:00:00.000Z",
      },
    ],
    signals: [
      {
        id: "sig_v75_1",
        strategyId: "strat_mss_ob",
        asset: "Volatility 75",
        direction: "BUY",
        entryPrice: 452180.0,
        entryZoneMax: 452400.0,
        stopLoss: 450500.0,
        takeProfit1: 455200.0,
        takeProfit2: 457800.0,
        status: "ACTIVE",
        createdAt: "Hace 6 min",
      },
      {
        id: "sig_boom_2",
        strategyId: "strat_spike_hunter",
        asset: "Boom 1000",
        direction: "BUY",
        entryPrice: 14280.0,
        entryZoneMax: 14283.0,
        stopLoss: 14240.0,
        takeProfit1: 14350.0,
        takeProfit2: 14420.0,
        status: "ACTIVE",
        createdAt: "Hace 18 min",
      },
      {
        id: "sig_crash_3",
        strategyId: "strat_spike_hunter",
        asset: "Crash 1000",
        direction: "SELL",
        entryPrice: 9845.0,
        entryZoneMax: 9842.0,
        stopLoss: 9885.0,
        takeProfit1: 9775.0,
        takeProfit2: 9700.0,
        status: "ACTIVE",
        createdAt: "Hace 42 min",
      },
      {
        id: "sig_step_4",
        strategyId: "strat_step_squeeze",
        asset: "Step Index",
        direction: "BUY",
        entryPrice: 7348.0,
        entryZoneMax: 7351.0,
        stopLoss: 7322.0,
        takeProfit1: 7395.0,
        takeProfit2: 7435.0,
        status: "ACTIVE",
        createdAt: "Hace 1 hora",
      },
    ],
    journal: [
      {
        id: "jrn_open_live",
        userId: "usr_trader_1",
        signalId: "sig_v75_1",
        outcome: "OPEN",
        lotSize: 0.25,
        executionPrice: 4153.5,
        targetTpPrice: 4168.0,
        estimatedProfit: 362.5,
        exitPrice: null,
        riskAmount: 237.5,
        pnlAmount: 0,
        rMultiple: 0,
        session: "NEW_YORK",
        followedPlan: true,
        emotionState: "Disciplinado",
        emotionNote: "Operación en curso monitoreando cierre automático en TP1 (4168.00) o SL (4144.00).",
        createdAt: "2026-10-15T20:15:00.000Z",
      },
      {
        id: "jrn_2",
        userId: "usr_trader_1",
        signalId: "sig_nas_2",
        outcome: "LOSS",
        lotSize: 0.2,
        executionPrice: 29940.0,
        targetTpPrice: 29850.0,
        estimatedProfit: 180.0,
        exitPrice: 29995.0,
        riskAmount: 110.0,
        pnlAmount: -110.0,
        rMultiple: -1.0,
        session: "NEW_YORK",
        followedPlan: false,
        emotionState: "FOMO / Ansiedad",
        emotionNote: "Entré antes de que cerrara la vela M5 de confirmación.",
        createdAt: "2026-10-14T14:45:00.000Z",
      },
      {
        id: "jrn_3",
        userId: "usr_trader_1",
        signalId: "sig_xau_3",
        outcome: "WIN",
        lotSize: 0.3,
        executionPrice: 4165.0,
        targetTpPrice: 4148.0,
        estimatedProfit: 510.0,
        exitPrice: 4148.0,
        riskAmount: 270.0,
        pnlAmount: 510.0,
        rMultiple: 1.89,
        session: "LONDON",
        followedPlan: true,
        emotionState: "Enfocado",
        emotionNote: "Excelente distribución tras barrido de altos de Londres.",
        createdAt: "2026-10-13T10:15:00.000Z",
      },
    ],
  };
}

function readLocalDb(): LocalDatabase {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const seed = getInitialSeed();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), "utf-8");
      return seed;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as LocalDatabase;
    if (parsed.journal?.some((j) => j.estimatedProfit === undefined)) {
      const freshSeed = getInitialSeed();
      fs.writeFileSync(DB_FILE, JSON.stringify(freshSeed, null, 2), "utf-8");
      return freshSeed;
    }
    return parsed;
  } catch {
    return getInitialSeed();
  }
}

function writeLocalDb(db: LocalDatabase) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // En entornos serverless de solo lectura donde /tmp falle, ignorar silenciosamente
  }
}

const configuredDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_DATABASE_URL ||
  "";

let USE_PRISMA_LIVE =
  process.env.USE_PRISMA_POSTGRES === "true" ||
  (Boolean(configuredDbUrl) &&
    !configuredDbUrl.includes("localhost") &&
    !configuredDbUrl.includes("127.0.0.1"));

let pgSeedPromise: Promise<void> | null = null;

async function ensurePostgresSeeded(): Promise<void> {
  if (!USE_PRISMA_LIVE) return;
  if (pgSeedPromise) return pgSeedPromise;

  pgSeedPromise = (async () => {
    try {
      const stratCount = await prisma.strategy.count();
      if (stratCount > 0) return;

      const seed = getInitialSeed();

      for (const u of seed.users) {
        await prisma.user.upsert({
          where: { email: u.email },
          update: {},
          create: {
            id: u.id,
            name: u.name,
            email: u.email,
            passwordHash: u.passwordHash,
            role: u.role,
            isActive: u.isActive,
          },
        });
      }

      for (const st of seed.strategies) {
        await prisma.strategy.upsert({
          where: { name: st.name },
          update: {},
          create: {
            id: st.id,
            name: st.name,
            description: st.description,
            winRate: st.winRate,
            timeframe: st.timeframe,
            isActive: st.isActive,
          },
        });
      }

      for (const sub of seed.subscriptions) {
        await prisma.strategySubscription
          .upsert({
            where: {
              userId_strategyId: {
                userId: sub.userId,
                strategyId: sub.strategyId,
              },
            },
            update: {},
            create: {
              userId: sub.userId,
              strategyId: sub.strategyId,
            },
          })
          .catch(() => null);
      }

      for (const sig of seed.signals) {
        await prisma.signal
          .upsert({
            where: { id: sig.id },
            update: {},
            create: {
              id: sig.id,
              strategyId: sig.strategyId,
              asset: sig.asset,
              direction: sig.direction,
              entryPrice: sig.entryPrice,
              entryZoneMax: sig.entryZoneMax ?? null,
              stopLoss: sig.stopLoss,
              takeProfit1: sig.takeProfit1,
              takeProfit2: sig.takeProfit2 ?? null,
              status: sig.status,
            },
          })
          .catch(() => null);
      }
    } catch {
      pgSeedPromise = null;
      USE_PRISMA_LIVE = false;
    }
  })();

  return pgSeedPromise;
}

export const DataService = {
  // ==========================================
  // USUARIOS Y ADMIN TOGGLE
  // ==========================================
  async findUserByEmail(email: string): Promise<AppUser | null> {
    const normalized = email.toLowerCase().trim();
    await ensurePostgresSeeded();
    if (USE_PRISMA_LIVE) {
      const u = await prisma.user.findUnique({ where: { email: normalized } });
      if (!u) return null;
      return {
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      };
    }

    const db = readLocalDb();
    return db.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
  },

  async findUserById(
    id: string
  ): Promise<Omit<AppUser, "passwordHash"> | null> {
    await ensurePostgresSeeded();
    if (USE_PRISMA_LIVE) {
      const u = await prisma.user.findUnique({ where: { id } });
      if (!u) return null;
      return {
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      };
    }

    const db = readLocalDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) return null;
    const { passwordHash: _ph, ...safeUser } = user;
    return safeUser;
  },

  async createUser(input: {
    name: string;
    email: string;
    password?: string;
    role?: Role;
  }): Promise<Omit<AppUser, "passwordHash">> {
    const normalized = input.email.toLowerCase().trim();
    const assignedRole: Role = input.role === "ADMIN" ? "ADMIN" : "USER";
    const passwordHash = input.password
      ? await bcrypt.hash(input.password, 10)
      : null;

    await ensurePostgresSeeded();
    if (USE_PRISMA_LIVE) {
      const existing = await prisma.user.findUnique({
        where: { email: normalized },
      });
      if (existing) {
        throw new Error("El correo electrónico ya está registrado.");
      }

      const firstStrategy = await prisma.strategy.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });

      const u = await prisma.user.create({
        data: {
          name: input.name.trim(),
          email: normalized,
          passwordHash,
          role: assignedRole,
          isActive: true,
          ...(firstStrategy
            ? {
                subscriptions: {
                  create: { strategyId: firstStrategy.id },
                },
              }
            : {}),
        },
      });
      return {
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      };
    }

    const db = readLocalDb();
    if (db.users.some((u) => u.email.toLowerCase() === normalized)) {
      throw new Error("El correo electrónico ya está registrado.");
    }

    const newUser: AppUser = {
      id: `usr_${Date.now()}`,
      name: input.name.trim(),
      email: normalized,
      passwordHash,
      role: assignedRole,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.users.unshift(newUser);
    if (db.strategies[0]) {
      db.subscriptions.push({
        userId: newUser.id,
        strategyId: db.strategies[0].id,
        subscribedAt: new Date().toISOString(),
      });
    }
    writeLocalDb(db);
    const { passwordHash: _ph, ...safeUser } = newUser;
    return safeUser;
  },

  async listAllUsers(): Promise<Omit<AppUser, "passwordHash">[]> {
    await ensurePostgresSeeded();
    if (USE_PRISMA_LIVE) {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });
      return users.map((u) => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      }));
    }

    const db = readLocalDb();
    return db.users.map(({ passwordHash: _ph, ...rest }) => rest);
  },

  async toggleUserAccess(
    userId: string,
    isActive: boolean
  ): Promise<Omit<AppUser, "passwordHash">> {
    await ensurePostgresSeeded();
    if (USE_PRISMA_LIVE) {
      const u = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
      });
      return {
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      };
    }

    const db = readLocalDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("Usuario no encontrado.");
    user.isActive = isActive;
    writeLocalDb(db);
    const { passwordHash: _ph, ...safeUser } = user;
    return safeUser;
  },

  // ==========================================
  // ESTRATEGIAS Y SUSCRIPCIONES
  // ==========================================
  async listStrategiesWithUserSubscription(userId: string) {
    await ensurePostgresSeeded();
    if (USE_PRISMA_LIVE) {
      const [strategies, subs, activeSignals] = await Promise.all([
        prisma.strategy.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.strategySubscription.findMany({ where: { userId } }),
        prisma.signal.groupBy({
          by: ["strategyId"],
          where: { status: "ACTIVE" },
          _count: { _all: true },
        }),
      ]);

      const userSubs = new Set(subs.map((s) => s.strategyId));
      const countMap = new Map(
        activeSignals.map((g) => [g.strategyId, g._count._all])
      );

      return strategies.map((strat) => ({
        id: strat.id,
        name: strat.name,
        description: strat.description,
        winRate: Number(strat.winRate),
        timeframe: strat.timeframe || "M15",
        isActive: strat.isActive,
        createdAt: strat.createdAt.toISOString(),
        isSubscribed: userSubs.has(strat.id),
        activeSignalsCount: countMap.get(strat.id) ?? 0,
      }));
    }

    const db = readLocalDb();
    const userSubs = new Set(
      db.subscriptions
        .filter((s) => s.userId === userId)
        .map((s) => s.strategyId)
    );

    return db.strategies.map((strat) => ({
      ...strat,
      isSubscribed: userSubs.has(strat.id),
      activeSignalsCount: db.signals.filter(
        (sig) => sig.strategyId === strat.id && sig.status === "ACTIVE"
      ).length,
    }));
  },

  async toggleStrategySubscription(userId: string, strategyId: string) {
    if (USE_PRISMA_LIVE) {
      const existing = await prisma.strategySubscription.findUnique({
        where: { userId_strategyId: { userId, strategyId } },
      });

      if (existing) {
        await prisma.strategySubscription.delete({
          where: { id: existing.id },
        });
        return { subscribed: false };
      }

      await prisma.strategySubscription.create({
        data: { userId, strategyId },
      });
      return { subscribed: true };
    }

    const db = readLocalDb();
    const existingIndex = db.subscriptions.findIndex(
      (s) => s.userId === userId && s.strategyId === strategyId
    );

    let subscribed = false;
    if (existingIndex >= 0) {
      db.subscriptions.splice(existingIndex, 1);
      subscribed = false;
    } else {
      db.subscriptions.push({
        userId,
        strategyId,
        subscribedAt: new Date().toISOString(),
      });
      subscribed = true;
    }

    writeLocalDb(db);
    return { subscribed };
  },

  async createStrategy(input: {
    name: string;
    description: string;
    winRate: number;
    timeframe: string;
  }): Promise<AppStrategy> {
    if (USE_PRISMA_LIVE) {
      const created = await prisma.strategy.create({
        data: {
          name: input.name.trim(),
          description: input.description.trim(),
          winRate: Number(input.winRate),
          timeframe: input.timeframe.trim() || "M15",
          isActive: true,
        },
      });
      return {
        id: created.id,
        name: created.name,
        description: created.description,
        winRate: Number(created.winRate),
        timeframe: created.timeframe || "M15",
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
      };
    }

    const db = readLocalDb();
    const newStrategy: AppStrategy = {
      id: `strat_${Date.now()}`,
      name: input.name.trim(),
      description: input.description.trim(),
      winRate: Number(input.winRate),
      timeframe: input.timeframe.trim() || "M15",
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.strategies.push(newStrategy);
    writeLocalDb(db);
    return newStrategy;
  },

  // ==========================================
  // SEÑALES DE TRADING (FEED Y ADMIN)
  // ==========================================
  async listSignalsForUser(userId: string, filterBySubscriptions = true) {
    await ensurePostgresSeeded();
    if (USE_PRISMA_LIVE) {
      const [subs, signals, userJournal] = await Promise.all([
        prisma.strategySubscription.findMany({ where: { userId } }),
        prisma.signal.findMany({
          where: { status: "ACTIVE" },
          include: { strategy: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.journalEntry.findMany({
          where: { userId, isDeleted: false },
        }),
      ]);

      const subscribedIds = new Set(subs.map((s) => s.strategyId));
      const journalBySignal = new Map(
        userJournal.map((j) => [
          j.signalId,
          {
            id: j.id,
            userId: j.userId,
            signalId: j.signalId,
            outcome: j.outcome,
            lotSize: Number(j.lotSize),
            executionPrice: Number(j.executionPrice),
            targetTpPrice: j.targetTpPrice ? Number(j.targetTpPrice) : null,
            estimatedProfit: Number(j.estimatedProfit),
            exitPrice: j.exitPrice ? Number(j.exitPrice) : null,
            riskAmount: Number(j.riskAmount),
            pnlAmount: Number(j.pnlAmount),
            rMultiple: Number(j.rMultiple),
            session: j.session,
            followedPlan: j.followedPlan,
            emotionState: j.emotionState,
            emotionNote: j.emotionNote ?? undefined,
            signalSnapshot:
              (j.signalSnapshot as unknown as OriginalSignalSnapshot) ?? null,
            isDeleted: j.isDeleted,
            deletedAt: j.deletedAt ? j.deletedAt.toISOString() : null,
            createdAt: j.createdAt.toISOString(),
          } satisfies AppJournalEntry,
        ])
      );

      const filtered = signals.filter((sig) =>
        filterBySubscriptions ? subscribedIds.has(sig.strategyId) : true
      );

      return filtered.map((sig) => {
        const journalEntry = journalBySignal.get(sig.id) ?? null;
        return {
          id: sig.id,
          strategyId: sig.strategyId,
          asset: sig.asset,
          direction: sig.direction,
          entryPrice: Number(sig.entryPrice),
          entryZoneMax: sig.entryZoneMax ? Number(sig.entryZoneMax) : null,
          stopLoss: Number(sig.stopLoss),
          takeProfit1: Number(sig.takeProfit1),
          takeProfit2: sig.takeProfit2 ? Number(sig.takeProfit2) : null,
          status: sig.status,
          createdAt: sig.createdAt.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          strategyName: sig.strategy?.name ?? "Estrategia Institucional",
          strategyWinRate: sig.strategy ? Number(sig.strategy.winRate) : 75,
          strategyTimeframe: sig.strategy?.timeframe ?? "M15",
          hasJournalEntry: Boolean(journalEntry),
          journalEntry,
        };
      });
    }

    const db = readLocalDb();
    const subscribedIds = new Set(
      db.subscriptions
        .filter((s) => s.userId === userId)
        .map((s) => s.strategyId)
    );
    const strategyMap = new Map(db.strategies.map((s) => [s.id, s]));
    const userJournalBySignal = new Map(
      db.journal
        .filter((j) => j.userId === userId && !j.isDeleted)
        .map((j) => [j.signalId, j])
    );

    const filtered = db.signals.filter((sig) => {
      if (sig.status !== "ACTIVE") return false;
      if (!filterBySubscriptions) return true;
      return subscribedIds.has(sig.strategyId);
    });

    return filtered.map((sig) => {
      const strat = strategyMap.get(sig.strategyId);
      const journalEntry = userJournalBySignal.get(sig.id);
      return {
        ...sig,
        strategyName: strat?.name ?? "Estrategia Institucional",
        strategyWinRate: strat?.winRate ?? 75,
        strategyTimeframe: strat?.timeframe ?? "M15",
        hasJournalEntry: Boolean(journalEntry),
        journalEntry: journalEntry ?? null,
      };
    });
  },

  async createSignal(input: {
    strategyId: string;
    asset: string;
    direction: SignalDirection;
    entryPrice: number;
    entryZoneMax?: number | null;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2?: number | null;
  }): Promise<AppSignal> {
    if (USE_PRISMA_LIVE) {
      const created = await prisma.signal.create({
        data: {
          strategyId: input.strategyId,
          asset: input.asset.toUpperCase().trim() || "Volatility 75",
          direction: input.direction,
          entryPrice: Number(input.entryPrice),
          entryZoneMax: input.entryZoneMax ? Number(input.entryZoneMax) : null,
          stopLoss: Number(input.stopLoss),
          takeProfit1: Number(input.takeProfit1),
          takeProfit2: input.takeProfit2 ? Number(input.takeProfit2) : null,
          status: "ACTIVE",
        },
      });
      return {
        id: created.id,
        strategyId: created.strategyId,
        asset: created.asset,
        direction: created.direction,
        entryPrice: Number(created.entryPrice),
        entryZoneMax: created.entryZoneMax
          ? Number(created.entryZoneMax)
          : null,
        stopLoss: Number(created.stopLoss),
        takeProfit1: Number(created.takeProfit1),
        takeProfit2: created.takeProfit2 ? Number(created.takeProfit2) : null,
        status: created.status,
        createdAt: "Justo ahora",
      };
    }

    const db = readLocalDb();
    const newSig: AppSignal = {
      id: `sig_${Date.now()}`,
      strategyId: input.strategyId,
      asset: input.asset.toUpperCase().trim() || "Volatility 75",
      direction: input.direction,
      entryPrice: Number(input.entryPrice),
      entryZoneMax: input.entryZoneMax ? Number(input.entryZoneMax) : null,
      stopLoss: Number(input.stopLoss),
      takeProfit1: Number(input.takeProfit1),
      takeProfit2: input.takeProfit2 ? Number(input.takeProfit2) : null,
      status: "ACTIVE",
      createdAt: "Justo ahora",
    };
    db.signals.unshift(newSig);
    writeLocalDb(db);
    return newSig;
  },

  // ==========================================
  // BITÁCORA RÁPIDA Y MÉTRICAS (TRADING JOURNAL)
  // ==========================================
  async saveJournalEntry(input: {
    userId: string;
    signalId: string;
    outcome: TradeOutcome;
    lotSize: number;
    executionPrice: number;
    targetTpPrice?: number | null;
    targetSlPrice?: number | null;
    exitPrice?: number | null;
    riskAmount: number;
    pnlAmount: number;
    session: TradingSession;
    followedPlan: boolean;
    emotionState: string;
    emotionNote?: string;
  }): Promise<AppJournalEntry> {
    if (USE_PRISMA_LIVE) {
      const [sig, existing] = await Promise.all([
        prisma.signal.findUnique({
          where: { id: input.signalId },
          include: { strategy: true },
        }),
        prisma.journalEntry.findUnique({
          where: {
            userId_signalId: {
              userId: input.userId,
              signalId: input.signalId,
            },
          },
        }),
      ]);

      const lots = Math.max(0.01, Number(input.lotSize) || 0.1);
      const execPrice = Number(input.executionPrice);
      const tpPrice = input.targetTpPrice
        ? Number(input.targetTpPrice)
        : sig
        ? Number(sig.takeProfit1)
        : execPrice + 15;
      const slPrice = input.targetSlPrice
        ? Number(input.targetSlPrice)
        : sig
        ? Number(sig.stopLoss)
        : execPrice - 10;

      const multiplier = getContractMultiplier(sig?.asset ?? "Volatility 75");
      const estimatedProfit = Number(
        (Math.abs(tpPrice - execPrice) * lots * multiplier).toFixed(2)
      );

      const rawPnl = Math.abs(Number(input.pnlAmount) || 0);
      const normalizedPnl =
        input.outcome === "LOSS"
          ? -rawPnl
          : input.outcome === "WIN"
          ? rawPnl
          : 0;

      const risk = Math.max(1, Math.abs(Number(input.riskAmount) || 100));
      const rMultiple =
        input.outcome === "OPEN" || input.outcome === "BREAKEVEN"
          ? 0
          : Number((normalizedPnl / risk).toFixed(2));

      const snapshot: OriginalSignalSnapshot | null =
        (existing?.signalSnapshot as unknown as OriginalSignalSnapshot) ??
        (sig
          ? {
              signalId: sig.id,
              asset: sig.asset,
              direction: sig.direction,
              strategyName: sig.strategy?.name ?? "Estrategia Institucional",
              strategyDescription: sig.strategy?.description,
              strategyWinRate: sig.strategy
                ? Number(sig.strategy.winRate)
                : 75,
              strategyTimeframe: sig.strategy?.timeframe ?? "M15",
              entryPrice: Number(sig.entryPrice),
              entryZoneMax: sig.entryZoneMax
                ? Number(sig.entryZoneMax)
                : null,
              stopLoss: slPrice,
              takeProfit1: Number(sig.takeProfit1),
              takeProfit2: sig.takeProfit2 ? Number(sig.takeProfit2) : null,
              signalCreatedAt: sig.createdAt.toISOString(),
              capturedAt: new Date().toISOString(),
            }
          : null);

      if (snapshot && input.targetSlPrice) {
        snapshot.stopLoss = slPrice;
      }

      const saved = await prisma.journalEntry.upsert({
        where: {
          userId_signalId: {
            userId: input.userId,
            signalId: input.signalId,
          },
        },
        update: {
          outcome: input.outcome,
          lotSize: lots,
          executionPrice: execPrice,
          targetTpPrice: tpPrice,
          estimatedProfit,
          exitPrice: input.exitPrice ? Number(input.exitPrice) : null,
          riskAmount: risk,
          pnlAmount: normalizedPnl,
          rMultiple,
          session: input.session,
          followedPlan: Boolean(input.followedPlan),
          emotionState: input.emotionState || "Disciplinado",
          emotionNote: input.emotionNote,
          signalSnapshot: snapshot ? (snapshot as object) : undefined,
          isDeleted: false,
          deletedAt: null,
        },
        create: {
          userId: input.userId,
          signalId: input.signalId,
          outcome: input.outcome,
          lotSize: lots,
          executionPrice: execPrice,
          targetTpPrice: tpPrice,
          estimatedProfit,
          exitPrice: input.exitPrice ? Number(input.exitPrice) : null,
          riskAmount: risk,
          pnlAmount: normalizedPnl,
          rMultiple,
          session: input.session,
          followedPlan: Boolean(input.followedPlan),
          emotionState: input.emotionState || "Disciplinado",
          emotionNote: input.emotionNote,
          signalSnapshot: snapshot ? (snapshot as object) : undefined,
          isDeleted: false,
          deletedAt: null,
        },
      });

      return {
        id: saved.id,
        userId: saved.userId,
        signalId: saved.signalId,
        outcome: saved.outcome,
        lotSize: Number(saved.lotSize),
        executionPrice: Number(saved.executionPrice),
        targetTpPrice: saved.targetTpPrice
          ? Number(saved.targetTpPrice)
          : null,
        targetSlPrice: slPrice,
        estimatedProfit: Number(saved.estimatedProfit),
        exitPrice: saved.exitPrice ? Number(saved.exitPrice) : null,
        riskAmount: Number(saved.riskAmount),
        pnlAmount: Number(saved.pnlAmount),
        rMultiple: Number(saved.rMultiple),
        session: saved.session,
        followedPlan: saved.followedPlan,
        emotionState: saved.emotionState,
        emotionNote: saved.emotionNote ?? undefined,
        signalSnapshot: snapshot,
        isDeleted: saved.isDeleted,
        deletedAt: saved.deletedAt ? saved.deletedAt.toISOString() : null,
        createdAt: saved.createdAt.toISOString(),
      };
    }

    const db = readLocalDb();
    const sig = db.signals.find((s) => s.id === input.signalId);
    const strat = sig
      ? db.strategies.find((st) => st.id === sig.strategyId)
      : undefined;
    const existing = db.journal.find(
      (j) => j.userId === input.userId && j.signalId === input.signalId
    );

    const lots = Math.max(0.01, Number(input.lotSize) || 0.1);
    const execPrice = Number(input.executionPrice);
    const tpPrice = input.targetTpPrice
      ? Number(input.targetTpPrice)
      : sig?.takeProfit1 ?? execPrice + 15;
    const slPrice = input.targetSlPrice
      ? Number(input.targetSlPrice)
      : sig?.stopLoss ?? execPrice - 10;

    const multiplier = getContractMultiplier(sig?.asset ?? "Volatility 75");
    const estimatedProfit = Number(
      (Math.abs(tpPrice - execPrice) * lots * multiplier).toFixed(2)
    );

    const rawPnl = Math.abs(Number(input.pnlAmount) || 0);
    const normalizedPnl =
      input.outcome === "LOSS"
        ? -rawPnl
        : input.outcome === "WIN"
        ? rawPnl
        : 0;

    const risk = Math.max(1, Math.abs(Number(input.riskAmount) || 100));
    const rMultiple =
      input.outcome === "OPEN" || input.outcome === "BREAKEVEN"
        ? 0
        : Number((normalizedPnl / risk).toFixed(2));

    // Guardar copia inmutable de la señal original en la bitácora al momento de tomarla
    const snapshot: OriginalSignalSnapshot | null =
      existing?.signalSnapshot ??
      (sig
        ? {
            signalId: sig.id,
            asset: sig.asset,
            direction: sig.direction,
            strategyName: strat?.name ?? "Estrategia Institucional",
            strategyDescription: strat?.description,
            strategyWinRate: strat?.winRate ?? 75,
            strategyTimeframe: strat?.timeframe ?? "M15",
            entryPrice: sig.entryPrice,
            entryZoneMax: sig.entryZoneMax ?? null,
            stopLoss: slPrice,
            takeProfit1: sig.takeProfit1,
            takeProfit2: sig.takeProfit2 ?? null,
            signalCreatedAt: sig.createdAt,
            capturedAt: new Date().toISOString(),
          }
        : null);

    if (snapshot && input.targetSlPrice) {
      snapshot.stopLoss = slPrice;
    }

    if (existing) {
      existing.outcome = input.outcome;
      existing.lotSize = lots;
      existing.executionPrice = execPrice;
      existing.targetTpPrice = tpPrice;
      existing.targetSlPrice = slPrice;
      existing.estimatedProfit = estimatedProfit;
      existing.exitPrice = input.exitPrice ? Number(input.exitPrice) : null;
      existing.riskAmount = risk;
      existing.pnlAmount = normalizedPnl;
      existing.rMultiple = rMultiple;
      existing.session = input.session;
      existing.followedPlan = Boolean(input.followedPlan);
      existing.emotionState = input.emotionState || "Disciplinado";
      existing.emotionNote = input.emotionNote;
      existing.signalSnapshot = snapshot;
      existing.isDeleted = false;
      existing.deletedAt = null;
      writeLocalDb(db);
      return existing;
    }

    const entry: AppJournalEntry = {
      id: `jrn_${Date.now()}`,
      userId: input.userId,
      signalId: input.signalId,
      outcome: input.outcome,
      lotSize: lots,
      executionPrice: execPrice,
      targetTpPrice: tpPrice,
      targetSlPrice: slPrice,
      estimatedProfit,
      exitPrice: input.exitPrice ? Number(input.exitPrice) : null,
      riskAmount: risk,
      pnlAmount: normalizedPnl,
      rMultiple,
      session: input.session,
      followedPlan: Boolean(input.followedPlan),
      emotionState: input.emotionState || "Disciplinado",
      emotionNote: input.emotionNote,
      signalSnapshot: snapshot,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };
    db.journal.unshift(entry);
    writeLocalDb(db);
    return entry;
  },

  async moveJournalEntryToTrash(
    userId: string,
    entryId: string
  ): Promise<AppJournalEntry> {
    if (USE_PRISMA_LIVE) {
      const existing = await prisma.journalEntry.findFirst({
        where: { id: entryId, userId },
      });
      if (!existing) throw new Error("Operación no encontrada.");
      const updated = await prisma.journalEntry.update({
        where: { id: entryId },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      return {
        id: updated.id,
        userId: updated.userId,
        signalId: updated.signalId,
        outcome: updated.outcome,
        lotSize: Number(updated.lotSize),
        executionPrice: Number(updated.executionPrice),
        targetTpPrice: updated.targetTpPrice
          ? Number(updated.targetTpPrice)
          : null,
        estimatedProfit: Number(updated.estimatedProfit),
        exitPrice: updated.exitPrice ? Number(updated.exitPrice) : null,
        riskAmount: Number(updated.riskAmount),
        pnlAmount: Number(updated.pnlAmount),
        rMultiple: Number(updated.rMultiple),
        session: updated.session,
        followedPlan: updated.followedPlan,
        emotionState: updated.emotionState,
        emotionNote: updated.emotionNote ?? undefined,
        signalSnapshot:
          (updated.signalSnapshot as unknown as OriginalSignalSnapshot) ?? null,
        isDeleted: updated.isDeleted,
        deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
      };
    }

    const db = readLocalDb();
    const entry = db.journal.find(
      (j) => j.id === entryId && j.userId === userId
    );
    if (!entry) throw new Error("Operación no encontrada.");
    entry.isDeleted = true;
    entry.deletedAt = new Date().toISOString();
    writeLocalDb(db);
    return entry;
  },

  async restoreJournalEntry(
    userId: string,
    entryId: string
  ): Promise<AppJournalEntry> {
    if (USE_PRISMA_LIVE) {
      const existing = await prisma.journalEntry.findFirst({
        where: { id: entryId, userId },
      });
      if (!existing) throw new Error("Operación no encontrada en la papelera.");
      const updated = await prisma.journalEntry.update({
        where: { id: entryId },
        data: { isDeleted: false, deletedAt: null },
      });
      return {
        id: updated.id,
        userId: updated.userId,
        signalId: updated.signalId,
        outcome: updated.outcome,
        lotSize: Number(updated.lotSize),
        executionPrice: Number(updated.executionPrice),
        targetTpPrice: updated.targetTpPrice
          ? Number(updated.targetTpPrice)
          : null,
        estimatedProfit: Number(updated.estimatedProfit),
        exitPrice: updated.exitPrice ? Number(updated.exitPrice) : null,
        riskAmount: Number(updated.riskAmount),
        pnlAmount: Number(updated.pnlAmount),
        rMultiple: Number(updated.rMultiple),
        session: updated.session,
        followedPlan: updated.followedPlan,
        emotionState: updated.emotionState,
        emotionNote: updated.emotionNote ?? undefined,
        signalSnapshot:
          (updated.signalSnapshot as unknown as OriginalSignalSnapshot) ?? null,
        isDeleted: updated.isDeleted,
        deletedAt: null,
        createdAt: updated.createdAt.toISOString(),
      };
    }

    const db = readLocalDb();
    const entry = db.journal.find(
      (j) => j.id === entryId && j.userId === userId
    );
    if (!entry) throw new Error("Operación no encontrada en la papelera.");
    entry.isDeleted = false;
    entry.deletedAt = null;
    writeLocalDb(db);
    return entry;
  },

  async permanentlyDeleteJournalEntry(
    userId: string,
    entryId: string
  ): Promise<{ deletedId: string }> {
    if (USE_PRISMA_LIVE) {
      const existing = await prisma.journalEntry.findFirst({
        where: { id: entryId, userId },
      });
      if (!existing) throw new Error("Operación no encontrada.");
      await prisma.journalEntry.delete({ where: { id: entryId } });
      return { deletedId: entryId };
    }

    const db = readLocalDb();
    const index = db.journal.findIndex(
      (j) => j.id === entryId && j.userId === userId
    );
    if (index === -1) throw new Error("Operación no encontrada.");
    db.journal.splice(index, 1);
    writeLocalDb(db);
    return { deletedId: entryId };
  },

  async listUserJournal(userId: string) {
    await ensurePostgresSeeded();
    if (USE_PRISMA_LIVE) {
      const entries = await prisma.journalEntry.findMany({
        where: { userId },
        include: {
          signal: {
            include: { strategy: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return entries.map((j) => {
        const sig = j.signal;
        const strat = sig?.strategy;
        const rawSnapshot =
          (j.signalSnapshot as unknown as OriginalSignalSnapshot) ?? null;

        const resolvedSnapshot: OriginalSignalSnapshot | null =
          rawSnapshot ??
          (sig
            ? {
                signalId: sig.id,
                asset: sig.asset,
                direction: sig.direction,
                strategyName: strat?.name ?? "Estrategia Institucional",
                strategyDescription: strat?.description,
                strategyWinRate: strat ? Number(strat.winRate) : 75,
                strategyTimeframe: strat?.timeframe ?? "M15",
                entryPrice: Number(sig.entryPrice),
                entryZoneMax: sig.entryZoneMax
                  ? Number(sig.entryZoneMax)
                  : null,
                stopLoss: Number(sig.stopLoss),
                takeProfit1: Number(sig.takeProfit1),
                takeProfit2: sig.takeProfit2 ? Number(sig.takeProfit2) : null,
                signalCreatedAt: sig.createdAt.toISOString(),
                capturedAt: j.createdAt.toISOString(),
              }
            : null);

        const mappedSignal: AppSignal | null = sig
          ? {
              id: sig.id,
              strategyId: sig.strategyId,
              asset: sig.asset,
              direction: sig.direction,
              entryPrice: Number(sig.entryPrice),
              entryZoneMax: sig.entryZoneMax
                ? Number(sig.entryZoneMax)
                : null,
              stopLoss: Number(sig.stopLoss),
              takeProfit1: Number(sig.takeProfit1),
              takeProfit2: sig.takeProfit2 ? Number(sig.takeProfit2) : null,
              status: sig.status,
              createdAt: sig.createdAt.toISOString(),
            }
          : null;

        return {
          id: j.id,
          userId: j.userId,
          signalId: j.signalId,
          outcome: j.outcome,
          lotSize: Number(j.lotSize),
          executionPrice: Number(j.executionPrice),
          targetTpPrice: j.targetTpPrice ? Number(j.targetTpPrice) : null,
          targetSlPrice:
            resolvedSnapshot?.stopLoss ??
            (sig ? Number(sig.stopLoss) : null),
          estimatedProfit: Number(j.estimatedProfit),
          exitPrice: j.exitPrice ? Number(j.exitPrice) : null,
          riskAmount: Number(j.riskAmount),
          pnlAmount: Number(j.pnlAmount),
          rMultiple: Number(j.rMultiple),
          session: j.session,
          followedPlan: j.followedPlan,
          emotionState: j.emotionState,
          emotionNote: j.emotionNote ?? undefined,
          isDeleted: Boolean(j.isDeleted),
          deletedAt: j.deletedAt ? j.deletedAt.toISOString() : null,
          createdAt: j.createdAt.toISOString(),
          signal: mappedSignal,
          signalSnapshot: resolvedSnapshot,
          strategyName:
            resolvedSnapshot?.strategyName ??
            strat?.name ??
            "Estrategia Institucional",
        };
      });
    }

    const db = readLocalDb();
    const signalMap = new Map(db.signals.map((s) => [s.id, s]));
    const strategyMap = new Map(db.strategies.map((s) => [s.id, s]));

    return db.journal
      .filter((j) => j.userId === userId)
      .map((j) => {
        const sig = signalMap.get(j.signalId);
        const strat = sig ? strategyMap.get(sig.strategyId) : undefined;
        const resolvedSnapshot: OriginalSignalSnapshot | null =
          j.signalSnapshot ??
          (sig
            ? {
                signalId: sig.id,
                asset: sig.asset,
                direction: sig.direction,
                strategyName: strat?.name ?? "Estrategia Institucional",
                strategyDescription: strat?.description,
                strategyWinRate: strat?.winRate ?? 75,
                strategyTimeframe: strat?.timeframe ?? "M15",
                entryPrice: sig.entryPrice,
                entryZoneMax: sig.entryZoneMax ?? null,
                stopLoss: sig.stopLoss,
                takeProfit1: sig.takeProfit1,
                takeProfit2: sig.takeProfit2 ?? null,
                signalCreatedAt: sig.createdAt,
                capturedAt: j.createdAt,
              }
            : null);

        return {
          ...j,
          targetSlPrice:
            j.targetSlPrice ??
            resolvedSnapshot?.stopLoss ??
            (sig ? sig.stopLoss : null),
          isDeleted: Boolean(j.isDeleted),
          deletedAt: j.deletedAt ?? null,
          signal: sig ?? null,
          signalSnapshot: resolvedSnapshot,
          strategyName:
            resolvedSnapshot?.strategyName ??
            strat?.name ??
            "Estrategia Institucional",
        };
      });
  },
};
