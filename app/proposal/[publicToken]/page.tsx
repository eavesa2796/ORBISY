"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  serializePublicProposalForPrint,
  type PublicPrintProposalInput,
} from "@/lib/sales/proposals/public-print";

type PrintProposal = ReturnType<typeof serializePublicProposalForPrint>;
type PrintOption = PrintProposal["sortedOptions"][number];

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return `${value.toFixed(2).replace(/\.00$/, "")}%`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function tierSubhead(tier: PrintOption["tier"]) {
  if (tier === "GOOD") return "Essential comfort";
  if (tier === "BETTER") return "Recommended balance";
  return "Premium performance";
}

function tierTone(option: PrintOption) {
  if (option.isSelected) return "border-emerald-500 bg-emerald-50";
  if (option.tier === "BETTER") return "border-blue-500 bg-blue-50";
  return "border-slate-200 bg-white";
}

function isSavingsLine(type: PrintOption["addonLines"][number]["type"]) {
  return type === "DISCOUNT" || type === "REBATE";
}

export default function PublicProposalPage() {
  const params = useParams<{ publicToken: string }>();
  const searchParams = useSearchParams();
  const publicToken = params.publicToken;
  const isPrintMode = searchParams.get("print") === "1";

  const [loading, setLoading] = useState(true);
  const [acceptingOptionId, setAcceptingOptionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [proposal, setProposal] = useState<PublicPrintProposalInput | null>(null);
  const trackedOptionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!publicToken) return;
    trackedOptionIdsRef.current.clear();

    const fetchProposal = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/proposals/${publicToken}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load proposal");
        setProposal(json.proposal);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unexpected error");
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
  }, [publicToken]);

  const printModel = useMemo(() => {
    if (!proposal) return null;
    return serializePublicProposalForPrint(proposal);
  }, [proposal]);

  const recommendedOption = useMemo(() => {
    if (!printModel) return null;
    return (
      printModel.sortedOptions.find((option) => option.tier === "BETTER") ||
      printModel.sortedOptions[0] ||
      null
    );
  }, [printModel]);

  const selectedOption = useMemo(() => {
    if (!printModel) return null;
    return printModel.sortedOptions.find((option) => option.isSelected) || null;
  }, [printModel]);

  const proposalPublicToken = proposal?.publicToken;

  const trackOptionFocus = useCallback(
    (option: PrintOption, source = "option_card_visible") => {
      if (!proposalPublicToken || isPrintMode) return;
      if (trackedOptionIdsRef.current.has(option.id)) return;

      trackedOptionIdsRef.current.add(option.id);

      void fetch(`/api/proposals/${proposalPublicToken}/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "OPTION_VIEWED",
          optionId: option.id,
          metadata: { source },
        }),
      }).catch(() => {
        // Engagement tracking should never block the customer proposal flow.
      });
    },
    [isPrintMode, proposalPublicToken],
  );

  useEffect(() => {
    if (!printModel || isPrintMode) return;
    if (typeof IntersectionObserver === "undefined") return;

    const optionsById = new Map(printModel.sortedOptions.map((option) => [option.id, option]));
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-proposal-option-id]"),
    );

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
          const optionId = entry.target.getAttribute("data-proposal-option-id");
          const option = optionId ? optionsById.get(optionId) : null;
          if (option) {
            trackOptionFocus(option, "option_card_visible");
          }
        }
      },
      { threshold: [0.55] },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [isPrintMode, printModel, trackOptionFocus]);

  async function acceptOption(optionId: string) {
    if (!proposal || proposal.status === "DECLINED") return;

    setAcceptingOptionId(optionId);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/proposals/${proposal.publicToken}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to accept option");

      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: json.proposal.status,
              selectedOptionId: json.proposal.selectedOptionId,
              acceptedAt: json.proposal.acceptedAt,
            }
          : prev,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setAcceptingOptionId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <p className="mx-auto max-w-6xl text-slate-600">Loading proposal...</p>
      </div>
    );
  }

  if (errorMessage || !proposal || !printModel) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-300 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            Proposal unavailable
          </h1>
          <p className="mt-2 text-slate-600">
            {errorMessage || "This proposal could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  const canAccept = proposal.status !== "ACCEPTED" && proposal.status !== "DECLINED";

  return (
    <div
      className={`min-h-screen ${
        isPrintMode
          ? "proposal-print-root bg-white p-2 md:p-4"
          : "bg-[linear-gradient(180deg,#edf7ff,#f8fafc_42%,#eef2f7)] p-4 md:p-8"
      }`}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.6fr_1fr]">
            <div className="p-6 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                HVAC Replacement Proposal
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                {proposal.title}
              </h1>
              {proposal.notes && (
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
                  {proposal.notes}
                </p>
              )}

              <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <Info label="Prepared for" value={proposal.contact?.fullName || proposal.contact?.email || "Homeowner"} />
                <Info label="Project" value={proposal.company?.name || "-"} />
                <Info label="Email" value={proposal.contact?.email || "-"} />
                <Info label="Phone" value={proposal.contact?.phone || "-"} />
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0 md:p-8">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                Proposal Status
              </p>
              <p className="mt-2 text-3xl font-semibold">{proposal.status}</p>
              {proposal.status === "ACCEPTED" && selectedOption ? (
                <div className="mt-5 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4">
                  <p className="text-sm font-semibold text-emerald-200">
                    Accepted Option
                  </p>
                  <p className="mt-1 text-lg font-semibold">{selectedOption.title}</p>
                  <p className="text-sm text-emerald-100">
                    {currency(selectedOption.finalCustomerPrice)}
                  </p>
                  <p className="mt-2 text-xs text-slate-300">
                    Accepted {formatDateTime(proposal.acceptedAt)}
                  </p>
                </div>
              ) : recommendedOption ? (
                <div className="mt-5 rounded-xl border border-blue-300/40 bg-blue-300/10 p-4">
                  <p className="text-sm font-semibold text-blue-100">
                    Recommended
                  </p>
                  <p className="mt-1 text-lg font-semibold">{recommendedOption.title}</p>
                  <p className="text-sm text-blue-100">
                    {currency(recommendedOption.finalCustomerPrice)}
                    {recommendedOption.monthlyPaymentEstimate
                      ? ` or about ${currency(recommendedOption.monthlyPaymentEstimate)}/mo`
                      : ""}
                  </p>
                </div>
              ) : null}

              {!isPrintMode && (
                <div className="no-print mt-6 flex flex-wrap gap-3">
                  <a
                    href={`/proposal/${proposal.publicToken}?print=1`}
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Print View
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100"
                  >
                    Save PDF
                  </button>
                </div>
              )}
            </aside>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {printModel.sortedOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              canAccept={canAccept}
              isPrintMode={isPrintMode}
              isRecommended={recommendedOption?.id === option.id}
              accepting={acceptingOptionId === option.id}
              onAccept={() => acceptOption(option.id)}
              onFocusOption={() => trackOptionFocus(option, "option_card_interaction")}
            />
          ))}
        </section>

        {!isPrintMode && canAccept && recommendedOption && (
          <div className="no-print sticky bottom-4 z-20 rounded-2xl border border-slate-300 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Ready to move forward?
                </p>
                <p className="text-sm text-slate-600">
                  Most customers choose {recommendedOption.title} at{" "}
                  {currency(recommendedOption.finalCustomerPrice)}.
                </p>
              </div>
              <button
                onClick={() => {
                  trackOptionFocus(recommendedOption, "recommended_sticky_cta");
                  void acceptOption(recommendedOption.id);
                }}
                disabled={acceptingOptionId === recommendedOption.id}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {acceptingOptionId === recommendedOption.id
                  ? "Accepting..."
                  : `Accept ${recommendedOption.tier}`}
              </button>
            </div>
          </div>
        )}

        <footer className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {proposal.proposalDisclaimer && <p>{proposal.proposalDisclaimer}</p>}
          {proposal.companyProposalFooter && (
            <p className="mt-2">{proposal.companyProposalFooter}</p>
          )}
        </footer>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function OptionCard({
  option,
  canAccept,
  isPrintMode,
  isRecommended,
  accepting,
  onAccept,
  onFocusOption,
}: {
  option: PrintOption;
  canAccept: boolean;
  isPrintMode: boolean;
  isRecommended: boolean;
  accepting: boolean;
  onAccept: () => void;
  onFocusOption: () => void;
}) {
  const addons = option.addonLines.filter((line) => line.type === "ADDON");
  const savings = option.addonLines.filter((line) => isSavingsLine(line.type));

  return (
    <article
      data-proposal-option-id={option.id}
      onMouseEnter={onFocusOption}
      onFocusCapture={onFocusOption}
      className={`proposal-print-card relative rounded-2xl border p-5 shadow-sm ${tierTone(option)}`}
    >
      {isRecommended && !option.isSelected && (
        <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
          Recommended
        </div>
      )}
      {option.isSelected && (
        <div className="absolute right-4 top-4 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
          Accepted
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {option.tier}
      </p>
      <h2 className="mt-2 pr-24 text-2xl font-semibold text-slate-950">
        {option.title}
      </h2>
      <p className="mt-1 text-sm font-medium text-slate-600">
        {tierSubhead(option.tier)}
      </p>
      {option.summary && (
        <p className="mt-3 min-h-12 text-sm leading-6 text-slate-700">
          {option.summary}
        </p>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-4xl font-bold tracking-tight text-slate-950">
          {currency(option.finalCustomerPrice)}
        </p>
        {option.monthlyPaymentEstimate && (
          <p className="mt-1 text-sm font-medium text-blue-700">
            About {currency(option.monthlyPaymentEstimate)}/mo
            {option.financingMonths ? ` for ${option.financingMonths} months` : ""}
            {option.financingApr !== null ? ` at ${percent(option.financingApr)} APR` : ""}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <DetailBlock title="Equipment">
          <p>{option.equipmentLabel || "Equipment details included in proposal"}</p>
          {option.equipmentSnapshot?.sizeTonnage && (
            <p>Size: {option.equipmentSnapshot.sizeTonnage}</p>
          )}
          {option.equipmentSnapshot?.efficiencyRating && (
            <p>Efficiency: {option.equipmentSnapshot.efficiencyRating}</p>
          )}
        </DetailBlock>

        {option.warrantyLabel && (
          <DetailBlock title="Warranty">
            <p>{option.warrantyLabel}</p>
          </DetailBlock>
        )}

        {addons.length > 0 && (
          <DetailBlock title="Included Add-ons">
            {addons.map((line) => (
              <div key={line.id} className="flex justify-between gap-4">
                <span>{line.label}</span>
                <span>{currency(line.amount)}</span>
              </div>
            ))}
          </DetailBlock>
        )}

        {savings.length > 0 && (
          <DetailBlock title="Savings">
            {savings.map((line) => (
              <div key={line.id} className="flex justify-between gap-4">
                <span>{line.label}</span>
                <span>-{currency(line.amount)}</span>
              </div>
            ))}
          </DetailBlock>
        )}

        <DetailBlock title="Price Breakdown">
          <PriceLine
            label="Base package"
            value={option.priceBreakdown.basePriceBeforeAdjustments}
          />
          <PriceLine label="Add-ons" value={option.priceBreakdown.addonsTotal} />
          <PriceLine
            label="Discounts"
            value={-option.priceBreakdown.discountsTotal}
          />
          <PriceLine label="Rebates" value={-option.priceBreakdown.rebatesTotal} />
          {option.priceBreakdown.permitFee > 0 && (
            <PriceLine label="Permit / Fees" value={option.priceBreakdown.permitFee} />
          )}
          {option.priceBreakdown.taxAmount > 0 && (
            <PriceLine
              label={`Tax (${percent(option.priceBreakdown.taxRatePercent)})`}
              value={option.priceBreakdown.taxAmount}
            />
          )}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-950">
            <span>Final Price</span>
            <span>{currency(option.priceBreakdown.finalCustomerPrice)}</span>
          </div>
        </DetailBlock>
      </div>

      {!isPrintMode && !option.isSelected && canAccept && (
        <button
          onClick={onAccept}
          disabled={accepting}
          className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {accepting ? "Accepting..." : `Accept ${option.tier}`}
        </button>
      )}
    </article>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <p className="mb-2 font-semibold text-slate-950">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span>{value < 0 ? `-${currency(Math.abs(value))}` : currency(value)}</span>
    </div>
  );
}
