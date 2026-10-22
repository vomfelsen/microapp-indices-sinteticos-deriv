import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataService } from "@/lib/data-service";
import { fetchLiveMarketQuotes } from "@/lib/market-prices";
import { JournalDashboardClient } from "@/components/journal/JournalDashboardClient";

export const dynamic = "force-dynamic";

export default async function TradingJournalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.isActive) {
    redirect("/feed");
  }

  const [entries, liveQuotes] = await Promise.all([
    DataService.listUserJournal(session.user.id),
    fetchLiveMarketQuotes(),
  ]);

  return (
    <JournalDashboardClient
      initialEntries={entries}
      initialQuotes={liveQuotes}
    />
  );
}
