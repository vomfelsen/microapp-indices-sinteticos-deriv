// ============================================================================
// REAL-TIME TRADING JOURNAL (BITÁCORA), SL/TP TRACKER, DAILY RISK GUARD & CHECKLIST
// ============================================================================

export const MOOD_OPTIONS = [
  { id: 'calmo', label: '🧘 Calmo y Enfocado (Estado Óptimo)', color: '#10b981' },
  { id: 'confiado', label: '🎯 Confiado / Siguiendo el Plan', color: '#3b82f6' },
  { id: 'ansioso', label: '⚡ Ansioso / Impaciente', color: '#f59e0b' },
  { id: 'fomo', label: '🔥 FOMO (Miedo a perderse el movimiento)', color: '#f97316' },
  { id: 'revancha', label: '😡 Frustrado / Buscando Revancha', color: '#ef4444' },
  { id: 'dudoso', label: '🌫️ Cansado / Con Duda', color: '#94a3b8' }
];

export const SENTIMENT_OPTIONS = [
  'Alcista Institucional (Order Flow Bullish)',
  'Bajista Institucional (Order Flow Bearish)',
  'Zona de Caza de Spikes (Agotamiento)',
  'Manipulación / Judas Swing (Stop Hunt)',
  'Rango / Consolidación (Acumulación)',
  'Expansión de Alta Volatilidad (Jump/V75)'
];

export const DEFAULT_CHECKLIST = [
  { id: 'chk_1', text: '¿Hubo barrido de liquidez previo (BSL/SSL Sweep) o agotamiento claro?', required: true },
  { id: 'chk_2', text: '¿Existe desplazamiento institucional con Fair Value Gap (FVG) u Order Block?', required: true },
  { id: 'chk_3', text: '¿El precio se encuentra en zona correcta (Discount para BUY / Premium para SELL)?', required: true },
  { id: 'chk_4', text: '¿El Ratio Riesgo:Beneficio (R:R) es mínimo 1:2 y el SL está bien ubicado?', required: true },
  { id: 'chk_5', text: '¿Calculé el lotaje respetando mi riesgo máximo por operación (%)?', required: true },
  { id: 'chk_6', text: '¿Mi estado de ánimo es calmo, sin FOMO ni deseo de revancha?', required: false }
];

const INITIAL_JOURNALS = [
  {
    id: 'jrn_main_ict',
    name: 'Bitácora Principal ICT & Volatility (V75 / V100)',
    description: 'Cuenta enfocada en setups ICT Silver Bullet, Order Blocks y tendencias en índices continuos y Jump.',
    initialBalance: 2500,
    riskPerTradePct: 1.0,
    maxDailyTrades: 4,
    maxDailyLosses: 2,
    minChecklistPct: 80,
    strictGuardEnabled: true,
    checklist: structuredClone(DEFAULT_CHECKLIST),
    createdAt: '2026-10-01T10:00:00Z'
  },
  {
    id: 'jrn_spikes_bc',
    name: 'Bitácora Caza-Spikes (Boom 1000 / Crash 1000)',
    description: 'Operativa especializada en reacciones institucionales y caza de spikes con SL ajustado.',
    initialBalance: 1000,
    riskPerTradePct: 1.5,
    maxDailyTrades: 6,
    maxDailyLosses: 2,
    minChecklistPct: 75,
    strictGuardEnabled: true,
    checklist: [
      { id: 'chk_s1', text: '¿RSI(14) en zona extrema (<18 en Boom o >82 en Crash)?', required: true },
      { id: 'chk_s2', text: '¿Confluencia con Order Block de spike anterior o Banda de Bollinger?', required: true },
      { id: 'chk_s3', text: '¿SL máximo de 10-12 ticks configurado rigurosamente?', required: true },
      { id: 'chk_s4', text: '¿Estado emocional tranquilo sin sobre-apalancamiento?', required: true }
    ],
    createdAt: '2026-10-05T12:00:00Z'
  }
];

export class TradingJournalEngine {
  constructor() {
    this.journals = this._loadJournals();
    this.activeJournalId = localStorage.getItem('deriv_active_journal_id') || this.journals[0].id;
    this.trades = this._loadTrades();
    this.tradeUpdateListeners = new Set();
  }

  _loadJournals() {
    try {
      const saved = localStorage.getItem('deriv_journals_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}
    return structuredClone(INITIAL_JOURNALS);
  }

  saveJournals() {
    localStorage.setItem('deriv_journals_v1', JSON.stringify(this.journals));
  }

  _loadTrades() {
    try {
      const saved = localStorage.getItem('deriv_journal_trades_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}

    // Seed initial realistic trades (including 1 active live trade and historical closed trades)
    const now = Date.now();
    return [
      {
        id: 'trd_seed_live_1',
        journalId: 'jrn_main_ict',
        symbol: 'R_75',
        displayName: 'Volatility 75 Index',
        shortName: 'V75',
        decimals: 2,
        direction: 'BUY',
        strategyName: 'ICT Silver Bullet + FVG + OTE',
        timeframe: 'M5',
        lotSize: 0.05,
        riskUsd: 25.0,
        entryPrice: 148490.0,
        stopLoss: 148180.0,
        takeProfit: 149420.0,
        currentPrice: 148640.0,
        exitPrice: null,
        rrRatio: 3.0,
        status: 'OPEN',
        pnlUsd: 12.1,
        rMultiple: 0.48,
        marketSentiment: 'Alcista Institucional (Order Flow Bullish)',
        traderMood: 'calmo',
        traderMoodLabel: '🧘 Calmo y Enfocado (Estado Óptimo)',
        session: 'Nueva York Killzone',
        checklistScorePct: 100,
        disciplineStars: 5,
        tags: ['ICT', 'SilverBullet', 'FVG', 'Discount'],
        notes: 'Barrido limpio de SSL en M15 + Desplazamiento con FVG en M5 dentro de zona OTE 70.5%.',
        openedAt: new Date(now - 1000 * 60 * 18).toISOString(),
        closedAt: null
      },
      {
        id: 'trd_seed_hist_1',
        journalId: 'jrn_main_ict',
        symbol: '1HZ75V',
        displayName: 'Volatility 75 (1s) Index',
        shortName: 'V75 (1s)',
        decimals: 2,
        direction: 'SELL',
        strategyName: 'ICT Market Structure Shift (MSS) + Order Block',
        timeframe: 'M15',
        lotSize: 0.1,
        riskUsd: 25.0,
        entryPrice: 7465.2,
        stopLoss: 7490.2,
        takeProfit: 7395.2,
        currentPrice: 7395.2,
        exitPrice: 7395.2,
        rrRatio: 2.8,
        status: 'TP_HIT',
        pnlUsd: 70.0,
        rMultiple: 2.8,
        marketSentiment: 'Bajista Institucional (Order Flow Bearish)',
        traderMood: 'confiado',
        traderMoodLabel: '🎯 Confiado / Siguiendo el Plan',
        session: 'Londres Killzone',
        checklistScorePct: 100,
        disciplineStars: 5,
        tags: ['MSS', 'OrderBlock', 'Premium'],
        notes: 'Entrada milimétrica en mitigación de Bearish OB tras toma de BSL. Toca TP directo.',
        openedAt: new Date(now - 1000 * 60 * 190).toISOString(),
        closedAt: new Date(now - 1000 * 60 * 145).toISOString()
      },
      {
        id: 'trd_seed_hist_2',
        journalId: 'jrn_main_ict',
        symbol: 'BOOM1000',
        displayName: 'Boom 1000 Index',
        shortName: 'BOOM 1000',
        decimals: 2,
        direction: 'BUY',
        strategyName: 'Boom & Crash Institutional Spike Hunter',
        timeframe: 'M1',
        lotSize: 0.5,
        riskUsd: 25.0,
        entryPrice: 13810.5,
        stopLoss: 13795.5,
        takeProfit: 13858.5,
        currentPrice: 13858.5,
        exitPrice: 13858.5,
        rrRatio: 3.2,
        status: 'TP_HIT',
        pnlUsd: 80.0,
        rMultiple: 3.2,
        marketSentiment: 'Zona de Caza de Spikes (Agotamiento)',
        traderMood: 'calmo',
        traderMoodLabel: '🧘 Calmo y Enfocado (Estado Óptimo)',
        session: '24/7 Sintéticos',
        checklistScorePct: 100,
        disciplineStars: 5,
        tags: ['SpikeHunter', 'RSI_Extremo', 'OB'],
        notes: 'RSI(14) en 14.8 + Order Block de doble spike previo. Dos spikes consecutivos cerraron en TP.',
        openedAt: new Date(now - 1000 * 60 * 320).toISOString(),
        closedAt: new Date(now - 1000 * 60 * 305).toISOString()
      },
      {
        id: 'trd_seed_hist_3',
        journalId: 'jrn_main_ict',
        symbol: 'R_100',
        displayName: 'Volatility 100 Index',
        shortName: 'V100',
        decimals: 2,
        direction: 'BUY',
        strategyName: 'ICT Judas Swing & Turtle Soup Reversal',
        timeframe: 'M5',
        lotSize: 0.5,
        riskUsd: 25.0,
        entryPrice: 1912.0,
        stopLoss: 1898.0,
        takeProfit: 1947.0,
        currentPrice: 1898.0,
        exitPrice: 1898.0,
        rrRatio: 2.5,
        status: 'SL_HIT',
        pnlUsd: -25.0,
        rMultiple: -1.0,
        marketSentiment: 'Manipulación / Judas Swing (Stop Hunt)',
        traderMood: 'ansioso',
        traderMoodLabel: '⚡ Ansioso / Impaciente',
        session: 'Nueva York Killzone',
        checklistScorePct: 83,
        disciplineStars: 3,
        tags: ['TurtleSoup', 'SL_Respetado'],
        notes: 'Entré ligeramente antes del cierre de la vela de confirmación M5. Pérdida controlada de -1R.',
        openedAt: new Date(now - 1000 * 60 * 440).toISOString(),
        closedAt: new Date(now - 1000 * 60 * 415).toISOString()
      }
    ];
  }

  saveTrades() {
    localStorage.setItem('deriv_journal_trades_v1', JSON.stringify(this.trades));
  }

  getActiveJournal() {
    return this.journals.find((j) => j.id === this.activeJournalId) || this.journals[0];
  }

  setActiveJournal(journalId) {
    if (this.journals.some((j) => j.id === journalId)) {
      this.activeJournalId = journalId;
      localStorage.setItem('deriv_active_journal_id', journalId);
    }
    return this.getActiveJournal();
  }

  createJournal(payload) {
    const newJournal = {
      id: 'jrn_' + Date.now(),
      name: payload.name.trim(),
      description: payload.description || 'Bitácora personalizada de Índices Sintéticos Deriv',
      initialBalance: Number(payload.initialBalance || 1000),
      riskPerTradePct: Number(payload.riskPerTradePct || 1.0),
      maxDailyTrades: Number(payload.maxDailyTrades || 4),
      maxDailyLosses: Number(payload.maxDailyLosses || 2),
      minChecklistPct: Number(payload.minChecklistPct || 80),
      strictGuardEnabled: Boolean(payload.strictGuardEnabled ?? true),
      checklist: structuredClone(DEFAULT_CHECKLIST),
      createdAt: new Date().toISOString()
    };
    this.journals.push(newJournal);
    this.activeJournalId = newJournal.id;
    this.saveJournals();
    localStorage.setItem('deriv_active_journal_id', newJournal.id);
    return newJournal;
  }

  updateActiveJournalSettings(payload) {
    const journal = this.getActiveJournal();
    if (!journal) return null;
    journal.name = payload.name?.trim() || journal.name;
    journal.description = payload.description ?? journal.description;
    journal.initialBalance = Number(payload.initialBalance ?? journal.initialBalance);
    journal.riskPerTradePct = Number(payload.riskPerTradePct ?? journal.riskPerTradePct);
    journal.maxDailyTrades = Number(payload.maxDailyTrades ?? journal.maxDailyTrades);
    journal.maxDailyLosses = Number(payload.maxDailyLosses ?? journal.maxDailyLosses);
    journal.minChecklistPct = Number(payload.minChecklistPct ?? journal.minChecklistPct);
    journal.strictGuardEnabled = Boolean(payload.strictGuardEnabled ?? journal.strictGuardEnabled);
    if (Array.isArray(payload.checklist)) {
      journal.checklist = payload.checklist;
    }
    this.saveJournals();
    return journal;
  }

  addChecklistItem(text) {
    const journal = this.getActiveJournal();
    if (!journal || !text.trim()) return;
    journal.checklist.push({
      id: 'chk_' + Date.now(),
      text: text.trim(),
      required: true
    });
    this.saveJournals();
  }

  removeChecklistItem(chkId) {
    const journal = this.getActiveJournal();
    if (!journal) return;
    journal.checklist = journal.checklist.filter((c) => c.id !== chkId);
    this.saveJournals();
  }

  // --- Daily Risk & Discipline Evaluation ---
  getDailyStatus(journalId = this.activeJournalId) {
    const journal = this.journals.find((j) => j.id === journalId) || this.getActiveJournal();
    const todayStr = new Date().toISOString().slice(0, 10);
    const jTrades = this.trades.filter((t) => t.journalId === journal.id);
    const todayTrades = jTrades.filter((t) => String(t.openedAt || '').slice(0, 10) === todayStr);
    const todayLosses = todayTrades.filter((t) => t.status === 'SL_HIT' || t.pnlUsd < 0);
    const todayWins = todayTrades.filter((t) => t.status === 'TP_HIT' || (t.status !== 'OPEN' && t.pnlUsd > 0));
    const todayPnl = todayTrades.reduce((acc, t) => acc + Number(t.pnlUsd || 0), 0);

    const maxTradesReached = todayTrades.length >= journal.maxDailyTrades;
    const maxLossesReached = todayLosses.length >= journal.maxDailyLosses;
    const canTrade = !(journal.strictGuardEnabled && (maxTradesReached || maxLossesReached));

    return {
      journal,
      todayTradesCount: todayTrades.length,
      maxDailyTrades: journal.maxDailyTrades,
      todayLossesCount: todayLosses.length,
      maxDailyLosses: journal.maxDailyLosses,
      todayWinsCount: todayWins.length,
      todayPnl: Number(todayPnl.toFixed(2)),
      maxTradesReached,
      maxLossesReached,
      canTrade
    };
  }

  // --- Compute SL <-> Entry <-> TP Progress Bar Metrics ---
  computeProgressMetrics(trade) {
    const entry = Number(trade.entryPrice);
    const sl = Number(trade.stopLoss);
    const tp = Number(trade.takeProfit);
    const current = Number(trade.status === 'OPEN' ? trade.currentPrice : trade.exitPrice ?? trade.currentPrice);
    const riskUsd = Number(trade.riskUsd || 25);
    const rr = Number(trade.rrRatio || 2.5);

    const totalSpan = Math.abs(tp - sl) || 1;
    let barPercent = 50; // 0% = SL, 100% = TP
    let entryMarkerPercent = 30;
    let rMultiple = 0;

    if (trade.direction === 'BUY') {
      barPercent = ((current - sl) / (tp - sl)) * 100;
      entryMarkerPercent = ((entry - sl) / (tp - sl)) * 100;
      const riskDist = Math.max(Math.abs(entry - sl), 0.00001);
      rMultiple = (current - entry) / riskDist;
    } else {
      // SELL: SL is higher than TP, so as price drops from SL toward TP, barPercent goes from 0% (SL) to 100% (TP)
      barPercent = ((sl - current) / (sl - tp)) * 100;
      entryMarkerPercent = ((sl - entry) / (sl - tp)) * 100;
      const riskDist = Math.max(Math.abs(sl - entry), 0.00001);
      rMultiple = (entry - current) / riskDist;
    }

    const clampedBarPct = Math.max(0, Math.min(100, Number(barPercent.toFixed(1))));
    const clampedEntryPct = Math.max(8, Math.min(92, Number(entryMarkerPercent.toFixed(1))));
    const liveR = Number(Math.max(-1.0, Math.min(rr, rMultiple)).toFixed(2));
    const livePnlUsd =
      trade.status === 'TP_HIT'
        ? Number((riskUsd * rr).toFixed(2))
        : trade.status === 'SL_HIT'
          ? Number((-riskUsd).toFixed(2))
          : Number((riskUsd * liveR).toFixed(2));

    // Also compute progress specifically towards TP (0 to 100%) or towards SL (0 to -100%)
    const tpProgressPct =
      liveR >= 0 ? Math.min(100, Math.round((liveR / rr) * 100)) : Math.max(-100, Math.round(liveR * 100));

    return {
      barPercent: clampedBarPct,
      entryMarkerPercent: clampedEntryPct,
      liveR,
      livePnlUsd,
      tpProgressPct,
      isProfitZone: liveR >= 0,
      totalSpan
    };
  }

  // --- Add Trade from Signal or Manual Entry ---
  addTradeToJournal(payload) {
    const journal = this.getActiveJournal();
    const daily = this.getDailyStatus(journal.id);

    if (journal.strictGuardEnabled && daily.maxTradesReached) {
      throw new Error(
        `Bloqueo de Plan de Trading: Has alcanzado tu máximo de ${journal.maxDailyTrades} entradas diarias en "${journal.name}".`
      );
    }
    if (journal.strictGuardEnabled && daily.maxLossesReached) {
      throw new Error(
        `Guardia Anti-Overtrading: Has alcanzado tu límite máximo de ${journal.maxDailyLosses} pérdidas hoy. Protege tu capital.`
      );
    }
    if (journal.strictGuardEnabled && Number(payload.checklistScorePct || 0) < journal.minChecklistPct) {
      throw new Error(
        `Checklist Incompleto (${payload.checklistScorePct}%): Tu bitácora exige al menos ${journal.minChecklistPct}% del checklist pre-trade.`
      );
    }

    const moodObj = MOOD_OPTIONS.find((m) => m.id === payload.traderMood) || MOOD_OPTIONS[0];
    const entryPrice = Number(payload.entryPrice);
    const stopLoss = Number(payload.stopLoss);
    const takeProfit = Number(payload.takeProfit);
    const riskUsd = Number(payload.riskUsd || (journal.initialBalance * journal.riskPerTradePct) / 100);

    const newTrade = {
      id: 'trd_' + Date.now() + '_' + Math.floor(Math.random() * 999),
      journalId: journal.id,
      symbol: payload.symbol,
      displayName: payload.displayName || payload.symbol,
      shortName: payload.shortName || payload.symbol,
      decimals: Number(payload.decimals ?? 2),
      direction: payload.direction || 'BUY',
      strategyName: payload.strategyName || 'ICT Silver Bullet + FVG + OTE',
      timeframe: payload.timeframe || 'M5',
      lotSize: Number(payload.lotSize || 0.1),
      riskUsd: Number(riskUsd.toFixed(2)),
      entryPrice,
      stopLoss,
      takeProfit,
      currentPrice: entryPrice,
      exitPrice: null,
      rrRatio: Number(payload.rrRatio || 2.5),
      status: 'OPEN',
      pnlUsd: 0,
      rMultiple: 0,
      marketSentiment: payload.marketSentiment || SENTIMENT_OPTIONS[0],
      traderMood: moodObj.id,
      traderMoodLabel: moodObj.label,
      session: payload.session || 'Nueva York Killzone',
      checklistScorePct: Number(payload.checklistScorePct ?? 100),
      disciplineStars: Number(payload.disciplineStars || 5),
      tags: Array.isArray(payload.tags) ? payload.tags : ['DerivLive', 'ICT'],
      notes: payload.notes || '',
      openedAt: new Date().toISOString(),
      closedAt: null
    };

    this.trades.unshift(newTrade);
    this.saveTrades();
    this._notifyTradeListeners('TRADE_OPENED', newTrade);
    return newTrade;
  }

  // --- Real-Time Price Tick Processor for Active Trades ---
  processLiveTick(symbol, livePrice) {
    let anyClosed = false;
    let anyUpdated = false;

    for (const trade of this.trades) {
      if (trade.status !== 'OPEN' || trade.symbol !== symbol) continue;

      trade.currentPrice = Number(livePrice.toFixed(trade.decimals || 2));
      const metrics = this.computeProgressMetrics(trade);
      trade.pnlUsd = metrics.livePnlUsd;
      trade.rMultiple = metrics.liveR;
      anyUpdated = true;

      // Check automatic TP or SL touch!
      if (trade.direction === 'BUY') {
        if (livePrice >= trade.takeProfit) {
          this._closeTradeAutomatically(trade, 'TP_HIT', trade.takeProfit);
          anyClosed = true;
        } else if (livePrice <= trade.stopLoss) {
          this._closeTradeAutomatically(trade, 'SL_HIT', trade.stopLoss);
          anyClosed = true;
        }
      } else {
        // SELL
        if (livePrice <= trade.takeProfit) {
          this._closeTradeAutomatically(trade, 'TP_HIT', trade.takeProfit);
          anyClosed = true;
        } else if (livePrice >= trade.stopLoss) {
          this._closeTradeAutomatically(trade, 'SL_HIT', trade.stopLoss);
          anyClosed = true;
        }
      }
    }

    if (anyClosed) {
      this.saveTrades();
    }
    return { anyUpdated, anyClosed };
  }

  _closeTradeAutomatically(trade, newStatus, triggerPrice) {
    trade.status = newStatus;
    trade.currentPrice = triggerPrice;
    trade.exitPrice = triggerPrice;
    trade.closedAt = new Date().toISOString();

    if (newStatus === 'TP_HIT') {
      trade.rMultiple = Number(trade.rrRatio);
      trade.pnlUsd = Number((trade.riskUsd * trade.rrRatio).toFixed(2));
    } else if (newStatus === 'SL_HIT') {
      trade.rMultiple = -1.0;
      trade.pnlUsd = Number((-trade.riskUsd).toFixed(2));
    }
    this._notifyTradeListeners(newStatus, trade);
  }

  // Allow user to manually close, move to Break Even, or test TP/SL hit
  closeTradeManually(tradeId, mode = 'MANUAL', currentMarketPrice = null) {
    const trade = this.trades.find((t) => t.id === tradeId);
    if (!trade || trade.status !== 'OPEN') return null;

    if (mode === 'FORCE_TP') {
      this._closeTradeAutomatically(trade, 'TP_HIT', trade.takeProfit);
    } else if (mode === 'FORCE_SL') {
      this._closeTradeAutomatically(trade, 'SL_HIT', trade.stopLoss);
    } else if (mode === 'BREAK_EVEN') {
      trade.status = 'BE_CLOSED';
      trade.exitPrice = trade.entryPrice;
      trade.currentPrice = trade.entryPrice;
      trade.pnlUsd = 0;
      trade.rMultiple = 0;
      trade.closedAt = new Date().toISOString();
      this._notifyTradeListeners('BE_CLOSED', trade);
    } else {
      const closePx = currentMarketPrice ?? trade.currentPrice;
      trade.currentPrice = closePx;
      const metrics = this.computeProgressMetrics(trade);
      trade.status = 'MANUAL_CLOSED';
      trade.exitPrice = closePx;
      trade.pnlUsd = metrics.livePnlUsd;
      trade.rMultiple = metrics.liveR;
      trade.closedAt = new Date().toISOString();
      this._notifyTradeListeners('MANUAL_CLOSED', trade);
    }

    this.saveTrades();
    return trade;
  }

  updateTradeNotesAndMood(tradeId, { notes, traderMood, marketSentiment, disciplineStars }) {
    const trade = this.trades.find((t) => t.id === tradeId);
    if (!trade) return null;
    if (notes !== undefined) trade.notes = notes;
    if (marketSentiment) trade.marketSentiment = marketSentiment;
    if (disciplineStars) trade.disciplineStars = Number(disciplineStars);
    if (traderMood) {
      const m = MOOD_OPTIONS.find((item) => item.id === traderMood);
      if (m) {
        trade.traderMood = m.id;
        trade.traderMoodLabel = m.label;
      }
    }
    this.saveTrades();
    return trade;
  }

  getTradesForJournal(journalId = this.activeJournalId) {
    return this.trades.filter((t) => t.journalId === journalId);
  }

  getOpenTrades() {
    return this.trades.filter((t) => t.status === 'OPEN');
  }

  getJournalStats(journalId = this.activeJournalId) {
    const journal = this.journals.find((j) => j.id === journalId) || this.getActiveJournal();
    const list = this.getTradesForJournal(journal.id);
    const closed = list.filter((t) => t.status !== 'OPEN');
    const open = list.filter((t) => t.status === 'OPEN');

    const wins = closed.filter((t) => t.pnlUsd > 0);
    const losses = closed.filter((t) => t.pnlUsd < 0);
    const totalNetPnl = list.reduce((acc, t) => acc + Number(t.pnlUsd || 0), 0);
    const grossProfit = wins.reduce((acc, t) => acc + Number(t.pnlUsd || 0), 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + Number(t.pnlUsd || 0), 0));

    const winRate = closed.length > 0 ? Number(((wins.length / closed.length) * 100).toFixed(1)) : 0;
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 4.5 : 0;
    const currentEquity = Number((journal.initialBalance + totalNetPnl).toFixed(2));

    // Mood performance breakdown
    const moodStats = {};
    for (const m of MOOD_OPTIONS) {
      const mTrades = closed.filter((t) => t.traderMood === m.id);
      if (mTrades.length > 0) {
        const mWins = mTrades.filter((t) => t.pnlUsd > 0).length;
        const mPnl = mTrades.reduce((a, b) => a + b.pnlUsd, 0);
        moodStats[m.id] = {
          label: m.label,
          count: mTrades.length,
          winRate: Math.round((mWins / mTrades.length) * 100),
          pnl: Number(mPnl.toFixed(2))
        };
      }
    }

    return {
      initialBalance: journal.initialBalance,
      currentEquity,
      totalNetPnl: Number(totalNetPnl.toFixed(2)),
      totalTrades: list.length,
      openCount: open.length,
      closedCount: closed.length,
      winsCount: wins.length,
      lossesCount: losses.length,
      winRate,
      profitFactor,
      moodStats
    };
  }

  onTradeEvent(cb) {
    this.tradeUpdateListeners.add(cb);
    return () => this.tradeUpdateListeners.delete(cb);
  }

  _notifyTradeListeners(eventType, trade) {
    for (const cb of this.tradeUpdateListeners) {
      cb(eventType, trade);
    }
  }
}
