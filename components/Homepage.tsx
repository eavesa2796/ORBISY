"use client";

import React, { useEffect, useMemo, useState } from "react";
import CalendlyButton from "@/components/CalendlyButton";
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
    tab: "Lead Follow-Up & Automations",
    kicker: "Stop losing leads",
    title: "Instant replies + reminders so every lead gets handled",
    sub: "Local businesses lose customers when leads sit too long. We set up simple automations that respond immediately, notify your team, and keep follow-ups from slipping through the cracks.",
    chips: [
      "Website forms",
      "Instagram DMs",
      "Email/SMS alerts",
      "Zapier/Make",
    ],
    ctas: [
      { label: "Book a Free Lead Audit", href: "#book", variant: "primary" },
      { label: "See How It Works", href: "#workflows", variant: "ghost" },
    ],
    highlights: [
      {
        title: "What we automate first",
        bullets: [
          "Instant auto-reply to new leads (so they don’t bounce)",
          "Owner alerts when a lead comes in",
          "Follow-up reminders until the lead is contacted",
        ],
      },
      {
        title: "Built for local reality",
        bullets: [
          "Works with what you already use",
          "No complicated “software rollout”",
          "Clear documentation so you’re not dependent on us",
        ],
      },
    ],
    table: {
      title: "72-hour lead fix (typical)",
      rows: [
        ["Day 1", "Audit lead sources + map follow-up flow", "You + me"],
        ["Day 2", "Build automations + notifications + tracking", "Me"],
        ["Day 3", "Test, tune messaging, go-live", "You + me"],
      ],
    },
    cards3: [
      {
        title: "What you get",
        text: "A lead follow-up system that responds fast, keeps your team accountable, and prevents missed opportunities.",
      },
      {
        title: "Best for",
        text: "Local service businesses where speed-to-lead matters (calls, website forms, IG).",
      },
      {
        title: "Typical outcome",
        text: "More booked jobs without spending more on ads—because you stop leaking leads.",
      },
    ],
  },
  {
    id: "websites",
    tab: "Websites & Lead Capture",
    kicker: "Turn visitors into booked jobs",
    title: "A fast homepage that converts—and routes leads correctly",
    sub: "Most websites look fine but leak leads. We build a clean, mobile-first site with clear messaging, strong CTAs, and reliable lead routing so you can respond fast.",
    chips: ["Next.js", "Local SEO basics", "Forms/Booking", "Analytics"],
    ctas: [
      { label: "Book a Free Lead Audit", href: "#book", variant: "primary" },
      { label: "What’s Included", href: "#sections", variant: "ghost" },
    ],
    highlights: [
      {
        title: "Included",
        bullets: [
          "Conversion-first homepage sections",
          "Lead form routed to email/CRM + auto-reply",
          "Speed + basic SEO setup",
        ],
      },
      {
        title: "Optional add-ons",
        bullets: [
          "Online booking",
          "Reviews widget + social proof",
          "Location/Service landing pages",
        ],
      },
    ],
    table: {
      title: "Homepage launch timeline (example)",
      rows: [
        ["Week 1", "Copy + layout + approval", "Draft to final"],
        ["Week 2", "Build + mobile QA", "Staging link"],
        ["Week 3", "Go-live + tracking", "Post-launch tweaks"],
      ],
    },
    cards3: [
      {
        title: "What you get",
        text: "A homepage designed to get calls/messages, not just look good—and a lead pipeline you can actually track.",
      },
      {
        title: "Best for",
        text: "Trades and local services that win by responding faster than competitors.",
      },
      {
        title: "Typical outcome",
        text: "More inquiries convert to booked work because follow-up is automatic and consistent.",
      },
    ],
  },
  {
    id: "ops",
    tab: "Dashboards & Ops Tools",
    kicker: "Clarity for the day-to-day",
    title: "Simple tools for scheduling, jobs, and visibility",
    sub: "When operations live in texts and spreadsheets, things get missed. We build lightweight dashboards and internal tools that match how your team actually works.",
    chips: ["Postgres", "Admin UI", "Exports", "Audit trails"],
    ctas: [
      { label: "Book a Free Lead Audit", href: "#book", variant: "primary" },
      { label: "See Example Tools", href: "#dashboard", variant: "ghost" },
    ],
    highlights: [
      {
        title: "Common builds",
        bullets: [
          "Job tracker (status, owner, next step)",
          "Daily KPI dashboard",
          "Inventory + reorder alerts",
        ],
      },
      {
        title: "Designed for adoption",
        bullets: [
          "Works on phones/tablets",
          "Simple permissions",
          "Documentation + training included",
        ],
      },
    ],
    table: {
      title: "MVP build plan (example)",
      rows: [
        ["Week 1", "Requirements + wireframes", "Screens + data model"],
        ["Week 2", "Build MVP", "Core flows working"],
        ["Week 3", "Polish + training", "Go-live + handoff"],
      ],
    },
    cards3: [
      {
        title: "What you get",
        text: "A focused tool that matches your workflow so the team actually uses it (and stops improvising).",
      },
      {
        title: "Best for",
        text: "Businesses juggling jobs, schedules, and follow-ups across too many places.",
      },
      {
        title: "Typical outcome",
        text: "Fewer missed steps, faster handoffs, and clearer ownership—without enterprise complexity.",
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
              className="mx-auto h-20 w-auto sm:h-24"
            />
          </a>

          <div className="flex items-center gap-2">
            <a
              href="#services"
              className="rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[color:var(--text)]"
            >
              Services
            </a>
            <CalendlyButton className="cursor-pointer rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-2 text-sm font-bold text-[#001]">
              Book Audit
            </CalendlyButton>
          </div>
        </div>

        <div className="text-[color:var(--muted)] font-semibold tracking-[.12em] uppercase">
          Built for Local Service Businesses
        </div>

        <h1 className="mt-2 text-[clamp(28px,4vw,44px)] leading-[1.1] font-extrabold">
          Stop losing leads from your website & Instagram.
        </h1>

        <p className="mx-auto mt-3 max-w-[70ch] text-[color:var(--muted)]">
          ORBISY helps local businesses capture every lead, respond instantly,
          and track follow-ups so more inquiries turn into booked jobs—without
          expensive software or complicated setups.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <CalendlyButton className="cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-3 font-bold border border-[color:var(--border)] shadow-[var(--shadow)] bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001]">
            Book a Free Lead Audit →
          </CalendlyButton>
          <a
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-bold border border-[color:var(--border)] bg-transparent text-[color:var(--text)]"
            href="#work"
          >
            See How It Works
          </a>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3">
          {/* Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 px-2">
            {[
              "Plumbers",
              "HVAC",
              "Electricians",
              "Med spas",
              "Clinics & practices",
              "Contractors",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-[color:var(--border)] bg-white/5 px-3 py-1 text-[13px] text-[color:var(--muted)]"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Pricing line */}
          <p className="text-center text-sm text-[color:var(--muted)]">
            Most Lead Follow-Up Fix setups start at{" "}
            <strong>$750 one-time</strong>.
          </p>
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
                      Book a free lead audit
                    </h2>
                    <p className="mt-2 text-[color:var(--muted)] max-w-[80ch]">
                      I’ll review how leads come in from your website and
                      Instagram (and how fast they’re handled). You’ll get a
                      short action plan you can implement immediately—whether
                      you work with ORBISY or not.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                        <h3 className="text-lg font-bold">Request the audit</h3>
                        <form className="mt-3 grid gap-3" onSubmit={onSubmit}>
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
                              placeholder="Acme Electric"
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
                              What happens when a lead comes in?
                            </span>
                            <textarea
                              name="message"
                              required
                              className="min-h-[96px] rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                              placeholder="Leads come from our website + IG DMs. Response time varies…"
                            />
                          </label>

                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001] disabled:opacity-60"
                            type="submit"
                            disabled={sending}
                          >
                            {sending ? "Sending..." : "Request audit"}{" "}
                            <span aria-hidden>→</span>
                          </button>

                          {status === "ok" && (
                            <p className="text-sm text-[color:var(--accent-2)]">
                              Sent! I’ll reply soon with next steps.
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
                        <h3 className="text-lg font-bold">What you’ll get</h3>
                        <ul className="mt-2 list-disc pl-5 text-[color:var(--muted)]">
                          <li>15–20 minute call</li>
                          <li>Where leads are being missed (if anywhere)</li>
                          <li>Recommended “72-hour fix” plan</li>
                          <li>Clear next steps (with or without us)</li>
                        </ul>

                        <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                          <h4 className="font-bold">Prefer email?</h4>
                          <p className="mt-1 text-[color:var(--muted)]">
                            <a
                              className="text-[color:var(--accent)]"
                              href="mailto:info@orbisy.com"
                            >
                              info@orbisy.com
                            </a>
                            <br />
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
                How it works
              </h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[color:var(--muted)]">
                    Most local businesses don’t need “more leads”—they need to
                    stop losing the ones they already get. We start by fixing
                    speed-to-lead and follow-up, then expand only if it’s paying
                    for itself.
                  </p>
                  <ol className="mt-3 list-decimal pl-5 text-[color:var(--muted)]">
                    <li>Audit your lead sources (website + Instagram)</li>
                    <li>Set up instant replies + owner alerts</li>
                    <li>Track follow-up so nothing slips</li>
                  </ol>
                </div>
                <div className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                  <h3 className="text-lg font-bold">Good fit if you…</h3>
                  <ul className="mt-2 list-disc pl-5 text-[color:var(--muted)]">
                    <li>Get leads but response time varies</li>
                    <li>Have website forms + IG DMs in different places</li>
                    <li>Lose jobs because follow-up isn’t consistent</li>
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
