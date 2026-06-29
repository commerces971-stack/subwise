"use client";

import { useState } from "react";
import type { Subscription } from "@prisma/client";
import DeleteSubscriptionButton from "./DeleteSubscriptionButton";
import SubscriptionModal from "./SubscriptionModal";
import AlternativesPanel from "@/components/alternatives/AlternativesPanel";

const CATEGORY_COLORS: Record<string, string> = {
  "téléphonie mobile": "bg-blue-100 text-blue-700",
  "internet box": "bg-cyan-100 text-cyan-700",
  "streaming": "bg-purple-100 text-purple-700",
  "assurance auto": "bg-orange-100 text-orange-700",
  "assurance habitation": "bg-yellow-100 text-yellow-700",
  "mutuelle santé": "bg-green-100 text-green-700",
  "salle de sport": "bg-red-100 text-red-700",
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(d: Date | string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

interface Props {
  subscriptions: Subscription[];
}

export default function SubscriptionList({ subscriptions }: Props) {
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [compareTarget, setCompareTarget] = useState<Subscription | null>(null);

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">Aucun abonnement.</p>
        <p className="text-sm mt-1">Ajoutez-en un avec le bouton ci-dessus !</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3">Catégorie</th>
              <th className="text-right px-4 py-3">Montant</th>
              <th className="text-left px-4 py-3">Renouvellement</th>
              <th className="text-center px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subscriptions.map((sub) => {
              const days = daysUntil(sub.renewalDate);
              const urgent = days >= 0 && days <= 45;
              return (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[sub.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {sub.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {sub.amount.toFixed(2)} {sub.currency}
                  </td>
                  <td className="px-4 py-3">
                    <span className={urgent ? "text-amber-600 font-medium" : "text-gray-600"}>
                      {formatDate(sub.renewalDate)}
                    </span>
                    {urgent && days >= 0 && (
                      <span className="ml-2 text-xs text-amber-500">J-{days}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${sub.isActive ? "bg-green-400" : "bg-gray-300"}`} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => setCompareTarget(sub)}
                        className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Gérer la transition
                      </button>
                      <button
                        onClick={() => setEditTarget(sub)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Modifier
                      </button>
                      <DeleteSubscriptionButton id={sub.id} name={sub.name} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SubscriptionModal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        subscription={editTarget ?? undefined}
      />

      <AlternativesPanel
        subscription={compareTarget}
        onClose={() => setCompareTarget(null)}
      />
    </>
  );
}
