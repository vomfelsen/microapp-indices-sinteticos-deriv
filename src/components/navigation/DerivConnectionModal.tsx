"use client";

import React, { useEffect, useState } from "react";
import {
  getDerivClient,
  type DerivAccountInfo,
  type DerivConnectionStatus,
} from "@/lib/deriv-ws";

export function DerivConnectionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<DerivConnectionStatus>("disconnected");
  const [account, setAccount] = useState<DerivAccountInfo | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [appIdInput, setAppIdInput] = useState("1089");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const client = getDerivClient();
    setTokenInput(client.getToken());
    setAppIdInput(client.getAppId());

    const unsub = client.subscribeStatus((newStatus, newAccount) => {
      setStatus(newStatus);
      setAccount(newAccount);
    });

    // Auto-conectar al cargar la app si hay token o al menos para ticks públicos
    client.connect();

    return unsub;
  }, []);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const client = getDerivClient();
    client.connect(appIdInput, tokenInput);
    setIsOpen(false);
  };

  const handleDisconnect = () => {
    const client = getDerivClient();
    client.disconnect();
    setIsOpen(false);
  };

  return (
    <>
      {/* Botón / Pill de Estado en la Barra de Navegación */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-xs transition-colors hover:border-zinc-700 hover:bg-zinc-800"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            status === "authorized"
              ? "bg-emerald-400 animate-pulse"
              : status === "connected_live"
              ? "bg-emerald-400"
              : status === "sim_fallback"
              ? "bg-amber-400 animate-pulse"
              : status === "connecting"
              ? "bg-sky-400 animate-spin"
              : "bg-zinc-600"
          }`}
        />
        {status === "authorized" && account ? (
          <span className="font-mono text-[11px] font-semibold text-emerald-300">
            {account.isVirtual ? "Demo" : "Real"}: ${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {account.currency}
          </span>
        ) : status === "connected_live" ? (
          <span className="font-mono text-[11px] font-medium text-emerald-300">
            Deriv WS Live
          </span>
        ) : status === "sim_fallback" ? (
          <span className="font-mono text-[11px] font-medium text-amber-300">
            Deriv Ticks 24/7
          </span>
        ) : status === "connecting" ? (
          <span className="text-[11px] text-zinc-400">Conectando Deriv...</span>
        ) : (
          <span className="text-[11px] text-zinc-400">Conectar Deriv API</span>
        )}
      </button>

      {/* Modal de Conexión y Token */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 font-mono text-xs font-black text-white">
                  WS
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    Conexión WebSocket Deriv
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    API v3 • Ticks & Ejecución en Tiempo Real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Estado actual */}
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Estado:</span>
                <span className="font-mono font-bold">
                  {status === "authorized" && (
                    <span className="text-emerald-400">🟢 Autorizado con Token Oficial</span>
                  )}
                  {status === "connected_live" && (
                    <span className="text-emerald-400">🟢 Conectado a WebSocket Deriv (Público)</span>
                  )}
                  {status === "sim_fallback" && (
                    <span className="text-amber-400">🟡 Motor Cuántico Activo (Ticks 24/7 de Respaldo)</span>
                  )}
                  {status === "connecting" && (
                    <span className="text-sky-400">🔄 Conectando a Deriv...</span>
                  )}
                  {status === "disconnected" && (
                    <span className="text-zinc-500">⚪ Desconectado</span>
                  )}
                </span>
              </div>

              {account && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-800 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block">Cuenta:</span>
                    <span className="font-mono font-semibold text-zinc-200">
                      {account.loginid} ({account.isVirtual ? "Virtual / Demo" : "Real"})
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Balance en Vivo:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ${account.balance.toFixed(2)} {account.currency}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Formulario de Token */}
            <form onSubmit={handleConnect} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Deriv API Token
                </label>
                <div className="relative mt-1">
                  <input
                    type={showToken ? "text" : "password"}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Pega aquí tu API Token de Deriv"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 pr-10 font-mono text-xs text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    {showToken ? "Ocultar" : "Ver"}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Obtén tu token con permisos de lectura/operación en{" "}
                  <a
                    href="https://app.deriv.com/account/api-token"
                    target="_blank"
                    rel="noreferrer"
                    className="text-rose-400 hover:underline"
                  >
                    app.deriv.com/account/api-token
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  App ID (Opcional)
                </label>
                <input
                  type="text"
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  placeholder="1089"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-md shadow-rose-500/20"
                >
                  Conectar a Deriv en Vivo
                </button>
                {status !== "disconnected" && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    Desconectar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
