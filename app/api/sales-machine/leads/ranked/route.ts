import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authErrorToHttp,
  isHvacRole,
  requireInternalUser,
} from "@/lib/session";

export const runtime = "nodejs";

const EXTRACTED_EVIDENCE_CODES = new Set([
  "REV_EMERGENCY",
  "REV_FINANCING",
  "REV_SERVICE_AREAS",
  "REV_VISIBILITY",
  "PAIN_NO_MISSED_CALL_TEXT",
  "PAIN_NO_ONLINE_BOOKING",
  "PAIN_NO_CHAT_TEXT",
  "PAIN_NO_AFTER_HOURS",
  "PAIN_WEAK_ESTIMATE_FLOW",
  "PAIN_MOBILE_UX",
  "PAIN_WEAK_ESTIMATE_FOLLOWUP",
  "PAIN_REVIEW_COMMS",
  "PAIN_FORM_FRICTION",
  "DISQ_ADVANCED_AUTOMATION",
  "DISQ_ADVANCED_TOOLS",
  "DISQ_MODERATE_TOOLS",
]);

export async function GET(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireInternalUser>>;
  try {
    session = await requireInternalUser();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const minScore = parseInt(searchParams.get("minScore") || "60", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const city = searchParams.get("city") || undefined;
    const state = searchParams.get("state") || undefined;
    const scopedCompanyId = isHvacRole(session.userRole)
      ? session.customerCompanyId
      : null;

    if (isHvacRole(session.userRole) && !scopedCompanyId) {
      return NextResponse.json({ ok: true, count: 0, leads: [] });
    }

    const scores = await prisma.salesLeadScore.findMany({
      where: {
        totalScore: { gte: minScore },
        company: {
          ...(scopedCompanyId ? { id: scopedCompanyId } : {}),
          ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
          ...(state ? { state: { equals: state, mode: "insensitive" } } : {}),
        },
      },
      include: {
        company: {
          include: {
            customerUsers: { select: { id: true } },
          },
        },
        evidence: true,
      },
      orderBy: [{ totalScore: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const seen = new Set<string>();
    const ranked = [] as typeof scores;

    for (const score of scores) {
      if (!seen.has(score.companyId)) {
        ranked.push(score);
        seen.add(score.companyId);
      }
    }

    if (scopedCompanyId && ranked.length === 0) {
      const company = await prisma.salesCompany.findUnique({
        where: { id: scopedCompanyId },
        include: {
          customerUsers: { select: { id: true } },
        },
      });

      if (!company) {
        return NextResponse.json({ ok: true, count: 0, leads: [] });
      }

      return NextResponse.json({
        ok: true,
        count: 1,
        leads: [
          {
            companyId: company.id,
            companyName: company.name,
            slug: company.slug,
            website: company.website,
            phone: company.phone,
            city: company.city,
            state: company.state,
            accountStatus: company.accountStatus,
            convertedToCustomerAt: company.convertedToCustomerAt,
            customerUserCount: company.customerUsers.length,
            score: 0,
            buyingLikelihood: 0,
            qualified: company.isQualified,
            explanation:
              "Workspace company is linked, but no lead score has been generated yet.",
            dealThesis: undefined,
            thesisConfidence: 0,
            scoreBreakdown: {
              icpFit: 0,
              revenuePotential: 0,
              painSignals: 0,
              contactability: 0,
              disqualifiers: 0,
            },
            topEvidence: [],
          },
        ],
      });
    }

    return NextResponse.json({
      ok: true,
      count: ranked.length,
      leads: ranked.map((row) => ({
        companyId: row.companyId,
        companyName: row.company.name,
        slug: row.company.slug,
        website: row.company.website,
        phone: row.company.phone,
        city: row.company.city,
        state: row.company.state,
        accountStatus: row.company.accountStatus,
        convertedToCustomerAt: row.company.convertedToCustomerAt,
        customerUserCount: row.company.customerUsers?.length ?? 0,
        score: row.totalScore,
        buyingLikelihood: row.buyingLikelihood,
        qualified: row.company.isQualified,
        explanation: row.explanation,
        dealThesis: row.dealThesis ?? undefined,
        thesisConfidence: row.thesisConfidence,
        scoreBreakdown: {
          icpFit: row.icpFit,
          revenuePotential: row.revenuePotential,
          painSignals: row.painSignals,
          contactability: row.contactability,
          disqualifiers: row.disqualifiers,
        },
        topEvidence: row.evidence
          .filter((e) => EXTRACTED_EVIDENCE_CODES.has(e.code))
          .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
          .slice(0, 5)
          .map((e) => ({
            code: e.code,
            label: e.label,
            points: e.points,
            detail: e.detail,
          })),
      })),
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
