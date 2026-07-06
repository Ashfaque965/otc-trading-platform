import Link from "next/link";
import WalletConnect from "./WalletConnect";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-800 bg-[#0b0e17]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-white">
          OTC<span className="text-brand-500">Desk</span>
        </Link>
        <nav className="hidden gap-6 text-sm text-gray-300 md:flex">
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link href="/dashboard/admin" className="hover:text-white">Admin</Link>
        </nav>
        <WalletConnect />
      </div>
    </header>
  );
}
