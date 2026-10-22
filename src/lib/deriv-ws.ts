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
  isLive?: boolean;
  accountType?: "REAL" | "DEMO" | "SIMULATED";
  source?: string;
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
    basePrice: 7348.0,
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

      // Inicializar precios base y cargar calibraciones personalizadas si existen
      Object.values(DERIV_SYMBOLS).forEach((meta) => {
        this.latestPrices.set(meta.symbol, meta.basePrice);
      });

      try {
        const customCalib = localStorage.getItem("synth_calibrated_prices");
        if (customCalib) {
          const parsed = JSON.parse(customCalib);
          Object.entries(parsed).forEach(([sym, val]) => {
            if (DERIV_SYMBOLS[sym] && typeof val === "number") {
              DERIV_SYMBOLS[sym].basePrice = val;
              this.latestPrices.set(sym, val);
            }
          });
        }
      } catch {}

      // Iniciar motor de respaldo 24/7 (garantiza ticks continuos siempre)
      this.startSimulationEngine();

      // Conexión automática inmediata a los servidores de Deriv en vivo al cargar
      this.connect();
    }
  }

  public setBasePrice(symbol: string, newPrice: number) {
    if (DERIV_SYMBOLS[symbol] && typeof newPrice === "number" && !isNaN(newPrice)) {
      DERIV_SYMBOLS[symbol].basePrice = newPrice;
      this.latestPrices.set(symbol, newPrice);
      try {
        const customCalib = localStorage.getItem("synth_calibrated_prices");
        const parsed = customCalib ? JSON.parse(customCalib) : {};
        parsed[symbol] = newPrice;
        localStorage.setItem("synth_calibrated_prices", JSON.stringify(parsed));
      } catch {}

      // Notificar tick inmediatamente
      this.notifyTick({
        symbol,
        price: newPrice,
        epoch: Math.floor(Date.now() / 1000),
      });

      // También sincronizar con el backend
      const meta = DERIV_SYMBOLS[symbol];
      if (meta) {
        fetch("/api/market/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asset: meta.displayName, price: newPrice }),
        }).catch(() => {});
      }
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

  public isRealAccount(): boolean {
    return this.status === "authorized" && this.account !== null && !this.account.isVirtual;
  }

  public isDemoAccount(): boolean {
    return this.status === "authorized" && this.account !== null && this.account.isVirtual;
  }

  public getPriceSource(): "REAL_LIVE" | "DEMO_LIVE" | "PUBLIC_WS" | "CALIBRATED_FALLBACK" {
    if (this.status === "authorized" && this.account) {
      return this.account.isVirtual ? "DEMO_LIVE" : "REAL_LIVE";
    }
    if (this.status === "connected_live") {
      return "PUBLIC_WS";
    }
    return "CALIBRATED_FALLBACK";
  }

  private endpointIndex: number = 0;
  private readonly endpoints: string[] = [
    "wss://ws.derivws.com/websockets/v3",
    "wss://ws.binaryws.com/websockets/v3",
  ];

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

    // Timeout de seguridad: si la red bloquea o tarda más de 4s, activar modo respaldo sin bloquear la UI
    const fallbackTimer = setTimeout(() => {
      if (this.status === "connecting") {
        this.status = "sim_fallback";
        this.notify();
      }
    }, 4000);

    try {
      const baseHost = this.endpoints[this.endpointIndex % this.endpoints.length];
      const endpoint = `${baseHost}?app_id=${encodeURIComponent(this.appId)}`;
      const ws = new WebSocket(endpoint);
      this.ws = ws;

      ws.onopen = () => {
        clearTimeout(fallbackTimer);

        if (this.token) {
          // Si hay token, autorizar primero para activar los permisos de la cuenta
          try {
            ws.send(JSON.stringify({ authorize: this.token }));
          } catch {}
        } else {
          // Modo público sin token: suscribir directamente a los ticks
          this.status = "connected_live";
          this.notify();
          Object.keys(DERIV_SYMBOLS).forEach((sym) => {
            try {
              ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
            } catch {}
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.msg_type === "authorize" && data.authorize) {
            clearTimeout(fallbackTimer);
            this.account = {
              loginid: data.authorize.loginid,
              balance: Number(data.authorize.balance),
              currency: data.authorize.currency,
              isVirtual: Boolean(data.authorize.is_virtual),
              email: data.authorize.email,
            };
            this.status = "authorized";
            this.notify();

            // Una vez autorizada la cuenta (Real o Demo), suscribir a todos los ticks del servidor correspondiente
            Object.keys(DERIV_SYMBOLS).forEach((sym) => {
              try {
                ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
              } catch {}
            });
          } else if (data.msg_type === "tick" && data.tick) {
            const sym = data.tick.symbol;
            const quote = Number(data.tick.quote);
            this.lastLiveTickTime.set(sym, Date.now());
            this.latestPrices.set(sym, quote);
            
            const isVirtual = Boolean(this.account?.isVirtual);
            const sourceName = this.account
              ? isVirtual
                ? "Deriv Demo Server (Live)"
                : "Deriv Real Server (Live)"
              : "Deriv WebSocket (Live)";

            this.notifyTick({
              symbol: sym,
              price: quote,
              epoch: data.tick.epoch,
              isLive: true,
              accountType: this.account ? (isVirtual ? "DEMO" : "REAL") : "SIMULATED",
              source: sourceName,
            });
          } else if (data.error) {
            // Manejo de error si el token expiró o fue inválido
            if (data.msg_type === "authorize") {
              this.status = "connected_live";
              this.account = null;
              this.notify();
              // Suscribir en modo público si falló el authorize
              Object.keys(DERIV_SYMBOLS).forEach((sym) => {
                try {
                  ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
                } catch {}
              });
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        clearTimeout(fallbackTimer);
        this.endpointIndex++;
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
