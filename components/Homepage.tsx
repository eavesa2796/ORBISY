"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Service = {
  id: string;
  tab: string;
  kicker: string;
  title: string;
  sub: string;
  chips: string[];
  ctas: { label: string; href: string; variant: "primary" | "ghost" }[];
  highlights: { title: string; bullets: string[] }[];
  table: { title: string; rows: [string, string, string][] };
  cards3: { title: string; text: string }[];
};

const services: Service[] = [
  {
    id: "automation",
    tab: "Automation & Integrations",
    kicker: "Make busywork disappear",
    title: "Automations that save hours every week",
    sub: "We connect the tools you already use so your team spends less time copying/pasting and more time serving customers.",
    chips: ["Zapier/Make", "Google Workspace", "QuickBooks", "POS/CRM"],
    ctas: [
      { label: "Book a Free Audit", href: "#book", variant: "primary" },
      { label: "See Example Workflows", href: "#workflows", variant: "ghost" },
    ],
    highlights: [
      {
        title: "Common wins",
        bullets: [
          "Auto-send invoices & payment reminders",
          "Sync leads from forms → CRM",
          "Daily sales & inventory alerts",
        ],
      },
      {
        title: "Fast turnaround",
        bullets: [
          "1–3 days for simple automations",
          "1–2 weeks for multi-system builds",
          "We document everything for handoff",
        ],
      },
    ],
    table: {
      title: "Sample workflow plan",
      rows: [
        ["Day 1", "Audit + map data flow", "You + me"],
        ["Day 2", "Build automation + logging", "Me"],
        ["Day 3", "Test, train staff, go-live", "You + me"],
      ],
    },
    cards3: [
      {
        title: "What you get",
        text: "Reliable automations with error handling, alerts, and a simple dashboard so you’re not guessing if it worked.",
      },
      {
        title: "Best for",
        text: "Businesses juggling 3+ tools, manual data entry, and recurring admin tasks.",
      },
      {
        title: "Pricing idea",
        text: "Fixed-fee build + optional monthly monitoring. Clear scope, no surprises.",
      },
    ],
  },
  {
    id: "websites",
    tab: "Websites & Lead Capture",
    kicker: "Turn visitors into customers",
    title: "A fast website that brings in leads",
    sub: "Modern, mobile-first sites with clear messaging, booking, contact forms, and analytics—built to convert, not just look pretty.",
    chips: ["Next.js", "SEO", "Analytics", "Booking/Forms"],
    ctas: [
      { label: "Get a Homepage Mock", href: "#book", variant: "primary" },
      { label: "View Sections", href: "#sections", variant: "ghost" },
    ],
    highlights: [
      {
        title: "Included",
        bullets: [
          "Homepage + service pages",
          "Lead form routed to email/CRM",
          "Speed + basic SEO setup",
        ],
      },
      {
        title: "Optional",
        bullets: [
          "Online booking",
          "Reviews widget",
          "Local SEO landing pages",
        ],
      },
    ],
    table: {
      title: "Launch timeline (example)",
      rows: [
        ["Week 1", "Copy + layout + design", "Draft to approval"],
        ["Week 2", "Build + mobile + QA", "Staging link"],
        ["Week 3", "Go live + analytics", "Post-launch tweaks"],
      ],
    },
    cards3: [
      {
        title: "What you get",
        text: "A clean site with conversion-first sections, simple navigation, and a lead pipeline you can track.",
      },
      {
        title: "Best for",
        text: "Local services, clinics, trades, and any business that wins by responding faster.",
      },
      {
        title: "Pricing idea",
        text: "One-time build + optional monthly hosting/updates. Keep ownership of your code.",
      },
    ],
  },
  {
    id: "ops",
    tab: "Dashboards & Ops Tools",
    kicker: "Know what’s happening",
    title: "Simple internal tools your team actually uses",
    sub: "Custom dashboards and lightweight apps for scheduling, job tracking, inventory, and reporting—built around how your business runs.",
    chips: ["Postgres", "Admin UI", "Role-based access", "Exports"],
    ctas: [
      { label: "Talk Through Your Process", href: "#book", variant: "primary" },
      { label: "See Example Dashboard", href: "#dashboard", variant: "ghost" },
    ],
    highlights: [
      {
        title: "Common builds",
        bullets: [
          "Job tracker (status, owners, SLAs)",
          "Daily KPI dashboard",
          "Inventory + reorder alerts",
        ],
      },
      {
        title: "Built for reality",
        bullets: [
          "Works on phones/tablets",
          "Exports to CSV",
          "Permissions + audit logs",
        ],
      },
    ],
    table: {
      title: "Example deliverables",
      rows: [
        ["Week 1", "Requirements + wireframes", "Screens + data model"],
        ["Week 2", "Build MVP", "Core flows working"],
        ["Week 3", "Polish + training", "Go-live + handoff"],
      ],
    },
    cards3: [
      {
        title: "What you get",
        text: "A focused tool that matches your workflows, with clear documentation and ongoing support if you want it.",
      },
      {
        title: "Best for",
        text: "Teams still running operations from paper, text threads, or messy spreadsheets.",
      },
      {
        title: "Pricing idea",
        text: "Milestone-based with a clear MVP. Expand only if it’s paying for itself.",
      },
    ],
  },
];

export default function Homepage() {
  const [activeId, setActiveId] = useState<string>("automation");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | "ok" | "error">(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setStatus(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      businessName: String(formData.get("businessName") || ""),
      email: String(formData.get("email") || ""),
      message: String(formData.get("message") || ""),
      website: String(formData.get("website") || ""), // honeypot
    };

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSending(false);

    if (res.ok) {
      setStatus("ok");
      form.reset();
    } else {
      setStatus("error");
    }
  };

  const active = useMemo(
    () => services.find((s) => s.id === activeId) ?? services[0],
    [activeId]
  );

  useEffect(() => {
    const readHash = () => {
      const h = (window.location.hash || "").replace("#", "").trim();
      if (h && services.some((s) => s.id === h)) setActiveId(h);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  const activate = (id: string, pushHash = true) => {
    setActiveId(id);
    if (pushHash) window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="min-h-screen text-[color:var(--text)] antialiased bg-[linear-gradient(180deg,var(--bg),#0a0f1b_40%,#090d17)]">
      <header className="mx-auto max-w-[1100px] px-5 pb-5 text-center">
        <div className="mb-8 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 no-underline">
            <span className="sr-only">ORBISY</span>
            <Image
              src="/orbisy-logo.png"
              alt="ORBISY"
              width={260}
              height={80}
              priority
              // className="h-10 w-auto"
              className="mx-auto h-20 w-auto sm:h-34"
            />
          </a>

          <div className="flex items-center gap-2">
            <a
              href="#services"
              className="rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[color:var(--text)]"
            >
              Services
            </a>
            <a
              href="#book"
              className="rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-2 text-sm font-bold text-[#001]"
            >
              Contact
            </a>
          </div>
        </div>

        <div className="text-[color:var(--muted)] font-semibold tracking-[.12em] uppercase">
          Software Services • Built for Small Businesses
        </div>
        <h1 className="mt-2 text-[clamp(28px,4vw,42px)] leading-[1.15] font-extrabold">
          We build the tools that keep your business running—without the
          enterprise bloat.
        </h1>
        <p className="mx-auto mt-3 max-w-[60ch] text-[color:var(--muted)]">
          Websites, automations, dashboards, and internal tools—delivered fast,
          documented well, and priced clearly. Start with one high-impact win.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-bold border border-[color:var(--border)] shadow-[var(--shadow)] bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001]"
            href="#book"
          >
            Book a Free Audit <span aria-hidden>→</span>
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-bold border border-[color:var(--border)] bg-transparent text-[color:var(--text)]"
            href="#work"
          >
            See How It Works
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {[
            "Local service businesses",
            "Clinics & practices",
            "Retail & restaurants",
            "Trades & contractors",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-[color:var(--border)] bg-white/5 px-3 py-1 text-[13px] text-[color:var(--muted)]"
            >
              {t}
            </span>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 pb-16" id="services">
        <div className="mt-6 overflow-hidden rounded-[calc(var(--radius)+4px)] border border-[color:var(--border)] bg-white/5 shadow-[var(--shadow)]">
          <div
            className="sticky top-0 z-30 flex flex-wrap gap-2 border-b border-[color:var(--border)] bg-white/5 p-2 backdrop-blur"
            role="tablist"
            aria-label="Service Tabs"
          >
            {services.map((s, idx) => {
              const selected = s.id === activeId;
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${s.id}`}
                  id={`tab-${s.id}`}
                  onClick={() => activate(s.id)}
                  onKeyDown={(e) => {
                    if (
                      ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                    )
                      e.preventDefault();
                    const focusBy = (nextIdx: number) => {
                      const el = document.getElementById(
                        `tab-${services[nextIdx].id}`
                      );
                      (el as HTMLButtonElement | null)?.focus();
                    };
                    if (e.key === "ArrowRight")
                      focusBy((idx + 1) % services.length);
                    if (e.key === "ArrowLeft")
                      focusBy((idx - 1 + services.length) % services.length);
                    if (e.key === "Home") focusBy(0);
                    if (e.key === "End") focusBy(services.length - 1);
                  }}
                  className={
                    "rounded-full border px-4 py-2 font-semibold tracking-[.01em] " +
                    (selected
                      ? "border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001]"
                      : "border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)]")
                  }
                >
                  {s.tab}
                </button>
              );
            })}
          </div>

          <div className="relative">
            {services.map((s) => {
              const isActive = s.id === activeId;
              const anchor =
                s.id === "automation"
                  ? "workflows"
                  : s.id === "websites"
                  ? "sections"
                  : "dashboard";

              return (
                <section
                  key={s.id}
                  id={`panel-${s.id}`}
                  role="tabpanel"
                  tabIndex={0}
                  aria-labelledby={`tab-${s.id}`}
                  className={"p-6 " + (isActive ? "block" : "hidden")}
                  style={
                    isActive
                      ? ({
                          animation: "fade .25s ease-in",
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <div className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
                    <div className="text-[color:var(--muted)] font-semibold tracking-[.12em] uppercase text-sm">
                      {s.kicker}
                    </div>
                    <h2 className="mt-2 text-[clamp(20px,3vw,26px)] font-extrabold">
                      {s.title}
                    </h2>
                    <p className="mt-2 text-[color:var(--muted)] max-w-[70ch]">
                      {s.sub}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.chips.map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-[color:var(--border)] bg-white/5 px-3 py-1 text-[13px] text-[color:var(--muted)]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {s.ctas.map((cta) => (
                        <a
                          key={cta.label}
                          href={cta.href}
                          className={
                            "inline-flex items-center gap-2 rounded-xl px-4 py-3 font-bold border border-[color:var(--border)] " +
                            (cta.variant === "primary"
                              ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001] border-transparent"
                              : "bg-transparent text-[color:var(--text)]")
                          }
                        >
                          {cta.label} <span aria-hidden>→</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {s.highlights.map((h) => (
                      <div
                        key={h.title}
                        className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4"
                      >
                        <h3 className="text-lg font-bold">{h.title}</h3>
                        <ul className="mt-2 list-disc pl-5 text-[color:var(--muted)]">
                          {h.bullets.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div
                    className="mt-5 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-6"
                    id={anchor}
                  >
                    <h2 className="text-[clamp(20px,3vw,26px)] font-extrabold">
                      {s.table.title}
                    </h2>
                    <div className="mt-3 overflow-auto">
                      <table className="w-full min-w-[520px] border-collapse">
                        <thead>
                          <tr className="text-[color:var(--muted)]">
                            <th className="border-b border-[color:var(--border)] p-2 text-left font-bold w-[160px]">
                              When
                            </th>
                            <th className="border-b border-[color:var(--border)] p-2 text-left font-bold">
                              What happens
                            </th>
                            <th className="border-b border-[color:var(--border)] p-2 text-left font-bold">
                              Owner
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.table.rows.map((r, i) => (
                            <tr key={i}>
                              <td className="border-b border-[color:var(--border)] p-2">
                                {r[0]}
                              </td>
                              <td className="border-b border-[color:var(--border)] p-2">
                                {r[1]}
                              </td>
                              <td className="border-b border-[color:var(--border)] p-2 text-[color:var(--muted)]">
                                {r[2]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {s.cards3.map((c) => (
                      <div
                        key={c.title}
                        className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4"
                      >
                        <h3 className="text-lg font-bold">{c.title}</h3>
                        <p className="mt-2 text-[color:var(--muted)]">
                          {c.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div
                    className="mt-5 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-6"
                    id="book"
                  >
                    <h2 className="text-[clamp(20px,3vw,26px)] font-extrabold">
                      Let’s scope your first win
                    </h2>
                    <p className="mt-2 text-[color:var(--muted)] max-w-[70ch]">
                      Tell me what tools you use and where work gets stuck. I’ll
                      propose one high-impact build (and a clear fixed price)
                      within 48 hours.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                        <h3 className="text-lg font-bold">Quick intake</h3>
                        <form className="mt-3 grid gap-3" onSubmit={onSubmit}>
                          {/* honeypot */}
                          <input
                            name="website"
                            tabIndex={-1}
                            autoComplete="off"
                            className="hidden"
                            aria-hidden="true"
                          />

                          <label className="grid gap-1">
                            <span className="text-sm text-[color:var(--muted)]">
                              Business name
                            </span>
                            <input
                              name="businessName"
                              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                              placeholder="Acme Plumbing"
                            />
                          </label>

                          <label className="grid gap-1">
                            <span className="text-sm text-[color:var(--muted)]">
                              Email
                            </span>
                            <input
                              name="email"
                              type="email"
                              required
                              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                              placeholder="you@business.com"
                            />
                          </label>

                          <label className="grid gap-1">
                            <span className="text-sm text-[color:var(--muted)]">
                              What are you trying to fix?
                            </span>
                            <textarea
                              name="message"
                              required
                              className="min-h-[96px] rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                              placeholder="We manually copy leads into our CRM, then send texts one-by-one…"
                            />
                          </label>

                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001] disabled:opacity-60"
                            type="submit"
                            disabled={sending}
                          >
                            {sending ? "Sending..." : "Request proposal"}{" "}
                            <span aria-hidden>→</span>
                          </button>

                          {status === "ok" && (
                            <p className="text-sm text-[color:var(--accent-2)]">
                              Sent! I’ll reply soon.
                            </p>
                          )}
                          {status === "error" && (
                            <p className="text-sm text-red-300">
                              Something went wrong. Try again or email directly.
                            </p>
                          )}
                        </form>
                      </div>

                      <div className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                        <h3 className="text-lg font-bold">What to expect</h3>
                        <ul className="mt-2 list-disc pl-5 text-[color:var(--muted)]">
                          <li>
                            Short call (15–20 min) to understand your workflow
                          </li>
                          <li>Written scope + fixed price</li>
                          <li>Build + handoff docs + training</li>
                        </ul>

                        <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                          <h4 className="font-bold">Need help right now?</h4>
                          <p className="mt-1 text-[color:var(--muted)]">
                            Email:{" "}
                            <a
                              className="text-[color:var(--accent)]"
                              href="mailto:anthonyeaves33@gmail.com"
                            >
                              AnthonyEaves33@gmail.com
                            </a>
                            <br />
                            Phone:{" "}
                            <span className="text-[color:var(--muted)]">
                              (331) 703-4585
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <div id="work" className="p-6">
            <div className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
              <h2 className="text-[clamp(20px,3vw,26px)] font-extrabold">
                How it works (shared)
              </h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[color:var(--muted)]">
                    You don’t need a 6-month project plan. We start with a
                    single outcome that saves time or increases revenue, ship
                    quickly, then decide what’s next.
                  </p>
                  <ul className="mt-3 list-disc pl-5 text-[color:var(--muted)]">
                    <li>Clear scope & deliverables</li>
                    <li>Fast builds, frequent demos</li>
                    <li>Documentation + ownership</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                  <h3 className="text-lg font-bold">Good fit if you…</h3>
                  <ul className="mt-2 list-disc pl-5 text-[color:var(--muted)]">
                    <li>Do the same admin tasks every day</li>
                    <li>Lose leads because responses are slow</li>
                    <li>Run ops from spreadsheets/text threads</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <footer className="p-6 text-center text-[color:var(--muted)]">
            © {new Date().getFullYear()} ORBISY. All Rights Reserved.
          </footer>
        </div>
      </main>
    </div>
  );
}
