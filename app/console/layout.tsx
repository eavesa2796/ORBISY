"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer } from "@/components/outreach/Toast";

export default function ConsoleLayout({
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
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="flex items-center justify-center h-16 border-b border-gray-800">
          <h1 className="text-xl font-bold">ORBISY Console</h1>
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
          <NavLink href="/console/settings" icon="⚙️">
            Settings
          </NavLink>
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-white font-medium"
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
      className="flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
    >
      <span className="mr-3">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
