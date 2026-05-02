"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type InviteInfo = {
  email: string;
  name: string;
  role: string;
  expiresAt: string;
};

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      if (!token) {
        setError("Invite token is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `/api/auth/setup-password?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Invite is invalid or expired");
        }

        if (cancelled) {
          return;
        }

        setInvite(data.invite);
        setName(data.invite?.name || "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load invite",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to set password");
      }

      router.push(data.redirectPath || "/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--bg),#0a0f1b_40%,#090d17)] text-[color:var(--text)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-7 shadow-[var(--shadow)]">
        <h1 className="text-2xl font-bold">Set your ORBISY password</h1>

        {loading ? (
          <p className="mt-4 text-[color:var(--muted)]">Loading invite...</p>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        ) : invite ? (
          <>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              You are invited as {invite.role} for {invite.email}.
            </p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <label className="grid gap-1">
                <span className="text-sm text-[color:var(--muted)]">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={saving}
                  className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2.5 outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-[color:var(--muted)]">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={saving}
                  className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2.5 outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-[color:var(--muted)]">
                  Confirm password
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={saving}
                  className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2.5 outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-3 font-semibold text-[#001] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Set Password"}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-[color:var(--muted)]">
            Invite could not be loaded.
          </p>
        )}

        <div className="mt-5 text-sm text-[color:var(--muted)]">
          <Link href="/login" className="hover:text-[color:var(--text)]">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[color:var(--bg)]" />}>
      <SetupPasswordForm />
    </Suspense>
  );
}
