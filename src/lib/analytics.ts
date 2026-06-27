import type { Subscription } from "@prisma/client";

const CATEGORY_COLORS: Record<string, string> = {
  "téléphonie mobile":    "#3b82f6",
  "internet box":         "#06b6d4",
  "streaming":            "#8b5cf6",
  "assurance auto":       "#f97316",
  "assurance habitation": "#eab308",
  "mutuelle santé":       "#22c55e",
  "salle de sport":       "#ef4444",
};

export interface MonthlyPoint {
  month: string;
  total: number;
}

export interface CategorySlice {
  category: string;
  monthly: number;
  color: string;
}

export interface AnalyticsData {
  monthlyPoints: MonthlyPoint[];
  categorySlices: CategorySlice[];
  totalThisMonth: number;
  totalThisYear: number;
  potentialSavings: number;
  activeCount: number;
}

export function computeAnalytics(
  subscriptions: Subscription[],
  cheapestByCategory: Record<string, number>
): AnalyticsData {
  const active = subscriptions.filter((s) => s.isActive);
  const now = new Date();

  // ── 12-month evolution ─────────────────────────────────────────────
  const monthlyPoints: MonthlyPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d;
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const total = subscriptions
      .filter((s) => {
        const start = new Date(s.startDate);
        const renewal = new Date(s.renewalDate);
        // Active during this month = started before end AND (still active OR renewed after start)
        return start <= monthEnd && (s.isActive || renewal >= monthStart);
      })
      .reduce((sum, s) => sum + s.amount / s.durationMonths, 0);

    monthlyPoints.push({
      month: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      total: Math.round(total * 100) / 100,
    });
  }

  // ── Category slices ────────────────────────────────────────────────
  const categoryTotals: Record<string, number> = {};
  for (const s of active) {
    categoryTotals[s.category] = (categoryTotals[s.category] ?? 0) + s.amount / s.durationMonths;
  }
  const categorySlices: CategorySlice[] = Object.entries(categoryTotals)
    .map(([category, monthly]) => ({
      category,
      monthly: Math.round(monthly * 100) / 100,
      color: CATEGORY_COLORS[category] ?? "#6b7280",
    }))
    .sort((a, b) => b.monthly - a.monthly);

  // ── Totals ─────────────────────────────────────────────────────────
  const totalThisMonth = active.reduce((sum, s) => sum + s.amount / s.durationMonths, 0);
  const totalThisYear = totalThisMonth * 12;

  // ── Potential savings (vs cheapest alternative per category) ───────
  let potentialSavings = 0;
  for (const s of active) {
    const cheapestAltPrice = cheapestByCategory[s.category];
    if (cheapestAltPrice !== undefined) {
      const currentAnnual = (s.amount / s.durationMonths) * 12;
      const saving = currentAnnual - cheapestAltPrice;
      if (saving > 0) potentialSavings += saving;
    }
  }

  return {
    monthlyPoints,
    categorySlices,
    totalThisMonth: Math.round(totalThisMonth * 100) / 100,
    totalThisYear: Math.round(totalThisYear * 100) / 100,
    potentialSavings: Math.round(potentialSavings * 100) / 100,
    activeCount: active.length,
  };
}
