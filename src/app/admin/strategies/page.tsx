import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { AdminEngineClient } from "@/components/admin/AdminEngineClient";

export const dynamic = "force-dynamic";

export default async function AdminStrategiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/feed");
  }

  const strategies = await DataService.listStrategiesWithUserSubscription(
    session.user.id
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
          Motor Administrativo • /admin/strategies
        </span>
        <h1 className="text-base font-extrabold text-zinc-100">
          Gestión de Estrategias y Emisión de Señales
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          Crea nuevos perfiles de estrategias con su win-rate histórico o emite
          señales directamente al feed de los usuarios suscritos.
        </p>
      </div>

      <AdminEngineClient initialStrategies={strategies} />
    </div>
  );
}
