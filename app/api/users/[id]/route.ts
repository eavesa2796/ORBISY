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

type UpdateUserPayload = {
  email?: string;
  name?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
  customerCompanyId?: string | null;
  customerContactId?: string | null;
};

type ManagedUserUpdateData = {
  email?: string;
  name?: string;
  role?: ManagedUserRole;
  isActive?: boolean;
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

export async function GET(
  _request: NextRequest,
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
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        customerCompany: {
          select: { id: true, name: true, city: true, state: true },
        },
        customerContact: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, user: serializeUser(user) });
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    session = await requireAdmin();
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
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as UpdateUserPayload;
    const data: ManagedUserUpdateData = {};

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { ok: false, error: "A valid email is required" },
          { status: 400 },
        );
      }
      const emailOwner = await prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.id !== id) {
        return NextResponse.json(
          { ok: false, error: "A user with that email already exists" },
          { status: 409 },
        );
      }
      data.email = email;
    }

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { ok: false, error: "Name is required" },
          { status: 400 },
        );
      }
      data.name = name;
    }

    let nextRole: ManagedUserRole;
    if (body.role !== undefined) {
      if (!isManagedUserRole(body.role)) {
        return NextResponse.json(
          { ok: false, error: "Invalid user role" },
          { status: 400 },
        );
      }
      nextRole = body.role;
      data.role = body.role;
    } else if (isManagedUserRole(existing.role)) {
      nextRole = existing.role;
    } else {
      return NextResponse.json(
        { ok: false, error: "Existing user has an invalid role" },
        { status: 500 },
      );
    }

    if (id === session.userId && body.isActive === false) {
      return NextResponse.json(
        { ok: false, error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }
    if (id === session.userId && data.role && data.role !== "ORBISY_ADMIN") {
      return NextResponse.json(
        { ok: false, error: "You cannot remove your own admin access" },
        { status: 400 },
      );
    }

    if (body.isActive !== undefined) {
      data.isActive = body.isActive;
    }

    if (body.password !== undefined && body.password.trim()) {
      const password = body.password.trim();
      if (password.length < 8) {
        return NextResponse.json(
          { ok: false, error: "Password must be at least 8 characters" },
          { status: 400 },
        );
      }
      data.password = hashPassword(password);
    }

    if (COMPANY_LINKED_ROLES.includes(nextRole)) {
      const customerCompanyId =
        body.customerCompanyId !== undefined
          ? body.customerCompanyId?.trim() || null
          : existing.customerCompanyId;
      const customerContactId =
        body.customerContactId !== undefined
          ? body.customerContactId?.trim() || null
          : existing.customerContactId;

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

      data.customerCompanyId = customerCompanyId;
      data.customerContactId = customerContactId;
    } else {
      data.customerCompanyId = null;
      data.customerContactId = null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      include: {
        customerCompany: {
          select: { id: true, name: true, city: true, state: true },
        },
        customerContact: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (body.isActive === false) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    return NextResponse.json({ ok: true, user: serializeUser(updated) });
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
