import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { StrategyListClient } from "@/components/strategies/StrategyListClient";

export const dynamic = "force-dynamic";

export default async function StrategiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isActive) {
    redirect("/feed");
  }

  const strategies = await DataService.listStrategiesWithUserSubscription(
    session.user.id
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-4">
        <h1 className="text-base font-extrabold text-zinc-100">
          Catálogo de Estrategias Institucionales
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Selecciona las estrategias que deseas seguir. Tu Feed Principal solo
          mostrará las señales de las estrategias activadas aquí.
        </p>
      </div>

      <StrategyListClient initialStrategies={strategies} />
    </div>
  );
}
