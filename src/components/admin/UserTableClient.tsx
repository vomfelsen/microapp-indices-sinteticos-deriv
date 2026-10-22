"use client";

import React, { useState } from "react";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  createdAt: string;
}

export function UserTableClient({
  initialUsers,
  currentAdminId,
}: {
  initialUsers: AdminUserRow[];
  currentAdminId: string;
}) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estado para formulario de creación de usuario
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"USER" | "ADMIN">("USER");
  const [creating, setCreating] = useState(false);

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setCreating(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear usuario.");
      }

      setUsers((prev) => [data, ...prev]);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("USER");
      setShowAddForm(false);
      setSuccessMsg(`Usuario ${data.email} creado correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (user: AdminUserRow) => {
    setError(null);
    setSuccessMsg(null);
    setTogglingId(user.id);
    const nextState = !user.isActive;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar acceso.");
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: data.isActive } : u
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra de acción para añadir nuevo usuario */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950 px-4 py-3">
        <div>
          <p className="text-xs font-bold text-zinc-200">
            Alta Manual de Usuarios
          </p>
          <p className="text-[11px] text-zinc-400">
            Registra nuevos traders o administradores directamente con su clave
            de acceso.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setError(null);
            setSuccessMsg(null);
          }}
          className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-amber-300"
        >
          {showAddForm ? "Cancelar" : "+ Añadir Usuario"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateUser}
          className="rounded-2xl border border-amber-400/30 bg-zinc-950 p-4 shadow-xl"
        >
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
            Nuevo Usuario / Trader
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400">
                Nombre completo o Alias
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Laura Restrepo"
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="usuario@correo.com"
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400">
                Contraseña inicial (mín. 6 caracteres)
              </label>
              <input
                type="password"
                minLength={6}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400">
                Rol en la plataforma
              </label>
              <select
                value={newRole}
                onChange={(e) =>
                  setNewRole(e.target.value === "ADMIN" ? "ADMIN" : "USER")
                }
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
              >
                <option value="USER">USER (Trader / Suscriptor)</option>
                <option value="ADMIN">ADMIN (Administrador)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
            >
              {creating ? "Guardando..." : "Guardar Usuario"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-xl bg-rose-950/60 px-4 py-2.5 text-xs text-rose-300 ring-1 ring-rose-800">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-emerald-950/60 px-4 py-2.5 text-xs text-emerald-300 ring-1 ring-emerald-800">
          {successMsg}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-800/90 bg-zinc-950 custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-800/80 bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-4 py-3">Usuario / Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Fecha Registro</th>
              <th className="px-4 py-3 text-right">Acceso (Toggle)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {users.map((user) => {
              const isSelf = user.id === currentAdminId;
              const isBusy = togglingId === user.id;

              return (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-zinc-900/40"
                >
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-zinc-100">
                      {user.name}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-400">
                      {user.email}
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                        user.role === "ADMIN"
                          ? "bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30"
                          : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2.5">
                      <span
                        className={`text-[11px] font-semibold ${
                          user.isActive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {user.isActive ? "Activo" : "Inactivo"}
                      </span>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={user.isActive}
                        aria-label={`Cambiar acceso para ${user.email}`}
                        disabled={isBusy || isSelf}
                        onClick={() => handleToggle(user)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          user.isActive ? "bg-emerald-500" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            user.isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
