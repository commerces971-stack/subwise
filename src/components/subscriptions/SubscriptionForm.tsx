"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import {
  MOBILE_OPTIONS,
  INTERNET_OPTIONS,
  INTERNET_SPEEDS,
  DEFAULT_MOBILE_META,
  DEFAULT_INTERNET_META,
  type MobilePlanMeta,
  type InternetPlanMeta,
} from "@/lib/planMeta";
import type { Subscription } from "@prisma/client";

function toDateInput(d: Date | string): string {
  return new Date(d).toISOString().split("T")[0];
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function toggleOption(options: string[], value: string): string[] {
  return options.includes(value)
    ? options.filter((o) => o !== value)
    : [...options, value];
}

interface Props {
  subscription?: Subscription;
  onSuccess: () => void;
}

export default function SubscriptionForm({ subscription, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = Boolean(subscription);

  // ── Core fields ────────────────────────────────────────────────────────────
  const [name, setName] = useState(subscription?.name ?? "");
  const [category, setCategory] = useState(subscription?.category ?? CATEGORIES[0]);
  const [amount, setAmount] = useState(subscription?.amount?.toString() ?? "");
  const [durationMonths, setDurationMonths] = useState(subscription?.durationMonths?.toString() ?? "12");
  const [startDate, setStartDate] = useState(subscription ? toDateInput(subscription.startDate) : "");
  const [renewalDate, setRenewalDate] = useState(subscription ? toDateInput(subscription.renewalDate) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Mobile plan meta ───────────────────────────────────────────────────────
  const [mobileMeta, setMobileMeta] = useState<MobilePlanMeta>(() => {
    if (subscription?.category === "téléphonie mobile" && subscription.planMeta) {
      const m = subscription.planMeta as unknown as MobilePlanMeta;
      return {
        dataGb: m.dataGb ?? DEFAULT_MOBILE_META.dataGb,
        unlimitedData: m.unlimitedData ?? false,
        unlimitedCalls: m.unlimitedCalls ?? true,
        unlimitedSms: m.unlimitedSms ?? true,
        options: Array.isArray(m.options) ? m.options : [],
      };
    }
    return { ...DEFAULT_MOBILE_META };
  });

  // ── Internet plan meta ─────────────────────────────────────────────────────
  const [internetMeta, setInternetMeta] = useState<InternetPlanMeta>(() => {
    if (subscription?.category === "internet box" && subscription.planMeta) {
      const m = subscription.planMeta as unknown as InternetPlanMeta;
      return {
        downloadSpeedMbps: m.downloadSpeedMbps ?? DEFAULT_INTERNET_META.downloadSpeedMbps,
        tvIncluded: m.tvIncluded ?? true,
        options: Array.isArray(m.options) ? m.options : [],
      };
    }
    return { ...DEFAULT_INTERNET_META };
  });

  useEffect(() => {
    if (startDate && durationMonths && parseInt(durationMonths) > 0) {
      setRenewalDate(addMonths(startDate, parseInt(durationMonths)));
    }
  }, [startDate, durationMonths]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Build planMeta only for telecom categories
    let planMeta: MobilePlanMeta | InternetPlanMeta | null = null;
    if (category === "téléphonie mobile") {
      planMeta = {
        ...mobileMeta,
        dataGb: mobileMeta.unlimitedData ? null : mobileMeta.dataGb,
      };
    } else if (category === "internet box") {
      planMeta = { ...internetMeta };
    }

    const payload = { name, category, amount, durationMonths, startDate, renewalDate, planMeta };
    const url = isEdit ? `/api/subscriptions/${subscription!.id}` : "/api/subscriptions";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur inattendue");
        return;
      }
      router.refresh();
      onSuccess();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;abonnement</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Netflix, SFR, Macif…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
        <select
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€/an)</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="99.99"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Durée (mois)</label>
          <input
            type="number"
            required
            min="1"
            max="24"
            value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de renouvellement</label>
          <input
            type="date"
            required
            value={renewalDate}
            onChange={(e) => setRenewalDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ── Champs téléphonie mobile ── */}
      {category === "téléphonie mobile" && (
        <div className="border border-blue-100 rounded-lg p-4 space-y-4 bg-blue-50/40">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Caractéristiques du forfait
          </p>

          {/* Data */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Volume de données</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mobileMeta.unlimitedData}
                onChange={(e) =>
                  setMobileMeta((m) => ({ ...m, unlimitedData: e.target.checked }))
                }
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Données illimitées</span>
            </label>
            {!mobileMeta.unlimitedData && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={mobileMeta.dataGb ?? ""}
                  onChange={(e) =>
                    setMobileMeta((m) => ({ ...m, dataGb: parseInt(e.target.value) || 1 }))
                  }
                  className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-500">Go</span>
              </div>
            )}
          </div>

          {/* Calls + SMS */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Inclus dans le forfait</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mobileMeta.unlimitedCalls}
                onChange={(e) =>
                  setMobileMeta((m) => ({ ...m, unlimitedCalls: e.target.checked }))
                }
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Appels illimités</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mobileMeta.unlimitedSms}
                onChange={(e) =>
                  setMobileMeta((m) => ({ ...m, unlimitedSms: e.target.checked }))
                }
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">SMS/MMS illimités</span>
            </label>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Options incluses</label>
            {MOBILE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobileMeta.options.includes(opt.value)}
                  onChange={() =>
                    setMobileMeta((m) => ({ ...m, options: toggleOption(m.options, opt.value) }))
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Champs internet box ── */}
      {category === "internet box" && (
        <div className="border border-cyan-100 rounded-lg p-4 space-y-4 bg-cyan-50/40">
          <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">
            Caractéristiques de la box
          </p>

          {/* Speed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Débit descendant
            </label>
            <select
              value={internetMeta.downloadSpeedMbps}
              onChange={(e) =>
                setInternetMeta((m) => ({ ...m, downloadSpeedMbps: parseInt(e.target.value) }))
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {INTERNET_SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s >= 1000 ? `${s / 1000} Gb/s` : `${s} Mb/s`}
                </option>
              ))}
            </select>
          </div>

          {/* TV */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Inclus dans l&apos;offre</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={internetMeta.tvIncluded}
                onChange={(e) =>
                  setInternetMeta((m) => ({ ...m, tvIncluded: e.target.checked }))
                }
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">TV incluse</span>
            </label>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Options incluses</label>
            {INTERNET_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={internetMeta.options.includes(opt.value)}
                  onChange={() =>
                    setInternetMeta((m) => ({ ...m, options: toggleOption(m.options, opt.value) }))
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white rounded-md py-2 px-4 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Ajouter l'abonnement"}
      </button>
    </form>
  );
}
