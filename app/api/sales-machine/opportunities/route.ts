import { NextRequest, NextResponse } from "next/server";
import { type SalesOpportunityStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  authErrorToHttp,
  isHvacRole,
  requireInternalUser,
} from "@/lib/session";

export const runtime = "nodejs";

const OPPORTUNITY_STAGES: SalesOpportunityStage[] = [
  "NEW",
  "QUALIFIED",
  "PROPOSAL_DRAFTED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
] as const;

function isOpportunityStage(value: string): value is SalesOpportunityStage {
  return OPPORTUNITY_STAGES.includes(value as SalesOpportunityStage);
}

export async function GET(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireInternalUser>>;
  try {
    session = await requireInternalUser();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedCompanyId = searchParams.get("companyId") || undefined;
    const companyId = isHvacRole(session.userRole)
      ? session.customerCompanyId || "__unlinked_hvac_workspace__"
      : requestedCompanyId;
    const stageParam = searchParams.get("stage") || undefined;
    const stage = stageParam && isOpportunityStage(stageParam) ? stageParam : undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const opportunities = await prisma.salesOpportunity.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(stage ? { stage } : {}),
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        contact: { select: { id: true, fullName: true, email: true, phone: true } },
        _count: { select: { proposals: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      count: opportunities.length,
      opportunities: opportunities.map((o) => ({
        id: o.id,
        title: o.title,
        stage: o.stage,
        estimatedJobValue: o.estimatedJobValue ? Number(o.estimatedJobValue) : null,
        targetInstallDate: o.targetInstallDate,
        notes: o.notes,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        company: o.company,
        contact: o.contact,
        proposalCount: o._count.proposals,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

type CreateOpportunityPayload = {
  companyId: string;
  contactId?: string;
  title: string;
  estimatedJobValue?: number;
  targetInstallDate?: string;
  notes?: string;
};

export async function POST(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireInternalUser>>;
  try {
    session = await requireInternalUser();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateOpportunityPayload;

    if (!body.companyId || !body.title?.trim()) {
      return NextResponse.json(
        { ok: false, error: "companyId and title are required" },
        { status: 400 },
      );
    }

    if (isHvacRole(session.userRole)) {
      if (!session.customerCompanyId) {
        return NextResponse.json(
          { ok: false, error: "HVAC user is not linked to a company workspace" },
          { status: 403 },
        );
      }

      if (body.companyId !== session.customerCompanyId) {
        return NextResponse.json(
          { ok: false, error: "Cannot create opportunities for another company" },
          { status: 403 },
        );
      }
    }

    const company = await prisma.salesCompany.findUnique({ where: { id: body.companyId } });
    if (!company) {
      return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 });
    }

    if (body.contactId) {
      const contact = await prisma.salesContact.findFirst({
        where: { id: body.contactId, companyId: body.companyId },
      });
      if (!contact) {
        return NextResponse.json(
          { ok: false, error: "contactId does not belong to companyId" },
          { status: 400 },
        );
      }
    }

    const created = await prisma.salesOpportunity.create({
      data: {
        companyId: body.companyId,
        contactId: body.contactId,
        title: body.title.trim(),
        estimatedJobValue:
          typeof body.estimatedJobValue === "number" && Number.isFinite(body.estimatedJobValue)
            ? body.estimatedJobValue
            : undefined,
        targetInstallDate: body.targetInstallDate ? new Date(body.targetInstallDate) : undefined,
        notes: body.notes?.trim() || undefined,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        contact: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      opportunity: {
        id: created.id,
        title: created.title,
        stage: created.stage,
        estimatedJobValue: created.estimatedJobValue ? Number(created.estimatedJobValue) : null,
        targetInstallDate: created.targetInstallDate,
        notes: created.notes,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        company: created.company,
        contact: created.contact,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
