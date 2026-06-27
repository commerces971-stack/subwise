"use client";

import { useEffect } from "react";
import type { Subscription } from "@prisma/client";
import SubscriptionForm from "./SubscriptionForm";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subscription?: Subscription;
}

export default function SubscriptionModal({ isOpen, onClose, subscription }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {subscription ? "Modifier l'abonnement" : "Ajouter un abonnement"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <SubscriptionForm subscription={subscription} onSuccess={onClose} />
      </div>
    </div>
  );
}
