"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchOffer, createTrade } from "@/lib/api";
import { connectWallet, getEscrowContract } from "@/lib/web3";

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: offer, isLoading } = useQuery({
    queryKey: ["offer", id],
    queryFn: () => fetchOffer(id),
  });

  async function handleAcceptOffer() {
    if (!offer) return;
    setSubmitting(true);
    setError(null);
    try {
      const { signer } = await connectWallet();
      const escrow = getEscrowContract(signer);

      // The on-chain trade must already exist (created by the seller). Here the
      // buyer joins it. In a full RFQ flow, tradeId would be resolved from the
      // offer's most recent on-chain event; simplified here for clarity.
      const onChainTradeId = Number(prompt("Enter the on-chain trade ID shared by the seller:"));
      if (!onChainTradeId) throw new Error("A valid on-chain trade ID is required to join");

      const tx = await escrow.joinTrade(onChainTradeId);
      await tx.wait();

      const trade = await createTrade({
        offerId: offer.id,
        amount: Number(offer.quantity),
        escrowAddress: process.env.NEXT_PUBLIC_ESCROW_ADDRESS!,
        onChainTradeId,
        txHashCreate: tx.hash,
      });

      router.push(`/dashboard/trade/${trade.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to accept offer");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <p className="text-gray-400">Loading offer...</p>;
  if (!offer) return <p className="text-red-400">Offer not found.</p>;

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-gray-800 bg-gray-900/60 p-8">
      <h1 className="text-2xl font-bold text-white">
        {offer.quantity} {offer.tokenSymbol} @ ${offer.price}
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        Seller: {offer.seller.displayName || offer.seller.walletAddress}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {offer.paymentMethods.map((m) => (
          <span key={m} className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300">
            {m.replace("_", " ")}
          </span>
        ))}
      </div>

      <button
        onClick={handleAcceptOffer}
        disabled={submitting}
        className="mt-8 w-full rounded-md bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? "Processing..." : "Accept Offer & Join Escrow"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
