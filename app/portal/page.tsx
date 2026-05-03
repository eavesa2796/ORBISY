"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PortalProposal = {
  id: string;
  publicToken: string;
  title: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED";
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  company: { id: string; name: string; slug: string };
  options: Array<{
    id: string;
    tier: "GOOD" | "BETTER" | "BEST";
    title: string;
    finalCustomerPrice: number;
    monthlyPaymentEstimate: number | null;
  }>;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusTone(status: PortalProposal["status"]) {
  if (status === "ACCEPTED") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (status === "DECLINED") return "bg-rose-100 text-rose-800 border-rose-300";
  if (status === "VIEWED") return "bg-blue-100 text-blue-800 border-blue-300";
  if (status === "SENT") return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-slate-100 text-slate-700 border-slate-300";
}

export default function PortalHomePage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [proposals, setProposals] = useState<PortalProposal[]>([]);

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/portal/proposals");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load proposals");
        setProposals(data.proposals || []);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unexpected error");
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, []);

  const sorted = useMemo(
    () =>
      [...proposals].sort((a, b) => {
        const aTime = new Date(a.acceptedAt || a.viewedAt || a.sentAt || 0).getTime();
        const bTime = new Date(b.acceptedAt || b.viewedAt || b.sentAt || 0).getTime();
        return bTime - aTime;
      }),
    [proposals],
  );

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-300 bg-white/90 p-6">
          <h1 className="text-3xl font-semibold text-slate-900">Your HVAC Proposals</h1>
          <p className="mt-2 text-slate-600">
            Review open estimates, compare Good / Better / Best options, and accept when you are ready.
          </p>
        </header>

        {loading && (
          <div className="rounded-xl border border-slate-300 bg-white p-6 text-slate-600">
            Loading proposals...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && sorted.length === 0 && (
          <div className="rounded-xl border border-slate-300 bg-white p-6 text-slate-600">
            No proposals are available yet.
          </div>
        )}

        {!loading && !errorMessage && sorted.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {sorted.map((proposal) => (
              <article key={proposal.id} className="rounded-2xl border border-slate-300 bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{proposal.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{proposal.company.name}</p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${statusTone(
                      proposal.status,
                    )}`}
                  >
                    {proposal.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {proposal.options.map((option) => (
                    <div key={option.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{option.tier}</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{option.title}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {formatCurrency(option.finalCustomerPrice)}
                      </p>
                      {option.monthlyPaymentEstimate && (
                        <p className="text-xs text-slate-600">
                          {formatCurrency(option.monthlyPaymentEstimate)}/mo est.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <Link
                    href={`/proposal/${proposal.publicToken}`}
                    className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Open Proposal
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
