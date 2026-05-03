"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PortalClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc,#edf4ff)] text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/portal" className="flex items-center gap-3">
            <Image
              src="/orbisy-logo.png"
              alt="ORBISY"
              width={130}
              height={40}
              priority
              className="h-9 w-auto"
            />
            <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              Homeowner Portal
            </span>
          </Link>

          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/portal"
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              My Proposals
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
