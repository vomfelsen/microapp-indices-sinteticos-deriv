import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { UserTableClient } from "@/components/admin/UserTableClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  // Protección de ruta exclusiva para rol ADMIN
  if (session.user.role !== "ADMIN") {
    redirect("/feed");
  }

  const users = await DataService.listAllUsers();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950 p-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Dashboard Administrativo • /admin/users
          </span>
          <h1 className="text-base font-extrabold text-zinc-100">
            Control de Acceso y Usuarios Registrados
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Activa o desactiva el acceso de cualquier trader en tiempo real con
            el interruptor.
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-300 ring-1 ring-zinc-800">
          Total:{" "}
          <strong className="text-amber-400">{users.length}</strong> usuarios
        </div>
      </div>

      <UserTableClient
        initialUsers={users}
        currentAdminId={session.user.id}
      />
    </div>
  );
}
