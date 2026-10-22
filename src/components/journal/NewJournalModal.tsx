"use client";

import React, { useEffect, useState } from "react";
import type { JournalBook, JournalColor } from "./types";
import { BookOpen, X, Shield, Target, Plus, Check, Trash2, Edit3 } from "lucide-react";

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

  useEffect(() => {
    if (initialBook) {
      setName(initialBook.name);
      setDescription(initialBook.description || "");
      setMaxDailyTrades(initialBook.maxDailyTrades || 3);
      setTargetDailyTrades(initialBook.targetDailyTrades || 2);
      setMaxDailyLossUsd(initialBook.maxDailyLossUsd || 150);
      setColor(initialBook.color || "amber");
    } else {
      setName("");
      setDescription("");
      setMaxDailyTrades(3);
      setTargetDailyTrades(2);
      setMaxDailyLossUsd(150);
      setColor("amber");
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
