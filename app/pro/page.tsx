import Link from "next/link";

export default function ProDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[color:var(--text)]">
          Pro Dashboard
        </h1>
        <p className="mt-2 text-[color:var(--muted)]">
          Build, send, and manage HVAC replacement proposals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/pro/proposals"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 transition hover:bg-white/5"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            Quote Workflow
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--text)]">
            Proposal Builder
          </h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Create Good / Better / Best options and send customer-facing
            proposal links.
          </p>
        </Link>

        <Link
          href="/pro/proposals/settings"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 transition hover:bg-white/5"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            Defaults
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--text)]">
            Pricing Settings
          </h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Configure default labor, financing, warranties, permit fees, and
            proposal text.
          </p>
        </Link>
      </div>
    </div>
  );
}
