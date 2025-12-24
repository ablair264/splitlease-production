import { db, leads, brokers } from "@/lib/db";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { LeadsList } from "@/components/leads/leads-list";

export default async function LeadsPage() {
  const session = await auth();
  
  // Get broker for current user
  const broker = await db.query.brokers.findFirst({
    where: eq(brokers.userId, session!.user!.id!),
  });

  if (!broker) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <h2 className="text-xl font-semibold mb-2">No broker account found</h2>
        <p className="text-muted-foreground">
          Please complete your setup in Settings.
        </p>
      </div>
    );
  }

  const allLeads = await db.query.leads.findMany({
    where: eq(leads.brokerId, broker.id),
    orderBy: [desc(leads.createdAt)],
  });

  const stats = {
    total: allLeads.length,
    new: allLeads.filter((l) => l.status === "new").length,
    hot: allLeads.filter((l) => (l.score || 0) >= 70).length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">
          {stats.new} new • {stats.hot} hot leads • {stats.total} total
        </p>
      </div>

      <LeadsList leads={allLeads} />
    </div>
  );
}
