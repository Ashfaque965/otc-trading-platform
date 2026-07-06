import Link from "next/link";

const stats = [
  { label: "Escrowed Volume", value: "$0" },
  { label: "Active Offers", value: "0" },
  { label: "Verified Traders", value: "0" },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold text-white md:text-5xl">
          Trade digital assets directly. <span className="text-brand-500">Trustlessly escrowed.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-400">
          A peer-to-peer OTC desk where every trade is secured by a smart contract escrow,
          not a promise. Negotiate, settle, and release funds — all on-chain.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/marketplace" className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            Browse Marketplace
          </Link>
          <Link href="/dashboard" className="rounded-md border border-gray-700 px-6 py-3 font-semibold text-gray-200 hover:bg-gray-800">
            Go to Dashboard
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-sm text-gray-400">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { title: "1. Create or Accept an Offer", body: "Sellers list assets with price and payment terms. Buyers browse and accept." },
          { title: "2. Escrow Locks the Trade", body: "Tokens are locked in an audited escrow contract the moment a trade starts." },
          { title: "3. Settle & Release", body: "Buyer pays off-chain, seller confirms, and the contract releases funds automatically." },
        ].map((step) => (
          <div key={step.title} className="rounded-xl border border-gray-800 p-6">
            <h3 className="font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm text-gray-400">{step.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
