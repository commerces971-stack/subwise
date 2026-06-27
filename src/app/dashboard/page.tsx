import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SubscriptionList from "@/components/subscriptions/SubscriptionList";
import AddSubscriptionButton from "@/components/subscriptions/AddSubscriptionButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import AnalyticsSection from "@/components/analytics/AnalyticsSection";
import { computeAnalytics } from "@/lib/analytics";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { order?: string; paid?: string; cancelled?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const { order: orderId, paid, cancelled } = searchParams;

  const [subscriptions, notifications] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: session.user.id },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id, readAt: null },
      include: {
        subscription: {
          select: { name: true, renewalDate: true, amount: true, currency: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Cheapest alternative per category for potential-savings computation
  const activeCategories = Array.from(
    new Set(subscriptions.filter((s) => s.isActive).map((s) => s.category))
  );
  const cheapestAlts = await prisma.alternative.findMany({
    where: { category: { in: activeCategories }, isActive: true },
    orderBy: { price: "asc" },
    select: { category: true, price: true },
  });
  const cheapestByCategory: Record<string, number> = {};
  for (const alt of cheapestAlts) {
    if (!(alt.category in cheapestByCategory)) {
      cheapestByCategory[alt.category] = alt.price;
    }
  }

  const analyticsData = computeAnalytics(subscriptions, cheapestByCategory);

  // Serialize dates for client component props (RSC passes Date as ISO string, but explicit is safer)
  const serializedNotifications = notifications.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    subscription: {
      ...n.subscription,
      renewalDate: n.subscription.renewalDate.toISOString(),
    },
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Subwise</h1>
            <p className="text-sm text-gray-500">
              Bonjour, {session.user.name ?? session.user.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell initialNotifications={serializedNotifications} />
            <AddSubscriptionButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Order status banners */}
        {paid && orderId && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Paiement confirmé — lettre en cours d&apos;envoi</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Votre lettre recommandée sera expédiée sous 24 h ouvrées. Un email de confirmation avec la référence Maileva vous sera envoyé dès l&apos;envoi effectif.
              </p>
            </div>
          </div>
        )}
        {cancelled && orderId && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Paiement annulé</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Votre commande a été annulée. Aucun montant n&apos;a été débité. Vous pouvez relancer la démarche depuis le comparateur.
              </p>
            </div>
          </div>
        )}

        {/* Analytics — KPI cards + charts */}
        <AnalyticsSection data={analyticsData} />

        {/* Subscription list */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Mes abonnements</h2>
          <SubscriptionList subscriptions={subscriptions} />
        </section>
      </main>
    </div>
  );
}
