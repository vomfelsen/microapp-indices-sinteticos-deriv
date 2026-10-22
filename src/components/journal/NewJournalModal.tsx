"use client";

import React, { useEffect, useState } from "react";
import type { JournalBook, JournalColor } from "./types";
import { BookOpen, X, Shield, Target, Plus, Check, Trash2, Edit3, Bot, Zap } from "lucide-react";

interface NewJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveJournal: (
    journal: Omit<JournalBook, "id" | "checklist" | "createdAt">,
    editBookId?: string
  ) => void;
  initialBook?: JournalBook | null;
  onDeleteJournal?: (id: string) => void;
}

const COLOR_OPTIONS: { id: JournalColor; label: string; hex: string; bgClass: string }[] = [
  { id: "amber", label: "Ámbar ICT", hex: "#f59e0b", bgClass: "bg-amber-500" },
  { id: "emerald", label: "Verde Quant", hex: "#10b981", bgClass: "bg-emerald-500" },
  { id: "cyan", label: "Cian Neón", hex: "#06b6d4", bgClass: "bg-cyan-500" },
  { id: "rose", label: "Carmesí Deriv", hex: "#f43f5e", bgClass: "bg-rose-500" },
  { id: "purple", label: "Púrpura VIP", hex: "#a855f7", bgClass: "bg-purple-500" },
];

export function NewJournalModal({
  isOpen,
  onClose,
  onSaveJournal,
  initialBook,
  onDeleteJournal,
}: NewJournalModalProps) {
  const isEditing = Boolean(initialBook);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxDailyTrades, setMaxDailyTrades] = useState<number>(3);
  const [targetDailyTrades, setTargetDailyTrades] = useState<number>(2);
  const [maxDailyLossUsd, setMaxDailyLossUsd] = useState<number>(150);
  const [color, setColor] = useState<JournalColor>("amber");

  // Parámetros de Auto-Trading para esta bitácora
  const [autoTradeEnabled, setAutoTradeEnabled] = useState<boolean>(false);
  const [autoTradeLotSize, setAutoTradeLotSize] = useState<number>(0.2);
  const [autoTradeTargetTp, setAutoTradeTargetTp] = useState<"TP1" | "TP2">("TP1");
  const [autoTradeMaxRiskUsd, setAutoTradeMaxRiskUsd] = useState<number>(50);
  const [autoTradeOnlyInZone, setAutoTradeOnlyInZone] = useState<boolean>(true);
  const [autoTradeMinWinRate, setAutoTradeMinWinRate] = useState<number>(70);

  useEffect(() => {
    if (initialBook) {
      setName(initialBook.name);
      setDescription(initialBook.description || "");
      setMaxDailyTrades(initialBook.maxDailyTrades || 3);
      setTargetDailyTrades(initialBook.targetDailyTrades || 2);
      setMaxDailyLossUsd(initialBook.maxDailyLossUsd || 150);
      setColor(initialBook.color || "amber");

      const at = initialBook.autoTrade;
      setAutoTradeEnabled(Boolean(at?.enabled));
      setAutoTradeLotSize(at?.defaultLotSize ?? 0.2);
      setAutoTradeTargetTp(at?.targetTp ?? "TP1");
      setAutoTradeMaxRiskUsd(at?.maxRiskPerTradeUsd ?? 50);
      setAutoTradeOnlyInZone(at?.onlyInEntryZone ?? true);
      setAutoTradeMinWinRate(at?.minStrategyWinRate ?? 70);
    } else {
      setName("");
      setDescription("");
      setMaxDailyTrades(3);
      setTargetDailyTrades(2);
      setMaxDailyLossUsd(150);
      setColor("amber");

      setAutoTradeEnabled(false);
      setAutoTradeLotSize(0.2);
      setAutoTradeTargetTp("TP1");
      setAutoTradeMaxRiskUsd(50);
      setAutoTradeOnlyInZone(true);
      setAutoTradeMinWinRate(70);
    }
  }, [initialBook, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveJournal(
      {
        name: name.trim(),
        description: description.trim() || "Bitácora operativa de Índices Sintéticos",
        maxDailyTrades: Number(maxDailyTrades) || 4,
        targetDailyTrades: Number(targetDailyTrades) || 2,
        maxDailyLossUsd: Number(maxDailyLossUsd) || 150,
        color,
        autoTrade: {
          enabled: autoTradeEnabled,
          defaultLotSize: Math.max(0.01, Number(autoTradeLotSize) || 0.2),
          targetTp: autoTradeTargetTp,
          maxRiskPerTradeUsd: Math.max(5, Number(autoTradeMaxRiskUsd) || 50),
          onlyInEntryZone: autoTradeOnlyInZone,
          minStrategyWinRate: Math.max(50, Math.min(100, Number(autoTradeMinWinRate) || 70)),
        },
      },
      initialBook?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="theme-accent-btn flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg shrink-0">
              {isEditing ? <Edit3 className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
            </span>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                {isEditing ? "Editar Bitácora de Trading" : "Crear Nueva Bitácora de Trading"}
              </h2>
              <p className="text-xs text-zinc-400">
                {isEditing
                  ? "Modifica el nombre, metas diarias de trades y límites de riesgo de esta cartera."
                  : "Configura un libro independiente para cuenta real, demo, fondeo o scalping."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300">
              Nombre de la Bitácora / Cartera *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Cuenta Reto Fondeo ($25k) o Scalping 1s"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300">
              Descripción u Objetivo Operativo
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Reglas de drawdown estricto, setups en V75 y Boom 1000"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          {/* Límite de Entradas Diarias & Meta */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Target className="h-3.5 w-3.5 text-amber-400" />
                Máx. Entradas por Día (Límite)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={maxDailyTrades}
                onChange={(e) => setMaxDailyTrades(parseInt(e.target.value, 10) || 1)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
              <span className="text-[10px] text-zinc-500">
                Te alertará cuando alcances esta cuota para evitar overtrading.
              </span>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                Meta de Entradas Diarias
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={targetDailyTrades}
                onChange={(e) => setTargetDailyTrades(parseInt(e.target.value, 10) || 1)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
              <span className="text-[10px] text-zinc-500">
                Cantidad recomendada de trades de alta probabilidad al día.
              </span>
            </div>
          </div>

          {/* Pérdida Máxima Diaria */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300">
              Pérdida Máxima Diaria Permitida ($ USD)
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-500">
                $
              </span>
              <input
                type="number"
                min={10}
                step={10}
                value={maxDailyLossUsd}
                onChange={(e) => setMaxDailyLossUsd(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2 pl-7 pr-3 font-mono text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>
            <span className="text-[10px] text-zinc-500">
              Límite de riesgo diario para detener operativa si el mercado está adverso.
            </span>
          </div>

          {/* Color de la bitácora */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Color Distintivo de la Cartera
            </label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all ${
                      isSelected
                        ? "border-zinc-500 bg-zinc-900 ring-1 ring-zinc-500"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full shadow-sm"
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3] text-white" />}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-300 truncate w-full">
                      {c.label.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN AUTO-TRADING DE SEÑALES */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                  autoTradeEnabled ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50" : "bg-zinc-800 text-zinc-400"
                }`}>
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>Tomar Señales Automáticamente</span>
                    {autoTradeEnabled && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                        ACTIVO
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Toma operaciones solas en esta bitácora respetando de forma estricta las reglas del plan.
                  </p>
                </div>
              </div>

              {/* Switch Toggle */}
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={autoTradeEnabled}
                  onChange={(e) => setAutoTradeEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-zinc-800 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-600 after:bg-zinc-300 after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:after:bg-white peer-focus:outline-none"></div>
              </label>
            </div>

            {/* Parámetros de Auto-Trading cuando está activo */}
            {autoTradeEnabled && (
              <div className="mt-4 space-y-3.5 border-t border-zinc-800/80 pt-3.5 animate-in fade-in slide-in-from-top-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-2.5 text-[11px] text-emerald-300">
                  🛡️ <strong>Reglas del Plan Activas:</strong> El bot tomará señales institucionales hasta un máximo de{" "}
                  <strong>{maxDailyTrades} trades/día</strong>. Si se alcanza esa cuota o una pérdida de{" "}
                  <strong>${maxDailyLossUsd} USD</strong>, se detendrá inmediatamente para proteger tu capital.
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Loteaje Automático */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300">
                      Loteaje por Trade
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      min={0.01}
                      required
                      value={autoTradeLotSize}
                      onChange={(e) => setAutoTradeLotSize(parseFloat(e.target.value) || 0.01)}
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-[9px] text-zinc-500">Ej: 0.10, 0.20, 0.50</span>
                  </div>

                  {/* Objetivo TP */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300">
                      Objetivo de Salida (TP)
                    </label>
                    <div className="mt-1 flex gap-1 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setAutoTradeTargetTp("TP1")}
                        className={`flex-1 rounded-xl py-1.5 text-center font-bold transition-all ${
                          autoTradeTargetTp === "TP1"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        TP1 (1.8R)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoTradeTargetTp("TP2")}
                        className={`flex-1 rounded-xl py-1.5 text-center font-bold transition-all ${
                          autoTradeTargetTp === "TP2"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        TP2 (3.2R)
                      </button>
                    </div>
                  </div>

                  {/* Riesgo Máximo por Trade */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300">
                      Riesgo Máx / Trade ($)
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-500">
                        $
                      </span>
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={autoTradeMaxRiskUsd}
                        onChange={(e) => setAutoTradeMaxRiskUsd(parseFloat(e.target.value) || 10)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-1.5 pl-6 pr-3 font-mono text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[9px] text-zinc-500">Si el SL supera esto, no entra</span>
                  </div>
                </div>

                {/* Filtros avanzados de validación */}
                <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 hover:text-zinc-100">
                    <input
                      type="checkbox"
                      checked={autoTradeOnlyInZone}
                      onChange={(e) => setAutoTradeOnlyInZone(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>
                      🎯 <strong>Esperar zona de entrada:</strong> Solo ejecutar si el precio spot está dentro de la zona oficial
                    </span>
                  </label>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60">
                    <span className="text-zinc-400">
                      ⚡ <strong>Calidad de Estrategia:</strong> Win Rate mínimo
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={50}
                        max={95}
                        step={5}
                        value={autoTradeMinWinRate}
                        onChange={(e) => setAutoTradeMinWinRate(parseInt(e.target.value, 10) || 70)}
                        className="w-16 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-emerald-400 text-right focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="font-mono text-xs text-zinc-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
            <div>
              {isEditing && !initialBook?.isDefault && onDeleteJournal && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `¿Estás seguro de eliminar la bitácora "${initialBook?.name}"? Las operaciones no se borrarán y pasarán a la principal.`
                      )
                    ) {
                      onDeleteJournal(initialBook!.id);
                      onClose();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-900/40 hover:text-rose-200 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eliminar Bitácora</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="theme-accent-btn inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold shadow-md transition-all"
              >
                {isEditing ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Guardar Cambios</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Crear Bitácora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
