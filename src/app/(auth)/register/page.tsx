"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo completar el registro.");
      }

      // Iniciar sesión automáticamente tras el registro
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        router.push("/login");
        return;
      }

      router.push("/feed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-6 shadow-2xl">
        <h1 className="text-lg font-extrabold text-zinc-100">
          Crear Cuenta de Trader
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Recibe señales accionables en Índices Sintéticos de Deriv (Volatility, Boom, Crash, Step) y lleva tu bitácora.
        </p>

        <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-zinc-400"
            >
              Nombre o Alias
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Martín Gómez"
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

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
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-zinc-400"
            >
              Contraseña (mín. 6 caracteres)
            </label>
            <input
              id="password"
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-950/50 px-3.5 py-2.5 text-xs text-rose-300 ring-1 ring-rose-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Registrarme y Entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-amber-400 hover:underline"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
