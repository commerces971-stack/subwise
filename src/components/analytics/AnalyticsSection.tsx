import dynamic from "next/dynamic";
import type { AnalyticsData } from "@/lib/analytics";

const AnalyticsCharts = dynamic(() => import("./AnalyticsCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 h-[280px] animate-pulse shadow-sm" />
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 h-[280px] animate-pulse shadow-sm" />
    </div>
  ),
});

function fmt(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "indigo" | "gray";
}

function KpiCard({ label, value, sub, accent = "gray" }: KpiCardProps) {
  const valueColor =
    accent === "green"
      ? "text-emerald-600"
      : accent === "indigo"
      ? "text-indigo-600"
      : "text-gray-900";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsSection({ data }: { data: AnalyticsData }) {
  const { totalThisMonth, totalThisYear, potentialSavings, activeCount, monthlyPoints, categorySlices } = data;

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-gray-700">Vue d&apos;ensemble</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Ce mois"
          value={fmt(totalThisMonth)}
          sub="dépenses mensuelles"
          accent="indigo"
        />
        <KpiCard
          label="Cette année"
          value={fmt(totalThisYear)}
          sub="projection annuelle"
        />
        <KpiCard
          label="Abonnements actifs"
          value={String(activeCount)}
          sub={activeCount === 1 ? "abonnement" : "abonnements"}
        />
        <KpiCard
          label="Économies potentielles"
          value={potentialSavings > 0 ? fmt(potentialSavings) : "—"}
          sub={potentialSavings > 0 ? "possibles sur un an" : "aucune trouvée"}
          accent={potentialSavings > 0 ? "green" : "gray"}
        />
      </div>

      {/* Charts */}
      <AnalyticsCharts monthlyPoints={monthlyPoints} categorySlices={categorySlices} />
    </section>
  );
}
