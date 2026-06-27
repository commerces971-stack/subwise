"use client";

import { useState } from "react";
import type { Subscription } from "@prisma/client";

interface Alternative {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string | null;
}

interface UserAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zip: string;
}

interface ProviderAddress {
  name: string;
  address: string;
  city: string;
  zip: string;
}

interface Props {
  subscription: Subscription;
  alternative: Alternative;
  onClose: () => void;
}

interface CancellationInfo {
  customerNumber: string;
  contractRef: string;
  rioCode: string;
}

type Step = "mandate" | "summary";

function fmt(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

const SERVICE_FEE = 4.99;
const MAILEVA_COST = 6.5;
const TOTAL = SERVICE_FEE + MAILEVA_COST;

export default function TransitionFlow({ subscription, alternative, onClose }: Props) {
  const [step, setStep] = useState<Step>("mandate");
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [userAddr, setUserAddr] = useState<UserAddress>({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    zip: "",
  });
  const [providerAddr, setProviderAddr] = useState<ProviderAddress>({
    name: "",
    address: "",
    city: "",
    zip: "",
  });
  const [cancellationInfo, setCancellationInfo] = useState<CancellationInfo>({
    customerNumber: "",
    contractRef: "",
    rioCode: "",
  });

  const isMobile = subscription.category === "téléphonie mobile";

  const currentMonthly = subscription.amount / subscription.durationMonths;
  const currentAnnual = currentMonthly * 12;
  const saving = currentAnnual - alternative.price;

  function mandateText() {
    const fullName =
      userAddr.firstName && userAddr.lastName
        ? `${userAddr.firstName} ${userAddr.lastName}`
        : "[votre nom]";
    const customerRef = cancellationInfo.customerNumber
      ? `numéro client ${cancellationInfo.customerNumber}`
      : "[numéro client]";
    const contractRef = cancellationInfo.contractRef
      ? `référence contrat ${cancellationInfo.contractRef}`
      : "[référence contrat]";
    const rioLine = isMobile
      ? ` Je souhaite conserver mon numéro et le porter vers mon nouvel opérateur. Mon code RIO est : ${cancellationInfo.rioCode || "[code RIO]"}.`
      : "";
    return (
      `Je soussigné(e) ${fullName}, domicilié(e) ${userAddr.address || "[adresse]"}, ` +
      `${userAddr.zip || "[CP]"} ${userAddr.city || "[ville]"}, ` +
      `mandate Subwise à envoyer en mon nom une lettre recommandée avec accusé ` +
      `de réception à ${providerAddr.name || "[opérateur]"} pour résilier mon abonnement ` +
      `« ${subscription.name} » (${customerRef} — ${contractRef}). ` +
      `Je certifie que les informations fournies sont exactes ` +
      `et que j'ai le droit de résilier ce contrat.` +
      rioLine
    );
  }

  const mandateIsComplete =
    userAddr.firstName &&
    userAddr.lastName &&
    userAddr.address &&
    userAddr.city &&
    userAddr.zip &&
    providerAddr.name &&
    providerAddr.address &&
    providerAddr.city &&
    providerAddr.zip &&
    cancellationInfo.customerNumber &&
    cancellationInfo.contractRef &&
    (!isMobile || cancellationInfo.rioCode.length === 12);

  async function handlePay() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          alternativeId: alternative.id,
          alternativeName: alternative.name,
          userAddress: userAddr,
          providerAddress: providerAddr,
          customerNumber: cancellationInfo.customerNumber,
          contractRef: cancellationInfo.contractRef,
          rioCode: isMobile ? cancellationInfo.rioCode : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la création de la commande");
      }

      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {step === "mandate" ? "Mandat de résiliation" : "Récapitulatif & paiement"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Étape {step === "mandate" ? "1" : "2"}/2
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ── STEP 1 — MANDAT ── */}
          {step === "mandate" && (
            <>
              {/* Alternative summary */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">
                  Vous souhaitez passer à
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{alternative.name}</p>
                    {alternative.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{alternative.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{fmt(alternative.price, alternative.currency)}/an</p>
                    {saving > 0 && (
                      <p className="text-xs text-emerald-600 font-medium">
                        -{fmt(saving, alternative.currency)}/an
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* User address */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Vos coordonnées</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                    <input
                      type="text"
                      required
                      value={userAddr.firstName}
                      onChange={(e) => setUserAddr((a) => ({ ...a, firstName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                    <input
                      type="text"
                      required
                      value={userAddr.lastName}
                      onChange={(e) => setUserAddr((a) => ({ ...a, lastName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Adresse postale</label>
                  <input
                    type="text"
                    required
                    value={userAddr.address}
                    onChange={(e) => setUserAddr((a) => ({ ...a, address: e.target.value }))}
                    placeholder="12 rue de la Paix"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="mt-3 grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Code postal</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={userAddr.zip}
                      onChange={(e) => setUserAddr((a) => ({ ...a, zip: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
                    <input
                      type="text"
                      required
                      value={userAddr.city}
                      onChange={(e) => setUserAddr((a) => ({ ...a, city: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Provider address */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Coordonnées de votre opérateur actuel
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  Trouvez l&apos;adresse de résiliation sur votre contrat ou facture.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nom du destinataire
                  </label>
                  <input
                    type="text"
                    required
                    value={providerAddr.name}
                    onChange={(e) => setProviderAddr((a) => ({ ...a, name: e.target.value }))}
                    placeholder="SFR — Service Résiliations"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                  <input
                    type="text"
                    required
                    value={providerAddr.address}
                    onChange={(e) => setProviderAddr((a) => ({ ...a, address: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="mt-3 grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Code postal</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={providerAddr.zip}
                      onChange={(e) => setProviderAddr((a) => ({ ...a, zip: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
                    <input
                      type="text"
                      required
                      value={providerAddr.city}
                      onChange={(e) => setProviderAddr((a) => ({ ...a, city: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Cancellation info */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Informations de votre contrat
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  Trouvez ces informations sur votre facture ou espace client.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Numéro de client
                    </label>
                    <input
                      type="text"
                      required
                      value={cancellationInfo.customerNumber}
                      onChange={(e) => setCancellationInfo((c) => ({ ...c, customerNumber: e.target.value }))}
                      placeholder="ex : 0123456789"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Référence du contrat
                    </label>
                    <input
                      type="text"
                      required
                      value={cancellationInfo.contractRef}
                      onChange={(e) => setCancellationInfo((c) => ({ ...c, contractRef: e.target.value }))}
                      placeholder="ex : CTR-2024-XXXXX"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* RIO code — téléphonie mobile only */}
              {isMobile && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Code RIO <span className="text-red-500">*</span>
                  </p>
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Comment obtenir votre code RIO ?</p>
                    <p className="text-xs text-blue-600">
                      Appelez le <strong>3179</strong> gratuitement depuis votre mobile (24h/24, 7j/7).
                      Vous recevrez votre code par SMS en quelques secondes.
                      Ce code est obligatoire pour transférer votre numéro vers votre nouvel opérateur.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Code RIO (12 caractères)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={cancellationInfo.rioCode}
                      onChange={(e) =>
                        setCancellationInfo((c) => ({
                          ...c,
                          rioCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                        }))
                      }
                      placeholder="ex : AB1234567890"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest uppercase"
                    />
                    {cancellationInfo.rioCode.length > 0 && cancellationInfo.rioCode.length !== 12 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {cancellationInfo.rioCode.length}/12 caractères — le code RIO doit en comporter exactement 12.
                      </p>
                    )}
                    {cancellationInfo.rioCode.length === 12 && (
                      <p className="text-xs text-emerald-600 mt-1">Code RIO valide ✓</p>
                    )}
                  </div>
                </div>
              )}

              {/* Mandate preview */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Aperçu du mandat
                </p>
                <p className="text-xs text-gray-600 leading-relaxed italic">{mandateText()}</p>
              </div>

              {/* Signature checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signed}
                  onChange={(e) => setSigned(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  Je certifie l&apos;exactitude des informations ci-dessus et mandate Subwise
                  à envoyer cette lettre recommandée en mon nom. Je comprends que le montant
                  suivant sera débité à la confirmation :
                  <span className="flex flex-col mt-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 gap-1 text-gray-700">
                    <span className="flex justify-between">
                      <span>Frais Subwise</span>
                      <strong>{fmt(SERVICE_FEE)}</strong>
                    </span>
                    <span className="flex justify-between">
                      <span>Lettre recommandée Maileva</span>
                      <strong>~{fmt(MAILEVA_COST)}</strong>
                    </span>
                    <span className="flex justify-between border-t border-gray-200 pt-1 mt-0.5">
                      <span className="font-semibold text-gray-900">Total estimé</span>
                      <strong className="text-gray-900">~{fmt(TOTAL)}</strong>
                    </span>
                    <span className="text-gray-400 text-[10px] leading-snug mt-0.5">
                      Prix exact Maileva calculé selon le document — confirmé avant paiement.
                    </span>
                  </span>
                  <span className="block mt-1.5">
                    La lettre sera expédiée dans les 24 h ouvrées.
                  </span>
                </span>
              </label>

              <button
                onClick={() => setStep("summary")}
                disabled={!signed || !mandateIsComplete}
                className="w-full bg-indigo-600 text-white rounded-xl py-3 px-4 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continuer vers le paiement →
              </button>
            </>
          )}

          {/* ── STEP 2 — SUMMARY ── */}
          {step === "summary" && (
            <>
              {/* Recap */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                    Résiliation
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{subscription.name}</p>
                  <p className="text-xs text-gray-500">
                    Destinataire : {providerAddr.name}, {providerAddr.zip} {providerAddr.city}
                  </p>
                  <p className="text-xs text-gray-500">
                    N° client : {cancellationInfo.customerNumber} · Réf. contrat : {cancellationInfo.contractRef}
                  </p>
                  {isMobile && (
                    <p className="text-xs text-gray-500">
                      Code RIO : <span className="font-mono font-medium">{cancellationInfo.rioCode}</span>
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                    Alternative choisie
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{alternative.name}</p>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Frais Subwise</span>
                  <span className="font-medium">{fmt(SERVICE_FEE)}</span>
                </div>
                <div className="flex items-start justify-between text-sm text-gray-700">
                  <div>
                    <span>Lettre recommandée avec AR (Maileva)</span>
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      Estimation — prix exact calculé selon le document avant paiement
                    </p>
                  </div>
                  <span className="font-medium shrink-0 ml-4">~{fmt(MAILEVA_COST)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Total estimé TTC</span>
                  <span className="text-lg font-bold text-gray-900">~{fmt(TOTAL)}</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("mandate")}
                  disabled={submitting}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-3 px-4 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={handlePay}
                  disabled={submitting}
                  className="flex-[2] bg-indigo-600 text-white rounded-xl py-3 px-4 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Redirection…
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Payer ~{fmt(TOTAL)} et envoyer la lettre
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Paiement sécurisé par Stripe · Lettre expédiée sous 24 h ouvrées
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
