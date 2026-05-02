"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

// Force dynamic rendering to prevent prerendering issues
export const dynamic = "force-dynamic";

type LoginUserRole =
  | "ORBISY_ADMIN"
  | "ORBISY_SALES"
  | "HVAC_OWNER"
  | "HVAC_SALES"
  | "HOMEOWNER";

function getDefaultCallbackUrl(role: LoginUserRole) {
  if (role === "HOMEOWNER") {
    return "/portal";
  }

  if (role === "HVAC_OWNER" || role === "HVAC_SALES") {
    return "/pro";
  }

  return "/console";
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/console";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const destination =
          searchParams.get("callbackUrl") ||
          getDefaultCallbackUrl(data.user.role as LoginUserRole);

        router.push(destination || callbackUrl);
      } else {
        const data = await response.json();
        const message = data.diagnostic
          ? `${data.error}: ${data.diagnostic}`
          : data.error || "Login failed";

        setError(message);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--bg),#0a0f1b_40%,#090d17)] text-[color:var(--text)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/orbisy-logo.png"
                alt="ORBISY"
                width={200}
                height={61}
                priority
                className="w-auto h-24"
              />
            </div>
            <p className="text-[color:var(--muted)]">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[color:var(--text)] mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-[color:var(--border)] rounded-xl text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent outline-none transition"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[color:var(--text)] mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-[color:var(--border)] rounded-xl text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent outline-none transition"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] hover:opacity-90 disabled:opacity-50 text-[#001] font-bold py-3 rounded-xl transition duration-200 shadow-[var(--shadow)]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-[color:var(--muted)]">
              Account creation is currently invite-only.
            </p>
            <a
              href="/"
              className="block text-sm text-[color:var(--muted)] hover:text-[color:var(--text)] transition"
            >
              ← Back to homepage
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-white text-lg">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
