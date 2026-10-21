import { DerivMarketEngine } from './deriv-engine.js';
import { StrategyEngine } from './strategy-engine.js';
import { AuthRBACManager, PERMISSION_LABELS } from './auth-rbac.js';
import { TradingJournalEngine, MOOD_OPTIONS, SENTIMENT_OPTIONS } from './journal-engine.js';

// ============================================================================
// MODERN WEB GUIDANCE: :user-invalid WeakMap Fallback & ARIA Sync
// ============================================================================
const UserInvalidFallback = (() => {
  const dirtyState = new WeakMap();

  const syncAria = (el) => {
    if (!el || typeof el.matches !== 'function' || !el.checkValidity) return;
    let isInvalid = false;
    try {
      isInvalid = el.matches(':user-invalid') || el.classList.contains('user-invalid-fallback');
    } catch (_e) {
      isInvalid = el.classList.contains('user-invalid-fallback');
    }
    el.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
  };

  const updateState = (input) => {
    const isValid = input.checkValidity();
    input.classList.toggle('user-invalid-fallback', !isValid);
    input.classList.toggle('user-valid-fallback', isValid);
    syncAria(input);
  };

  const handleEvent = (event) => {
    const input = event.target;
    if (!input || !input.checkValidity) return;

    if (event.type === 'input' || event.type === 'change') {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(input, state);
      if (state.hasBlurred) updateState(input);
      else if (input.hasAttribute('aria-invalid')) syncAria(input);
    } else if (event.type === 'blur') {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasBlurred = true;
      dirtyState.set(input, state);
      if (state.hasInteracted) updateState(input);
      else syncAria(input);
    }
  };

  const init = (root = document) => {
    root.addEventListener('blur', handleEvent, true);
    root.addEventListener('input', handleEvent);
    root.addEventListener('change', handleEvent);
  };

  return { init };
})();

// ============================================================================
// MAIN MICROAPP CONTROLLER
// ============================================================================
class SynthQuantApp {
  constructor() {
    this.market = new DerivMarketEngine();
    this.strategyEngine = new StrategyEngine();
    this.auth = new AuthRBACManager();
    this.journal = new TradingJournalEngine();

    this.selectedSymbol = 'R_75';
    this.signals = [];
    this.pendingSignalForModal = null;

    this._init();
  }

  _init() {
    UserInvalidFallback.init(document);
    this._populateSelectOptions();
    this._seedInitialSignals();
    this._bindNavigation();
    this._bindMarketEvents();
    this._bindJournalEvents();
    this._bindSignalActions();
    this._bindStrategyBuilder();
    this._bindJournalConfigAndModals();
    this._bindAuthAndRBAC();
    this._bindDerivApiConfig();

    this.renderAll();
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast-item ${type === 'tp' ? 'toast-tp' : type === 'sl' ? 'toast-sl' : ''}`;
    el.innerHTML = message;
    container.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 5200);
  }

  _populateSelectOptions() {
    const moodSelects = [document.getElementById('tsMood'), document.getElementById('mtMood')];
    for (const sel of moodSelects) {
      if (!sel) continue;
      sel.innerHTML = MOOD_OPTIONS.map((m) => `<option value="${m.id}">${m.label}</option>`).join('');
    }

    const sentSelects = [document.getElementById('tsSentiment'), document.getElementById('mtSentiment')];
    for (const sel of sentSelects) {
      if (!sel) continue;
      sel.innerHTML = SENTIMENT_OPTIONS.map((s) => `<option value="${s}">${s}</option>`).join('');
    }

    const mtSymbol = document.getElementById('mtSymbol');
    if (mtSymbol) {
      mtSymbol.innerHTML = this.market
        .getCatalog()
        .map((s) => `<option value="${s.symbol}">${s.display_name} (${s.symbol})</option>`)
        .join('');
    }
  }

  _seedInitialSignals() {
    const initialSymbols = ['R_75', 'BOOM1000', '1HZ75V', 'CRASH1000', 'JD75', 'R_100'];
    for (const sym of initialSymbols) {
      const meta = this.market.getSymbolMeta(sym);
      const candles = this.market.getCandles(sym);
      const sig = this.strategyEngine.generateSignalForSymbol(meta, candles);
      if (sig) this.signals.push(sig);
    }
  }

  _bindNavigation() {
    const allNavBtns = document.querySelectorAll('.nav-tab, .mobile-nav-btn');
    allNavBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.view;
        allNavBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === targetId));
        document.querySelectorAll('.view-section').forEach((sec) => {
          sec.classList.toggle('active', sec.id === targetId);
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (targetId === 'view-signals') {
          this.renderChart();
        }
        this._refreshScrollAffordances();
      });
    });

    // Responsive Canvas ResizeObserver for Mobile/Tablet/Desktop
    const chartWrap = document.querySelector('.chart-canvas-wrap');
    const canvas = document.getElementById('derivChartCanvas');
    if (chartWrap && canvas && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.max(300, Math.floor(entry.contentRect.width));
          const h = Math.max(220, Math.floor(entry.contentRect.height));
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            this.renderChart();
          }
        }
      });
      ro.observe(chartWrap);
    }

    // Scrollability affordance fallback listener for .custom-scroller elements
    document.querySelectorAll('.custom-scroller').forEach((scroller) => {
      scroller.addEventListener('scroll', () => this._updateSingleScrollerAffordance(scroller), { passive: true });
    });
  }

  _updateSingleScrollerAffordance(scroller) {
    if (!scroller) return;
    if (!scroller.querySelector(':scope > .scroll-hint-top')) {
      const topHint = document.createElement('div');
      topHint.className = 'scroll-hint-top';
      topHint.setAttribute('aria-hidden', 'true');
      scroller.prepend(topHint);
    }
    if (!scroller.querySelector(':scope > .scroll-hint-bottom')) {
      const botHint = document.createElement('div');
      botHint.className = 'scroll-hint-bottom';
      botHint.setAttribute('aria-hidden', 'true');
      scroller.append(botHint);
    }
    const canUp = scroller.scrollTop > 6;
    const canDown = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 6;
    scroller.classList.toggle('can-scroll-up', canUp);
    scroller.classList.toggle('can-scroll-down', canDown);
  }

  _refreshScrollAffordances() {
    document.querySelectorAll('.custom-scroller').forEach((scroller) => {
      this._updateSingleScrollerAffordance(scroller);
    });
  }

  _bindMarketEvents() {
    this.market.onStatusChange((status, accountInfo) => {
      const pill = document.getElementById('wsStatusPill');
      const text = document.getElementById('wsStatusText');
      const accBox = document.getElementById('derivAccountStatusBox');
      if (!pill || !text) return;

      if (status === 'connected_live') {
        text.textContent = accountInfo
          ? `Deriv Live (${accountInfo.loginid}: ${accountInfo.balance} ${accountInfo.currency})`
          : `Deriv WebSocket API v3 Conectado (AppID ${this.market.appId})`;
        if (accBox) {
          accBox.innerHTML = accountInfo
            ? `✅ Conectado a Deriv API v3 · Cuenta <strong>${accountInfo.loginid}</strong> · Balance: <strong>${accountInfo.balance} ${accountInfo.currency}</strong>`
            : `✅ Conectado en vivo a <code>${this.market.endpoint}</code> (App ID: ${this.market.appId})`;
        }
      } else {
        text.textContent = `Deriv SynthStream 24/7 Activo (${this.market.getCatalog().length} Índices)`;
      }
    });

    let tickCounter = 0;
    this.market.onTick((symbol, priceState) => {
      // 1. Update live open trades for this symbol & check automatic SL/TP touches
      const { anyUpdated, anyClosed } = this.journal.processLiveTick(symbol, priceState.price);

      if (symbol === this.selectedSymbol) {
        this.renderChart();
      }

      tickCounter++;
      if (tickCounter % 4 === 0 || anyUpdated || anyClosed) {
        this.renderTickerTape();
        this.renderSymbolSelector();
        this.renderLiveActiveTrades();
        this.renderTopKpis();
        if (document.getElementById('view-journal')?.classList.contains('active')) {
          this.renderJournalView();
        }
        if (document.getElementById('view-deriv-api')?.classList.contains('active')) {
          this.renderFullCatalogTable();
        }
      }
    });
  }

  _bindJournalEvents() {
    this.journal.onTradeEvent((eventType, trade) => {
      if (eventType === 'TP_HIT') {
        this.showToast(
          `🎯 <strong>¡TAKE PROFIT ALCANZADO!</strong><br/>${trade.displayName} (${trade.direction}) tocó TP en <strong>${trade.exitPrice}</strong>.<br/>Ganancia: <strong style="color:#34d399;">+$${trade.pnlUsd.toFixed(2)} (+${trade.rMultiple}R)</strong> actualizada en tu bitácora.`,
          'tp'
        );
      } else if (eventType === 'SL_HIT') {
        this.showToast(
          `🛡️ <strong>STOP LOSS TOCADO</strong><br/>${trade.displayName} (${trade.direction}) cerró en SL (<strong>${trade.exitPrice}</strong>).<br/>Resultado: <strong style="color:#f87171;">-$${Math.abs(trade.pnlUsd).toFixed(2)} (-1.0R)</strong> registrado en tu bitácora.`,
          'sl'
        );
      }
      this.renderLiveActiveTrades();
      this.renderJournalView();
      this.renderTopKpis();
    });
  }

  _bindSignalActions() {
    const filterSelect = document.getElementById('filterSubmarketSelect');
    filterSelect?.addEventListener('change', () => this.renderSymbolSelector());

    const onlySub = document.getElementById('chkOnlySubscribedSignals');
    onlySub?.addEventListener('change', () => this.renderSignalsFeed());

    const btnScan = document.getElementById('btnGenerateSignalNow');
    btnScan?.addEventListener('click', () => {
      const meta = this.market.getSymbolMeta(this.selectedSymbol);
      const candles = this.market.getCandles(this.selectedSymbol);
      const newSig = this.strategyEngine.generateSignalForSymbol(meta, candles);
      if (newSig) {
        this.signals.unshift(newSig);
        if (this.signals.length > 25) this.signals.pop();
        this.renderSignalsFeed();
        this.renderChart();
        this.showToast(
          `⚡ <strong>Nueva Señal Generada en ${meta.display_name}</strong>: ${newSig.direction} @ ${newSig.entryPrice} (${newSig.strategyName})`
        );
      }
    });

    // Close modal buttons
    const takeDialog = document.getElementById('takeSignalDialog');
    document.getElementById('btnCloseTakeSignalModal')?.addEventListener('click', () => takeDialog?.close());
    document.getElementById('btnCancelTakeSignal')?.addEventListener('click', () => takeDialog?.close());

    // Submit Take Signal Form
    const takeForm = document.getElementById('takeSignalForm');
    takeForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.pendingSignalForModal) return;

      const errBox = document.getElementById('takeSignalErrorAlert');
      if (errBox) errBox.style.display = 'none';

      try {
        const checks = takeForm.querySelectorAll('.ts-checklist-item');
        const checkedCount = Array.from(checks).filter((c) => c.checked).length;
        const scorePct = checks.length > 0 ? Math.round((checkedCount / checks.length) * 100) : 100;

        const sig = this.pendingSignalForModal;
        const livePrice = this.market.getPrice(sig.symbol);
        // Adjust SL/TP proportionally around current live entry price
        const origSlDist = Math.abs(sig.entryPrice - sig.stopLoss);
        const origTpDist = Math.abs(sig.takeProfit - sig.entryPrice);
        const entryPrice = Number(livePrice.toFixed(sig.decimals));
        const stopLoss = Number(
          (sig.direction === 'BUY' ? entryPrice - origSlDist : entryPrice + origSlDist).toFixed(sig.decimals)
        );
        const takeProfit = Number(
          (sig.direction === 'BUY' ? entryPrice + origTpDist : entryPrice - origTpDist).toFixed(sig.decimals)
        );

        const trade = this.journal.addTradeToJournal({
          symbol: sig.symbol,
          displayName: sig.displayName,
          shortName: sig.shortName,
          decimals: sig.decimals,
          direction: sig.direction,
          strategyName: sig.strategyName,
          timeframe: sig.timeframe,
          lotSize: Number(document.getElementById('tsLotSize').value || 0.1),
          riskUsd: Number(document.getElementById('tsRiskUsd').value || 25),
          entryPrice,
          stopLoss,
          takeProfit,
          rrRatio: sig.rrRatio,
          traderMood: document.getElementById('tsMood').value,
          marketSentiment: document.getElementById('tsSentiment').value,
          checklistScorePct: scorePct,
          notes:
            document.getElementById('tsNotes').value.trim() ||
            `Señal tomada de ${sig.strategyName} (${sig.confluences.slice(0, 2).join(' | ')})`
        });

        takeDialog?.close();
        this.selectedSymbol = trade.symbol;
        this.renderAll();
        this.showToast(
          `🚀 <strong>Señal Añadida a tu Bitácora</strong>: ${trade.displayName} (${trade.direction}) ahora está en <strong>Seguimiento en Tiempo Real SL/TP</strong>.`
        );
      } catch (err) {
        if (errBox) {
          errBox.textContent = `⚠️ ${err.message}`;
          errBox.style.display = 'block';
        }
      }
    });
  }

  openTakeSignalModal(signalId) {
    if (!this.auth.hasPermission('signals.take')) {
      this.showToast('🔒 Tu rol actual (RBAC) no tiene el permiso [signals.take] para tomar señales a la bitácora.');
      return;
    }

    const sig = this.signals.find((s) => s.id === signalId);
    if (!sig) return;
    this.pendingSignalForModal = sig;

    const journal = this.journal.getActiveJournal();
    const daily = this.journal.getDailyStatus(journal.id);

    const summaryBox = document.getElementById('takeSignalSummaryBox');
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <span class="badge ${sig.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}">${sig.direction}</span>
            <strong style="font-size:0.95rem;margin-left:0.4rem;">${sig.displayName} (${sig.symbol})</strong>
            <span style="color:var(--text-muted);margin-left:0.4rem;">· ${sig.strategyName} (${sig.timeframe})</span>
          </div>
          <span class="badge badge-ict">R:R 1:${sig.rrRatio} · Confianza ${sig.confidence}%</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-top:0.6rem;font-family:monospace;">
          <div><span style="color:var(--text-muted);font-size:0.7rem;">ENTRADA VIVA</span><br/><strong>${this.market.getPrice(sig.symbol).toFixed(sig.decimals)}</strong></div>
          <div><span style="color:var(--text-muted);font-size:0.7rem;">STOP LOSS</span><br/><strong style="color:#f87171;">${sig.stopLoss}</strong></div>
          <div><span style="color:var(--text-muted);font-size:0.7rem;">TAKE PROFIT</span><br/><strong style="color:#34d399;">${sig.takeProfit}</strong></div>
          <div><span style="color:var(--text-muted);font-size:0.7rem;">CUPO DIARIO HOY</span><br/><strong>${daily.todayTradesCount}/${daily.maxDailyTrades} entradas · ${daily.todayLossesCount}/${daily.maxDailyLosses} pérdidas</strong></div>
        </div>
      `;
    }

    // Render checklist items from active journal
    const chkContainer = document.getElementById('takeSignalChecklistContainer');
    const scoreLabel = document.getElementById('takeSignalChecklistScore');
    if (chkContainer) {
      chkContainer.innerHTML = journal.checklist
        .map(
          (item) => `
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
            <input type="checkbox" class="ts-checklist-item" value="${item.id}" checked />
            <span>${item.text}</span>
          </label>
        `
        )
        .join('');

      const updateScore = () => {
        const boxes = chkContainer.querySelectorAll('.ts-checklist-item');
        const checked = Array.from(boxes).filter((b) => b.checked).length;
        const pct = boxes.length > 0 ? Math.round((checked / boxes.length) * 100) : 100;
        if (scoreLabel) {
          scoreLabel.textContent = `Cumplimiento del Checklist: ${pct}% (Mínimo exigido por tu bitácora: ${journal.minChecklistPct}%)`;
          scoreLabel.style.color = pct >= journal.minChecklistPct ? '#34d399' : '#f87171';
        }
      };
      chkContainer.querySelectorAll('.ts-checklist-item').forEach((b) => b.addEventListener('change', updateScore));
      updateScore();
    }

    const defaultRisk = Number(((journal.initialBalance * journal.riskPerTradePct) / 100).toFixed(2));
    const riskInput = document.getElementById('tsRiskUsd');
    if (riskInput) riskInput.value = defaultRisk;

    const errBox = document.getElementById('takeSignalErrorAlert');
    if (errBox) errBox.style.display = 'none';

    const dialog = document.getElementById('takeSignalDialog');
    dialog?.showModal();
  }

  _bindStrategyBuilder() {
    const form = document.getElementById('customStrategyForm');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.auth.hasPermission('strategies.create')) {
        this.showToast('🔒 Tu rol actual no tiene permisos [strategies.create] para crear estrategias.');
        return;
      }
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const name = document.getElementById('stratName').value;
      const category = document.getElementById('stratCategory').value;
      const timeframe = document.getElementById('stratTimeframe').value;
      const rrRatio = Number(document.getElementById('stratRR').value);
      const slAtrMult = Number(document.getElementById('stratAtrMult').value);
      const minConfidence = Number(document.getElementById('stratMinConf').value);
      const description = document.getElementById('stratDesc').value;

      const targetSubmarkets = Array.from(form.querySelectorAll('input[name="stratSubmarket"]:checked')).map(
        (el) => el.value
      );
      const conditions = Array.from(form.querySelectorAll('input[name="stratCond"]:checked')).map((el) => el.value);

      const created = this.strategyEngine.addCustomStrategy({
        name,
        category,
        timeframe,
        rrRatio,
        slAtrMult,
        minConfidence,
        description,
        targetSubmarkets,
        conditions,
        winRateEst: Number((70 + Math.min(8, conditions.length * 1.4)).toFixed(1))
      });

      // Immediately generate a signal with this new strategy
      const meta = this.market.getSymbolMeta(this.selectedSymbol);
      const sig = this.strategyEngine.generateSignalForSymbol(
        meta,
        this.market.getCandles(this.selectedSymbol),
        created.id
      );
      if (sig) this.signals.unshift(sig);

      form.reset();
      this.renderStrategiesView();
      this.renderSignalsFeed();
      this.showToast(`🧠 Estrategia <strong>"${created.name}"</strong> creada y activada en el motor en vivo.`);
    });
  }

  _bindJournalConfigAndModals() {
    const journalSelect = document.getElementById('activeJournalSelect');
    journalSelect?.addEventListener('change', (e) => {
      this.journal.setActiveJournal(e.target.value);
      this.renderJournalView();
      this.renderTopKpis();
    });

    const cfgForm = document.getElementById('journalConfigForm');
    cfgForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.auth.hasPermission('journal.manage')) {
        this.showToast('🔒 Permiso [journal.manage] requerido para modificar parámetros de la bitácora.');
        return;
      }
      this.journal.updateActiveJournalSettings({
        name: document.getElementById('jcfgName').value,
        initialBalance: Number(document.getElementById('jcfgBalance').value),
        maxDailyTrades: Number(document.getElementById('jcfgMaxTrades').value),
        maxDailyLosses: Number(document.getElementById('jcfgMaxLosses').value),
        riskPerTradePct: Number(document.getElementById('jcfgRiskPct').value),
        minChecklistPct: Number(document.getElementById('jcfgMinChecklist').value),
        strictGuardEnabled: document.getElementById('jcfgStrictGuard').checked
      });
      this.renderJournalView();
      this.renderTopKpis();
      this.showToast('✅ Parámetros de la bitácora y límites diarios actualizados.');
    });

    const chkForm = document.getElementById('addChecklistForm');
    chkForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('newChecklistText');
      if (input?.value.trim()) {
        this.journal.addChecklistItem(input.value);
        input.value = '';
        this.renderJournalView();
        this.showToast('✅ Nueva regla añadida al Checklist Pre-Trade.');
      }
    });

    // New Journal Modal
    const njDialog = document.getElementById('newJournalDialog');
    document.getElementById('btnOpenNewJournalModal')?.addEventListener('click', () => njDialog?.showModal());
    document.getElementById('btnCloseNewJournalModal')?.addEventListener('click', () => njDialog?.close());
    document.getElementById('newJournalForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const created = this.journal.createJournal({
        name: document.getElementById('njName').value,
        initialBalance: Number(document.getElementById('njBalance').value),
        riskPerTradePct: Number(document.getElementById('njRiskPct').value),
        maxDailyTrades: Number(document.getElementById('njMaxTrades').value),
        maxDailyLosses: Number(document.getElementById('njMaxLosses').value),
        strictGuardEnabled: true
      });
      njDialog?.close();
      this.renderJournalView();
      this.renderTopKpis();
      this.showToast(`📓 Nueva bitácora <strong>"${created.name}"</strong> creada y seleccionada.`);
    });

    // Manual Trade Modal
    const mtDialog = document.getElementById('manualTradeDialog');
    document.getElementById('btnOpenManualTradeModal')?.addEventListener('click', () => {
      const sym = this.selectedSymbol;
      const meta = this.market.getSymbolMeta(sym);
      const px = this.market.getPrice(sym);
      const step = meta.pip * (sym === 'R_75' ? 2500 : 120);
      document.getElementById('mtSymbol').value = sym;
      document.getElementById('mtEntry').value = px.toFixed(meta.decimals);
      document.getElementById('mtSL').value = (px - step).toFixed(meta.decimals);
      document.getElementById('mtTP').value = (px + step * 2.5).toFixed(meta.decimals);
      mtDialog?.showModal();
    });
    document.getElementById('btnCloseManualTradeModal')?.addEventListener('click', () => mtDialog?.close());
    document.getElementById('manualTradeForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const sym = document.getElementById('mtSymbol').value;
        const meta = this.market.getSymbolMeta(sym);
        const entry = Number(document.getElementById('mtEntry').value);
        const sl = Number(document.getElementById('mtSL').value);
        const tp = Number(document.getElementById('mtTP').value);
        const rr = Number((Math.abs(tp - entry) / Math.max(Math.abs(entry - sl), 0.0001)).toFixed(2));

        this.journal.addTradeToJournal({
          symbol: sym,
          displayName: meta.display_name,
          shortName: meta.shortName,
          decimals: meta.decimals,
          direction: document.getElementById('mtDirection').value,
          strategyName: 'Entrada Manual ICT / Acción del Precio',
          timeframe: 'M5',
          lotSize: 0.1,
          riskUsd: Number(document.getElementById('mtRiskUsd').value || 25),
          entryPrice: entry,
          stopLoss: sl,
          takeProfit: tp,
          rrRatio: rr || 2.0,
          traderMood: document.getElementById('mtMood').value,
          marketSentiment: document.getElementById('mtSentiment').value,
          checklistScorePct: 100,
          notes: document.getElementById('mtNotes').value
        });
        mtDialog?.close();
        this.renderAll();
        this.showToast('✍️ Operación manual añadida con barra de seguimiento SL/TP en vivo.');
      } catch (err) {
        this.showToast(`⚠️ ${err.message}`);
      }
    });

    // Export CSV
    document.getElementById('btnExportJournalCsv')?.addEventListener('click', () => {
      const j = this.journal.getActiveJournal();
      const trades = this.journal.getTradesForJournal(j.id);
      const headers = [
        'Fecha',
        'Simbolo',
        'Direccion',
        'Estrategia',
        'Entrada',
        'SL',
        'TP',
        'Estado',
        'PnL_USD',
        'R_Multiple',
        'Estado_Animo',
        'Sentimiento',
        'Checklist_Pct',
        'Notas'
      ];
      const rows = trades.map((t) => [
        t.openedAt,
        t.symbol,
        t.direction,
        `"${t.strategyName}"`,
        t.entryPrice,
        t.stopLoss,
        t.takeProfit,
        t.status,
        t.pnlUsd,
        t.rMultiple,
        `"${t.traderMoodLabel}"`,
        `"${t.marketSentiment}"`,
        t.checklistScorePct,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitacora_deriv_${j.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  _bindAuthAndRBAC() {
    const pwdInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('regPasswordConfirm');

    const updatePwdMeter = () => {
      const val = pwdInput?.value || '';
      const res = this.auth.evaluatePasswordSecurity(val);

      document.getElementById('ruleLen')?.classList.toggle('rule-ok', res.checks.length);
      document.getElementById('ruleCase')?.classList.toggle('rule-ok', res.checks.upperLower);
      document.getElementById('ruleNum')?.classList.toggle('rule-ok', res.checks.number);
      document.getElementById('ruleSpec')?.classList.toggle('rule-ok', res.checks.special);
      document.getElementById('ruleCommon')?.classList.toggle('rule-ok', res.checks.noCommon);

      for (let i = 1; i <= 5; i++) {
        const bar = document.getElementById(`pwdBar${i}`);
        if (!bar) continue;
        bar.className = 'pwd-bar';
        if (i <= res.level) {
          bar.classList.add(`active-${res.level}`);
        }
      }

      const txt = document.getElementById('pwdStrengthText');
      if (txt) {
        txt.textContent = `Fortaleza: ${res.label} (${res.entropyBits} bits de entropía criptográfica)`;
      }

      if (confirmInput && confirmInput.value) {
        confirmInput.setCustomValidity(confirmInput.value === val ? '' : 'Las contraseñas no coinciden');
      }
    };

    pwdInput?.addEventListener('input', updatePwdMeter);
    confirmInput?.addEventListener('input', () => {
      confirmInput.setCustomValidity(confirmInput.value === (pwdInput?.value || '') ? '' : 'Las contraseñas no coinciden');
    });

    // Registration submission
    const regForm = document.getElementById('secureRegisterForm');
    regForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (confirmInput && pwdInput && confirmInput.value !== pwdInput.value) {
        confirmInput.setCustomValidity('Las contraseñas no coinciden');
      } else if (confirmInput) {
        confirmInput.setCustomValidity('');
      }

      if (!regForm.checkValidity()) {
        regForm.reportValidity();
        return;
      }

      const btn = document.getElementById('btnSubmitRegister');
      if (btn) btn.disabled = true;

      try {
        const roleRadio = regForm.querySelector('input[name="regRole"]:checked');
        const newUser = await this.auth.registerUser({
          name: document.getElementById('regName').value,
          email: document.getElementById('regEmail').value,
          password: document.getElementById('regPassword').value,
          role: roleRadio ? roleRadio.value : 'trader_vip',
          twoFactorEnabled: document.getElementById('regEnable2FA').checked
        });

        regForm.reset();
        updatePwdMeter();
        this.renderAll();
        this.showToast(
          `🔐 <strong>Cuenta Creada con Éxito</strong>: Bienvenido ${newUser.name} (${this.auth.roles[newUser.role]?.name}).${newUser.twoFactorCode ? ` Código 2FA asignado: <strong>${newUser.twoFactorCode}</strong>` : ''}`
        );
      } catch (err) {
        this.showToast(`⚠️ Error en registro: ${err.message}`);
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    // Auth Modal & Google OAuth Login
    const authDialog = document.getElementById('authModalDialog');
    const profilePopover = document.getElementById('userProfilePopover');
    const editProfileDialog = document.getElementById('editProfileDialog');

    const closeProfilePopover = () => {
      if (profilePopover && typeof profilePopover.hidePopover === 'function') {
        try {
          profilePopover.hidePopover();
        } catch (_e) {
          // ignore if already hidden
        }
      }
    };

    document.getElementById('btnOpenAuthModal')?.addEventListener('click', () => authDialog?.showModal());
    document.getElementById('btnCloseAuthModal')?.addEventListener('click', () => authDialog?.close());
    document.getElementById('btnGoogleSignInDirect')?.addEventListener('click', () => authDialog?.showModal());

    document.getElementById('btnGoToRegisterView')?.addEventListener('click', () => {
      authDialog?.close();
      document.querySelector('.nav-tab[data-view="view-users"]')?.click();
      document.getElementById('regName')?.focus();
    });

    // Top-left Profile Popover & Edit Profile Modal
    this._pendingProfilePhotoDataUrl = null;

    const quickPhotoInput = document.getElementById('quickPhotoFileInput');
    const triggerQuickPhoto = () => {
      if (!this.auth.currentUser) {
        closeProfilePopover();
        authDialog?.showModal();
        this.showToast('🔑 Inicia sesión primero para personalizar tu foto de perfil.');
        return;
      }
      quickPhotoInput?.click();
    };

    document.getElementById('btnQuickCameraOverlay')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerQuickPhoto();
    });

    document.getElementById('btnPopoverAddPhoto')?.addEventListener('click', () => {
      triggerQuickPhoto();
    });

    quickPhotoInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await this._resizeImageToDataUrl(file, 220);
        this.auth.updateCurrentUserProfile({ photoUrl: dataUrl });
        this.renderTopUserHeader();
        this.renderUsersAndRBACView();
        this.showToast('📸 <strong>Foto de perfil actualizada</strong> en tu cuenta activa.');
      } catch (err) {
        this.showToast(`⚠️ Error al procesar imagen: ${err.message}`);
      } finally {
        quickPhotoInput.value = '';
      }
    });

    // Open Edit Profile Modal and populate fields
    const openEditProfileModal = () => {
      closeProfilePopover();
      const u = this.auth.currentUser;
      if (!u) {
        authDialog?.showModal();
        this.showToast('🔑 Inicia sesión para editar tus datos de perfil.');
        return;
      }
      this._pendingProfilePhotoDataUrl = u.photoUrl || '';
      this._syncEditProfileAvatarPreview(this._pendingProfilePhotoDataUrl, u.avatar || 'TR');

      const nameEl = document.getElementById('epName');
      const emailEl = document.getElementById('epEmail');
      const phoneEl = document.getElementById('epPhone');
      const bioEl = document.getElementById('epBio');
      const twoFaEl = document.getElementById('epEnable2FA');

      if (nameEl) nameEl.value = u.name || '';
      if (emailEl) emailEl.value = u.email || '';
      if (phoneEl) phoneEl.value = u.phone || '';
      if (bioEl) bioEl.value = u.bio || '';
      if (twoFaEl) twoFaEl.checked = Boolean(u.twoFactorEnabled);

      this._renderPresetAvatarsRow();
      if (editProfileDialog && !editProfileDialog.open) {
        editProfileDialog.showModal();
      }
    };

    document.getElementById('btnPopoverEditProfile')?.addEventListener('click', openEditProfileModal);
    document.getElementById('btnCloseEditProfile')?.addEventListener('click', () => editProfileDialog?.close());
    document.getElementById('btnCancelEditProfile')?.addEventListener('click', () => editProfileDialog?.close());

    // Photo input inside Edit Profile Modal
    const epPhotoInput = document.getElementById('epPhotoInput');
    epPhotoInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await this._resizeImageToDataUrl(file, 220);
        this._pendingProfilePhotoDataUrl = dataUrl;
        this._syncEditProfileAvatarPreview(dataUrl, this.auth.currentUser?.avatar || 'TR');
      } catch (err) {
        this.showToast(`⚠️ No se pudo cargar la foto: ${err.message}`);
      } finally {
        epPhotoInput.value = '';
      }
    });

    document.getElementById('btnRemoveProfilePhoto')?.addEventListener('click', () => {
      this._pendingProfilePhotoDataUrl = '';
      const nm = document.getElementById('epName')?.value || this.auth.currentUser?.name || 'TR';
      const initials = nm
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      this._syncEditProfileAvatarPreview('', initials || 'TR');
    });

    // Save Edit Profile Form
    const editProfileForm = document.getElementById('editProfileForm');
    editProfileForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!editProfileForm.checkValidity()) {
        editProfileForm.reportValidity();
        return;
      }
      try {
        const updated = this.auth.updateCurrentUserProfile({
          name: document.getElementById('epName')?.value,
          email: document.getElementById('epEmail')?.value,
          phone: document.getElementById('epPhone')?.value,
          bio: document.getElementById('epBio')?.value,
          twoFactorEnabled: Boolean(document.getElementById('epEnable2FA')?.checked),
          photoUrl: this._pendingProfilePhotoDataUrl
        });
        editProfileDialog?.close();
        this.renderAll();
        this.showToast(`✅ <strong>Perfil actualizado</strong>: Datos guardados para ${updated.name}.`);
      } catch (err) {
        this.showToast(`⚠️ ${err.message}`);
      }
    });

    // Switch Account from Popover
    document.getElementById('btnPopoverSwitchAccount')?.addEventListener('click', () => {
      closeProfilePopover();
      authDialog?.showModal();
    });

    // Logout handlers (from Popover and from Edit Profile Modal)
    const handleLogout = () => {
      closeProfilePopover();
      editProfileDialog?.close();
      const prevUser = this.auth.logoutCurrentUser();
      this.renderAll();
      this.showToast(
        prevUser
          ? `🚪 <strong>Sesión cerrada</strong> (${prevUser.name}). Selecciona o ingresa con una cuenta para operar.`
          : '🚪 Sesión cerrada.'
      );
      authDialog?.showModal();
    };

    document.getElementById('btnPopoverLogout')?.addEventListener('click', handleLogout);
    document.getElementById('btnLogoutFromModal')?.addEventListener('click', handleLogout);

    document.querySelectorAll('.google-quick-account').forEach((btn) => {
      btn.addEventListener('click', () => {
        try {
          const user = this.auth.loginWithGoogleAccount({
            name: btn.dataset.name,
            email: btn.dataset.email,
            role: btn.dataset.role
          });
          authDialog?.close();
          this.renderAll();
          this.showToast(`✅ Autenticado con <strong>Google OAuth 2.0</strong> como <strong>${user.name}</strong>.`);
        } catch (err) {
          this.showToast(`⚠️ ${err.message}`);
        }
      });
    });

    const loginForm = document.getElementById('loginModalForm');
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('loginModalError');
      if (errEl) errEl.style.display = 'none';
      try {
        const user = await this.auth.loginWithCredentials(
          document.getElementById('loginEmail').value,
          document.getElementById('loginPassword').value,
          document.getElementById('loginOtp').value
        );
        authDialog?.close();
        this.renderAll();
        this.showToast(`🔓 Sesión iniciada como <strong>${user.name}</strong>.`);
      } catch (err) {
        if (errEl) {
          errEl.textContent = `❌ ${err.message}`;
          errEl.style.display = 'block';
        }
        this.renderUsersAndRBACView();
      }
    });
  }

  _resizeImageToDataUrl(file, maxSize = 220) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Selecciona un archivo de imagen válido (JPG, PNG, WEBP, SVG).'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Formato de imagen no válido.'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          const ctx = canvas.getContext('2d');
          // Center square crop
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  _syncEditProfileAvatarPreview(photoUrl, initials = 'TR') {
    const imgEl = document.getElementById('epAvatarImg');
    const initEl = document.getElementById('epAvatarInitials');
    if (initEl) initEl.textContent = initials;
    if (imgEl) {
      if (photoUrl) {
        imgEl.src = photoUrl;
        imgEl.hidden = false;
      } else {
        imgEl.removeAttribute('src');
        imgEl.hidden = true;
      }
    }
  }

  _getPresetTraderAvatars() {
    const svgToDataUrl = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    return [
      {
        label: 'Quant Cyan',
        url: svgToDataUrl(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g1)"/><circle cx="60" cy="44" r="20" fill="#e0f2fe"/><path d="M24 104c6-22 22-32 36-32s30 10 36 32" fill="#e0f2fe"/><path d="M25 32l16-12 14 10 22-16 18 12" stroke="#34d399" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`
        )
      },
      {
        label: 'Bullish Emerald',
        url: svgToDataUrl(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g2)"/><circle cx="60" cy="45" r="19" fill="#d1fae5"/><path d="M26 104c6-20 20-30 34-30s28 10 34 30" fill="#d1fae5"/><polyline points="24,84 48,62 64,72 94,36" fill="none" stroke="#34d399" stroke-width="6" stroke-linecap="round"/></svg>`
        )
      },
      {
        label: 'ICT Sniper Purple',
        url: svgToDataUrl(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#db2777"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g3)"/><circle cx="60" cy="45" r="19" fill="#fae8ff"/><path d="M26 104c6-20 20-30 34-30s28 10 34 30" fill="#fae8ff"/><circle cx="60" cy="60" r="46" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="8 6"/></svg>`
        )
      },
      {
        label: 'Gold Institutional',
        url: svgToDataUrl(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d97706"/><stop offset="100%" stop-color="#1e293b"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g4)"/><circle cx="60" cy="46" r="19" fill="#fef3c7"/><path d="M26 104c6-20 20-30 34-30s28 10 34 30" fill="#fef3c7"/><polygon points="36,28 48,38 60,22 72,38 84,28 80,44 40,44" fill="#fbbf24"/></svg>`
        )
      }
    ];
  }

  _renderPresetAvatarsRow() {
    const row = document.getElementById('presetAvatarsRow');
    if (!row) return;
    const presets = this._getPresetTraderAvatars();
    row.innerHTML = presets
      .map(
        (p, idx) => `
        <button type="button" class="preset-avatar-btn ${this._pendingProfilePhotoDataUrl === p.url ? 'active' : ''}" data-idx="${idx}" title="Usar avatar ${p.label}">
          <img src="${p.url}" alt="${p.label}" />
        </button>
      `
      )
      .join('');

    row.querySelectorAll('.preset-avatar-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = presets[Number(btn.dataset.idx)];
        if (!preset) return;
        this._pendingProfilePhotoDataUrl = preset.url;
        this._syncEditProfileAvatarPreview(preset.url, this.auth.currentUser?.avatar || 'TR');
        row.querySelectorAll('.preset-avatar-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  _bindDerivApiConfig() {
    const form = document.getElementById('derivApiConfigForm');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.auth.hasPermission('deriv.configure')) {
        this.showToast('🔒 Permiso [deriv.configure] requerido para cambiar la conexión WebSocket de Deriv.');
        return;
      }
      const endpoint = document.getElementById('cfgDerivEndpoint').value;
      const appId = document.getElementById('cfgDerivAppId').value;
      const token = document.getElementById('cfgDerivToken').value;
      this.market.connectWebSocket(appId, token, endpoint);
      this.showToast(`🔌 Reconectando a Deriv WebSocket API (${endpoint}?app_id=${appId})...`);
    });
  }

  // ==========================================================================
  // RENDER METHODS
  // ==========================================================================
  renderAll() {
    this.renderTopUserHeader();
    this.renderTopKpis();
    this.renderTickerTape();
    this.renderSymbolSelector();
    this.renderChart();
    this.renderLiveActiveTrades();
    this.renderSignalsFeed();
    this.renderStrategiesView();
    this.renderJournalView();
    this.renderUsersAndRBACView();
    this.renderFullCatalogTable();
    this._refreshScrollAffordances();
  }

  renderTopUserHeader() {
    const u = this.auth.currentUser;
    const av = document.getElementById('topUserAvatar');
    const avImg = document.getElementById('topUserAvatarImg');
    const dot = document.getElementById('topUserOnlineDot');
    const nm = document.getElementById('topUserName');
    const rl = document.getElementById('topUserRoleBadge');

    // Popover elements
    const popAv = document.getElementById('popoverAvatarInitials');
    const popAvImg = document.getElementById('popoverAvatarImg');
    const popName = document.getElementById('popoverUserName');
    const popEmail = document.getElementById('popoverUserEmail');
    const popRole = document.getElementById('popoverUserRole');
    const pop2FA = document.getElementById('popoverUser2FA');
    const popBio = document.getElementById('popoverUserBio');

    if (!u) {
      if (av) av.textContent = 'OFF';
      if (avImg) {
        avImg.removeAttribute('src');
        avImg.hidden = true;
      }
      if (dot) dot.classList.add('offline');
      if (nm) nm.textContent = 'Sin Sesión';
      if (rl) rl.textContent = 'Haz clic para iniciar sesión';

      if (popAv) popAv.textContent = 'OFF';
      if (popAvImg) {
        popAvImg.removeAttribute('src');
        popAvImg.hidden = true;
      }
      if (popName) popName.textContent = 'Sesión Cerrada';
      if (popEmail) popEmail.textContent = 'Inicia sesión con tus credenciales o Google';
      if (popRole) popRole.textContent = 'Desconectado';
      if (pop2FA) pop2FA.textContent = 'Sin sesión';
      if (popBio) popBio.textContent = '';
      return;
    }

    const roleObj = this.auth.roles[u.role];
    const initials = u.avatar || 'TR';
    const hasPhoto = Boolean(u.photoUrl);

    if (av) av.textContent = initials;
    if (avImg) {
      if (hasPhoto) {
        avImg.src = u.photoUrl;
        avImg.hidden = false;
      } else {
        avImg.removeAttribute('src');
        avImg.hidden = true;
      }
    }
    if (dot) dot.classList.remove('offline');
    if (nm) nm.textContent = u.name;
    if (rl) rl.textContent = `${roleObj?.name || u.role} ${u.authProvider === 'google' ? '· Google' : u.twoFactorEnabled ? '· 2FA' : ''}`;

    if (popAv) popAv.textContent = initials;
    if (popAvImg) {
      if (hasPhoto) {
        popAvImg.src = u.photoUrl;
        popAvImg.hidden = false;
      } else {
        popAvImg.removeAttribute('src');
        popAvImg.hidden = true;
      }
    }
    if (popName) popName.textContent = u.name;
    if (popEmail) popEmail.textContent = u.email + (u.phone ? ` · ${u.phone}` : '');
    if (popRole) popRole.textContent = roleObj?.name || u.role;
    if (pop2FA) {
      pop2FA.textContent = u.twoFactorEnabled ? '🔐 2FA Activo' : 'Sin 2FA';
      pop2FA.className = `badge ${u.twoFactorEnabled ? 'badge-buy' : 'badge-viewer'}`;
    }
    if (popBio) {
      popBio.textContent = u.bio || '';
    }
  }

  renderTopKpis() {
    const subCount = (this.auth.currentUser?.subscribedSymbols || []).length;
    const totalSymbols = this.market.getCatalog().length;
    const openTrades = this.journal.getOpenTrades();
    const floatingPnl = openTrades.reduce((acc, t) => acc + Number(t.pnlUsd || 0), 0);
    const daily = this.journal.getDailyStatus();
    const activeStrats = this.strategyEngine.getStrategies().filter((s) => s.active);
    const avgWr =
      activeStrats.length > 0
        ? (activeStrats.reduce((a, b) => a + b.winRateEst, 0) / activeStrats.length).toFixed(1)
        : '75.0';

    const elSub = document.getElementById('kpiSubscribedCount');
    if (elSub) elSub.textContent = `${subCount} / ${totalSymbols}`;

    const elOpen = document.getElementById('kpiActiveTrades');
    if (elOpen) elOpen.textContent = `${openTrades.length} En Curso`;

    const badgeOpen = document.getElementById('badgeOpenTrades');
    if (badgeOpen) badgeOpen.textContent = String(openTrades.length);

    const elFloat = document.getElementById('kpiFloatingPnl');
    if (elFloat) {
      const sign = floatingPnl >= 0 ? '+' : '';
      elFloat.innerHTML = `PnL Flotante: <strong style="color:${floatingPnl >= 0 ? '#34d399' : '#f87171'};">${sign}$${floatingPnl.toFixed(2)}</strong>`;
    }

    const elDaily = document.getElementById('kpiDailyEntries');
    if (elDaily) {
      elDaily.textContent = `${daily.todayTradesCount} / ${daily.maxDailyTrades}`;
      elDaily.style.color = daily.maxTradesReached ? '#f87171' : '#f8fafc';
    }

    const elLosses = document.getElementById('kpiDailyLosses');
    if (elLosses) {
      elLosses.textContent = `Pérdidas hoy: ${daily.todayLossesCount} / ${daily.maxDailyLosses} máx permitidas`;
    }

    const elWr = document.getElementById('kpiAvgWinrate');
    if (elWr) elWr.textContent = `${avgWr}%`;
  }

  renderTickerTape() {
    const container = document.getElementById('liveTickerTape');
    if (!container) return;
    const subscribed = new Set(this.auth.currentUser?.subscribedSymbols || []);
    const catalog = this.market.getCatalog();

    container.innerHTML = catalog
      .map((item) => {
        const isUp = item.price >= (item.prevPrice || item.price);
        const isSub = subscribed.has(item.symbol);
        const isSelected = item.symbol === this.selectedSymbol;
        return `
          <div class="ticker-chip ${isSub ? 'subscribed' : ''} ${isSelected ? 'active' : ''}" data-symbol="${item.symbol}">
            <strong>${item.shortName}</strong>
            <span style="font-family:monospace;color:${isUp ? '#34d399' : '#f87171'};">
              ${item.price.toFixed(item.decimals)} ${isUp ? '▲' : '▼'}
            </span>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('.ticker-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.selectedSymbol = chip.dataset.symbol;
        this.market.requestSymbolCandles(this.selectedSymbol, 60);
        this.renderSymbolSelector();
        this.renderChart();
        this.renderTickerTape();
      });
    });
  }

  renderSymbolSelector() {
    const container = document.getElementById('symbolSelectorList');
    if (!container) return;
    const prevScrollTop = container.scrollTop;
    const subFilter = document.getElementById('filterSubmarketSelect')?.value || 'all';
    const subscribed = new Set(this.auth.currentUser?.subscribedSymbols || []);
    const catalog = this.market
      .getCatalog()
      .filter((item) => subFilter === 'all' || item.submarket === subFilter);

    container.innerHTML = catalog
      .map((item) => {
        const isSub = subscribed.has(item.symbol);
        const isSel = item.symbol === this.selectedSymbol;
        const isUp = item.price >= (item.prevPrice || item.price);
        return `
          <div class="symbol-row" data-symbol="${item.symbol}" style="display:flex;align-items:center;justify-content:space-between;padding:0.55rem 0.7rem;border-radius:8px;background:${isSel ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.025)'};border:1px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-subtle)'};cursor:pointer;">
            <div>
              <div style="font-weight:700;font-size:0.82rem;display:flex;align-items:center;gap:0.4rem;">
                <span>${item.display_name}</span>
                <span class="badge badge-viewer" style="font-size:0.62rem;">${item.tickSpeed}</span>
              </div>
              <div style="font-size:0.71rem;color:var(--text-muted);">
                <code>${item.symbol}</code> · Pip: ${item.pip} · Lote mín: ${item.minLot}
              </div>
            </div>
            <div style="text-align:right;display:flex;align-items:center;gap:0.65rem;">
              <div>
                <div style="font-family:monospace;font-weight:700;font-size:0.84rem;color:${isUp ? '#34d399' : '#f87171'};">
                  ${item.price.toFixed(item.decimals)}
                </div>
                <div style="font-size:0.68rem;color:var(--text-muted);">Vol ${item.volatilityPct}%</div>
              </div>
              <label style="display:flex;align-items:center;gap:0.25rem;font-size:0.72rem;cursor:pointer;" title="Recibir señales de este índice">
                <input type="checkbox" class="chk-sub-symbol" data-symbol="${item.symbol}" ${isSub ? 'checked' : ''} />
                🔔
              </label>
            </div>
          </div>
        `;
      })
      .join('');

    container.scrollTop = prevScrollTop;
    this._updateSingleScrollerAffordance(container);

    container.querySelectorAll('.symbol-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('chk-sub-symbol')) return;
        this.selectedSymbol = row.dataset.symbol;
        this.market.requestSymbolCandles(this.selectedSymbol, 60);
        this.renderSymbolSelector();
        this.renderChart();
        this.renderTickerTape();
      });
    });

    container.querySelectorAll('.chk-sub-symbol').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        const sym = chk.dataset.symbol;
        this.auth.toggleSubscribedSymbol(sym);
        this.renderTopKpis();
        this.renderTickerTape();
        this.renderSignalsFeed();
      });
    });
  }

  // ==========================================================================
  // INTERACTIVE CANDLESTICK CHART + ICT FVG / OB / ENTRY / SL / TP OVERLAYS
  // ==========================================================================
  renderChart() {
    const canvas = document.getElementById('derivChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const meta = this.market.getSymbolMeta(this.selectedSymbol);
    const allCandles = this.market.getCandles(this.selectedSymbol);
    const candles = allCandles.slice(-55);
    if (!candles.length) return;

    const analysis = this.strategyEngine.analyzeICTAndIndicators(allCandles, meta);

    // Update header texts
    const titleEl = document.getElementById('chartSymbolTitle');
    const metaEl = document.getElementById('chartSymbolMeta');
    const badgeEl = document.getElementById('chartLivePriceBadge');
    const stripEl = document.getElementById('ictAnalysisStrip');

    if (titleEl) {
      titleEl.textContent = `📈 ${meta.display_name} (${meta.symbol}) — Estructura ICT & Velas en Tiempo Real`;
    }
    if (metaEl && analysis) {
      metaEl.textContent = `Pip: ${meta.pip} · Lote Mín: ${meta.minLot} · Velocidad: ${meta.tickSpeed} · Zona ICT: ${analysis.zone}`;
    }
    if (badgeEl && analysis) {
      badgeEl.textContent = analysis.price.toFixed(meta.decimals);
    }
    if (stripEl && analysis) {
      stripEl.innerHTML = `
        <div><span style="color:var(--text-muted);">RSI(14) Actual:</span> <strong>${analysis.rsi}</strong></div>
        <div><span style="color:var(--text-muted);">ATR(14) Rango:</span> <strong>${analysis.atr.toFixed(meta.decimals)}</strong></div>
        <div><span style="color:var(--text-muted);">FVGs Detectados:</span> <strong style="color:#38bdf8;">${analysis.fvgs.length} zonas</strong></div>
        <div><span style="color:var(--text-muted);">Order Blocks (OB):</span> <strong style="color:#a855f7;">${analysis.orderBlocks.length} activos</strong></div>
      `;
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Compute min/max price including any open trade or recent signal on this symbol
    let minP = Math.min(...candles.map((c) => c.low));
    let maxP = Math.max(...candles.map((c) => c.high));

    const activeTrade = this.journal.getOpenTrades().find((t) => t.symbol === this.selectedSymbol);
    if (activeTrade) {
      minP = Math.min(minP, activeTrade.stopLoss, activeTrade.takeProfit);
      maxP = Math.max(maxP, activeTrade.stopLoss, activeTrade.takeProfit);
    }

    const pad = (maxP - minP) * 0.12 || meta.pip * 10;
    minP -= pad;
    maxP += pad;

    const chartLeft = 14;
    const chartRight = w - 82;
    const chartTop = 18;
    const chartBottom = h - 22;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;

    const priceToY = (p) => chartTop + ((maxP - p) / (maxP - minP)) * chartH;

    // 1. Background Grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = chartTop + (chartH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartRight, y);
      ctx.stroke();

      const pVal = maxP - ((maxP - minP) / 5) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(pVal.toFixed(meta.decimals), chartRight + 6, y + 3);
    }

    // 2. ICT Equilibrium (50% Dealing Range) Line
    if (analysis) {
      const eqY = priceToY(analysis.equilibrium);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.beginPath();
      ctx.moveTo(chartLeft, eqY);
      ctx.lineTo(chartRight, eqY);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('ICT 50% EQ (Premium / Discount)', chartLeft + 8, eqY - 5);
      ctx.restore();

      // 3. Draw Fair Value Gaps (FVG boxes)
      for (const fvg of analysis.fvgs) {
        const yTop = priceToY(fvg.top);
        const yBot = priceToY(fvg.bottom);
        ctx.fillStyle = fvg.type === 'BULLISH_FVG' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(244, 63, 94, 0.14)';
        ctx.fillRect(chartRight - 220, Math.min(yTop, yBot), 220, Math.max(4, Math.abs(yBot - yTop)));
        ctx.fillStyle = '#38bdf8';
        ctx.font = '9px monospace';
        ctx.fillText(fvg.type === 'BULLISH_FVG' ? 'FVG +' : 'FVG -', chartRight - 214, Math.min(yTop, yBot) + 10);
      }
    }

    // 4. Draw Candlesticks
    const slotW = chartW / candles.length;
    const candleW = Math.max(3, slotW * 0.64);
    const closes = candles.map((c) => c.close);
    const ema20 = this.strategyEngine.computeEMA(closes, 12);

    candles.forEach((c, i) => {
      const xCenter = chartLeft + i * slotW + slotW / 2;
      const isBull = c.close >= c.open;
      const color = isBull ? '#10b981' : '#ef4444';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xCenter, priceToY(c.high));
      ctx.lineTo(xCenter, priceToY(c.low));
      ctx.stroke();

      // Body
      const yOpen = priceToY(c.open);
      const yClose = priceToY(c.close);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillStyle = color;
      ctx.fillRect(xCenter - candleW / 2, bodyTop, candleW, bodyH);
    });

    // 5. Draw EMA 20 curve
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ema20.forEach((val, i) => {
      const x = chartLeft + i * slotW + slotW / 2;
      const y = priceToY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 6. If there is an active trade on this symbol, draw Entry, SL, and TP lines!
    if (activeTrade) {
      const drawLevel = (price, label, color) => {
        const y = priceToY(price);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(chartLeft, y);
        ctx.lineTo(chartRight, y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${label}: ${price.toFixed(meta.decimals)}`, chartLeft + 110, y - 4);
        ctx.restore();
      };
      drawLevel(activeTrade.takeProfit, '🎯 TAKE PROFIT', '#10b981');
      drawLevel(activeTrade.entryPrice, '⚡ ENTRADA', '#38bdf8');
      drawLevel(activeTrade.stopLoss, '🛑 STOP LOSS', '#ef4444');
    }
  }

  // ==========================================================================
  // RENDER LIVE ACTIVE TRADES WITH REAL-TIME SL <-> ENTRY <-> TP PROGRESS BAR
  // ==========================================================================
  renderLiveActiveTrades() {
    const container = document.getElementById('liveActiveTradesContainer');
    if (!container) return;

    const recentTrades = this.journal.getTradesForJournal().slice(0, 4);
    if (recentTrades.length === 0) {
      container.innerHTML = `<div style="padding:1rem;color:var(--text-muted);text-align:center;">No hay operaciones en seguimiento. Haz clic en <strong>"Tomar Señal a Bitácora"</strong> en cualquier señal para activar la barra en tiempo real.</div>`;
      return;
    }

    container.innerHTML = recentTrades
      .map((trade) => {
        const m = this.journal.computeProgressMetrics(trade);
        const isOpen = trade.status === 'OPEN';
        const statusBadge =
          trade.status === 'OPEN'
            ? `<span class="badge badge-ict">🛰️ EN CURSO (VIVO)</span>`
            : trade.status === 'TP_HIT'
              ? `<span class="badge badge-buy">✅ GANADA (TP TOCADO)</span>`
              : trade.status === 'SL_HIT'
                ? `<span class="badge badge-sell">🛑 PERDIDA (SL TOCADO)</span>`
                : `<span class="badge badge-viewer">${trade.status}</span>`;

        const pnlColor = m.livePnlUsd >= 0 ? '#34d399' : '#f87171';
        const pnlSign = m.livePnlUsd >= 0 ? '+' : '';

        return `
          <div class="live-trade-card status-${trade.status}">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
              <div>
                <span class="badge ${trade.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}">${trade.direction}</span>
                <strong style="font-size:0.92rem;margin-left:0.35rem;">${trade.displayName} (${trade.symbol})</strong>
                <span style="font-size:0.75rem;color:var(--text-muted);margin-left:0.35rem;">· ${trade.strategyName}</span>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;">
                ${statusBadge}
                <strong style="font-family:monospace;font-size:0.92rem;color:${pnlColor};">
                  ${pnlSign}$${m.livePnlUsd.toFixed(2)} (${pnlSign}${m.liveR}R)
                </strong>
              </div>
            </div>

            <!-- BARRA INTERACTIVA EN TIEMPO REAL SL (0%) <---> ENTRY <---> TP (100%) -->
            <div class="sl-tp-bar-wrapper">
              <div class="sl-tp-labels">
                <span style="color:#f87171;">🛑 SL: ${trade.stopLoss.toFixed(trade.decimals)} (0%)</span>
                <span style="color:#cbd5e1;">⚡ Entrada: ${trade.entryPrice.toFixed(trade.decimals)} · <strong>Precio Vivo: ${trade.currentPrice.toFixed(trade.decimals)}</strong></span>
                <span style="color:#34d399;">🎯 TP: ${trade.takeProfit.toFixed(trade.decimals)} (100%)</span>
              </div>
              <div class="sl-tp-track">
                <div class="sl-tp-fill ${m.isProfitZone ? 'in-profit' : 'in-drawdown'}" style="width: ${m.barPercent}%;"></div>
                <div class="entry-marker" style="left: ${m.entryMarkerPercent}%;" title="Precio de Entrada"></div>
                <div class="price-cursor" style="left: ${m.barPercent}%;" title="Precio Actual en Vivo: ${trade.currentPrice}"></div>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-top:0.65rem;font-size:0.75rem;color:var(--text-muted);">
              <div>
                <span>Estado de Ánimo: <strong>${trade.traderMoodLabel}</strong></span> ·
                <span>Checklist: <strong>${trade.checklistScorePct}%</strong></span>
              </div>
              ${
                isOpen
                  ? `
                <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
                  <button type="button" class="btn btn-success btn-sm btn-trade-action" data-id="${trade.id}" data-action="FORCE_TP" title="Simular que el precio alcanza el Take Profit">
                    🎯 Simular Toque TP
                  </button>
                  <button type="button" class="btn btn-danger btn-sm btn-trade-action" data-id="${trade.id}" data-action="FORCE_SL" title="Simular que el precio toca el Stop Loss">
                    🛑 Simular Toque SL
                  </button>
                  <button type="button" class="btn btn-outline btn-sm btn-trade-action" data-id="${trade.id}" data-action="BREAK_EVEN">
                    🛡️ Break Even
                  </button>
                  <button type="button" class="btn btn-outline btn-sm btn-trade-action" data-id="${trade.id}" data-action="MANUAL">
                    ✕ Cerrar Ahora
                  </button>
                </div>
              `
                  : `<span style="font-family:monospace;">Cerrada @ ${trade.exitPrice?.toFixed(trade.decimals)}</span>`
              }
            </div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('.btn-trade-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tradeId = btn.dataset.id;
        const action = btn.dataset.action;
        this.journal.closeTradeManually(tradeId, action);
        this.renderLiveActiveTrades();
        this.renderJournalView();
        this.renderTopKpis();
      });
    });
  }

  // ==========================================================================
  // RENDER SIGNALS FEED
  // ==========================================================================
  renderSignalsFeed() {
    const container = document.getElementById('signalsFeedContainer');
    if (!container) return;

    const onlySub = document.getElementById('chkOnlySubscribedSignals')?.checked;
    const subscribed = new Set(this.auth.currentUser?.subscribedSymbols || []);

    const list = this.signals.filter((s) => !onlySub || subscribed.has(s.symbol));

    if (list.length === 0) {
      container.innerHTML = `<div style="padding:1.2rem;text-align:center;color:var(--text-muted);">No hay señales para los índices filtrados. Marca más índices en la columna izquierda o pulsa <strong>"⚡ Escanear Señal Ahora"</strong>.</div>`;
      return;
    }

    container.innerHTML = list
      .map(
        (sig) => `
        <article class="signal-card ${sig.direction === 'BUY' ? 'buy-card' : 'sell-card'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
            <div>
              <span class="badge ${sig.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}">${sig.direction}</span>
              <strong style="font-size:0.9rem;margin-left:0.3rem;">${sig.displayName}</strong>
              <div style="font-size:0.73rem;color:var(--accent-primary);margin-top:0.15rem;font-weight:600;">
                ${sig.strategyName} · ${sig.timeframe}
              </div>
            </div>
            <span class="badge badge-ict">${sig.confidence}% CONF</span>
          </div>

          <div class="signal-levels-grid">
            <div class="level-box">
              <span class="level-label">Entrada</span>
              <span class="level-val">${sig.entryPrice.toFixed(sig.decimals)}</span>
            </div>
            <div class="level-box">
              <span class="level-label">Stop Loss</span>
              <span class="level-val" style="color:#f87171;">${sig.stopLoss.toFixed(sig.decimals)}</span>
            </div>
            <div class="level-box">
              <span class="level-label">Take Profit</span>
              <span class="level-val" style="color:#34d399;">${sig.takeProfit.toFixed(sig.decimals)}</span>
            </div>
            <div class="level-box">
              <span class="level-label">Ratio R:R</span>
              <span class="level-val" style="color:#38bdf8;">1:${sig.rrRatio}</span>
            </div>
          </div>

          <ul class="confluences-list">
            ${sig.confluences.map((c) => `<li>${c}</li>`).join('')}
          </ul>

          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
            <button type="button" class="btn btn-outline btn-sm btn-view-sig-chart" data-symbol="${sig.symbol}">
              📈 Ver en Gráfico
            </button>
            <button type="button" class="btn btn-success btn-sm btn-take-signal" data-id="${sig.id}">
              ⚡ Tomar Señal a Bitácora
            </button>
          </div>
        </article>
      `
      )
      .join('');

    container.querySelectorAll('.btn-view-sig-chart').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedSymbol = btn.dataset.symbol;
        this.renderSymbolSelector();
        this.renderChart();
      });
    });

    container.querySelectorAll('.btn-take-signal').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.openTakeSignalModal(btn.dataset.id);
      });
    });
  }

  // ==========================================================================
  // RENDER STRATEGIES ENGINE VIEW
  // ==========================================================================
  renderStrategiesView() {
    const container = document.getElementById('strategiesListContainer');
    const badgeCount = document.getElementById('badgeStrategiesCount');
    const strategies = this.strategyEngine.getStrategies();
    if (badgeCount) badgeCount.textContent = String(strategies.length);
    if (!container) return;

    const candles = this.market.getCandles(this.selectedSymbol);

    container.innerHTML = strategies
      .map((st) => {
        const bt = this.strategyEngine.runBacktest(st, candles);
        return `
          <div style="background:var(--bg-surface);border:1px solid ${st.active ? 'var(--border-highlight)' : 'var(--border-subtle)'};border-radius:10px;padding:0.95rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
              <div>
                <span class="badge badge-ict">${st.badge}</span>
                <strong style="font-size:0.94rem;margin-left:0.4rem;">${st.name}</strong>
                <span style="font-size:0.75rem;color:var(--text-muted);margin-left:0.4rem;">(${st.category} · ${st.timeframe})</span>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <span class="badge badge-buy">Winrate Est: ${st.winRateEst}%</span>
                <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.78rem;cursor:pointer;font-weight:700;">
                  <input type="checkbox" class="chk-toggle-strategy" data-id="${st.id}" ${st.active ? 'checked' : ''} />
                  ${st.active ? 'Activa' : 'Pausada'}
                </label>
              </div>
            </div>

            <p style="margin:0.5rem 0;font-size:0.8rem;color:var(--text-secondary);">${st.description}</p>

            <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.65rem;">
              ${st.conditions.map((c) => `<span class="badge badge-viewer" style="text-transform:none;">✓ ${c}</span>`).join('')}
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;padding-top:0.55rem;border-top:1px solid var(--border-subtle);font-size:0.76rem;">
              <div>
                <span>R:R Objetivo: <strong>1:${st.rrRatio}</strong></span> ·
                <span>Profit Factor: <strong style="color:#34d399;">${bt.profitFactor}</strong></span> ·
                <span>Retorno Simulado (${this.selectedSymbol}): <strong style="color:#38bdf8;">+${bt.netR}R (${bt.wins}W / ${bt.losses}L)</strong></span>
              </div>
              <button type="button" class="btn btn-outline btn-sm btn-scan-with-strat" data-id="${st.id}">
                ⚡ Generar Señal con esta Estrategia
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('.chk-toggle-strategy').forEach((chk) => {
      chk.addEventListener('change', () => {
        if (!this.auth.hasPermission('strategies.manage')) {
          chk.checked = !chk.checked;
          this.showToast('🔒 Permiso [strategies.manage] requerido para activar/desactivar estrategias.');
          return;
        }
        this.strategyEngine.toggleStrategy(chk.dataset.id);
        this.renderStrategiesView();
        this.renderTopKpis();
      });
    });

    container.querySelectorAll('.btn-scan-with-strat').forEach((btn) => {
      btn.addEventListener('click', () => {
        const meta = this.market.getSymbolMeta(this.selectedSymbol);
        const sig = this.strategyEngine.generateSignalForSymbol(
          meta,
          this.market.getCandles(this.selectedSymbol),
          btn.dataset.id
        );
        if (sig) {
          this.signals.unshift(sig);
          this.renderSignalsFeed();
          document.querySelector('.nav-tab[data-view="view-signals"]')?.click();
          this.showToast(`⚡ Señal generada en <strong>${meta.display_name}</strong> usando <strong>${sig.strategyName}</strong>.`);
        }
      });
    });
  }

  // ==========================================================================
  // RENDER TRADING JOURNAL, DAILY RULES, CHECKLIST & PSYCHOTRADING VIEW
  // ==========================================================================
  renderJournalView() {
    const activeJournal = this.journal.getActiveJournal();
    if (!activeJournal) return;

    // 1. Journal selector
    const sel = document.getElementById('activeJournalSelect');
    if (sel) {
      sel.innerHTML = this.journal.journals
        .map((j) => `<option value="${j.id}" ${j.id === activeJournal.id ? 'selected' : ''}>${j.name}</option>`)
        .join('');
    }

    // 2. Daily status & Guard badge
    const daily = this.journal.getDailyStatus(activeJournal.id);
    const stats = this.journal.getJournalStats(activeJournal.id);
    const guardBadge = document.getElementById('journalGuardStatusBadge');
    if (guardBadge) {
      if (daily.canTrade) {
        guardBadge.innerHTML = `<span class="badge badge-buy">🟢 PLAN DIARIO EN REGLA (${daily.todayTradesCount}/${daily.maxDailyTrades} Entradas · ${daily.todayLossesCount}/${daily.maxDailyLosses} Pérdidas)</span>`;
      } else {
        guardBadge.innerHTML = `<span class="badge badge-sell">🛑 BLOQUEO DE DISCIPLINA ACTIVO (Límite Diario Alcanzado)</span>`;
      }
    }

    // 3. Journal KPIs
    const kpiRow = document.getElementById('journalStatsKpiRow');
    if (kpiRow) {
      const pnlSign = stats.totalNetPnl >= 0 ? '+' : '';
      kpiRow.innerHTML = `
        <div class="kpi-card">
          <span class="kpi-label">Equidad Actual de la Bitácora</span>
          <span class="kpi-value" style="color:#38bdf8;">$${stats.currentEquity.toFixed(2)}</span>
          <span class="kpi-sub">Capital Inicial: $${stats.initialBalance.toFixed(2)} (${pnlSign}$${stats.totalNetPnl.toFixed(2)})</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Win Rate &amp; Profit Factor</span>
          <span class="kpi-value" style="color:#34d399;">${stats.winRate}% WR</span>
          <span class="kpi-sub">Profit Factor: ${stats.profitFactor} (${stats.winsCount} Ganadas / ${stats.lossesCount} Perdidas)</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Control de Entradas Hoy</span>
          <span class="kpi-value" style="color:${daily.maxTradesReached ? '#f87171' : '#f8fafc'};">${daily.todayTradesCount} / ${daily.maxDailyTrades}</span>
          <span class="kpi-sub">Máximo permitido por tu configuración</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Control de Pérdidas Hoy</span>
          <span class="kpi-value" style="color:${daily.maxLossesReached ? '#f87171' : '#34d399'};">${daily.todayLossesCount} / ${daily.maxDailyLosses}</span>
          <span class="kpi-sub">Guardia Anti-Revancha: ${activeJournal.strictGuardEnabled ? 'ACTIVO' : 'INACTIVO'}</span>
        </div>
      `;
    }

    // 4. Populate Config Form
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = v;
    };
    setVal('jcfgName', activeJournal.name);
    setVal('jcfgBalance', activeJournal.initialBalance);
    setVal('jcfgMaxTrades', activeJournal.maxDailyTrades);
    setVal('jcfgMaxLosses', activeJournal.maxDailyLosses);
    setVal('jcfgRiskPct', activeJournal.riskPerTradePct);
    setVal('jcfgMinChecklist', activeJournal.minChecklistPct);
    const guardChk = document.getElementById('jcfgStrictGuard');
    if (guardChk) guardChk.checked = activeJournal.strictGuardEnabled;

    // 5. Render Checklist items
    const chkListEl = document.getElementById('checklistConfigItems');
    if (chkListEl) {
      chkListEl.innerHTML = activeJournal.checklist
        .map(
          (c) => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:#09101f;padding:0.4rem 0.65rem;border-radius:6px;border:1px solid var(--border-subtle);font-size:0.79rem;">
            <span>☑️ ${c.text}</span>
            <button type="button" class="btn btn-danger btn-sm btn-del-chk" data-id="${c.id}" style="padding:0.15rem 0.45rem;">✕</button>
          </div>
        `
        )
        .join('');

      chkListEl.querySelectorAll('.btn-del-chk').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.journal.removeChecklistItem(btn.dataset.id);
          this.renderJournalView();
        });
      });
    }

    // 6. Render Mood Analytics
    const moodContainer = document.getElementById('moodAnalyticsContainer');
    if (moodContainer) {
      const entries = Object.values(stats.moodStats);
      moodContainer.innerHTML =
        entries.length > 0
          ? entries
              .map(
                (ms) => `
              <div style="background:#09101f;padding:0.55rem 0.7rem;border-radius:8px;border:1px solid var(--border-subtle);font-size:0.76rem;">
                <div style="font-weight:700;margin-bottom:0.2rem;">${ms.label}</div>
                <div style="color:var(--text-secondary);">
                  Winrate: <strong>${ms.winRate}%</strong> (${ms.count} ops) ·
                  PnL: <strong style="color:${ms.pnl >= 0 ? '#34d399' : '#f87171'};">${ms.pnl >= 0 ? '+' : ''}$${ms.pnl}</strong>
                </div>
              </div>
            `
              )
              .join('')
          : `<div style="font-size:0.76rem;color:var(--text-muted);">Cierra operaciones para ver estadísticas por estado emocional.</div>`;
    }

    // 7. Render Full Trades Table with Live SL/TP Progress Bars
    const tbody = document.getElementById('journalTradesTableBody');
    if (!tbody) return;
    const trades = this.journal.getTradesForJournal(activeJournal.id);

    tbody.innerHTML = trades
      .map((t) => {
        const m = this.journal.computeProgressMetrics(t);
        const dateStr = new Date(t.openedAt).toLocaleString('es-ES', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        const statusBadge =
          t.status === 'OPEN'
            ? `<span class="badge badge-ict">🛰️ EN CURSO</span>`
            : t.status === 'TP_HIT'
              ? `<span class="badge badge-buy">✅ TP HIT (GANADA)</span>`
              : t.status === 'SL_HIT'
                ? `<span class="badge badge-sell">🛑 SL HIT (PERDIDA)</span>`
                : `<span class="badge badge-viewer">${t.status}</span>`;

        const pnlColor = m.livePnlUsd >= 0 ? '#34d399' : '#f87171';
        const pnlSign = m.livePnlUsd >= 0 ? '+' : '';

        return `
          <tr>
            <td>
              <div style="font-weight:600;">${dateStr}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">${t.session}</div>
            </td>
            <td>
              <span class="badge ${t.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}">${t.direction}</span>
              <strong style="margin-left:0.3rem;">${t.shortName || t.symbol}</strong>
              <div style="font-size:0.71rem;color:var(--text-muted);">Lote: ${t.lotSize}</div>
            </td>
            <td>
              <div style="font-weight:600;">${t.strategyName}</div>
              <div style="font-size:0.72rem;color:var(--accent-primary);">TF: ${t.timeframe} · R:R 1:${t.rrRatio}</div>
            </td>
            <td style="font-family:monospace;font-size:0.77rem;">
              <div>Ent: <strong>${t.entryPrice.toFixed(t.decimals)}</strong></div>
              <div style="color:#f87171;">SL: ${t.stopLoss.toFixed(t.decimals)}</div>
              <div style="color:#34d399;">TP: ${t.takeProfit.toFixed(t.decimals)}</div>
            </td>
            <td>
              <div style="font-family:monospace;font-size:0.72rem;display:flex;justify-content:space-between;margin-bottom:0.2rem;">
                <span style="color:#f87171;">SL</span>
                <span>Vivo: <strong>${t.currentPrice.toFixed(t.decimals)}</strong> (${m.barPercent}%)</span>
                <span style="color:#34d399;">TP</span>
              </div>
              <div class="sl-tp-track" style="height:12px;">
                <div class="sl-tp-fill ${m.isProfitZone ? 'in-profit' : 'in-drawdown'}" style="width:${m.barPercent}%;"></div>
                <div class="entry-marker" style="left:${m.entryMarkerPercent}%;"></div>
                <div class="price-cursor" style="left:${m.barPercent}%;width:14px;height:14px;"></div>
              </div>
            </td>
            <td>${statusBadge}</td>
            <td style="font-family:monospace;">
              <div style="font-size:0.72rem;color:var(--text-muted);">Riesgo: $${t.riskUsd}</div>
              <div style="font-weight:700;color:${pnlColor};">${pnlSign}$${m.livePnlUsd.toFixed(2)} (${pnlSign}${m.liveR}R)</div>
            </td>
            <td>
              <div style="font-weight:600;font-size:0.76rem;">${t.traderMoodLabel}</div>
              <div style="font-size:0.71rem;color:var(--text-muted);">${t.marketSentiment}</div>
            </td>
            <td style="max-width:220px;">
              <div style="font-size:0.72rem;color:#34d399;font-weight:700;">Checklist: ${t.checklistScorePct}% · ${'★'.repeat(t.disciplineStars || 5)}</div>
              <div style="font-size:0.74rem;color:var(--text-secondary);">${t.notes || '—'}</div>
            </td>
            <td>
              ${
                t.status === 'OPEN'
                  ? `
                <div style="display:flex;flex-direction:column;gap:0.25rem;">
                  <button type="button" class="btn btn-success btn-sm btn-jtable-action" data-id="${t.id}" data-action="FORCE_TP">🎯 Hit TP</button>
                  <button type="button" class="btn btn-danger btn-sm btn-jtable-action" data-id="${t.id}" data-action="FORCE_SL">🛑 Hit SL</button>
                </div>
              `
                  : `<span style="font-size:0.72rem;color:var(--text-muted);">Finalizada</span>`
              }
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.btn-jtable-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.journal.closeTradeManually(btn.dataset.id, btn.dataset.action);
        this.renderJournalView();
        this.renderLiveActiveTrades();
        this.renderTopKpis();
      });
    });
  }

  // ==========================================================================
  // RENDER USERS, RBAC MATRIX & SECURITY AUDIT LOG
  // ==========================================================================
  renderUsersAndRBACView() {
    // 1. RBAC Matrix Table
    const matrixBody = document.getElementById('rbacMatrixTableBody');
    if (matrixBody) {
      const roleOrder = ['super_admin', 'strategist', 'trader_vip', 'viewer'];
      matrixBody.innerHTML = Object.entries(PERMISSION_LABELS)
        .map(([permKey, label]) => {
          const cols = roleOrder
            .map((rId) => {
              const checked = Boolean(this.auth.roles[rId]?.permissions[permKey]);
              return `
                <td>
                  <input
                    type="checkbox"
                    class="chk-rbac-perm"
                    data-role="${rId}"
                    data-perm="${permKey}"
                    ${checked ? 'checked' : ''}
                    ${rId === 'super_admin' && permKey === 'roles.manage' ? 'disabled' : ''}
                  />
                </td>
              `;
            })
            .join('');
          return `
            <tr>
              <td>
                <div style="font-weight:600;">${label}</div>
                <code style="font-size:0.7rem;color:var(--text-muted);">${permKey}</code>
              </td>
              ${cols}
            </tr>
          `;
        })
        .join('');

      matrixBody.querySelectorAll('.chk-rbac-perm').forEach((chk) => {
        chk.addEventListener('change', () => {
          if (!this.auth.hasPermission('roles.manage')) {
            chk.checked = !chk.checked;
            this.showToast('🔒 Solo un usuario con permiso [roles.manage] (Super Admin) puede modificar la matriz RBAC.');
            return;
          }
          this.auth.toggleRolePermission(chk.dataset.role, chk.dataset.perm);
          this.renderUsersAndRBACView();
          this.showToast(`🔑 Permiso [${chk.dataset.perm}] actualizado para el rol ${chk.dataset.role}.`);
        });
      });
    }

    // 2. Security Audit Logs
    const auditContainer = document.getElementById('securityAuditLogContainer');
    if (auditContainer) {
      auditContainer.innerHTML = this.auth.auditLogs
        .slice(0, 15)
        .map((log) => {
          const timeStr = new Date(log.timestamp).toLocaleTimeString('es-ES');
          return `
            <div style="background:#09101f;padding:0.45rem 0.65rem;border-radius:6px;border-left:3px solid ${log.severity === 'danger' ? '#ef4444' : log.severity === 'warning' ? '#f59e0b' : '#10b981'};font-size:0.75rem;">
              <div style="display:flex;justify-content:space-between;">
                <strong>${log.event}</strong>
                <span style="color:var(--text-muted);font-family:monospace;">${timeStr} · ${log.user}</span>
              </div>
              <div style="color:var(--text-secondary);margin-top:0.1rem;">${log.details}</div>
            </div>
          `;
        })
        .join('');
    }

    // 3. Users Directory Table
    const usersBody = document.getElementById('usersDirectoryTableBody');
    if (usersBody) {
      usersBody.innerHTML = this.auth.users
        .map((u) => {
          const isCurrent = u.id === this.auth.currentUser?.id;
          const roleObj = this.auth.roles[u.role];
          return `
            <tr style="${isCurrent ? 'background:rgba(56,189,248,0.08);' : ''}">
              <td>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                  <div class="user-avatar-wrap" style="width:28px;height:28px;">
                    <div class="user-avatar" style="width:28px;height:28px;font-size:0.7rem;">${u.avatar || 'US'}</div>
                    ${u.photoUrl ? `<img class="user-avatar-img" src="${u.photoUrl}" alt="${u.name}" />` : ''}
                  </div>
                  <div>
                    <div style="font-weight:700;">${u.name} ${isCurrent ? '<span class="badge badge-ict">SESIÓN ACTIVA</span>' : ''}</div>
                    ${u.bio ? `<div style="font-size:0.68rem;color:var(--text-muted);">${u.bio}</div>` : ''}
                  </div>
                </div>
              </td>
              <td><code>${u.email}</code></td>
              <td>
                ${
                  u.authProvider === 'google'
                    ? '<span class="badge badge-ict">🔵 Google OAuth 2.0</span>'
                    : '<span class="badge badge-viewer">🔐 PBKDF2-SHA512</span>'
                }
              </td>
              <td>
                ${
                  u.twoFactorEnabled
                    ? `<span class="badge badge-buy">2FA Activo (${u.twoFactorCode || 'TOTP'})</span>`
                    : '<span class="badge badge-viewer">Sin 2FA</span>'
                }
              </td>
              <td>
                <select class="sel-user-role" data-userid="${u.id}" style="background:#09101f;color:#fff;border:1px solid var(--border-subtle);padding:0.28rem 0.5rem;border-radius:6px;font-size:0.76rem;">
                  ${Object.values(this.auth.roles)
                    .map((r) => `<option value="${r.id}" ${r.id === u.role ? 'selected' : ''}>${r.name}</option>`)
                    .join('')}
                </select>
              </td>
              <td>${(u.subscribedSymbols || []).length} índices</td>
              <td>
                <span class="badge ${u.status === 'active' ? 'badge-buy' : 'badge-sell'}">
                  ${u.status === 'active' ? 'ACTIVO' : 'SUSPENDIDO'}
                </span>
              </td>
              <td>
                <div style="display:flex;gap:0.35rem;">
                  ${
                    !isCurrent
                      ? `<button type="button" class="btn btn-primary btn-sm btn-switch-user" data-userid="${u.id}">Usar Cuenta</button>`
                      : ''
                  }
                  ${
                    !isCurrent
                      ? `<button type="button" class="btn btn-outline btn-sm btn-toggle-user-status" data-userid="${u.id}">${u.status === 'active' ? 'Suspender' : 'Activar'}</button>`
                      : ''
                  }
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      usersBody.querySelectorAll('.sel-user-role').forEach((sel) => {
        sel.addEventListener('change', () => {
          if (!this.auth.hasPermission('users.manage')) {
            this.renderUsersAndRBACView();
            this.showToast('🔒 Permiso [users.manage] requerido para cambiar roles de usuarios.');
            return;
          }
          this.auth.updateUserRole(sel.dataset.userid, sel.value);
          this.renderAll();
          this.showToast('✅ Rol de usuario actualizado en el motor RBAC.');
        });
      });

      usersBody.querySelectorAll('.btn-switch-user').forEach((btn) => {
        btn.addEventListener('click', () => {
          const u = this.auth.switchActiveUser(btn.dataset.userid);
          this.renderAll();
          this.showToast(`👤 Sesión cambiada a <strong>${u.name}</strong> (Rol: ${this.auth.roles[u.role]?.name}).`);
        });
      });

      usersBody.querySelectorAll('.btn-toggle-user-status').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (!this.auth.hasPermission('users.manage')) {
            this.showToast('🔒 Permiso [users.manage] requerido para suspender/activar cuentas.');
            return;
          }
          this.auth.toggleUserStatus(btn.dataset.userid);
          this.renderUsersAndRBACView();
        });
      });
    }
  }

  // ==========================================================================
  // RENDER FULL DERIV SYNTHETIC INDICES TECHNICAL CATALOG
  // ==========================================================================
  renderFullCatalogTable() {
    const tbody = document.getElementById('fullCatalogTableBody');
    if (!tbody) return;
    const subscribed = new Set(this.auth.currentUser?.subscribedSymbols || []);

    tbody.innerHTML = this.market
      .getCatalog()
      .map((item) => {
        const isSub = subscribed.has(item.symbol);
        return `
          <tr>
            <td><code>${item.symbol}</code></td>
            <td><strong>${item.display_name}</strong></td>
            <td><span class="badge badge-ict">${item.submarket_label}</span></td>
            <td style="font-family:monospace;font-weight:700;color:#34d399;">${item.price.toFixed(item.decimals)}</td>
            <td style="font-family:monospace;">${item.pip} (${item.decimals} dec)</td>
            <td style="font-family:monospace;">${item.minLot}</td>
            <td>${item.tickSpeed}</td>
            <td style="font-size:0.76rem;color:var(--text-secondary);max-width:300px;">${item.description}</td>
            <td>
              <label style="display:flex;align-items:center;gap:0.35rem;cursor:pointer;font-weight:600;">
                <input type="checkbox" class="chk-cat-sub" data-symbol="${item.symbol}" ${isSub ? 'checked' : ''} />
                ${isSub ? '🔔 Suscrito' : 'Inactivo'}
              </label>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.chk-cat-sub').forEach((chk) => {
      chk.addEventListener('change', () => {
        this.auth.toggleSubscribedSymbol(chk.dataset.symbol);
        this.renderAll();
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.synthQuantApp = new SynthQuantApp();
});
