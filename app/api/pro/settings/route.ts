import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorToHttp, requireHvacUser } from "@/lib/session";

export const runtime = "nodejs";

type ProSettingsPayload = {
  name?: string;
  website?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
};

const companySelect = {
  id: true,
  name: true,
  website: true,
  phone: true,
  city: true,
  state: true,
  country: true,
  logoUrl: true,
  brandColor: true,
} as const;

export async function GET() {
  let session: Awaited<ReturnType<typeof requireHvacUser>>;
  try {
    session = await requireHvacUser();
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

  if (!session.customerCompanyId) {
    return NextResponse.json(
      { ok: false, error: "HVAC user is not linked to a company workspace" },
      { status: 403 },
    );
  }

  try {
    const company = await prisma.salesCompany.findUnique({
      where: { id: session.customerCompanyId },
      select: companySelect,
    });

    if (!company) {
      return NextResponse.json(
        { ok: false, error: "Company workspace not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, company });
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

export async function PUT(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireHvacUser>>;
  try {
    session = await requireHvacUser();
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

  if (!session.customerCompanyId) {
    return NextResponse.json(
      { ok: false, error: "HVAC user is not linked to a company workspace" },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as ProSettingsPayload;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Company name is required" },
        { status: 400 },
      );
    }

    const company = await prisma.salesCompany.update({
      where: { id: session.customerCompanyId },
      data: {
        name,
        website: cleanOptionalUrl(body.website, "website"),
        phone: cleanOptional(body.phone, 40),
        city: cleanOptional(body.city, 80),
        state: cleanOptional(body.state, 40),
        logoUrl: cleanOptionalUrl(body.logoUrl, "logoUrl"),
        brandColor: cleanOptionalColor(body.brandColor),
      },
      select: companySelect,
    });

    return NextResponse.json({ ok: true, company });
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

function cleanOptional(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanOptionalUrl(value: unknown, label: string) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`${label} must start with http:// or https://`);
    }
    return url.toString();
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
}

function cleanOptionalColor(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    throw new Error("brandColor must be a hex color like #14b8a6");
  }
  return trimmed.toUpperCase();
}
