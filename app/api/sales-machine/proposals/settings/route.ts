import { NextResponse } from "next/server";
import {
  AuthError,
  authErrorToHttp,
  isHvacRole,
  requireInternalUser,
  type ValidatedSession,
} from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PROPOSAL_PRICING_SETTINGS,
  getProposalSettingsId,
  getProposalPricingSettings,
  normalizeProposalPricingSettings,
  type ProposalPricingSettings,
} from "@/lib/sales/proposals/settings";

export const runtime = "nodejs";

type SettingsPatchPayload = Partial<ProposalPricingSettings>;

function resolveSettingsCompanyId(session: ValidatedSession) {
  if (!isHvacRole(session.userRole)) {
    return null;
  }

  if (!session.customerCompanyId) {
    throw new AuthError("HVAC user is not linked to a company workspace", 403);
  }

  return session.customerCompanyId;
}

export async function GET() {
  let session: Awaited<ReturnType<typeof requireInternalUser>>;
  try {
    session = await requireInternalUser();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companyId = resolveSettingsCompanyId(session);
    const settings = await getProposalPricingSettings(companyId);
    return NextResponse.json({
      ok: true,
      scope: companyId ? "company" : "global",
      companyId,
      settings,
    });
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  let session: Awaited<ReturnType<typeof requireInternalUser>>;
  try {
    session = await requireInternalUser();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companyId = resolveSettingsCompanyId(session);
    const payload = (await request.json()) as SettingsPatchPayload;
    const current = await getProposalPricingSettings(companyId);
    const next = normalizeProposalPricingSettings(payload, current);
    const settingsId = getProposalSettingsId(companyId);

    const saved = await prisma.salesProposalSettings.upsert({
      where: { id: settingsId },
      create: {
        id: settingsId,
        companyId,
        defaultLaborCost: next.defaultLaborCost,
        defaultFinancingApr: next.defaultFinancingApr,
        defaultFinancingMonths: next.defaultFinancingMonths,
        defaultWarrantyGood: next.defaultWarrantyGood,
        defaultWarrantyBetter: next.defaultWarrantyBetter,
        defaultWarrantyBest: next.defaultWarrantyBest,
        permitFeeDefault: next.permitFeeDefault,
        taxRatePercent: next.taxRatePercent,
        companyProposalFooter: next.companyProposalFooter,
        proposalDisclaimer: next.proposalDisclaimer,
      },
      update: {
        defaultLaborCost: next.defaultLaborCost,
        defaultFinancingApr: next.defaultFinancingApr,
        defaultFinancingMonths: next.defaultFinancingMonths,
        defaultWarrantyGood: next.defaultWarrantyGood,
        defaultWarrantyBetter: next.defaultWarrantyBetter,
        defaultWarrantyBest: next.defaultWarrantyBest,
        permitFeeDefault: next.permitFeeDefault,
        taxRatePercent: next.taxRatePercent,
        companyProposalFooter: next.companyProposalFooter,
        proposalDisclaimer: next.proposalDisclaimer,
      },
    });

    return NextResponse.json({
      ok: true,
      scope: companyId ? "company" : "global",
      companyId,
      settings: normalizeProposalPricingSettings(
        {
          defaultLaborCost: Number(saved.defaultLaborCost),
          defaultFinancingApr: saved.defaultFinancingApr,
          defaultFinancingMonths: saved.defaultFinancingMonths,
          defaultWarrantyGood: saved.defaultWarrantyGood,
          defaultWarrantyBetter: saved.defaultWarrantyBetter,
          defaultWarrantyBest: saved.defaultWarrantyBest,
          permitFeeDefault: Number(saved.permitFeeDefault),
          taxRatePercent: saved.taxRatePercent,
          companyProposalFooter: saved.companyProposalFooter,
          proposalDisclaimer: saved.proposalDisclaimer,
        },
        DEFAULT_PROPOSAL_PRICING_SETTINGS,
      ),
    });
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
