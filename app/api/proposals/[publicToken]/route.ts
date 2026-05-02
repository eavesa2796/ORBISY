import { NextRequest, NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { preparePublicProposalView } from "@/lib/sales/proposals/workflow";

export const runtime = "nodejs";

const publicProposalInclude = {
  company: { select: { id: true, name: true, slug: true } },
  contact: {
    select: { id: true, fullName: true, email: true, phone: true },
  },
  options: {
    include: { addonLines: true },
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.SalesProposalInclude;

type PublicProposalWithRelations = Prisma.SalesProposalGetPayload<{
  include: typeof publicProposalInclude;
}>;

function serializeProposal(proposal: PublicProposalWithRelations) {
  return {
    id: proposal.id,
    publicToken: proposal.publicToken,
    title: proposal.title,
    notes: proposal.notes,
    companyProposalFooter: proposal.companyProposalFooter,
    proposalDisclaimer: proposal.proposalDisclaimer,
    status: proposal.status,
    sentAt: proposal.sentAt,
    viewedAt: proposal.viewedAt,
    acceptedAt: proposal.acceptedAt,
    declinedAt: proposal.declinedAt,
    createdAt: proposal.createdAt,
    company: proposal.company
      ? {
          id: proposal.company.id,
          name: proposal.company.name,
          slug: proposal.company.slug,
        }
      : null,
    contact: proposal.contact
      ? {
          id: proposal.contact.id,
          fullName: proposal.contact.fullName,
          email: proposal.contact.email,
          phone: proposal.contact.phone,
        }
      : null,
    selectedOptionId: proposal.selectedOptionId,
    options: proposal.options.map((option) => ({
      id: option.id,
      tier: option.tier,
      title: option.title,
      summary: option.summary,
      warrantyLabel: option.warrantyLabel,
      financingApr: option.financingApr,
      financingMonths: option.financingMonths,
      monthlyPaymentEstimate: option.monthlyPaymentEstimate
        ? Number(option.monthlyPaymentEstimate)
        : null,
      equipmentSnapshot: option.equipmentSnapshot,
      permitFee: Number(option.permitFee),
      taxRatePercent: option.taxRatePercent,
      taxAmount: Number(option.taxAmount),
      preTaxCustomerPrice: Number(option.preTaxCustomerPrice),
      addonsTotal: Number(option.addonsTotal),
      discountsTotal: Number(option.discountsTotal),
      rebatesTotal: Number(option.rebatesTotal),
      finalCustomerPrice: Number(option.finalCustomerPrice),
      addonLines: option.addonLines.map((line) => ({
        id: line.id,
        type: line.type,
        label: line.label,
        amount: Number(line.amount),
      })),
    })),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await params;

  try {
    const proposal = await prisma.$transaction(async (tx) => {
      const existing = await tx.salesProposal.findUnique({
        where: { publicToken },
        include: publicProposalInclude,
      });

      if (!existing) {
        return null;
      }

      const preparedView = preparePublicProposalView(existing);

      if (!preparedView.available) {
        return { unavailable: true };
      }

      if (preparedView.update) {
        await tx.salesProposal.update({
          where: { id: existing.id },
          data: preparedView.update,
        });
      }

      await tx.salesProposalEvent.create({
        data: {
          proposalId: existing.id,
          eventType: preparedView.event.eventType,
          metadata: preparedView.event.metadata,
        },
      });

      return tx.salesProposal.findUnique({
        where: { id: existing.id },
        include: publicProposalInclude,
      });
    });

    if (!proposal || "unavailable" in proposal) {
      return NextResponse.json(
        { ok: false, error: "Proposal not available" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      proposal: serializeProposal(proposal),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
