import { Resend } from "resend";
import {
  serializeInternalAcceptedProposalSummary,
  type AcceptedSummaryRecord,
} from "./accepted-summary";

type NotificationResult =
  | {
      status: "sent";
      messageId?: string;
      recipients: string[];
    }
  | {
      status: "skipped";
      reason: string;
      recipients?: string[];
    }
  | {
      status: "failed";
      error: string;
      recipients: string[];
    };

type AcceptedNotificationSummary = ReturnType<
  typeof serializeInternalAcceptedProposalSummary
>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseEmailList(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function uniqueEmails(emails: string[]) {
  return Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
}

function getNotificationFromEmail() {
  return (
    process.env.PROPOSAL_ACCEPTED_FROM_EMAIL ||
    process.env.CONTACT_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    ""
  );
}

export function buildAcceptedWorkOrderEmail(
  summary: AcceptedNotificationSummary,
) {
  const selected = summary.selectedOption;
  const customer =
    summary.contact?.fullName ||
    summary.contact?.email ||
    summary.company.name;

  const subject = selected
    ? `Accepted HVAC proposal: ${summary.company.name} - ${selected.tier}`
    : `Accepted HVAC proposal: ${summary.company.name}`;

  const addonLines = selected?.addonLines.length
    ? selected.addonLines.map((line) => `- ${line.type}: ${line.label} (${formatCurrency(line.amount)})`)
    : ["- None"];

  const text = [
    "A homeowner accepted a proposal in ORBISY.",
    "",
    `Customer: ${customer}`,
    `Customer email: ${summary.contact?.email || "N/A"}`,
    `Customer phone: ${summary.contact?.phone || "N/A"}`,
    `Company: ${summary.company.name}`,
    `Opportunity: ${summary.opportunity.title}`,
    `Accepted at: ${formatDate(summary.acceptedAt)}`,
    "",
    selected ? `Selected option: ${selected.tier} - ${selected.title}` : "Selected option: N/A",
    selected ? `Equipment: ${selected.equipmentLabel || "N/A"}` : "Equipment: N/A",
    selected ? `Warranty: ${selected.warrantyLabel || "N/A"}` : "Warranty: N/A",
    selected ? `Final customer price: ${formatCurrency(selected.finalCustomerPrice)}` : "Final customer price: N/A",
    selected && selected.monthlyPaymentEstimate
      ? `Financing estimate: ${formatCurrency(selected.monthlyPaymentEstimate)}/mo`
      : "Financing estimate: N/A",
    selected
      ? `Gross margin: ${formatCurrency(selected.grossMarginAmount)} (${selected.grossMarginPercent.toFixed(1)}%)`
      : "Gross margin: N/A",
    "",
    "Add-ons, discounts, and rebates:",
    ...addonLines,
    "",
    `Public proposal: ${summary.publicUrl}`,
    "",
    "Next step: contact the homeowner, confirm scope, and schedule installation.",
  ].join("\n");

  return { subject, text };
}

export async function sendAcceptedProposalNotification(params: {
  proposalId: string;
  origin: string;
}): Promise<NotificationResult> {
  if (!process.env.RESEND_API_KEY) {
    return { status: "skipped", reason: "RESEND_API_KEY is not configured" };
  }

  const from = getNotificationFromEmail();
  if (!from) {
    return {
      status: "skipped",
      reason: "PROPOSAL_ACCEPTED_FROM_EMAIL, CONTACT_FROM, or RESEND_FROM_EMAIL is required",
    };
  }

  const { prisma } = await import("@/lib/prisma");

  const proposal = await prisma.salesProposal.findUnique({
    where: { id: params.proposalId },
    include: {
      opportunity: { select: { id: true, title: true } },
      company: { select: { id: true, name: true, slug: true } },
      contact: { select: { id: true, fullName: true, email: true, phone: true } },
      selectedOption: {
        include: {
          addonLines: {
            orderBy: [{ type: "asc" }, { createdAt: "asc" }],
          },
        },
      },
      events: {
        orderBy: { occurredAt: "asc" },
      },
    },
  });

  if (!proposal || proposal.status !== "ACCEPTED") {
    return {
      status: "skipped",
      reason: "Proposal is not accepted or no longer exists",
    };
  }

  const workspaceUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["HVAC_OWNER", "HVAC_SALES"] },
      customerCompanyId: proposal.company.id,
    },
    select: { email: true },
  });

  const recipients = uniqueEmails([
    ...workspaceUsers.map((user) => user.email),
    ...parseEmailList(process.env.PROPOSAL_ACCEPTED_NOTIFY_TO),
  ]);

  if (recipients.length === 0) {
    return {
      status: "skipped",
      reason: "No HVAC workspace users or PROPOSAL_ACCEPTED_NOTIFY_TO recipients found",
      recipients,
    };
  }

  const summary = serializeInternalAcceptedProposalSummary(
    {
      id: proposal.id,
      publicToken: proposal.publicToken,
      title: proposal.title,
      notes: proposal.notes,
      status: proposal.status,
      acceptedAt: proposal.acceptedAt,
      opportunity: proposal.opportunity,
      company: proposal.company,
      contact: proposal.contact,
      selectedOption: proposal.selectedOption,
      events: proposal.events,
    } satisfies AcceptedSummaryRecord,
    params.origin,
  );

  const { subject, text } = buildAcceptedWorkOrderEmail(summary);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject,
      text,
    });

    if (error) {
      return {
        status: "failed",
        error: error.message || String(error),
        recipients,
      };
    }

    return {
      status: "sent",
      messageId: data?.id,
      recipients,
    };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      recipients,
    };
  }
}
