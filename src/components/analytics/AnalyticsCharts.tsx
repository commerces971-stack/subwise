"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { MonthlyPoint, CategorySlice } from "@/lib/analytics";

interface Props {
  monthlyPoints: MonthlyPoint[];
  categorySlices: CategorySlice[];
}

interface TooltipEntry {
  value?: number;
  name?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function AreaTooltipContent({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className="font-semibold text-indigo-600">{payload[0].value?.toFixed(2)} €</p>
    </div>
  );
}

function PieTooltipContent({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-900 capitalize">{item.name}</p>
      <p className="text-gray-600">{item.value?.toFixed(2)} €/mois</p>
    </div>
  );
}

export default function AnalyticsCharts({ monthlyPoints, categorySlices }: Props) {
  const hasData = monthlyPoints.some((p) => p.total > 0);

  const pieData = categorySlices.map((s) => ({
    name: s.category,
    value: s.monthly,
    color: s.color,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Area chart — 12-month evolution */}
      <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-4">
          Évolution des dépenses — 12 mois
        </p>
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyPoints} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v} €`}
              />
              <Tooltip content={<AreaTooltipContent />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#spendGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#6366f1" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-sm">Ajoutez des abonnements pour voir l&apos;évolution</p>
          </div>
        )}
      </div>

      {/* Pie chart — by category */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-4">Répartition par catégorie</p>
        {categorySlices.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom legend */}
            <div className="mt-3 space-y-1.5">
              {categorySlices.map((s) => (
                <div key={s.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-gray-600 truncate capitalize">{s.category}</span>
                  </div>
                  <span className="font-medium text-gray-900 ml-2 whitespace-nowrap">
                    {s.monthly.toFixed(2)} €/mois
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[150px] flex flex-col items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <p className="text-sm">Aucune donnée à afficher</p>
          </div>
        )}
      </div>
    </div>
  );
}
