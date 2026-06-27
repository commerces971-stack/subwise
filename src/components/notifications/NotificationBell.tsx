"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  type: string;
  createdAt: string;
  subscription: {
    name: string;
    renewalDate: string;
    amount: number;
    currency: string;
  };
}

interface Props {
  initialNotifications: NotificationItem[];
}

export default function NotificationBell({ initialNotifications }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = items.length;

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.filter((n) => n.id !== id));
    startTransition(() => router.refresh());
  }

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems([]);
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` · ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : ""}`}
      >
        {/* Bell icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none pointer-events-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                  {unreadCount}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAll}
                disabled={isPending}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 transition-colors"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 mx-auto text-gray-300 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-sm text-gray-400">Aucune notification non lue</p>
              </div>
            ) : (
              items.map((n) => {
                const formatted = new Date(n.subscription.renewalDate).toLocaleDateString(
                  "fr-FR",
                  { day: "2-digit", month: "long", year: "numeric" }
                );
                const amount = new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: n.subscription.currency,
                }).format(n.subscription.amount);

                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5 w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {n.subscription.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Renouvellement le{" "}
                        <span className="text-indigo-600 font-medium">{formatted}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{amount} · J-45</p>
                    </div>
                    <button
                      onClick={() => markOne(n.id)}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Marquer comme lu"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
