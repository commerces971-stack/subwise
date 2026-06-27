"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  name: string;
}

export default function DeleteSubscriptionButton({ id, name }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Supprimer "${name}" ? Cette action est irréversible.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
    >
      {loading ? "…" : "Supprimer"}
    </button>
  );
}
