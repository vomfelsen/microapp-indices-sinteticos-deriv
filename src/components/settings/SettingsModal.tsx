"use client";

import React, { useState, useMemo } from "react";
import {
  useAppSettings,
  APP_THEMES,
  ALL_DERIV_INDICES,
  type AppThemeId,
  type IndexCategory,
} from "@/components/providers/SettingsProvider";
import {
  SlidersHorizontal,
  Palette,
  Layers,
  Check,
  RotateCcw,
  X,
  Sparkles,
  Search,
  CheckCheck,
  Zap,
} from "lucide-react";

type FilterTab = "all" | IndexCategory;

const CATEGORY_LABELS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "volatility", label: "Volatility" },
  { id: "volatility_1s", label: "1s Series" },
  { id: "boom_crash", label: "Boom & Crash" },
  { id: "step", label: "Step Index" },
  { id: "jump", label: "Jump Index" },
  { id: "range_break", label: "Range Break" },
];

export function SettingsModal() {
  const {
    theme,
    setTheme,
    activeIndices,
    toggleIndex,
    setActiveIndices,
    isSettingsOpen,
    closeSettings,
  } = useAppSettings();

  const [activeTab, setActiveTab] = useState<"theme" | "indices">("theme");
  const [selectedCategory, setSelectedCategory] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredIndices = useMemo(() => {
    return ALL_DERIV_INDICES.filter((idx) => {
      const matchesCategory =
        selectedCategory === "all" || idx.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        idx.displayName.toLowerCase().includes(q) ||
        idx.tag.toLowerCase().includes(q) ||
        idx.symbolCode.toLowerCase().includes(q) ||
        idx.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isSettingsOpen) return null;

  const handleSelectAllIndices = () => {
    setActiveIndices(ALL_DERIV_INDICES.map((i) => i.displayName));
  };

  const handleClearAllIndices = () => {
    setActiveIndices([]);
  };

  const handleSelectFiltered = () => {
    const namesToAdd = filteredIndices.map((i) => i.displayName);
    const set = new Set([...activeIndices, ...namesToAdd]);
    setActiveIndices(Array.from(set));
  };

  const handleResetIndices = () => {
    setActiveIndices([
      "Volatility 75",
      "Volatility 75 (1s)",
      "Boom 1000",
      "Crash 1000",
      "Step Index",
      "Step Index 100",
      "Volatility 100",
      "Jump 75",
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="theme-accent-btn flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-md">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Configuración Global del Terminal
              </h2>
              <p className="text-[11px] text-zinc-400">
                Personaliza temas de color e índices sintéticos activos (28 disponibles)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSettings}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selector de Pestañas */}
        <div className="mt-4 flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("theme")}
            className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === "theme"
                ? "theme-accent-btn"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Tema ({APP_THEMES.find((t) => t.id === theme)?.name})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("indices")}
            className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === "indices"
                ? "theme-accent-btn"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>
              Índices Activos ({activeIndices.length}/{ALL_DERIV_INDICES.length})
            </span>
          </button>
        </div>

        {/* Contenido Pestaña 1: Temas */}
        {activeTab === "theme" && (
          <div className="mt-4 space-y-2.5">
            <p className="text-xs text-zinc-400">
              Selecciona la paleta cromática global. Se aplica en tiempo real para
              botones, indicadores de liquidez, badges y acentos:
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {APP_THEMES.map((item) => {
                const isSelected = theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-zinc-500 bg-zinc-900/90 shadow-md ring-1 ring-zinc-500"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                    }`}
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm"
                      style={{ backgroundColor: item.primaryHex }}
                    >
                      {isSelected && (
                        <Check className="h-4 w-4 stroke-[3] text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-100">
                          {item.name}
                        </span>
                        <div className="flex gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.primaryHex }}
                          />
                          <span
                            className="h-2 w-2 rounded-full opacity-60"
                            style={{ backgroundColor: item.secondaryHex }}
                          />
                        </div>
                      </div>
                      <p className="mt-0.5 text-[10px] text-zinc-400 leading-tight">
                        {item.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Contenido Pestaña 2: Índices Activos */}
        {activeTab === "indices" && (
          <div className="mt-3.5 space-y-2.5">
            {/* Buscador y Quick Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar índice (ej: 1s, Step, Jump, B300)..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-1.5 pl-8 pr-7 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Botones de acción rápida */}
              <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAllIndices}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
                >
                  Activar Todos
                </button>
                <button
                  type="button"
                  onClick={handleResetIndices}
                  className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  title="Restablecer los 8 principales"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Por defecto
                </button>
                <button
                  type="button"
                  onClick={handleClearAllIndices}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-2 py-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Categorías / Tabs horizontales */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {CATEGORY_LABELS.map((cat) => {
                const count =
                  cat.id === "all"
                    ? ALL_DERIV_INDICES.length
                    : ALL_DERIV_INDICES.filter((i) => i.category === cat.id)
                        .length;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                      isSelected
                        ? "theme-accent-btn text-white shadow-sm"
                        : "border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Lista con Scroll */}
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1.5 custom-scrollbar">
              {filteredIndices.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-zinc-500">
                    No se encontraron índices con &quot;{searchQuery}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="mt-2 text-[11px] text-zinc-400 underline hover:text-zinc-200"
                  >
                    Restablecer filtros
                  </button>
                </div>
              ) : (
                filteredIndices.map((idx) => {
                  const isActive = activeIndices.includes(idx.displayName);
                  const is1s = idx.category === "volatility_1s";
                  const isBoom = idx.displayName.includes("Boom");
                  const isCrash = idx.displayName.includes("Crash");
                  const isStep = idx.category === "step";
                  const isJump = idx.category === "jump";
                  const isRange = idx.category === "range_break";

                  return (
                    <div
                      key={idx.symbolCode}
                      onClick={() => toggleIndex(idx.displayName)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all ${
                        isActive
                          ? "border-zinc-700 bg-zinc-900/85 hover:border-zinc-600"
                          : "border-zinc-850 bg-zinc-950/40 opacity-55 hover:opacity-85"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isActive
                              ? "theme-accent-btn border-transparent"
                              : "border-zinc-700 bg-zinc-800"
                          }`}
                        >
                          {isActive && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-100">
                              {idx.displayName}
                            </span>
                            <span className="rounded bg-zinc-800 px-1.5 py-0.2 font-mono text-[9px] font-bold text-zinc-300">
                              {idx.tag}
                            </span>
                            {is1s && (
                              <span className="rounded bg-cyan-950/70 border border-cyan-800/40 px-1.5 py-0.2 font-mono text-[8.5px] font-semibold text-cyan-300">
                                1s Tick
                              </span>
                            )}
                            {(isBoom || isCrash) && (
                              <span
                                className={`rounded px-1.5 py-0.2 font-mono text-[8.5px] font-semibold ${
                                  isBoom
                                    ? "bg-emerald-950/70 border border-emerald-800/40 text-emerald-300"
                                    : "bg-rose-950/70 border border-rose-800/40 text-rose-300"
                                }`}
                              >
                                {isBoom ? "Spike ▲" : "Spike ▼"}
                              </span>
                            )}
                            {isStep && (
                              <span className="rounded bg-purple-950/70 border border-purple-800/40 px-1.5 py-0.2 font-mono text-[8.5px] font-semibold text-purple-300">
                                Paso 0.1
                              </span>
                            )}
                            {isJump && (
                              <span className="rounded bg-amber-950/70 border border-amber-800/40 px-1.5 py-0.2 font-mono text-[8.5px] font-semibold text-amber-300">
                                Salto 20m
                              </span>
                            )}
                            {isRange && (
                              <span className="rounded bg-indigo-950/70 border border-indigo-800/40 px-1.5 py-0.2 font-mono text-[8.5px] font-semibold text-indigo-300">
                                Ruptura
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[10px] text-zinc-400">
                            {idx.description}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 ml-2 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                          isActive
                            ? "theme-accent-subtle"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {isActive ? "ACTIVO" : "OCULTO"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
              <span>
                Mostrando {filteredIndices.length} de {ALL_DERIV_INDICES.length} índices sintéticos
              </span>
              <span>* Los índices activos se sincronizan en vivo en el terminal</span>
            </div>
          </div>
        )}

        {/* Pie de modal */}
        <div className="mt-5 flex justify-end border-t border-zinc-800 pt-3">
          <button
            type="button"
            onClick={closeSettings}
            className="theme-accent-btn rounded-xl px-4 py-2 text-xs font-bold shadow-md"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

