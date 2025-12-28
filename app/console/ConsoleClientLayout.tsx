"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/components/outreach/Toast";

export default function ConsoleClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--bg),#0a0f1b_40%,#090d17)] text-[color:var(--text)]">
      <ToastContainer />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-[color:var(--panel)] border-r border-[color:var(--border)]">
        <div className="flex items-center justify-center h-16 border-b border-[color:var(--border)]">
          <h1 className="text-xl font-bold text-[color:var(--text)]">
            ORBISY Console
          </h1>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          <NavLink href="/console" icon="📊">
            Dashboard
          </NavLink>
          <NavLink href="/console/leads" icon="👥">
            Leads
          </NavLink>
          <NavLink href="/console/campaigns" icon="📧">
            Campaigns
          </NavLink>
          <NavLink href="/console/inbox" icon="📥">
            Inbox
          </NavLink>
          <NavLink href="/console/users" icon="👤">
            Users
          </NavLink>
          <NavLink href="/console/settings" icon="⚙️">
            Settings
          </NavLink>
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[color:var(--border)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors text-red-400 font-medium"
          >
            <span className="mr-2">🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-[color:var(--text)] hover:text-[color:var(--accent)]"
    >
      <span className="mr-3">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
