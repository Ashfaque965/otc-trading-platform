"use client";

import { useState } from "react";
import { connectWallet, signMessage } from "@/lib/web3";
import { requestNonce, verifySignature } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

export default function WalletConnect() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, setAuth, logout } = useAuthStore();

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const { address, signer } = await connectWallet();
      const message = await requestNonce(address);
      const signature = await signMessage(signer, message);
      const { user: authedUser, token } = await verifySignature(address, signature);
      setAuth(authedUser, token);
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-brand-900/60 px-3 py-1 text-sm font-mono text-brand-50">
          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
        </span>
        <button
          onClick={logout}
          className="rounded-md border border-gray-700 px-3 py-1 text-sm text-gray-300 hover:bg-gray-800"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
