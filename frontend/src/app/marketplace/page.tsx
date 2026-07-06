"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOffers } from "@/lib/api";
import OfferCard from "@/components/OfferCard";

const TOKENS = ["ALL", "USDC", "USDT", "DAI", "WBTC", "ETH"];

export default function MarketplacePage() {
  const [token, setToken] = useState("ALL");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["offers", token],
    queryFn: () => fetchOffers(token === "ALL" ? undefined : { tokenSymbol: token }),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Marketplace</h1>
        <div className="flex gap-2">
          {TOKENS.map((t) => (
            <button
              key={t}
              onClick={() => setToken(t)}
              className={`rounded-md px-3 py-1 text-sm ${
                token === t ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="mt-8 text-gray-400">Loading offers...</p>}
      {isError && <p className="mt-8 text-red-400">Could not load offers. Is the backend running?</p>}

      {data && data.offers.length === 0 && (
        <p className="mt-8 text-gray-400">No open offers yet. Be the first to create one from your dashboard.</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data?.offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </div>
  );
}
