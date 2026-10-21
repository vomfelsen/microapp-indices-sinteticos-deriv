// ============================================================================
// DERIV SYNTHETIC INDICES ENGINE (WebSocket API v3 + High-Fidelity Fallback)
// Official Endpoint: wss://ws.derivws.com/websockets/v3?app_id=1089
// ============================================================================

export const DERIV_SYNTHETIC_CATALOG = [
  // Volatility Indices (Normal & 1s)
  {
    symbol: 'R_10',
    display_name: 'Volatility 10 Index',
    shortName: 'V10',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices',
    pip: 0.001,
    decimals: 3,
    basePrice: 6425.450,
    volatilityPct: 10,
    minLot: 0.50,
    spreadAvg: 0.045,
    tickSpeed: '2s',
    behavior: 'normal',
    description: 'Volatilidad constante del 10% anualizada con ticks cada 2 segundos. Ideal para estructuras limpias ICT.'
  },
  {
    symbol: '1HZ10V',
    display_name: 'Volatility 10 (1s) Index',
    shortName: 'V10 (1s)',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices (1s)',
    pip: 0.01,
    decimals: 2,
    basePrice: 9180.20,
    volatilityPct: 10,
    minLot: 0.50,
    spreadAvg: 0.08,
    tickSpeed: '1s',
    behavior: 'normal',
    description: 'Volatilidad del 10% con velocidad de 1 tick por segundo. Excelente para scalping M1/M5.'
  },
  {
    symbol: 'R_25',
    display_name: 'Volatility 25 Index',
    shortName: 'V25',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices',
    pip: 0.001,
    decimals: 3,
    basePrice: 2845.120,
    volatilityPct: 25,
    minLot: 0.50,
    spreadAvg: 0.065,
    tickSpeed: '2s',
    behavior: 'normal',
    description: 'Volatilidad constante del 25%. Muy noble para seguir Order Blocks y tendencias EMA.'
  },
  {
    symbol: '1HZ25V',
    display_name: 'Volatility 25 (1s) Index',
    shortName: 'V25 (1s)',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices (1s)',
    pip: 0.01,
    decimals: 2,
    basePrice: 45120.80,
    volatilityPct: 25,
    minLot: 0.005,
    spreadAvg: 1.20,
    tickSpeed: '1s',
    behavior: 'normal',
    description: 'Volatilidad del 25% a 1 tick por segundo. Alta liquidez algorítmica para Silver Bullet.'
  },
  {
    symbol: 'R_50',
    display_name: 'Volatility 50 Index',
    shortName: 'V50',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices',
    pip: 0.0001,
    decimals: 4,
    basePrice: 312.8450,
    volatilityPct: 50,
    minLot: 4.00,
    spreadAvg: 0.0120,
    tickSpeed: '2s',
    behavior: 'normal',
    description: 'Equilibrio entre rango y tendencia con 50% de volatilidad simulada.'
  },
  {
    symbol: '1HZ50V',
    display_name: 'Volatility 50 (1s) Index',
    shortName: 'V50 (1s)',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices (1s)',
    pip: 0.01,
    decimals: 2,
    basePrice: 21540.50,
    volatilityPct: 50,
    minLot: 0.005,
    spreadAvg: 1.80,
    tickSpeed: '1s',
    behavior: 'normal',
    description: 'Índice V50 acelerado a 1 segundo por tick. Gran respeto de Fair Value Gaps (FVG).'
  },
  {
    symbol: 'R_75',
    display_name: 'Volatility 75 Index',
    shortName: 'V75',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 148520.40,
    volatilityPct: 75,
    minLot: 0.001,
    spreadAvg: 18.50,
    tickSpeed: '2s',
    behavior: 'normal',
    description: 'El índice sintético estrella de Deriv. Movimientos direccionales potentes, ideal para ICT y SMC.'
  },
  {
    symbol: '1HZ75V',
    display_name: 'Volatility 75 (1s) Index',
    shortName: 'V75 (1s)',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices (1s)',
    pip: 0.01,
    decimals: 2,
    basePrice: 7420.65,
    volatilityPct: 75,
    minLot: 0.05,
    spreadAvg: 0.95,
    tickSpeed: '1s',
    behavior: 'normal',
    description: 'Versión de 1 tick/seg del mítico V75. Desplazamientos rápidos y barridos de liquidez claros.'
  },
  {
    symbol: 'R_100',
    display_name: 'Volatility 100 Index',
    shortName: 'V100',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 1895.30,
    volatilityPct: 100,
    minLot: 0.50,
    spreadAvg: 0.42,
    tickSpeed: '2s',
    behavior: 'normal',
    description: 'Máxima volatilidad continua (100%). Requiere SL calculado con ATR y disciplina estricta.'
  },
  {
    symbol: '1HZ100V',
    display_name: 'Volatility 100 (1s) Index',
    shortName: 'V100 (1s)',
    submarket: 'continuous_indices',
    submarket_label: 'Volatility Indices (1s)',
    pip: 0.01,
    decimals: 2,
    basePrice: 1245.80,
    volatilityPct: 100,
    minLot: 0.20,
    spreadAvg: 0.35,
    tickSpeed: '1s',
    behavior: 'normal',
    description: 'Volatilidad 100% a 1 tick por segundo. Diseñado para traders de alta velocidad y Judas Swings.'
  },

  // Boom & Crash Indices
  {
    symbol: 'BOOM1000',
    display_name: 'Boom 1000 Index',
    shortName: 'BOOM 1000',
    submarket: 'crash_index',
    submarket_label: 'Crash / Boom Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 13840.25,
    volatilityPct: 65,
    minLot: 0.20,
    spreadAvg: 0.85,
    tickSpeed: '1s',
    behavior: 'boom',
    description: 'Promedio de 1 spike alcista explosivo cada 1000 ticks. Especial para cazar Spikes en Order Blocks.'
  },
  {
    symbol: 'BOOM500',
    display_name: 'Boom 500 Index',
    shortName: 'BOOM 500',
    submarket: 'crash_index',
    submarket_label: 'Crash / Boom Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 4620.90,
    volatilityPct: 75,
    minLot: 0.20,
    spreadAvg: 0.60,
    tickSpeed: '1s',
    behavior: 'boom',
    description: 'Promedio de 1 spike alcista cada 500 ticks. Alta frecuencia de reacciones en zonas de demanda.'
  },
  {
    symbol: 'BOOM300N',
    display_name: 'Boom 300 Index',
    shortName: 'BOOM 300',
    submarket: 'crash_index',
    submarket_label: 'Crash / Boom Indices',
    pip: 0.001,
    decimals: 3,
    basePrice: 1945.320,
    volatilityPct: 85,
    minLot: 1.00,
    spreadAvg: 0.45,
    tickSpeed: '1s',
    behavior: 'boom',
    description: 'Spikes alcistas frecuentes (1 cada ~300 ticks). Ideal para entradas sniper de rápida resolución.'
  },
  {
    symbol: 'CRASH1000',
    display_name: 'Crash 1000 Index',
    shortName: 'CRASH 1000',
    submarket: 'crash_index',
    submarket_label: 'Crash / Boom Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 6890.40,
    volatilityPct: 65,
    minLot: 0.20,
    spreadAvg: 0.75,
    tickSpeed: '1s',
    behavior: 'crash',
    description: 'Promedio de 1 caída súbita (spike bajista) cada 1000 ticks. Excelente en zonas Premium ICT.'
  },
  {
    symbol: 'CRASH500',
    display_name: 'Crash 500 Index',
    shortName: 'CRASH 500',
    submarket: 'crash_index',
    submarket_label: 'Crash / Boom Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 3410.15,
    volatilityPct: 75,
    minLot: 0.20,
    spreadAvg: 0.55,
    tickSpeed: '1s',
    behavior: 'crash',
    description: 'Promedio de 1 desplome (spike bajista) cada 500 ticks. Alta efectividad con RSI > 82 + OB.'
  },
  {
    symbol: 'CRASH300N',
    display_name: 'Crash 300 Index',
    shortName: 'CRASH 300',
    submarket: 'crash_index',
    submarket_label: 'Crash / Boom Indices',
    pip: 0.001,
    decimals: 3,
    basePrice: 2480.750,
    volatilityPct: 85,
    minLot: 0.50,
    spreadAvg: 0.62,
    tickSpeed: '1s',
    behavior: 'crash',
    description: 'Spikes bajistas de alta frecuencia cada ~300 ticks.'
  },

  // Jump Indices
  {
    symbol: 'JD25',
    display_name: 'Jump 25 Index',
    shortName: 'JUMP 25',
    submarket: 'jump_index',
    submarket_label: 'Jump Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 18420.50,
    volatilityPct: 25,
    minLot: 0.01,
    spreadAvg: 1.10,
    tickSpeed: '1s',
    behavior: 'jump',
    description: 'Volatilidad base del 25% con saltos direccionales cada ~20 minutos en promedio.'
  },
  {
    symbol: 'JD50',
    display_name: 'Jump 50 Index',
    shortName: 'JUMP 50',
    submarket: 'jump_index',
    submarket_label: 'Jump Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 32940.10,
    volatilityPct: 50,
    minLot: 0.01,
    spreadAvg: 2.20,
    tickSpeed: '1s',
    behavior: 'jump',
    description: 'Saltos de precio simétricos de alta magnitud con volatilidad base del 50%.'
  },
  {
    symbol: 'JD75',
    display_name: 'Jump 75 Index',
    shortName: 'JUMP 75',
    submarket: 'jump_index',
    submarket_label: 'Jump Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 54120.75,
    volatilityPct: 75,
    minLot: 0.01,
    spreadAvg: 4.50,
    tickSpeed: '1s',
    behavior: 'jump',
    description: 'Combinación de la volatilidad del V75 con saltos institucionales agresivos.'
  },
  {
    symbol: 'JD100',
    display_name: 'Jump 100 Index',
    shortName: 'JUMP 100',
    submarket: 'jump_index',
    submarket_label: 'Jump Indices',
    pip: 0.01,
    decimals: 2,
    basePrice: 82610.30,
    volatilityPct: 100,
    minLot: 0.01,
    spreadAvg: 7.20,
    tickSpeed: '1s',
    behavior: 'jump',
    description: 'Máxima potencia de salto y expansión. Ideal para estrategias Squeeze Breakout.'
  },

  // Step & Range Break
  {
    symbol: 'stpRNG',
    display_name: 'Step Index 100',
    shortName: 'STEP 100',
    submarket: 'step_index',
    submarket_label: 'Step & Range Break',
    pip: 0.1,
    decimals: 1,
    basePrice: 8492.5,
    volatilityPct: 20,
    minLot: 0.10,
    spreadAvg: 0.2,
    tickSpeed: '1s',
    behavior: 'step',
    description: 'Probabilidad simétrica 50/50 de subir o bajar en pasos fijos de 0.1 puntos.'
  },
  {
    symbol: 'RB100',
    display_name: 'Range Break 100 Index',
    shortName: 'RB 100',
    submarket: 'step_index',
    submarket_label: 'Step & Range Break',
    pip: 0.01,
    decimals: 2,
    basePrice: 5120.40,
    volatilityPct: 35,
    minLot: 0.10,
    spreadAvg: 0.40,
    tickSpeed: '1s',
    behavior: 'normal',
    description: 'Oscila en un rango bien definido y rompe el rango en promedio 1 vez cada 100 intentos.'
  }
];

export class DerivMarketEngine {
  constructor() {
    this.appId = localStorage.getItem('deriv_app_id') || '1089';
    this.apiToken = localStorage.getItem('deriv_api_token') || '';
    this.endpoint = localStorage.getItem('deriv_ws_endpoint') || 'wss://ws.derivws.com/websockets/v3';
    this.ws = null;
    this.connectionStatus = 'connecting'; // 'connected_live', 'sim_fallback', 'connecting'
    this.accountInfo = null;

    this.symbolsMap = new Map();
    this.candlesBySymbol = new Map(); // symbol -> Array<{time, open, high, low, close}>
    this.lastPrices = new Map(); // symbol -> { price, prevPrice, changePct, high24h, low24h, updatedAt }
    this.tickListeners = new Set();
    this.statusListeners = new Set();

    this._initCatalogAndHistory();
    this._startSimulationLoop();
    this.connectWebSocket();
  }

  _initCatalogAndHistory() {
    const nowSec = Math.floor(Date.now() / 1000);
    const gran = 60; // 1m base candles

    for (const item of DERIV_SYNTHETIC_CATALOG) {
      this.symbolsMap.set(item.symbol, { ...item });
      const candles = this._generateRealisticHistory(item, 120, nowSec, gran);
      this.candlesBySymbol.set(item.symbol, candles);
      const last = candles[candles.length - 1];
      const first = candles[0];
      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);
      this.lastPrices.set(item.symbol, {
        price: last.close,
        prevPrice: candles[candles.length - 2]?.close || last.open,
        changePct: ((last.close - first.open) / first.open) * 100,
        high24h: Math.max(...highs),
        low24h: Math.min(...lows),
        updatedAt: Date.now()
      });
    }
  }

  _generateRealisticHistory(item, count, endSec, granSec) {
    const candles = [];
    let price = item.basePrice;
    const stepUnit = item.pip * (item.symbol === 'R_75' ? 1800 : item.symbol.startsWith('JD') ? 450 : 35);

    // Create realistic wave structures (trends, sweeps, FVGs, spikes)
    let phase = (item.symbol.charCodeAt(0) + item.symbol.charCodeAt(item.symbol.length - 1)) % 6;

    for (let i = count - 1; i >= 0; i--) {
      const time = endSec - i * granSec;
      const open = price;
      let delta = 0;
      let high = open;
      let low = open;

      if (item.behavior === 'boom') {
        // Boom indices: gradual downward ticks with periodic sharp upward spikes
        const isSpike = i % 14 === 0 || (i < 6 && i === 2);
        if (isSpike) {
          delta = stepUnit * (3.2 + Math.random() * 2.5);
          low = open - stepUnit * 0.2;
          high = open + delta + stepUnit * 0.3;
        } else {
          delta = -stepUnit * (0.22 + Math.random() * 0.18);
          high = open + stepUnit * 0.05;
          low = open + delta - stepUnit * 0.05;
        }
      } else if (item.behavior === 'crash') {
        // Crash indices: gradual upward ticks with periodic sharp downward spikes
        const isSpike = i % 13 === 0 || (i < 6 && i === 2);
        if (isSpike) {
          delta = -stepUnit * (3.2 + Math.random() * 2.5);
          high = open + stepUnit * 0.2;
          low = open + delta - stepUnit * 0.3;
        } else {
          delta = stepUnit * (0.22 + Math.random() * 0.18);
          low = open - stepUnit * 0.05;
          high = open + delta + stepUnit * 0.05;
        }
      } else if (item.behavior === 'step') {
        const dir = Math.random() > 0.48 ? 1 : -1;
        delta = dir * 0.1 * (1 + Math.floor(Math.random() * 4));
        high = Math.max(open, open + delta) + 0.1;
        low = Math.min(open, open + delta) - 0.1;
      } else {
        // Volatility & Jump indices with ICT institutional displacement patterns
        const wave = Math.sin((count - i) / 7 + phase) * 0.65;
        const isDisplacement = i === 3 || i === 18 || i === 36;
        const noise = (Math.random() - 0.485) * 1.3;
        const mult = isDisplacement ? 2.4 : 1.0;
        delta = (wave + noise) * stepUnit * mult;
        const wickUp = Math.random() * stepUnit * 0.85;
        const wickDown = Math.random() * stepUnit * 0.85;
        high = Math.max(open, open + delta) + wickUp;
        low = Math.min(open, open + delta) - wickDown;
      }

      const close = Number((open + delta).toFixed(item.decimals));
      candles.push({
        time,
        open: Number(open.toFixed(item.decimals)),
        high: Number(Math.max(open, close, high).toFixed(item.decimals)),
        low: Number(Math.min(open, close, low).toFixed(item.decimals)),
        close
      });
      price = close;
    }
    return candles;
  }

  connectWebSocket(customAppId, customToken, customEndpoint) {
    if (customAppId) {
      this.appId = String(customAppId).trim();
      localStorage.setItem('deriv_app_id', this.appId);
    }
    if (customToken !== undefined) {
      this.apiToken = String(customToken).trim();
      localStorage.setItem('deriv_api_token', this.apiToken);
    }
    if (customEndpoint) {
      this.endpoint = String(customEndpoint).trim();
      localStorage.setItem('deriv_ws_endpoint', this.endpoint);
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (_e) {}
    }

    this._setStatus('connecting');

    try {
      const wsUrl = `${this.endpoint}?app_id=${encodeURIComponent(this.appId)}`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const timeoutId = setTimeout(() => {
        if (this.connectionStatus === 'connecting') {
          this._setStatus('sim_fallback');
        }
      }, 4500);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        this._setStatus('connected_live');

        // 1. Request active synthetic symbols from Deriv
        ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }));

        // 2. Authorize if user provided API token
        if (this.apiToken) {
          ws.send(JSON.stringify({ authorize: this.apiToken }));
        }

        // 3. Subscribe to top symbols live ticks
        const defaultStreams = ['R_75', '1HZ75V', 'R_100', 'BOOM1000', 'CRASH1000', 'JD75'];
        for (const sym of defaultStreams) {
          ws.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
        }
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.msg_type === 'authorize' && msg.authorize) {
            this.accountInfo = {
              loginid: msg.authorize.loginid,
              balance: msg.authorize.balance,
              currency: msg.authorize.currency,
              isVirtual: Boolean(msg.authorize.is_virtual),
              email: msg.authorize.email
            };
            this._notifyStatus();
          } else if (msg.msg_type === 'tick' && msg.tick) {
            const { symbol, quote, epoch } = msg.tick;
            this._ingestLiveTick(symbol, Number(quote), Number(epoch));
          } else if (msg.msg_type === 'candles' && Array.isArray(msg.candles)) {
            const sym = msg.echo_req?.ticks_history;
            if (sym && this.symbolsMap.has(sym)) {
              const formatted = msg.candles.map((c) => ({
                time: Number(c.epoch),
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close)
              }));
              if (formatted.length > 20) {
                this.candlesBySymbol.set(sym, formatted);
              }
            }
          }
        } catch (_err) {}
      };

      ws.onerror = () => {
        clearTimeout(timeoutId);
        this._setStatus('sim_fallback');
      };

      ws.onclose = () => {
        clearTimeout(timeoutId);
        if (this.connectionStatus === 'connected_live') {
          this._setStatus('sim_fallback');
        }
      };
    } catch (_e) {
      this._setStatus('sim_fallback');
    }
  }

  requestSymbolCandles(symbol, granularity = 60) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 120,
            end: 'latest',
            style: 'candles',
            granularity,
            subscribe: 1
          })
        );
      } catch (_e) {}
    }
  }

  _ingestLiveTick(symbol, quote, epochSec = Math.floor(Date.now() / 1000)) {
    const meta = this.symbolsMap.get(symbol);
    if (!meta) return;

    const price = Number(quote.toFixed(meta.decimals));
    const currentState = this.lastPrices.get(symbol) || {
      price,
      prevPrice: price,
      changePct: 0,
      high24h: price,
      low24h: price
    };

    const candles = this.candlesBySymbol.get(symbol) || [];
    const bucketTime = Math.floor(epochSec / 60) * 60;
    const lastCandle = candles[candles.length - 1];

    if (!lastCandle || bucketTime > lastCandle.time) {
      candles.push({
        time: bucketTime,
        open: lastCandle ? lastCandle.close : price,
        high: Math.max(lastCandle ? lastCandle.close : price, price),
        low: Math.min(lastCandle ? lastCandle.close : price, price),
        close: price
      });
      if (candles.length > 150) candles.shift();
    } else {
      lastCandle.close = price;
      if (price > lastCandle.high) lastCandle.high = price;
      if (price < lastCandle.low) lastCandle.low = price;
    }

    const firstOpen = candles[0]?.open || meta.basePrice;
    const updated = {
      price,
      prevPrice: currentState.price,
      changePct: ((price - firstOpen) / firstOpen) * 100,
      high24h: Math.max(currentState.high24h, price),
      low24h: Math.min(currentState.low24h, price),
      updatedAt: Date.now()
    };
    this.lastPrices.set(symbol, updated);

    for (const cb of this.tickListeners) {
      cb(symbol, updated, candles);
    }
  }

  _startSimulationLoop() {
    // Runs continuously to ensure all 22 synthetic indices stay alive even if WS only streams a subset or is offline
    setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);
      for (const item of DERIV_SYNTHETIC_CATALOG) {
        const state = this.lastPrices.get(item.symbol);
        if (!state) continue;

        // If live WS updated this symbol within last 1.4s, skip synthetic tick for it
        if (this.connectionStatus === 'connected_live' && Date.now() - state.updatedAt < 1400) {
          continue;
        }

        const stepUnit = item.pip * (item.symbol === 'R_75' ? 420 : item.symbol.startsWith('JD') ? 110 : 10);
        let delta = 0;

        if (item.behavior === 'boom') {
          const spikeRoll = Math.random();
          if (spikeRoll > 0.965) {
            delta = stepUnit * (4.5 + Math.random() * 4.0); // Boom upward spike!
          } else {
            delta = -stepUnit * (0.18 + Math.random() * 0.14);
          }
        } else if (item.behavior === 'crash') {
          const spikeRoll = Math.random();
          if (spikeRoll > 0.965) {
            delta = -stepUnit * (4.5 + Math.random() * 4.0); // Crash downward spike!
          } else {
            delta = stepUnit * (0.18 + Math.random() * 0.14);
          }
        } else if (item.behavior === 'step') {
          delta = (Math.random() > 0.495 ? 1 : -1) * 0.1;
        } else if (item.behavior === 'jump') {
          const isJump = Math.random() > 0.975;
          delta = (Math.random() - 0.492) * stepUnit * (isJump ? 5.2 : 1.1);
        } else {
          delta = (Math.random() - 0.493) * stepUnit * 1.15;
        }

        const nextPrice = Math.max(item.pip * 10, state.price + delta);
        this._ingestLiveTick(item.symbol, nextPrice, nowSec);
      }
    }, 900);
  }

  _setStatus(status) {
    this.connectionStatus = status;
    this._notifyStatus();
  }

  _notifyStatus() {
    for (const cb of this.statusListeners) {
      cb(this.connectionStatus, this.accountInfo);
    }
  }

  onTick(callback) {
    this.tickListeners.add(callback);
    return () => this.tickListeners.delete(callback);
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.connectionStatus, this.accountInfo);
    return () => this.statusListeners.delete(callback);
  }

  getCatalog() {
    return DERIV_SYNTHETIC_CATALOG.map((item) => ({
      ...item,
      ...(this.lastPrices.get(item.symbol) || { price: item.basePrice, changePct: 0 })
    }));
  }

  getSymbolMeta(symbol) {
    return this.symbolsMap.get(symbol) || DERIV_SYNTHETIC_CATALOG[0];
  }

  getCandles(symbol) {
    return this.candlesBySymbol.get(symbol) || [];
  }

  getPrice(symbol) {
    return this.lastPrices.get(symbol)?.price || this.getSymbolMeta(symbol).basePrice;
  }
}
