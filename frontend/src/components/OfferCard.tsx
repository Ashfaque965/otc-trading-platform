import Link from "next/link";
import { Offer } from "@/lib/api";

export default function OfferCard({ offer }: { offer: Offer }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 transition hover:border-brand-600">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-white">{offer.tokenSymbol}</span>
        <span className="rounded-full bg-brand-900/60 px-2 py-0.5 text-xs text-brand-50">
          {offer.seller.kycStatus === "APPROVED" ? "KYC Verified" : "Unverified"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-400">
        <div>
          <p className="text-gray-500">Price</p>
          <p className="text-gray-200">${offer.price}</p>
        </div>
        <div>
          <p className="text-gray-500">Available</p>
          <p className="text-gray-200">{offer.quantity}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {offer.paymentMethods.map((m) => (
          <span key={m} className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
            {m.replace("_", " ")}
          </span>
        ))}
      </div>

      <Link
        href={`/marketplace/${offer.id}`}
        className="mt-4 block rounded-md bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
      >
        View Offer
      </Link>
    </div>
  );
}
