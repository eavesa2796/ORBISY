"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Force dynamic rendering to prevent prerendering issues
export const dynamic = "force-dynamic";

function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/console";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      // Create account
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!signupResponse.ok) {
        const data = await signupResponse.json();
        throw new Error(data.error || "Signup failed");
      }

      // Automatically log in after successful signup
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (loginResponse.ok) {
        router.push(callbackUrl);
      } else {
        // If auto-login fails, redirect to login page
        router.push("/login");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--bg),#0a0f1b_40%,#090d17)] text-[color:var(--text)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[color:var(--text)] mb-2">
              Create Account
            </h1>
            <p className="text-[color:var(--muted)]">Join ORBISY Console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[color:var(--text)] mb-2"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-[color:var(--border)] rounded-xl text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent outline-none transition"
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>

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
                minLength={8}
                className="w-full px-4 py-3 bg-white/5 border border-[color:var(--border)] rounded-xl text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent outline-none transition"
                placeholder="At least 8 characters"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[color:var(--text)] mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-white/5 border border-[color:var(--border)] rounded-xl text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent outline-none transition"
                placeholder="Confirm your password"
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
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-[color:var(--muted)]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[color:var(--accent)] hover:text-[color:var(--accent-2)] font-semibold transition"
              >
                Sign in
              </Link>
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-white text-lg">Loading...</div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
