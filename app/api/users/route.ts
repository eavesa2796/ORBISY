import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { authErrorToHttp, requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

const USER_ROLES = [
  "ORBISY_ADMIN",
  "ORBISY_SALES",
  "HVAC_OWNER",
  "HVAC_SALES",
  "HOMEOWNER",
] as const;
type ManagedUserRole = (typeof USER_ROLES)[number];
const COMPANY_LINKED_ROLES: ManagedUserRole[] = [
  "HVAC_OWNER",
  "HVAC_SALES",
  "HOMEOWNER",
];

type CreateUserPayload = {
  email?: string;
  name?: string;
  role?: string;
  password?: string;
  customerCompanyId?: string | null;
  customerContactId?: string | null;
};

type ManagedUserRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  customerCompanyId: string | null;
  customerContactId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  customerCompany?: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  customerContact?: {
    id: string;
    fullName: string | null;
    email: string | null;
  } | null;
};

function isManagedUserRole(role: string): role is ManagedUserRole {
  return USER_ROLES.includes(role as ManagedUserRole);
}

function serializeUser(user: ManagedUserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    customerCompanyId: user.customerCompanyId,
    customerContactId: user.customerContactId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    customerCompany: user.customerCompany
      ? {
          id: user.customerCompany.id,
          name: user.customerCompany.name,
          city: user.customerCompany.city,
          state: user.customerCompany.state,
        }
      : null,
    customerContact: user.customerContact
      ? {
          id: user.customerContact.id,
          fullName: user.customerContact.fullName,
          email: user.customerContact.email,
        }
      : null,
  };
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

export async function GET() {
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
  }

  try {
    const [users, companies] = await Promise.all([
      prisma.user.findMany({
        include: {
          customerCompany: {
            select: { id: true, name: true, city: true, state: true },
          },
          customerContact: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      }),
      prisma.salesCompany.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          contacts: {
            select: {
              id: true,
              fullName: true,
              email: true,
              isPrimary: true,
            },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
        orderBy: [{ name: "asc" }],
        take: 500,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      users: users.map(serializeUser),
      companies,
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
  }

  try {
    const body = (await request.json()) as CreateUserPayload;
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const role = body.role || "ORBISY_SALES";
    const password = body.password?.trim() || generateTemporaryPassword();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "A valid email is required" },
        { status: 400 },
      );
    }
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Name is required" },
        { status: 400 },
      );
    }
    if (!isManagedUserRole(role)) {
      return NextResponse.json(
        { ok: false, error: "Invalid user role" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "A user with that email already exists" },
        { status: 409 },
      );
    }

    let customerCompanyId: string | null = null;
    let customerContactId: string | null = null;

    if (COMPANY_LINKED_ROLES.includes(role)) {
      customerCompanyId = body.customerCompanyId?.trim() || null;
      customerContactId = body.customerContactId?.trim() || null;

      if (!customerCompanyId) {
        return NextResponse.json(
          { ok: false, error: "This user role must be linked to a company" },
          { status: 400 },
        );
      }

      const company = await prisma.salesCompany.findUnique({
        where: { id: customerCompanyId },
      });
      if (!company) {
        return NextResponse.json(
          { ok: false, error: "Company not found" },
          { status: 404 },
        );
      }

      if (customerContactId) {
        const contact = await prisma.salesContact.findFirst({
          where: { id: customerContactId, companyId: customerCompanyId },
        });
        if (!contact) {
          return NextResponse.json(
            { ok: false, error: "Contact does not belong to that company" },
            { status: 400 },
          );
        }
      }
    }

    const created = await prisma.user.create({
      data: {
        email,
        name,
        password: hashPassword(password),
        role,
        customerCompanyId,
        customerContactId,
      },
      include: {
        customerCompany: {
          select: { id: true, name: true, city: true, state: true },
        },
        customerContact: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      user: serializeUser(created),
      temporaryPassword: password,
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
