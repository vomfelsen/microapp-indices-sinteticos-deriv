"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getDerivClient, type DerivAccountInfo } from "@/lib/deriv-ws";
import { User, Shield, KeyRound, Activity, X, CheckCircle2 } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { data: session } = useSession();
  const [derivAccount, setDerivAccount] = useState<DerivAccountInfo | null>(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const client = getDerivClient();
      setDerivAccount(client.getAccount());
      setHasToken(Boolean(client.getToken()));
    }
  }, [isOpen]);

  if (!isOpen || !session?.user) return null;

  const user = session.user;
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="theme-accent-btn flex h-11 w-11 items-center justify-center rounded-2xl text-base font-black text-white shadow-lg">
              {initial}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">{user.name}</h2>
              <p className="text-xs text-zinc-400 font-mono">{user.email}</p>
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

        {/* Detalles de la cuenta */}
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-400">
                <Shield className="h-3.5 w-3.5 text-zinc-400" />
                Rol de Usuario:
              </span>
              <span className="theme-accent-subtle rounded-lg px-2.5 py-0.5 font-mono text-[11px] font-bold border">
                {user.role === "ADMIN" ? "Super Admin" : "Trader Pro"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Estado de la Cuenta:
              </span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Activa & Verificada
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-400">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                ID de Usuario:
              </span>
              <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[160px]">
                {user.id}
              </span>
            </div>
          </div>

          {/* Estado de Integración con Deriv */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Activity className="h-3.5 w-3.5 text-rose-400" />
                Terminal Deriv WebSocket
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                  derivAccount
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                }`}
              >
                {derivAccount ? "VINCULADO" : "MODO PÚBLICO"}
              </span>
            </div>

            {derivAccount ? (
              <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Cuenta:</span>
                  <span className="font-mono font-semibold text-zinc-200">
                    {derivAccount.loginid} ({derivAccount.isVirtual ? "Demo" : "Real"})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Balance Deriv:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${derivAccount.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {derivAccount.currency}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400 pt-1">
                Conectado recibiendo ticks en vivo. Puedes ingresar tu API Token desde el botón de Deriv en la barra superior o en ajustes.
              </p>
            )}
          </div>
        </div>

        {/* Pie */}
        <div className="mt-6 flex justify-end border-t border-zinc-800/80 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="theme-accent-btn rounded-xl px-5 py-2 text-xs font-bold shadow-md"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
