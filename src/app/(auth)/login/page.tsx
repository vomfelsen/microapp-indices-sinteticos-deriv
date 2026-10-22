"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    router.push("/feed");
    router.refresh();
  };

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-6 shadow-2xl">
        {/* Identidad */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 font-mono text-base font-black text-white shadow-md shadow-rose-500/20">
            DQ
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-zinc-100">
              SYNTHQUANT PRO
            </h1>
            <p className="text-xs text-zinc-400">
              Terminal B2C • Índices Sintéticos Deriv 24/7
            </p>
          </div>
        </div>

        {/* Botón Google SSO */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/feed" })}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"
              />
            </svg>
            Continuar con Google (SSO)
          </button>
        </div>

        <div className="my-4 flex items-center gap-3 text-[11px] text-zinc-500">
          <div className="h-px flex-1 bg-zinc-800" />
          <span>O CON TU CORREO</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Formulario tradicional */}
        <form onSubmit={handleCredentialsLogin} className="space-y-3.5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-zinc-400"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-zinc-400"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-950/50 px-3.5 py-2.5 text-xs text-rose-300 ring-1 ring-rose-800">
              {error}
            </div>
          )}

          {/* Botones de Auto-Llenado de Credenciales */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-zinc-500">Auto-llenar:</span>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@synthetics.pro");
                setPassword("Admin123!");
                setError(null);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono font-medium text-rose-400 hover:border-zinc-700 hover:text-rose-300"
            >
              🔑 Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("trader@synthetics.pro");
                setPassword("Password123!");
                setError(null);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
            >
              👤 Trader
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-rose-500 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition-opacity hover:opacity-95 shadow-md shadow-rose-500/20 disabled:opacity-50"
          >
            {loading ? "Verificando acceso..." : "Iniciar Sesión"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-zinc-400">
          ¿Aún no tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-semibold text-amber-400 hover:underline"
          >
            Crear cuenta gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
