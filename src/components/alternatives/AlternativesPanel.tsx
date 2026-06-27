"use client";

import { useEffect, useRef, useState } from "react";
import type { Subscription } from "@prisma/client";
import {
  isMobileMeta,
  isInternetMeta,
  meetsRequirements,
  MOBILE_OPTIONS,
  INTERNET_OPTIONS,
  type PlanMeta,
} from "@/lib/planMeta";
import TransitionFlow from "@/components/transition/TransitionFlow";

interface Alternative {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string | null;
  affiliateUrl: string | null;
  planMeta: unknown;
}

interface Props {
  subscription: Subscription | null;
  onClose: () => void;
}

function fmt(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

export default function AlternativesPanel({ subscription, onClose }: Props) {
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [transitionAlt, setTransitionAlt] = useState<Alternative | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const subscriptionId = subscription?.id;
  const category = subscription?.category;

  useEffect(() => {
    if (!subscriptionId || !category) return;
    setLoading(true);
    setAlternatives([]);
    setShowAll(false);
    fetch(`/api/alternatives?category=${encodeURIComponent(category)}`)
      .then((r) => r.json())
      .then((data) => setAlternatives(data.alternatives ?? []))
      .finally(() => setLoading(false));
  }, [subscriptionId, category]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!subscription) return null;

  const currentMonthly = subscription.amount / subscription.durationMonths;
  const currentAnnual = currentMonthly * 12;

  // Parse subscription planMeta
  const subMeta = subscription.planMeta as unknown as PlanMeta | null | undefined;
  const hasMeta = subMeta && (isMobileMeta(subMeta) || isInternetMeta(subMeta));

  // Filter alternatives: keep only those meeting or exceeding subscription's requirements
  const compatible = hasMeta
    ? alternatives.filter((alt) => meetsRequirements(subMeta, alt.planMeta))
    : alternatives;

  const displayed = showAll ? alternatives : compatible;
  const filteredCount = alternatives.length - compatible.length;
  const cheapest = displayed[0];

  // Build a human-readable summary of the active filter
  function metaSummary(): string {
    if (!subMeta) return "";
    if (isMobileMeta(subMeta)) {
      const parts: string[] = [];
      if (subMeta.unlimitedData) parts.push("données illimitées");
      else if (subMeta.dataGb) parts.push(`≥ ${subMeta.dataGb} Go`);
      if (subMeta.unlimitedCalls) parts.push("appels illimités");
      if (subMeta.unlimitedSms) parts.push("SMS illimités");
      subMeta.options.forEach((o) => {
        const found = MOBILE_OPTIONS.find((opt) => opt.value === o);
        if (found) parts.push(found.label.toLowerCase());
      });
      return parts.join(" · ");
    }
    if (isInternetMeta(subMeta)) {
      const parts: string[] = [];
      const mbps = subMeta.downloadSpeedMbps;
      parts.push(`≥ ${mbps >= 1000 ? `${mbps / 1000} Gb/s` : `${mbps} Mb/s`}`);
      if (subMeta.tvIncluded) parts.push("TV incluse");
      subMeta.options.forEach((o) => {
        const found = INTERNET_OPTIONS.find((opt) => opt.value === o);
        if (found) parts.push(found.label);
      });
      return parts.join(" · ");
    }
    return "";
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative flex flex-col w-full max-w-md bg-white h-full shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-100 px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Alternatives disponibles</h2>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{subscription.category}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current subscription card */}
        <div className="flex-shrink-0 mx-5 mt-4 mb-2 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Vous payez actuellement
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="font-semibold text-gray-900">{subscription.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fmt(currentMonthly, subscription.currency)}/mois
                {subscription.durationMonths !== 12 && (
                  <> · engagement {subscription.durationMonths} mois</>
                )}
              </p>
              {/* Active filter summary */}
              {hasMeta && (
                <p className="text-xs text-indigo-500 mt-1 leading-relaxed">{metaSummary()}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">
                {fmt(currentAnnual, subscription.currency)}
              </p>
              <p className="text-[10px] text-gray-400">par an</p>
            </div>
          </div>
        </div>

        {/* No meta hint */}
        {!hasMeta && (category === "téléphonie mobile" || category === "internet box") && !loading && (
          <div className="flex-shrink-0 mx-5 mb-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-700">
              Renseignez les caractéristiques de votre forfait lors de la modification pour ne voir que les offres compatibles.
            </p>
          </div>
        )}

        {/* Filter active + savings banner */}
        {!loading && (
          <>
            {hasMeta && filteredCount > 0 && !showAll && (
              <div className="flex-shrink-0 mx-5 mb-2 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2.5 flex items-center justify-between gap-2">
                <p className="text-xs text-indigo-700">
                  <strong>{filteredCount}</strong> offre{filteredCount > 1 ? "s" : ""} exclue{filteredCount > 1 ? "s" : ""} — caractéristiques inférieures à votre forfait
                </p>
                <button
                  onClick={() => setShowAll(true)}
                  className="flex-shrink-0 text-xs text-indigo-500 hover:text-indigo-700 underline"
                >
                  Tout voir
                </button>
              </div>
            )}
            {showAll && (
              <div className="flex-shrink-0 mx-5 mb-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 flex items-center justify-between">
                <p className="text-xs text-gray-500">Toutes les offres affichées (filtre désactivé)</p>
                <button
                  onClick={() => setShowAll(false)}
                  className="flex-shrink-0 text-xs text-indigo-500 hover:text-indigo-700 underline"
                >
                  Réactiver le filtre
                </button>
              </div>
            )}
            {cheapest && cheapest.price < currentAnnual && (
              <div className="flex-shrink-0 mx-5 mb-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-xs text-emerald-700 font-medium">
                  Économisez jusqu&apos;à{" "}
                  <strong>{fmt(currentAnnual - cheapest.price, subscription.currency)}/an</strong> en changeant d&apos;offre
                </p>
              </div>
            )}
          </>
        )}

        {/* Alternatives list */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {loading
              ? "Chargement…"
              : `${displayed.length} offre${displayed.length !== 1 ? "s" : ""} ${hasMeta && !showAll ? "compatibles" : "disponibles"}`}
          </p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm text-gray-500">
                Aucune offre compatible avec votre forfait actuel.
              </p>
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline"
              >
                Voir toutes les offres quand même
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((alt, i) => {
                const saving = currentAnnual - alt.price;
                const isBest = i === 0 && saving > 0;
                const isMoreExpensive = alt.price >= currentAnnual;
                const monthlyEquiv = alt.price / 12;
                const isFiltered = hasMeta && !showAll && !meetsRequirements(subMeta, alt.planMeta);

                // Build feature tags for telecom alternatives
                const tags: string[] = [];
                if (isMobileMeta(alt.planMeta)) {
                  if (alt.planMeta.unlimitedData) tags.push("∞ data");
                  else if (alt.planMeta.dataGb) tags.push(`${alt.planMeta.dataGb} Go`);
                  if (alt.planMeta.unlimitedCalls) tags.push("appels illimités");
                  if (alt.planMeta.unlimitedSms) tags.push("SMS illimités");
                  alt.planMeta.options.forEach((o) => {
                    const found = MOBILE_OPTIONS.find((opt) => opt.value === o);
                    if (found) tags.push(found.label);
                  });
                }
                if (isInternetMeta(alt.planMeta)) {
                  const mbps = alt.planMeta.downloadSpeedMbps;
                  tags.push(mbps >= 1000 ? `${mbps / 1000} Gb/s` : `${mbps} Mb/s`);
                  if (alt.planMeta.tvIncluded) tags.push("TV incluse");
                  alt.planMeta.options.forEach((o) => {
                    const found = INTERNET_OPTIONS.find((opt) => opt.value === o);
                    if (found) tags.push(found.label);
                  });
                }

                return (
                  <div
                    key={alt.id}
                    className={`relative rounded-xl border p-4 transition-colors ${
                      isFiltered
                        ? "border-gray-100 bg-white opacity-50"
                        : isBest
                        ? "border-emerald-300 bg-emerald-50/50"
                        : isMoreExpensive
                        ? "border-gray-100 bg-white"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {isBest && (
                      <span className="absolute -top-2.5 left-4 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide">
                        Meilleure offre
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{alt.name}</p>
                        {alt.description && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{alt.description}</p>
                        )}
                        {/* Feature tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-gray-900 text-base">
                          {fmt(alt.price, alt.currency)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {fmt(monthlyEquiv, alt.currency)}/mois
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {saving > 1 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {fmt(saving, alt.currency)} économisés/an
                        </span>
                      ) : isMoreExpensive ? (
                        <span className="text-xs text-gray-400">
                          +{fmt(alt.price - currentAnnual, alt.currency)}/an vs votre offre
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Prix similaire</span>
                      )}

                      <div className="flex items-center gap-3">
                        {alt.affiliateUrl && (
                          <a
                            href={alt.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Voir l&apos;offre →
                          </a>
                        )}
                        <button
                          onClick={() => setTransitionAlt(alt)}
                          className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Je veux changer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

    {transitionAlt && subscription && (
      <TransitionFlow
        subscription={subscription}
        alternative={transitionAlt}
        onClose={() => setTransitionAlt(null)}
      />
    )}
    </>
  );
}
