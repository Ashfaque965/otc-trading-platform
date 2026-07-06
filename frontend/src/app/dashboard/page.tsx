"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchMyTrades } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

const STATUS_COLORS: Record<string, string> = {
  CREATED: "bg-gray-700",
  BUYER_JOINED: "bg-blue-700",
  PAID: "bg-yellow-700",
  RELEASED: "bg-green-700",
  CANCELLED: "bg-gray-800",
  DISPUTED: "bg-red-700",
  REFUNDED: "bg-orange-700",
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: trades, isLoading } = useQuery({
    queryKey: ["my-trades"],
    queryFn: fetchMyTrades,
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="rounded-xl border border-gray-800 p-8 text-center text-gray-400">
        Connect your wallet to view your dashboard.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Trades</h1>
        <Link href="/dashboard/create-offer" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          + Create Offer
        </Link>
      </div>

      {isLoading && <p className="mt-6 text-gray-400">Loading trades...</p>}
      {trades && trades.length === 0 && (
        <p className="mt-6 text-gray-400">No trades yet. Head to the marketplace to accept an offer.</p>
      )}

      <div className="mt-6 space-y-3">
        {trades?.map((trade) => (
          <Link
            key={trade.id}
            href={`/dashboard/trade/${trade.id}`}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/60 p-4 hover:border-brand-600"
          >
            <div>
              <p className="font-semibold text-white">{trade.amount} tokens @ ${trade.price}</p>
              <p className="text-xs text-gray-500">Trade #{trade.id.slice(0, 8)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs text-white ${STATUS_COLORS[trade.status] || "bg-gray-700"}`}>
              {trade.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
