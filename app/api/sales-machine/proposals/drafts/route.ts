import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { authErrorToHttp, requireInternalUser } from "@/lib/session";
import {
  getProposalFollowUpDays,
  serializeInternalProposal,
} from "@/lib/sales/proposals/internal-list";
import {
  calculateProposalOptionPricing,
  type AddonType,
  type PricingMode,
} from "@/lib/sales/proposals/pricing";
import { getProposalPricingSettings } from "@/lib/sales/proposals/settings";

export const runtime = "nodejs";

type DraftAddonLineInput = {
  type: AddonType;
  label: string;
  amount: number;
};

type DraftOptionInput = {
  tier: "GOOD" | "BETTER" | "BEST";
  title: string;
  summary?: string;
  equipmentItemId?: string;
  equipmentCost?: number;
  laborCost?: number;
  pricingMode?: PricingMode;
  marginPercent?: number;
  sellPrice?: number;
  warrantyLabel?: string;
  financingApr?: number;
  financingMonths?: number;
  permitFee?: number;
  taxRatePercent?: number;
  addonLines?: DraftAddonLineInput[];
  equipmentSnapshot?: {
    equipmentType?: string;
    brand?: string;
    modelNumber?: string;
    sizeTonnage?: string;
    efficiencyRating?: string;
    description?: string;
  };
};

type CreateDraftPayload = {
  opportunityId: string;
  title?: string;
  notes?: string;
  companyProposalFooter?: string;
  proposalDisclaimer?: string;
  options: DraftOptionInput[];
};

const REQUIRED_TIERS = ["GOOD", "BETTER", "BEST"] as const;

function getWarrantyDefaultForTier(
  tier: "GOOD" | "BETTER" | "BEST",
  settings: Awaited<ReturnType<typeof getProposalPricingSettings>>,
) {
  if (tier === "GOOD") return settings.defaultWarrantyGood;
  if (tier === "BETTER") return settings.defaultWarrantyBetter;
  return settings.defaultWarrantyBest;
}

export async function GET(request: NextRequest) {
  try {
    await requireInternalUser();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunityId") || undefined;
    const statusParam = searchParams.get("status");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const allowedStatuses = [
      "DRAFT",
      "SENT",
      "VIEWED",
      "ACCEPTED",
      "DECLINED",
    ] as const;
    const statuses = statusParam
      ? statusParam
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter((value): value is (typeof allowedStatuses)[number] =>
            allowedStatuses.includes(value as (typeof allowedStatuses)[number]),
          )
      : [...allowedStatuses];

    const proposals = await prisma.salesProposal.findMany({
      where: {
        status: { in: statuses },
        ...(opportunityId ? { opportunityId } : {}),
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        contact: { select: { id: true, fullName: true, email: true } },
        opportunity: { select: { id: true, title: true } },
        selectedOption: { select: { id: true, tier: true, title: true } },
        events: {
          where: {
            eventType: { in: ["EMAIL_SENT", "FOLLOW_UP_SENT", "VIEWED", "OPTION_VIEWED"] },
          },
          select: {
            eventType: true,
            occurredAt: true,
            metadata: true,
          },
          orderBy: { occurredAt: "desc" },
        },
        options: {
          include: { addonLines: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
    });

    const now = new Date();
    const followUpDays = getProposalFollowUpDays();

    return NextResponse.json({
      ok: true,
      count: proposals.length,
      proposals: proposals.map((proposal) =>
        serializeInternalProposal(proposal, request.nextUrl.origin, {
          now,
          followUpDays,
        }),
      ),
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

export async function POST(request: NextRequest) {
  let sessionUserId: string;
  try {
    const session = await requireInternalUser();
    sessionUserId = session.userId;
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as CreateDraftPayload;

    if (!body.opportunityId) {
      return NextResponse.json(
        { ok: false, error: "opportunityId is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.options) || body.options.length !== 3) {
      return NextResponse.json(
        {
          ok: false,
          error: "Exactly 3 options are required (GOOD, BETTER, BEST)",
        },
        { status: 400 },
      );
    }

    const tiers = new Set(body.options.map((o) => o.tier));
    const hasAllTiers = REQUIRED_TIERS.every((tier) => tiers.has(tier));
    if (!hasAllTiers) {
      return NextResponse.json(
        {
          ok: false,
          error: "Options must include GOOD, BETTER, and BEST tiers",
        },
        { status: 400 },
      );
    }

    const opportunity = await prisma.salesOpportunity.findUnique({
      where: { id: body.opportunityId },
      include: {
        company: true,
        contact: true,
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { ok: false, error: "Opportunity not found" },
        { status: 404 },
      );
    }

    const equipmentIds = Array.from(
      new Set(
        body.options.map((o) => o.equipmentItemId).filter(Boolean) as string[],
      ),
    );

    const catalogItems = equipmentIds.length
      ? await prisma.salesHvacCatalogItem.findMany({
          where: { id: { in: equipmentIds }, isActive: true },
        })
      : [];

    const catalogMap = new Map(catalogItems.map((item) => [item.id, item]));

    if (equipmentIds.length !== catalogItems.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "One or more selected equipment items were not found or inactive",
        },
        { status: 400 },
      );
    }

    const settings = await getProposalPricingSettings();

    const optionsWithPricing = body.options.map((option, index) => {
      const item = option.equipmentItemId
        ? catalogMap.get(option.equipmentItemId)
        : undefined;

      const addonLines = (option.addonLines || []).filter(
        (line) => line.label.trim() && Number.isFinite(line.amount),
      );

      const pricingMode: PricingMode =
        option.pricingMode || item?.pricingMode || "COST_PLUS_MARGIN";

      const laborCost =
        typeof option.laborCost === "number"
          ? option.laborCost
          : settings.defaultLaborCost;
      const financingApr = option.financingApr ?? settings.defaultFinancingApr;
      const financingMonths =
        option.financingMonths ?? settings.defaultFinancingMonths;
      const permitFee = option.permitFee ?? settings.permitFeeDefault;
      const taxRatePercent = option.taxRatePercent ?? settings.taxRatePercent;
      const warrantyLabel =
        option.warrantyLabel?.trim() ||
        getWarrantyDefaultForTier(option.tier, settings);

      const pricing = calculateProposalOptionPricing({
        equipmentCost:
          typeof option.equipmentCost === "number"
            ? option.equipmentCost
            : item
              ? Number(item.cost)
              : 0,
        laborCost,
        permitFee,
        taxRatePercent,
        pricingMode,
        marginPercent: option.marginPercent ?? item?.marginPercent ?? undefined,
        sellPrice:
          option.sellPrice ??
          (item?.sellPrice ? Number(item.sellPrice) : undefined),
        financingApr,
        financingMonths,
        addons: addonLines.map((line) => ({
          type: line.type,
          amount: line.amount,
        })),
      });

      const equipmentSnapshot =
        option.equipmentSnapshot ||
        (item
          ? {
              equipmentType: item.equipmentType,
              brand: item.brand,
              modelNumber: item.modelNumber,
              sizeTonnage: item.sizeTonnage,
              efficiencyRating: item.efficiencyRating,
              description: item.description,
            }
          : undefined);

      return {
        proposalId: "",
        tier: option.tier,
        title: option.title.trim(),
        summary: option.summary?.trim() || null,
        equipmentItemId: item?.id || null,
        equipmentSnapshot,
        warrantyLabel,
        financingApr,
        financingMonths,
        monthlyPaymentEstimate: pricing.monthlyPaymentEstimate,
        equipmentCost: pricing.equipmentCost,
        laborCost: pricing.laborCost,
        permitFee: pricing.permitFee,
        taxRatePercent: pricing.taxRatePercent,
        taxAmount: pricing.taxAmount,
        preTaxCustomerPrice: pricing.preTaxCustomerPrice,
        addonsTotal: pricing.addonsTotal,
        discountsTotal: pricing.discountsTotal,
        rebatesTotal: pricing.rebatesTotal,
        totalCost: pricing.totalCost,
        grossMarginAmount: pricing.grossMarginAmount,
        grossMarginPercent: pricing.grossMarginPercent,
        finalCustomerPrice: pricing.finalCustomerPrice,
        sortOrder: index,
        addonLines,
      };
    });

    const token = randomBytes(20).toString("hex");

    const created = await prisma.$transaction(async (tx) => {
      const proposal = await tx.salesProposal.create({
        data: {
          opportunityId: opportunity.id,
          companyId: opportunity.companyId,
          contactId: opportunity.contactId,
          publicToken: token,
          status: "DRAFT",
          title:
            body.title?.trim() ||
            `${opportunity.company.name} Replacement Proposal`,
          notes: body.notes?.trim() || undefined,
          companyProposalFooter:
            body.companyProposalFooter?.trim() ||
            settings.companyProposalFooter,
          proposalDisclaimer:
            body.proposalDisclaimer?.trim() || settings.proposalDisclaimer,
          createdByUserId: sessionUserId,
        },
      });

      for (const option of optionsWithPricing) {
        const createdOption = await tx.salesProposalOption.create({
          data: {
            proposalId: proposal.id,
            tier: option.tier,
            title: option.title,
            summary: option.summary,
            equipmentItemId: option.equipmentItemId,
            equipmentSnapshot: option.equipmentSnapshot,
            warrantyLabel: option.warrantyLabel,
            financingApr: option.financingApr,
            financingMonths: option.financingMonths,
            monthlyPaymentEstimate: option.monthlyPaymentEstimate,
            equipmentCost: option.equipmentCost,
            laborCost: option.laborCost,
            permitFee: option.permitFee,
            taxRatePercent: option.taxRatePercent,
            taxAmount: option.taxAmount,
            preTaxCustomerPrice: option.preTaxCustomerPrice,
            addonsTotal: option.addonsTotal,
            discountsTotal: option.discountsTotal,
            rebatesTotal: option.rebatesTotal,
            totalCost: option.totalCost,
            grossMarginAmount: option.grossMarginAmount,
            grossMarginPercent: option.grossMarginPercent,
            finalCustomerPrice: option.finalCustomerPrice,
            sortOrder: option.sortOrder,
          },
        });

        if (option.addonLines.length > 0) {
          await tx.salesProposalAddonLine.createMany({
            data: option.addonLines.map((line) => ({
              optionId: createdOption.id,
              type: line.type,
              label: line.label.trim(),
              amount: line.amount,
            })),
          });
        }
      }

      await tx.salesProposalEvent.create({
        data: {
          proposalId: proposal.id,
          eventType: "DRAFT_CREATED",
          metadata: {
            createdByUserId: sessionUserId,
            optionCount: optionsWithPricing.length,
          },
        },
      });

      await tx.salesOpportunity.update({
        where: { id: opportunity.id },
        data: { stage: "PROPOSAL_DRAFTED" },
      });

      return tx.salesProposal.findUnique({
        where: { id: proposal.id },
        include: {
          company: { select: { id: true, name: true, slug: true } },
          contact: { select: { id: true, fullName: true, email: true } },
          options: {
            include: { addonLines: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      ok: true,
      proposal: {
        id: created!.id,
        opportunityId: created!.opportunityId,
        company: created!.company,
        contact: created!.contact,
        status: created!.status,
        title: created!.title,
        companyProposalFooter: created!.companyProposalFooter,
        proposalDisclaimer: created!.proposalDisclaimer,
        publicToken: created!.publicToken,
        createdAt: created!.createdAt,
        options: created!.options.map((option) => ({
          id: option.id,
          tier: option.tier,
          title: option.title,
          summary: option.summary,
          monthlyPaymentEstimate: option.monthlyPaymentEstimate
            ? Number(option.monthlyPaymentEstimate)
            : null,
          permitFee: Number(option.permitFee),
          taxRatePercent: option.taxRatePercent,
          taxAmount: Number(option.taxAmount),
          preTaxCustomerPrice: Number(option.preTaxCustomerPrice),
          totalCost: Number(option.totalCost),
          finalCustomerPrice: Number(option.finalCustomerPrice),
          grossMarginAmount: Number(option.grossMarginAmount),
          grossMarginPercent: option.grossMarginPercent,
          addonLines: option.addonLines.map((line) => ({
            id: line.id,
            type: line.type,
            label: line.label,
            amount: Number(line.amount),
          })),
        })),
      },
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
