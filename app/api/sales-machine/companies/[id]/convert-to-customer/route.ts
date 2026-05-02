import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorToHttp, requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
    throw error;
  }

  const { id } = await params;

  try {
    const existing = await prisma.salesCompany.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        accountStatus: true,
        convertedToCustomerAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Company not found" },
        { status: 404 },
      );
    }

    const convertedAt = existing.convertedToCustomerAt || new Date();
    const company = await prisma.salesCompany.update({
      where: { id },
      data: {
        accountStatus: "PRO_CUSTOMER",
        convertedToCustomerAt: convertedAt,
        isQualified: true,
        disqualifiedReason: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        accountStatus: true,
        convertedToCustomerAt: true,
        _count: {
          select: {
            customerUsers: true,
            audits: true,
            scores: true,
            proposals: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      company,
      alreadyCustomer: existing.accountStatus === "PRO_CUSTOMER",
      nextActions: [
        "Invite an HVAC_OWNER from /console/users and link them to this company.",
        "Have the HVAC owner complete setup and log into /pro.",
        "Use the retained audit and lead score as onboarding context.",
      ],
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
