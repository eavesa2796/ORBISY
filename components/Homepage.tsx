"use client";

import React, { useState } from "react";
import CalendlyButton from "@/components/CalendlyButton";
import Image from "next/image";
import Link from "next/link";

export default function Homepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen text-[color:var(--text)] antialiased bg-[linear-gradient(180deg,var(--bg),#0a0f1b_40%,#090d17)]">
      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="mx-auto max-w-[1100px] px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <span className="sr-only">ORBISY</span>
            <Image
              src="/orbisy-logo.png"
              alt="ORBISY"
              width={260}
              height={80}
              priority
              className="h-14 w-auto sm:h-16"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="#features"
              className="rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/10 transition-colors"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/10 transition-colors"
            >
              Workflow
            </a>
            <a
              href="#comparison"
              className="rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/10 transition-colors"
            >
              Why ORBISY
            </a>
            <Link
              href="/login"
              className="rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
            <CalendlyButton className="cursor-pointer rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-5 py-2 text-sm font-bold text-[#001] hover:opacity-90 transition-opacity">
              Book a Demo
            </CalendlyButton>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-lg border border-[color:var(--border)] bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-0.5 bg-[color:var(--text)] transition-all ${mobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-[color:var(--text)] mt-1 transition-all ${mobileMenuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-[color:var(--text)] mt-1 transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
            />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 space-y-2">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-[color:var(--text)] hover:bg-white/5 font-semibold"
            >
              Features
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-[color:var(--text)] hover:bg-white/5 font-semibold"
            >
              Workflow
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-[color:var(--text)] hover:bg-white/5 font-semibold"
            >
              Why ORBISY
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-[color:var(--text)] hover:bg-white/5 font-semibold"
            >
              Sign In
            </Link>
            <CalendlyButton className="cursor-pointer w-full block text-center px-4 py-3 rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001] font-bold hover:opacity-90">
              Book a Demo
            </CalendlyButton>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <header className="mx-auto max-w-[1100px] px-5 pt-12 pb-16 text-center">
        <div className="inline-block rounded-full border border-[color:var(--border)] bg-white/5 px-4 py-1.5 text-xs font-bold tracking-[.14em] uppercase text-[color:var(--muted)] mb-5">
          Proposal Software + Revenue Recovery for HVAC Teams
        </div>

        <h1 className="text-[clamp(30px,4.5vw,52px)] leading-[1.08] font-extrabold tracking-tight max-w-[18ch] mx-auto">
          HVAC proposals, follow-up, and revenue recovery in one simple
          <br className="hidden md:block" />
          <span className="bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] bg-clip-text text-transparent">
            platform.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-[64ch] text-lg text-[color:var(--muted)] leading-relaxed">
          ORBISY helps HVAC teams send Good / Better / Best replacement
          proposals, track homeowner engagement, and recover jobs that usually
          slip through the cracks.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <CalendlyButton className="cursor-pointer inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-bold text-base bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001] hover:opacity-90 transition-opacity shadow-[0_4px_24px_rgba(101,214,255,0.25)]">
            Book a Demo
          </CalendlyButton>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-bold text-base border border-[color:var(--border)] bg-white/5 text-[color:var(--text)] hover:bg-white/10 transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[color:var(--muted)]">
          {[
            "Good / Better / Best proposal builder",
            "Homeowner proposal links and acceptance flow",
            "Automated stale proposal follow-up",
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="text-[color:var(--accent-2)]">✓</span> {t}
            </span>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 pb-20 space-y-16">
        {/* ── BUILT FOR HVAC ───────────────────────────────────────── */}
        <section id="built-for-hvac">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <div className="text-xs font-bold tracking-[.14em] uppercase text-[color:var(--muted)] mb-3">
                  Built for HVAC Sales Teams
                </div>
                <h2 className="text-[clamp(22px,3.2vw,34px)] font-extrabold leading-tight">
                  ORBISY gives your team one clear system from proposal to
                  follow-up to closed replacement jobs.
                </h2>
                <p className="mt-4 text-[color:var(--muted)]">
                  This is not a generic CRM. It is purpose-built for HVAC owners
                  and sales teams that need to present options clearly, keep
                  homeowners moving, and recover revenue from missed leads, weak
                  follow-up, and stale estimates.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  "Sell replacements with Good / Better / Best options homeowners understand quickly",
                  "Send customer-facing proposal links and track what each homeowner actually reviews",
                  "Use engagement signals to prioritize who to call now and what to say",
                  "Auto-follow up stale proposals so good opportunities do not die in the pipeline",
                  "Keep revenue recovery in view with missed opportunity tracking and sales visibility",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-white/5 px-4 py-3"
                  >
                    <span className="text-[color:var(--accent-2)] font-bold mt-0.5">
                      ✓
                    </span>
                    <span className="text-sm text-[color:var(--muted)]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE CARDS ─────────────────────────────────────────── */}
        <section id="features">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-8 md:p-10">
            <div className="text-xs font-bold tracking-[.14em] uppercase text-[color:var(--muted)] mb-3">
              Product Capabilities
            </div>
            <h2 className="text-[clamp(22px,3.2vw,34px)] font-extrabold leading-tight">
              Proposal software + revenue recovery in one workflow
            </h2>
            <p className="mt-4 text-[color:var(--muted)] max-w-[70ch]">
              Everything your HVAC team needs to present options, track intent,
              and recover jobs that usually slip through the cracks.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  num: "01",
                  title: "Good / Better / Best proposal builder",
                  desc: "Build clear replacement proposals with option tiers, pricing, and scope details that make homeowner decisions easier.",
                },
                {
                  num: "02",
                  title: "Homeowner proposal portal",
                  desc: "Send customer-facing proposal links homeowners can review, compare, and accept from any device without long back-and-forth.",
                },
                {
                  num: "03",
                  title: "Proposal engagement tracking",
                  desc: "See views, option focus, and timing signals so your sales team knows which proposal is hot and who needs immediate follow-up.",
                },
                {
                  num: "04",
                  title: "Automated follow-up",
                  desc: "Trigger structured follow-up for stale proposals so opportunities are revived before they disappear from your pipeline.",
                },
                {
                  num: "05",
                  title: "Revenue recovery dashboard",
                  desc: "Track missed opportunities, weak follow-up, stale estimates, and pipeline movement in one view built for HVAC owners and sales managers.",
                },
                {
                  num: "06",
                  title: "Prospect scoring and website audits",
                  desc: "Prioritize high-value prospects, generate outreach drafts faster, and run website audit insights to uncover additional sales opportunities.",
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className="rounded-xl border border-[color:var(--border)] bg-white/5 p-5"
                >
                  <div className="text-xs font-bold text-[color:var(--accent)] tracking-[.12em] mb-2">
                    {item.num}
                  </div>
                  <h3 className="font-bold text-base mb-2">{item.title}</h3>
                  <p className="text-[color:var(--muted)] text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WORKFLOW ──────────────────────────────────────────────── */}
        <section id="workflow">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-8 md:p-10">
            <div className="text-xs font-bold tracking-[.14em] uppercase text-[color:var(--muted)] mb-3">
              Simple Workflow
            </div>
            <h2 className="text-[clamp(22px,3.2vw,34px)] font-extrabold leading-tight mb-2">
              From quote to close in five practical steps
            </h2>
            <p className="text-[color:var(--muted)] max-w-[60ch]">
              ORBISY keeps your team focused on selling, while the platform
              handles tracking and follow-up signals in the background.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {[
                {
                  num: "1",
                  title: "Build the proposal",
                  desc: "Create Good / Better / Best replacement options with pricing and scope in minutes.",
                },
                {
                  num: "2",
                  title: "Send the customer link",
                  desc: "Share a clean homeowner proposal link they can open, review, and accept from any device.",
                },
                {
                  num: "3",
                  title: "Track views and option interest",
                  desc: "See engagement events, option focus, and follow-up signals to prioritize next actions.",
                },
                {
                  num: "4",
                  title: "Follow up automatically",
                  desc: "Trigger follow-up sequences on stale proposals so your team does not lose momentum.",
                },
                {
                  num: "5",
                  title: "Win more replacement jobs",
                  desc: "Close more opportunities from the pipeline you already have without adding process overhead.",
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="rounded-xl border border-[color:var(--border)] bg-white/5 p-5"
                >
                  <div className="text-xs font-bold text-[color:var(--accent)] tracking-[.14em] mb-2">
                    STEP {step.num}
                  </div>
                  <h3 className="font-bold text-base mb-2">{step.title}</h3>
                  <p className="text-[color:var(--muted)] text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON / POSITIONING ─────────────────────────────── */}
        <section id="comparison">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-8 md:p-10">
            <div className="text-xs font-bold tracking-[.14em] uppercase text-[color:var(--muted)] mb-3">
              Positioning
            </div>
            <h2 className="text-[clamp(22px,3.2vw,34px)] font-extrabold leading-tight mb-2">
              A simpler, lower-cost alternative to bulky HVAC sales platforms.
            </h2>
            <p className="text-[color:var(--muted)] max-w-[70ch]">
              ORBISY focuses on the core revenue path: build proposals,
              understand homeowner intent, automate follow-up, and recover
              pipeline leaks. You get the capabilities your team uses every day
              without bloated workflows, long implementations, or enterprise
              overhead.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "What HVAC teams get with ORBISY",
                  points: [
                    "Fast proposal creation with Good / Better / Best selling",
                    "Customer-facing links with acceptance flow",
                    "Engagement tracking for view behavior and option focus",
                    "Automated stale proposal follow-up",
                    "Missed opportunity and pipeline visibility",
                  ],
                },
                {
                  title: "Revenue recovery outcomes",
                  points: [
                    "Fewer stale estimates",
                    "Stronger follow-up consistency",
                    "Better prioritization of high-intent homeowners",
                    "Clearer sales pipeline visibility",
                    "More replacement jobs closed from existing demand",
                  ],
                },
              ].map((group) => (
                <div
                  key={group.title}
                  className="rounded-xl border border-[color:var(--border)] bg-white/5 p-5"
                >
                  <h3 className="font-bold text-base mb-3">{group.title}</h3>
                  <ul className="space-y-2.5">
                    {group.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-sm text-[color:var(--muted)]"
                      >
                        <span className="text-[color:var(--accent-2)] mt-0.5">
                          ✓
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────── */}
        <section id="demo">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <div className="text-xs font-bold tracking-[.14em] uppercase text-[color:var(--muted)] mb-3">
                  Final Call To Action
                </div>
                <h2 className="text-[clamp(22px,3.2vw,34px)] font-extrabold leading-tight">
                  Replace proposal chaos with a clear revenue recovery system.
                </h2>
                <p className="mt-4 text-[color:var(--muted)]">
                  Give your HVAC sales team the tools to build better proposals,
                  track homeowner engagement, and follow up automatically before
                  opportunities go cold.
                </p>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-white/[0.03] p-6">
                {[
                  "Built for HVAC owners and sales teams",
                  "Focuses on proposals, follow-up, and pipeline recovery",
                  "Designed to keep homeowner opportunities moving to close",
                ].map((pt) => (
                  <div
                    key={pt}
                    className="flex items-start gap-2 text-sm text-[color:var(--muted)] mb-2.5"
                  >
                    <span className="text-[color:var(--accent-2)] mt-0.5">
                      ✓
                    </span>
                    {pt}
                  </div>
                ))}

                <div className="mt-5 flex flex-wrap gap-3">
                  <CalendlyButton className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-[#001] hover:opacity-90 transition-opacity">
                    Book a Demo
                  </CalendlyButton>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold border border-[color:var(--border)] bg-white/5 text-[color:var(--text)] hover:bg-white/10 transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-[1100px] px-5 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[color:var(--muted)] border-t border-[color:var(--border)] pt-8 mt-4">
        <div className="flex items-center gap-3">
          <Image
            src="/orbisy-logo.png"
            alt="ORBISY"
            width={100}
            height={32}
            className="h-7 w-auto opacity-70"
          />
          <span>© {new Date().getFullYear()} ORBISY. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="mailto:info@orbisy.com"
            className="hover:text-[color:var(--text)] transition-colors"
          >
            info@orbisy.com
          </a>
          <Link
            href="/login"
            className="hover:text-[color:var(--text)] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
}
