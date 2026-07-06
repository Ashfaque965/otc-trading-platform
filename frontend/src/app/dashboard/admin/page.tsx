"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Stats {
  userCount: number;
  offerCount: number;
  tradeCount: number;
  disputedCount: number;
  pendingKyc: number;
}

export default function AdminPage() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.get("/admin/stats")).data,
  });

  const { data: disputes } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => (await api.get("/admin/disputes")).data,
  });

  const { data: kycQueue } = useQuery({
    queryKey: ["admin-kyc-queue"],
    queryFn: async () => (await api.get("/admin/kyc-queue")).data,
  });

  async function decideKyc(userId: string, approve: boolean) {
    await api.post(`/admin/kyc/${userId}/decision`, { approve });
    queryClient.invalidateQueries({ queryKey: ["admin-kyc-queue"] });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Admin Console</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats &&
          Object.entries(stats).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-center">
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="mt-1 text-xs capitalize text-gray-400">{key.replace(/([A-Z])/g, " $1")}</p>
            </div>
          ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-white">Open Disputes</h2>
        <div className="mt-3 space-y-2">
          {disputes?.length === 0 && <p className="text-sm text-gray-500">No open disputes.</p>}
          {disputes?.map((d: any) => (
            <div key={d.id} className="rounded-lg border border-red-900 bg-red-950/30 p-4">
              <p className="text-sm text-gray-200">Trade #{d.id.slice(0, 8)} — {d.amount} @ ${d.price}</p>
              <p className="text-xs text-gray-500">
                Buyer: {d.buyer.walletAddress.slice(0, 8)} · Seller: {d.seller.walletAddress.slice(0, 8)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Resolve on-chain via the Escrow contract's <code>resolve(tradeId, refundToSeller)</code> function
                using an arbitrator-role wallet.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">KYC Review Queue</h2>
        <div className="mt-3 space-y-2">
          {kycQueue?.length === 0 && <p className="text-sm text-gray-500">No pending KYC submissions.</p>}
          {kycQueue?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/60 p-4">
              <span className="text-sm text-gray-200">{u.displayName || u.walletAddress}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => decideKyc(u.id, true)}
                  className="rounded-md bg-green-700 px-3 py-1 text-xs text-white hover:bg-green-800"
                >
                  Approve
                </button>
                <button
                  onClick={() => decideKyc(u.id, false)}
                  className="rounded-md bg-red-700 px-3 py-1 text-xs text-white hover:bg-red-800"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
