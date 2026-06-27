"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const errors: Record<string, string> = {
  Configuration: "Erreur de configuration du serveur.",
  AccessDenied: "Accès refusé.",
  Verification: "Le lien de connexion a expiré. Veuillez en demander un nouveau.",
  Default: "Une erreur est survenue lors de la connexion.",
};

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Default";
  const message = errors[error] ?? errors.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-xl font-semibold text-red-600">Erreur de connexion</h1>
        <p className="text-gray-500 text-sm">{message}</p>
        <Link href="/auth/signin" className="text-indigo-600 text-sm hover:underline">
          Réessayer
        </Link>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
