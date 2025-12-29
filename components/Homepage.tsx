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
    tab: "HVAC Lead Capture & Booking System",
    kicker: "Never miss another booking opportunity",
    title:
      "Capture every call, text, and web lead — then follow up automatically",
    sub: "HVAC companies lose revenue when calls go to voicemail, estimates sit unanswered, and leads scatter across phones and inboxes. We install a centralized system that responds instantly, tracks every lead, and automates follow-ups so more inquiries become booked jobs.",
    chips: [
      "Missed-call text-back",
      "Call tracking",
      "Centralized CRM",
      "Automated SMS/Email",
    ],
    ctas: [
      { label: "Book a Free Growth Call", href: "#book", variant: "primary" },
      { label: "See How It Works", href: "#workflows", variant: "ghost" },
    ],
    highlights: [
      {
        title: "What we fix first",
        bullets: [
          "Missed calls after hours or during peak season — instant text-back so leads don't call your competitor",
          "Estimates sent but never followed up — automated reminders until they book",
          "Leads scattered across phones, emails, and spreadsheets — one dashboard with full visibility",
          "No tracking of which leads turn into booked jobs — simple reporting so you know what's working",
        ],
      },
      {
        title: "Built for growing HVAC companies",
        bullets: [
          "Works with your existing phone system and tools",
          "No complicated software rollout or staff training",
          "Clear documentation so you're never dependent on us",
          "Scales as you add more technicians",
        ],
      },
    ],
    table: {
      title: "Typical installation timeline",
      rows: [
        ["Week 1", "Audit current lead flow and booking process", "You + us"],
        ["Week 2", "Install and customize your HVAC booking system", "Us"],
        ["Week 3", "Monitor bookings and optimize follow-ups", "You + us"],
      ],
    },
    cards3: [
      {
        title: "What you get",
        text: "A complete HVAC lead capture and booking system that responds instantly, keeps your team accountable, and prevents missed opportunities. Every lead gets tracked from first contact to booked job.",
      },
      {
        title: "Best for",
        text: "HVAC companies with 5–20 technicians who are growing fast and can't afford to miss calls or lose leads to slow follow-up.",
      },
      {
        title: "Typical outcome",
        text: "20–40% increase in booked jobs within 60 days without spending more on ads — because you stop leaking leads and follow up consistently.",
      },
    ],
  },
  {
    id: "websites",
    tab: "HVAC Website & Online Booking",
    kicker: "Turn website visitors into booked jobs",
    title:
      "A fast HVAC website that converts — with online booking and estimate requests",
    sub: "Most HVAC websites look fine but don't convert. We build a mobile-first site with clear messaging, strong CTAs, online booking, and reliable lead routing so customers can book service 24/7 and your team responds fast.",
    chips: ["Next.js", "Online booking", "Google integration", "Mobile-first"],
    ctas: [
      { label: "Book a Free Growth Call", href: "#book", variant: "primary" },
      { label: "What’s Included", href: "#sections", variant: "ghost" },
    ],
    highlights: [
      {
        title: "Included",
        bullets: [
          "Conversion-focused homepage built for HVAC companies",
          "Online booking and estimate request forms",
          "Lead routing to your CRM with instant auto-reply",
          "Google Business Profile integration",
          "Speed optimization + basic SEO setup",
        ],
      },
      {
        title: "Optional add-ons",
        bullets: [
          "Service area landing pages (AC repair, heating, etc.)",
          "Customer reviews widget and social proof",
          "Maintenance plan signup forms",
          "Emergency service CTAs",
        ],
      },
    ],
    table: {
      title: "Website launch timeline (typical)",
      rows: [
        ["Week 1", "Copy, layout, and messaging approval", "Draft to final"],
        ["Week 2", "Build site + mobile QA + booking setup", "Staging link"],
        ["Week 3", "Go-live + tracking + post-launch tweaks", "Live site"],
      ],
    },
    cards3: [
      {
        title: "What you get",
        text: "An HVAC website designed to book jobs 24/7, not just look good — plus a lead pipeline you can track from website visit to completed job.",
      },
      {
        title: "Best for",
        text: "Growing HVAC companies that want to capture more online leads and let customers book service without calling during business hours.",
      },
      {
        title: "Typical outcome",
        text: "More inquiries convert to booked jobs because customers can book instantly and follow-up is automatic and consistent.",
      },
    ],
  },
  {
    id: "ops",
    tab: "HVAC Dashboards & Job Tracking",
    kicker: "Clarity for your daily operations",
    title:
      "Simple dashboards for scheduling, job tracking, and team visibility",
    sub: "When operations live in texts, spreadsheets, and sticky notes, jobs get missed and technicians lose time. We build lightweight dashboards that match how HVAC teams actually work — so everyone knows what's scheduled, what's in progress, and what needs follow-up.",
    chips: ["Job tracker", "Daily KPIs", "Technician schedules", "Reporting"],
    ctas: [
      { label: "Book a Free Growth Call", href: "#book", variant: "primary" },
      { label: "See Example Tools", href: "#dashboard", variant: "ghost" },
    ],
    highlights: [
      {
        title: "Common builds for HVAC",
        bullets: [
          "Job tracker (status, assigned tech, next step)",
          "Daily KPI dashboard (calls, bookings, revenue)",
          "Technician schedule view (mobile-friendly)",
          "Parts inventory + reorder alerts",
        ],
      },
      {
        title: "Designed for field teams",
        bullets: [
          "Works on phones and tablets in the truck",
          "Simple permissions by role (owner, dispatcher, tech)",
          "Documentation and training included",
          "Integrates with your existing systems",
        ],
      },
    ],
    table: {
      title: "Dashboard build plan (example)",
      rows: [
        ["Week 1", "Requirements + wireframes", "Screens + data model"],
        ["Week 2", "Build MVP dashboard", "Core flows working"],
        ["Week 3", "Polish + team training", "Go-live + handoff"],
      ],
    },
    cards3: [
      {
        title: "What you get",
        text: "A focused dashboard that matches your HVAC workflow so the team actually uses it — and stops improvising with texts and paper.",
      },
      {
        title: "Best for",
        text: "HVAC companies juggling multiple jobs, technicians, and follow-ups across too many tools and losing visibility.",
      },
      {
        title: "Typical outcome",
        text: "Fewer missed jobs, faster handoffs, and clearer accountability — without expensive enterprise software your team won't use.",
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen text-[color:var(--text)] antialiased bg-[linear-gradient(180deg,var(--bg),#0a0f1b_40%,#090d17)]">
      <header className="mx-auto max-w-[1100px] px-5 pb-5 text-center">
        <div className="mb-8 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 no-underline">
            <span className="sr-only">ORBISY</span>
            <Image
              src="/orbisy-logo.png"
              alt="ORBISY"
              width={260}
              height={80}
              priority
              className="h-16 w-auto sm:h-20"
            />
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="#services"
              className="rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/10 transition-colors"
            >
              Services
            </a>
            <a
              href="/login"
              className="rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/10 transition-colors"
            >
              Login
            </a>
            <CalendlyButton className="cursor-pointer rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-2 text-sm font-bold text-[#001] hover:opacity-90 transition-opacity">
              Book Call
            </CalendlyButton>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-lg border border-[color:var(--border)] bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-0.5 bg-[color:var(--text)] transition-all ${
                mobileMenuOpen ? "rotate-45 translate-y-1.5" : ""
              }`}
            ></span>
            <span
              className={`block w-5 h-0.5 bg-[color:var(--text)] mt-1 transition-all ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            ></span>
            <span
              className={`block w-5 h-0.5 bg-[color:var(--text)] mt-1 transition-all ${
                mobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
              }`}
            ></span>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mb-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-[color:var(--text)] hover:bg-white/5 transition-colors font-semibold"
            >
              Services
            </a>
            <a
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-[color:var(--text)] hover:bg-white/5 transition-colors font-semibold"
            >
              Login
            </a>
            <CalendlyButton className="cursor-pointer w-full block px-4 py-3 rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001] font-bold hover:opacity-90 transition-opacity">
              Book Call
            </CalendlyButton>
          </div>
        )}

        <div className="text-[color:var(--muted)] font-semibold tracking-[.12em] uppercase">
          Built for Growing HVAC Companies
        </div>

        <h1 className="mt-2 text-[clamp(28px,4vw,44px)] leading-[1.1] font-extrabold">
          Book 20–40% More HVAC Jobs in 60 Days — Without Hiring More Office
          Staff
        </h1>

        <p className="mx-auto mt-3 max-w-[70ch] text-[color:var(--muted)]">
          ORBISY installs automated lead capture and follow-up systems for
          growing HVAC companies so you never miss a call, lead, or booking
          opportunity.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <CalendlyButton className="cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-3 font-bold border border-[color:var(--border)] shadow-[var(--shadow)] bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001]">
            Book a Free Growth Call →
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
              "5–20 technicians",
              "Residential HVAC",
              "Commercial HVAC",
              "Heating & Cooling",
              "Emergency Service",
              "Maintenance Plans",
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
            Best for HVAC companies doing at least <strong>$500k/year</strong>{" "}
            in revenue.
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
                      Book a Free 30-Minute HVAC Growth Call
                    </h2>
                    <p className="mt-2 text-[color:var(--muted)] max-w-[80ch]">
                      We'll review your current lead flow and show you exactly
                      where booking opportunities are being missed. You'll get a
                      clear action plan to increase booked jobs—whether you work
                      with us or not.
                    </p>
                    <p className="mt-2 text-[color:var(--muted)] text-sm">
                      <strong>Best for:</strong> HVAC companies with 5–20
                      technicians doing at least $500k/year in revenue.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                        <h3 className="text-lg font-bold">
                          Request your free call
                        </h3>
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
                              placeholder="Acme HVAC"
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
                              Tell us about your current lead process
                            </span>
                            <textarea
                              name="message"
                              required
                              className="min-h-[96px] rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                              placeholder="Example: Calls come in during the day, some go to voicemail after hours. We send estimates but don't always follow up…"
                            />
                          </label>

                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001] disabled:opacity-60"
                            type="submit"
                            disabled={sending}
                          >
                            {sending ? "Sending..." : "Book My Free Call"}{" "}
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
                          <li>30-minute HVAC growth call</li>
                          <li>
                            Analysis of where you're losing booking
                            opportunities
                          </li>
                          <li>Clear action plan to increase booked jobs</li>
                          <li>Next steps (whether you work with us or not)</li>
                        </ul>

                        <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                          <h4 className="font-bold">Our guarantee</h4>
                          <p className="mt-1 text-[color:var(--muted)] text-sm">
                            If you don't see a measurable increase in booked
                            jobs within 60 days, we work for free until you do.
                          </p>
                        </div>

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
                    Most HVAC companies don't need "more leads"—they need to
                    stop losing the ones they already get. We start by fixing
                    your lead capture and follow-up process, then optimize for
                    maximum bookings.
                  </p>
                  <ol className="mt-3 list-decimal pl-5 text-[color:var(--muted)]">
                    <li>Audit your current lead flow and booking process</li>
                    <li>Install and customize your HVAC booking system</li>
                    <li>Monitor bookings and optimize follow-ups</li>
                  </ol>
                </div>
                <div className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4">
                  <h3 className="text-lg font-bold">Good fit if you…</h3>
                  <ul className="mt-2 list-disc pl-5 text-[color:var(--muted)]">
                    <li>Have 5–20 technicians and doing $500k+/year</li>
                    <li>Miss calls after hours or during peak demand</li>
                    <li>Send estimates but follow-up isn't consistent</li>
                    <li>Lose visibility on which leads become booked jobs</li>
                  </ul>
                  <p className="mt-3 text-[color:var(--muted)] text-sm italic">
                    Every missed call or forgotten follow-up is revenue going to
                    your competitors.
                  </p>
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
