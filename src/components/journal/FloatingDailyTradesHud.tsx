"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Target, GripVertical, Minimize2, Maximize2, X, AlertTriangle } from "lucide-react";

interface FloatingDailyTradesHudProps {
  journalName: string;
  todayTradesCount: number;
  maxDailyTrades: number;
  targetDailyTrades: number;
  isDailyLimitReached: boolean;
  dailyTradesPercent: number;
  isOpen: boolean;
  onClose: () => void;
}

export function FloatingDailyTradesHud({
  journalName,
  todayTradesCount,
  maxDailyTrades,
  targetDailyTrades,
  isDailyLimitReached,
  dailyTradesPercent,
  isOpen,
  onClose,
}: FloatingDailyTradesHudProps) {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hudRef = useRef<HTMLDivElement>(null);

  // Cargar posición guardada desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("synth_hud_position");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          // Asegurar que quede dentro de la pantalla
          const safeX = Math.max(10, Math.min(window.innerWidth - 260, parsed.x));
          const safeY = Math.max(10, Math.min(window.innerHeight - 100, parsed.y));
          setPosition({ x: safeX, y: safeY });
        }
      } else {
        // Posición inicial por defecto: margen superior derecho
        const initX = Math.max(10, window.innerWidth - 300);
        setPosition({ x: initX, y: 130 });
      }
    } catch {}
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Solo permitir arrastrar desde el área designada o el header
    if ((e.target as HTMLElement).closest("button")) return;

    if (!hudRef.current) return;
    const rect = hudRef.current.getBoundingClientRect();
    dragStartOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartOffset.current.x;
    const newY = e.clientY - dragStartOffset.current.y;

    const hudWidth = hudRef.current ? hudRef.current.offsetWidth : 240;
    const hudHeight = hudRef.current ? hudRef.current.offsetHeight : 80;

    const clampedX = Math.max(10, Math.min(window.innerWidth - hudWidth - 10, newX));
    const clampedY = Math.max(10, Math.min(window.innerHeight - hudHeight - 10, newY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    try {
      localStorage.setItem("synth_hud_position", JSON.stringify(position));
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      ref={hudRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-50 select-none shadow-2xl transition-shadow ${
        isDragging
          ? "cursor-grabbing shadow-[0_20px_50px_rgba(0,0,0,0.8)] scale-[1.02]"
          : "cursor-grab"
      }`}
    >
      <div className="rounded-2xl border border-zinc-700/80 bg-zinc-950/95 backdrop-blur-xl p-3 ring-1 ring-white/10 shadow-2xl">
        {/* Barra superior con Drag Handle y Botones */}
        <div className="flex items-center justify-between gap-3 text-xs mb-1.5 border-b border-zinc-800/80 pb-1.5">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <GripVertical className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 truncate max-w-[130px]">
              {journalName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              title={isMinimized ? "Expandir" : "Minimizar"}
            >
              {isMinimized ? (
                <Maximize2 className="h-3 w-3" />
              ) : (
                <Minimize2 className="h-3 w-3" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              title="Cerrar widget flotante"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex flex-col gap-1.5 min-w-[190px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Target
                className={`h-3.5 w-3.5 ${
                  isDailyLimitReached
                    ? "text-rose-400 animate-pulse"
                    : todayTradesCount >= targetDailyTrades
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              />
              <span className="text-zinc-300 font-medium text-[11px]">
                Entradas de Hoy:
              </span>
            </div>
            <span className="font-mono font-bold text-xs text-zinc-100">
              {todayTradesCount} / {maxDailyTrades} máx
            </span>
          </div>

          {!isMinimized && (
            <>
              {/* Barra de progreso visual */}
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900 border border-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isDailyLimitReached
                        ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                        : todayTradesCount >= targetDailyTrades
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    }`}
                    style={{ width: `${dailyTradesPercent}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                  {dailyTradesPercent}%
                </span>
              </div>

              {isDailyLimitReached && (
                <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>¡Límite alcanzado! Evita overtrading</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
