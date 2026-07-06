"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrade, updateTradeStatus } from "@/lib/api";
import { connectWallet, getEscrowContract } from "@/lib/web3";
import { useAuthStore } from "@/lib/authStore";
import { useTradeChat } from "@/lib/useTradeChat";

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data: trade, isLoading } = useQuery({
    queryKey: ["trade", id],
    queryFn: () => fetchTrade(id),
  });

  const { messages, sendMessage } = useTradeChat(id);

  const isBuyer = trade && user && trade.buyerId === user.id;
  const isSeller = trade && user && trade.sellerId === user.id;

  async function runOnChainAction(action: "markPaid" | "release" | "cancel" | "dispute", nextStatus: string) {
    if (!trade?.onChainTradeId) {
      setError("This trade has no on-chain trade ID recorded yet.");
      return;
    }
    setActionLoading(action);
    setError(null);
    try {
      const { signer } = await connectWallet();
      const escrow = getEscrowContract(signer);
      const tx = await escrow[action](trade.onChainTradeId);
      await tx.wait();

      await updateTradeStatus(id, nextStatus, tx.hash);
      queryClient.invalidateQueries({ queryKey: ["trade", id] });
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || `Failed to execute ${action}`);
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading) return <p className="text-gray-400">Loading trade...</p>;
  if (!trade) return <p className="text-red-400">Trade not found.</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Trade #{trade.id.slice(0, 8)}</h1>
          <span className="rounded-full bg-brand-900/60 px-3 py-1 text-xs text-brand-50">{trade.status}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Amount</p>
            <p className="text-gray-200">{trade.amount}</p>
          </div>
          <div>
            <p className="text-gray-500">Price</p>
            <p className="text-gray-200">${trade.price}</p>
          </div>
          <div>
            <p className="text-gray-500">Escrow Contract</p>
            <p className="truncate text-gray-200 font-mono text-xs">{trade.escrowAddress}</p>
          </div>
          <div>
            <p className="text-gray-500">On-chain Status</p>
            <p className="text-gray-200">{trade.onChain?.status ?? "Not synced"}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isBuyer && trade.status === "BUYER_JOINED" && (
            <button
              onClick={() => runOnChainAction("markPaid", "PAID")}
              disabled={!!actionLoading}
              className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {actionLoading === "markPaid" ? "Confirming..." : "Mark Payment Sent"}
            </button>
          )}
          {isSeller && trade.status === "PAID" && (
            <button
              onClick={() => runOnChainAction("release", "RELEASED")}
              disabled={!!actionLoading}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === "release" ? "Releasing..." : "Confirm & Release Funds"}
            </button>
          )}
          {(isBuyer || isSeller) && ["BUYER_JOINED", "PAID"].includes(trade.status) && (
            <button
              onClick={() => runOnChainAction("dispute", "DISPUTED")}
              disabled={!!actionLoading}
              className="rounded-md border border-red-700 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/40 disabled:opacity-50"
            >
              {actionLoading === "dispute" ? "Opening..." : "Raise Dispute"}
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      <div className="flex flex-col rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <h2 className="font-semibold text-white">Negotiation Chat</h2>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: 360 }}>
          {messages.map((m) => (
            <div key={m.id} className="rounded-md bg-gray-800 p-2 text-sm">
              <p className="text-xs text-gray-500">{m.sender.displayName || m.sender.walletAddress.slice(0, 8)}</p>
              <p className="text-gray-200">{m.content}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-gray-500">No messages yet. Say hello!</p>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            sendMessage(draft.trim());
            setDraft("");
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
          />
          <button type="submit" className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
