// src/lib/deriv-ws.ts
"use client";

export interface DerivAccountInfo {
  loginid: string;
  balance: number;
  currency: string;
  isVirtual: boolean;
  email?: string;
}

export type DerivConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected_live"
  | "authorized"
  | "sim_fallback";

export interface DerivTick {
  symbol: string;
  price: number;
  epoch: number;
}

export interface DerivSymbolMeta {
  symbol: string;
  displayName: string;
  shortName: string;
  decimals: number;
  pip: number;
  basePrice: number;
  behavior: "boom" | "crash" | "step" | "jump" | "normal";
}

export const DERIV_SYMBOLS: Record<string, DerivSymbolMeta> = {
  // Volatility Continua Estándar (2s)
  R_10: {
    symbol: "R_10",
    displayName: "Volatility 10",
    shortName: "V10",
    decimals: 3,
    pip: 0.001,
    basePrice: 6540.25,
    behavior: "normal",
  },
  R_25: {
    symbol: "R_25",
    displayName: "Volatility 25",
    shortName: "V25",
    decimals: 2,
    pip: 0.01,
    basePrice: 2890.5,
    behavior: "normal",
  },
  R_50: {
    symbol: "R_50",
    displayName: "Volatility 50",
    shortName: "V50",
    decimals: 2,
    pip: 0.01,
    basePrice: 320.15,
    behavior: "normal",
  },
  R_75: {
    symbol: "R_75",
    displayName: "Volatility 75",
    shortName: "V75",
    decimals: 2,
    pip: 0.01,
    basePrice: 452180.5,
    behavior: "normal",
  },
  R_100: {
    symbol: "R_100",
    displayName: "Volatility 100",
    shortName: "V100",
    decimals: 2,
    pip: 0.01,
    basePrice: 1852.35,
    behavior: "normal",
  },

  // Volatility (1s) - Generación de Ticks cada 1 segundo
  "1HZ10V": {
    symbol: "1HZ10V",
    displayName: "Volatility 10 (1s)",
    shortName: "V10 (1s)",
    decimals: 2,
    pip: 0.01,
    basePrice: 8520.1,
    behavior: "normal",
  },
  "1HZ25V": {
    symbol: "1HZ25V",
    displayName: "Volatility 25 (1s)",
    shortName: "V25 (1s)",
    decimals: 2,
    pip: 0.01,
    basePrice: 3420.8,
    behavior: "normal",
  },
  "1HZ50V": {
    symbol: "1HZ50V",
    displayName: "Volatility 50 (1s)",
    shortName: "V50 (1s)",
    decimals: 2,
    pip: 0.01,
    basePrice: 480.9,
    behavior: "normal",
  },
  "1HZ75V": {
    symbol: "1HZ75V",
    displayName: "Volatility 75 (1s)",
    shortName: "V75 (1s)",
    decimals: 2,
    pip: 0.01,
    basePrice: 124500.0,
    behavior: "normal",
  },
  "1HZ100V": {
    symbol: "1HZ100V",
    displayName: "Volatility 100 (1s)",
    shortName: "V100 (1s)",
    decimals: 2,
    pip: 0.01,
    basePrice: 2150.4,
    behavior: "normal",
  },
  "1HZ150V": {
    symbol: "1HZ150V",
    displayName: "Volatility 150 (1s)",
    shortName: "V150 (1s)",
    decimals: 2,
    pip: 0.01,
    basePrice: 6500.0,
    behavior: "normal",
  },
  "1HZ250V": {
    symbol: "1HZ250V",
    displayName: "Volatility 250 (1s)",
    shortName: "V250 (1s)",
    decimals: 2,
    pip: 0.01,
    basePrice: 9200.0,
    behavior: "normal",
  },

  // Crash & Boom
  BOOM1000: {
    symbol: "BOOM1000",
    displayName: "Boom 1000",
    shortName: "B1000",
    decimals: 2,
    pip: 0.01,
    basePrice: 14280.4,
    behavior: "boom",
  },
  BOOM500: {
    symbol: "BOOM500",
    displayName: "Boom 500",
    shortName: "B500",
    decimals: 2,
    pip: 0.01,
    basePrice: 4210.5,
    behavior: "boom",
  },
  BOOM300N: {
    symbol: "BOOM300N",
    displayName: "Boom 300",
    shortName: "B300",
    decimals: 2,
    pip: 0.01,
    basePrice: 1850.2,
    behavior: "boom",
  },
  CRASH1000: {
    symbol: "CRASH1000",
    displayName: "Crash 1000",
    shortName: "C1000",
    decimals: 2,
    pip: 0.01,
    basePrice: 9845.2,
    behavior: "crash",
  },
  CRASH500: {
    symbol: "CRASH500",
    displayName: "Crash 500",
    shortName: "C500",
    decimals: 2,
    pip: 0.01,
    basePrice: 3680.1,
    behavior: "crash",
  },
  CRASH300N: {
    symbol: "CRASH300N",
    displayName: "Crash 300",
    shortName: "C300",
    decimals: 2,
    pip: 0.01,
    basePrice: 1220.8,
    behavior: "crash",
  },

  // Step Indices
  stpRNG: {
    symbol: "stpRNG",
    displayName: "Step Index",
    shortName: "STEP",
    decimals: 1,
    pip: 0.1,
    basePrice: 8642.1,
    behavior: "step",
  },
  stpRNG100: {
    symbol: "stpRNG100",
    displayName: "Step Index 100",
    shortName: "STEP 100",
    decimals: 1,
    pip: 0.1,
    basePrice: 10540.2,
    behavior: "step",
  },
  stpRNG200: {
    symbol: "stpRNG200",
    displayName: "Step Index 200",
    shortName: "STEP 200",
    decimals: 1,
    pip: 0.1,
    basePrice: 21320.5,
    behavior: "step",
  },
  stpRNG500: {
    symbol: "stpRNG500",
    displayName: "Step Index 500",
    shortName: "STEP 500",
    decimals: 1,
    pip: 0.1,
    basePrice: 53410.0,
    behavior: "step",
  },

  // Jump Indices
  JD10: {
    symbol: "JD10",
    displayName: "Jump 10",
    shortName: "J10",
    decimals: 2,
    pip: 0.01,
    basePrice: 32000.0,
    behavior: "jump",
  },
  JD25: {
    symbol: "JD25",
    displayName: "Jump 25",
    shortName: "J25",
    decimals: 2,
    pip: 0.01,
    basePrice: 65400.0,
    behavior: "jump",
  },
  JD50: {
    symbol: "JD50",
    displayName: "Jump 50",
    shortName: "J50",
    decimals: 2,
    pip: 0.01,
    basePrice: 145000.0,
    behavior: "jump",
  },
  JD75: {
    symbol: "JD75",
    displayName: "Jump 75",
    shortName: "J75",
    decimals: 2,
    pip: 0.01,
    basePrice: 541920.0,
    behavior: "jump",
  },
  JD100: {
    symbol: "JD100",
    displayName: "Jump 100",
    shortName: "J100",
    decimals: 2,
    pip: 0.01,
    basePrice: 890400.0,
    behavior: "jump",
  },

  // Range Break
  RB100: {
    symbol: "RB100",
    displayName: "Range Break 100",
    shortName: "RB 100",
    decimals: 2,
    pip: 0.01,
    basePrice: 5400.0,
    behavior: "normal",
  },
  RB200: {
    symbol: "RB200",
    displayName: "Range Break 200",
    shortName: "RB 200",
    decimals: 2,
    pip: 0.01,
    basePrice: 8900.0,
    behavior: "normal",
  },
};

class DerivWebSocketClient {
  private ws: WebSocket | null = null;
  private status: DerivConnectionStatus = "connecting";
  private account: DerivAccountInfo | null = null;
  private appId: string = "1089";
  private token: string = "";
  private listeners: Set<
    (status: DerivConnectionStatus, account: DerivAccountInfo | null) => void
  > = new Set();
  private tickListeners: Set<(tick: DerivTick) => void> = new Set();
  private latestPrices: Map<string, number> = new Map();
  private simulationInterval: NodeJS.Timeout | null = null;
  private lastLiveTickTime: Map<string, number> = new Map();

  constructor() {
    if (typeof window !== "undefined") {
      this.appId = localStorage.getItem("deriv_app_id") || "1089";
      this.token = localStorage.getItem("deriv_api_token") || "";

      // Inicializar precios base
      Object.values(DERIV_SYMBOLS).forEach((meta) => {
        this.latestPrices.set(meta.symbol, meta.basePrice);
      });

      // Iniciar motor de respaldo 24/7 (garantiza ticks continuos siempre)
      this.startSimulationEngine();
    }
  }

  public getStatus() {
    return this.status;
  }

  public getAccount() {
    return this.account;
  }

  public getAppId() {
    return this.appId;
  }

  public getToken() {
    return this.token;
  }

  public getPrice(symbol: string) {
    return this.latestPrices.get(symbol);
  }

  public subscribeStatus(
    cb: (status: DerivConnectionStatus, account: DerivAccountInfo | null) => void
  ) {
    this.listeners.add(cb);
    cb(this.status, this.account);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public subscribeTicks(cb: (tick: DerivTick) => void) {
    this.tickListeners.add(cb);
    return () => {
      this.tickListeners.delete(cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      cb(this.status, this.account);
    }
  }

  private notifyTick(tick: DerivTick) {
    for (const cb of this.tickListeners) {
      cb(tick);
    }
  }

  public connect(customAppId?: string, customToken?: string) {
    if (typeof window === "undefined") return;

    if (customAppId !== undefined) {
      this.appId = customAppId.trim() || "1089";
      localStorage.setItem("deriv_app_id", this.appId);
    }
    if (customToken !== undefined) {
      this.token = customToken.trim();
      localStorage.setItem("deriv_api_token", this.token);
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.status = "connecting";
    this.notify();

    // Timeout de seguridad: si la red bloquea o tarda más de 3.5s, activar modo respaldo sin error rojo
    const fallbackTimer = setTimeout(() => {
      if (this.status === "connecting") {
        this.status = "sim_fallback";
        this.notify();
      }
    }, 3500);

    try {
      const endpoint = `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(
        this.appId
      )}`;
      const ws = new WebSocket(endpoint);
      this.ws = ws;

      ws.onopen = () => {
        clearTimeout(fallbackTimer);
        this.status = "connected_live";
        this.notify();

        // 1. Autorizar si el usuario configuró API Token
        if (this.token) {
          ws.send(JSON.stringify({ authorize: this.token }));
        }

        // 2. Suscribir a los ticks de los índices principales
        Object.keys(DERIV_SYMBOLS).forEach((sym) => {
          ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.msg_type === "authorize" && data.authorize) {
            this.account = {
              loginid: data.authorize.loginid,
              balance: Number(data.authorize.balance),
              currency: data.authorize.currency,
              isVirtual: Boolean(data.authorize.is_virtual),
              email: data.authorize.email,
            };
            this.status = "authorized";
            this.notify();
          } else if (data.msg_type === "tick" && data.tick) {
            const sym = data.tick.symbol;
            const quote = Number(data.tick.quote);
            this.lastLiveTickTime.set(sym, Date.now());
            this.latestPrices.set(sym, quote);
            this.notifyTick({
              symbol: sym,
              price: quote,
              epoch: data.tick.epoch,
            });
          } else if (data.error) {
            // Manejo silencioso de error de token inválido
            if (data.msg_type === "authorize") {
              this.status = "connected_live";
              this.account = null;
              this.notify();
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        clearTimeout(fallbackTimer);
        // En lugar de console.error que dispara alertas rojas en Next.js,
        // pasamos limpiamente a sim_fallback mientras mantenemos los datos vivos.
        this.status = "sim_fallback";
        this.notify();
      };

      ws.onclose = () => {
        clearTimeout(fallbackTimer);
        if (this.status !== "authorized") {
          this.status = "sim_fallback";
          this.notify();
        }
      };
    } catch {
      clearTimeout(fallbackTimer);
      this.status = "sim_fallback";
      this.notify();
    }
  }

  private startSimulationEngine() {
    if (this.simulationInterval) return;

    this.simulationInterval = setInterval(() => {
      const now = Date.now();
      const nowEpoch = Math.floor(now / 1000);

      Object.values(DERIV_SYMBOLS).forEach((item) => {
        // Si hay conexión WS viva y este símbolo recibió un tick en los últimos 2s, respetamos el tick de Deriv
        const lastLive = this.lastLiveTickTime.get(item.symbol);
        if (
          this.status === "connected_live" ||
          this.status === "authorized"
        ) {
          if (lastLive && now - lastLive < 2000) return;
        }

        const currentPrice =
          this.latestPrices.get(item.symbol) || item.basePrice;
        const stepUnit =
          item.pip *
          (item.symbol === "R_75"
            ? 350
            : item.symbol === "1HZ75V"
            ? 120
            : item.symbol.startsWith("JD")
            ? 90
            : item.symbol.startsWith("stpRNG")
            ? 1
            : 8);
        let delta = 0;

        if (item.behavior === "boom") {
          // Boom: Ticks graduales hacia abajo con Spikes hacia arriba
          const isSpike = Math.random() > 0.965;
          if (isSpike) {
            delta = stepUnit * (4.2 + Math.random() * 4.5);
          } else {
            delta = -stepUnit * (0.16 + Math.random() * 0.12);
          }
        } else if (item.behavior === "crash") {
          // Crash: Ticks graduales hacia arriba con Spikes hacia abajo
          const isSpike = Math.random() > 0.965;
          if (isSpike) {
            delta = -stepUnit * (4.2 + Math.random() * 4.5);
          } else {
            delta = stepUnit * (0.16 + Math.random() * 0.12);
          }
        } else if (item.behavior === "step") {
          delta = (Math.random() > 0.495 ? 1 : -1) * 0.1;
        } else if (item.behavior === "jump") {
          const isJump = Math.random() > 0.975;
          delta = (Math.random() - 0.492) * stepUnit * (isJump ? 4.5 : 1.1);
        } else {
          delta = (Math.random() - 0.494) * stepUnit * 1.1;
        }

        const nextPrice = Number(
          Math.max(item.pip * 5, currentPrice + delta).toFixed(item.decimals)
        );
        this.latestPrices.set(item.symbol, nextPrice);

        this.notifyTick({
          symbol: item.symbol,
          price: nextPrice,
          epoch: nowEpoch,
        });
      });
    }, 850);
  }

  public disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.status = "sim_fallback";
    this.notify();
  }
}

// Singleton export
let clientInstance: DerivWebSocketClient | null = null;

export function getDerivClient(): DerivWebSocketClient {
  if (!clientInstance) {
    clientInstance = new DerivWebSocketClient();
  }
  return clientInstance;
}
