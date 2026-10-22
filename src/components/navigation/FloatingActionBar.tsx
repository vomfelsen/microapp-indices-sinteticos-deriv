"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  useAppSettings,
  APP_THEMES,
} from "@/components/providers/SettingsProvider";
import { ProfileModal } from "@/components/profile/ProfileModal";
import {
  SlidersHorizontal,
  Palette,
  Layers,
  ChevronRight,
  ChevronLeft,
  User,
  LogOut,
  Shield,
  Activity,
  Check,
} from "lucide-react";

export function FloatingActionBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme, activeIndices, openSettings } = useAppSettings();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUserBubble, setShowUserBubble] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const bubbleRef = useRef<HTMLDivElement>(null);

  // Cerrar submenú al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        bubbleRef.current &&
        !bubbleRef.current.contains(event.target as Node)
      ) {
        setShowUserBubble(false);
        setShowThemePicker(false);
      }
    }
    if (showUserBubble || showThemePicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserBubble, showThemePicker]);

  // No mostrar en login o register
  if (!session?.user || pathname === "/login" || pathname === "/register") {
    return null;
  }

  const user = session.user;
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
  const currentThemeMeta =
    APP_THEMES.find((t) => t.id === theme) || APP_THEMES[0];

  return (
    <>
      <aside
        ref={bubbleRef}
        aria-label="Acciones y perfil flotante"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 select-none print:hidden"
      >
        {/* SUBMENÚ FLOTANTE TIPO BURBUJA DE USUARIO */}
        {showUserBubble && (
          <div className="absolute bottom-14 right-0 w-72 rounded-3xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-3 ring-1 ring-white/10">
            {/* Header de la Burbuja: Info de Usuario */}
            <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3.5">
              <div className="theme-accent-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-black text-white shadow-lg">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-xs font-bold text-zinc-100">
                    {user.name}
                  </h3>
                </div>
                <p className="truncate font-mono text-[10px] text-zinc-400">
                  {user.email}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="theme-accent-subtle rounded-md px-1.5 py-0.2 font-mono text-[9px] font-bold border">
                    {user.role === "ADMIN" ? "👑 Admin" : "⚡ Trader"}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
              </div>
            </div>

            {/* Opciones del Submenú */}
            <div className="mt-2 space-y-1">
              {/* Mi Perfil */}
              <button
                type="button"
                onClick={() => {
                  setShowUserBubble(false);
                  setIsProfileOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
              >
                <User className="h-4 w-4 text-zinc-400" />
                <span>Mi Perfil & Cuenta</span>
              </button>

              {/* Selector de Temas */}
              <button
                type="button"
                onClick={() => {
                  setShowUserBubble(false);
                  setShowThemePicker(true);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
              >
                <div className="flex items-center gap-2.5">
                  <Palette className="h-4 w-4 text-zinc-400" />
                  <span>Tema: {currentThemeMeta.name}</span>
                </div>
                <span
                  className="h-2.5 w-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: currentThemeMeta.primaryHex }}
                />
              </button>

              {/* Ajustes e Índices */}
              <button
                type="button"
                onClick={() => {
                  setShowUserBubble(false);
                  openSettings();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
              >
                <SlidersHorizontal className="h-4 w-4 text-zinc-400" />
                <span>Configurar Índices ({activeIndices.length})</span>
              </button>
            </div>

            {/* Divisor & Cerrar Sesión */}
            <div className="mt-2 border-t border-zinc-800/80 pt-2">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-950/40 hover:text-rose-300"
              >
                <LogOut className="h-4 w-4 text-rose-400" />
                <span>Cerrar Sesión</span>
              </button>
            </div>

            {/* Flechita / Indicador decorativo tipo burbuja apuntando abajo */}
            <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-r border-b border-zinc-800 bg-zinc-950" />
          </div>
        )}

        {/* SELECTOR RÁPIDO DE TEMAS FLOTANTE */}
        {showThemePicker && (
          <div className="absolute bottom-14 right-0 w-60 rounded-3xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 px-1 text-[11px] font-bold text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-zinc-300" />
                Temas de Color
              </span>
              <button
                type="button"
                onClick={() => setShowThemePicker(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {APP_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemePicker(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                    theme === t.id
                      ? "bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700"
                      : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: t.primaryHex }}
                    />
                    <span>{t.name}</span>
                  </div>
                  {theme === t.id && (
                    <Check className="h-3.5 w-3.5 theme-accent-text" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CÁPSULA FLOTANTE DOCK */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-zinc-800/90 bg-zinc-950/85 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 transition-all">
          {/* Botón de Colapsar / Expandir */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expandir barra de ajustes" : "Minimizar barra"}
            className="flex h-8 w-6 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-colors"
          >
            {isCollapsed ? (
              <ChevronLeft className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {!isCollapsed && (
            <>
              {/* Botón de Temas Rápido */}
              <button
                type="button"
                onClick={() => {
                  setShowThemePicker(!showThemePicker);
                  setShowUserBubble(false);
                }}
                title="Cambiar paleta cromática"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: currentThemeMeta.primaryHex }}
                />
                <span className="hidden sm:inline font-mono text-[11px] font-semibold text-zinc-200">
                  {currentThemeMeta.name}
                </span>
              </button>

              {/* Botón de Índices Activos */}
              <button
                type="button"
                onClick={openSettings}
                title="Configurar qué índices tener activos"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800"
              >
                <Layers className="h-3.5 w-3.5 text-zinc-400" />
                <span className="font-mono text-[11px] font-bold text-zinc-300">
                  {activeIndices.length} Índices
                </span>
              </button>

              {/* Botón de Ajustes Completos */}
              <button
                type="button"
                onClick={openSettings}
                title="Centro de Configuración"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </>
          )}

          {/* BOTÓN BURBUJA DE USUARIO (EL PROTAGONISTA) */}
          <button
            type="button"
            onClick={() => {
              setShowUserBubble(!showUserBubble);
              setShowThemePicker(false);
            }}
            title={`Perfil de ${user.name}`}
            className="group relative flex h-9 w-9 items-center justify-center rounded-xl transition-transform active:scale-95"
          >
            <div className="theme-accent-btn flex h-full w-full items-center justify-center rounded-xl font-bold text-xs text-white shadow-md">
              {initial}
            </div>
            {/* Punto indicador de sesión activa */}
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-pulse" />
          </button>
        </div>
      </aside>

      {/* Modal de Perfil Detallado */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
