"use client";

import { useState } from "react";
import SubscriptionModal from "./SubscriptionModal";

export default function AddSubscriptionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        + Ajouter un abonnement
      </button>
      <SubscriptionModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
