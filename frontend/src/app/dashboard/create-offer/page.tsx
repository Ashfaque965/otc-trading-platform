"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOffer } from "@/lib/api";

const PAYMENT_METHODS = ["BANK_TRANSFER", "STRIPE", "USDC", "PAYPAL", "UPI"];

export default function CreateOfferPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tokenSymbol: "USDC",
    tokenAddress: "",
    price: "",
    quantity: "",
    paymentMethods: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePaymentMethod(method: string) {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(method)
        ? f.paymentMethods.filter((m) => m !== method)
        : [...f.paymentMethods, method],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!form.paymentMethods.length) throw new Error("Select at least one payment method");
      await createOffer({
        tokenSymbol: form.tokenSymbol,
        tokenAddress: form.tokenAddress,
        price: parseFloat(form.price) as any,
        quantity: parseFloat(form.quantity) as any,
        paymentMethods: form.paymentMethods,
      });
      router.push("/marketplace");
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to create offer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-gray-800 bg-gray-900/60 p-8">
      <h1 className="text-xl font-bold text-white">Create Offer</h1>
      <p className="mt-1 text-sm text-gray-400">
        After submitting, you'll need to call <code>createTrade()</code> on the Escrow
        contract to deposit tokens once a buyer accepts.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm text-gray-300">Token Symbol</label>
          <input
            value={form.tokenSymbol}
            onChange={(e) => setForm({ ...form, tokenSymbol: e.target.value })}
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="text-sm text-gray-300">Token Contract Address</label>
          <input
            value={form.tokenAddress}
            onChange={(e) => setForm({ ...form, tokenAddress: e.target.value })}
            placeholder="0x..."
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-300">Price (USD)</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Quantity</label>
            <input
              type="number"
              step="0.000001"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-300">Accepted Payment Methods</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => togglePaymentMethod(m)}
                className={`rounded-md px-3 py-1 text-sm ${
                  form.paymentMethods.includes(m) ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-300"
                }`}
              >
                {m.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Offer"}
        </button>
      </form>
    </div>
  );
}
