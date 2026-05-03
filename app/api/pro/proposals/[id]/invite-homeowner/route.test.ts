import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireHvacUserMock,
  authErrorToHttpMock,
  salesProposalFindFirstMock,
  userFindUniqueMock,
  transactionMock,
  userCreateMock,
  userUpdateMock,
  inviteUpdateManyMock,
  inviteCreateMock,
  sendUserInviteEmailMock,
  generateOneTimeTokenMock,
  hashOneTimeTokenMock,
  hashPasswordMock,
} = vi.hoisted(() => ({
  requireHvacUserMock: vi.fn(),
  authErrorToHttpMock: vi.fn(),
  salesProposalFindFirstMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  userCreateMock: vi.fn(),
  userUpdateMock: vi.fn(),
  inviteUpdateManyMock: vi.fn(),
  inviteCreateMock: vi.fn(),
  sendUserInviteEmailMock: vi.fn(),
  generateOneTimeTokenMock: vi.fn(),
  hashOneTimeTokenMock: vi.fn(),
  hashPasswordMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireHvacUser: requireHvacUserMock,
  authErrorToHttp: authErrorToHttpMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    salesProposal: {
      findFirst: salesProposalFindFirstMock,
    },
    user: {
      findUnique: userFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/invite-email", () => ({
  sendUserInviteEmail: sendUserInviteEmailMock,
}));

vi.mock("@/lib/auth", () => ({
  generateOneTimeToken: generateOneTimeTokenMock,
  hashOneTimeToken: hashOneTimeTokenMock,
  hashPassword: hashPasswordMock,
}));

import { POST } from "./route";

const linkedSession = {
  userId: "user_hvac",
  userEmail: "sales@acme.example",
  userName: "Sam Sales",
  userRole: "HVAC_SALES",
  customerCompanyId: "company_1",
  customerContactId: null,
};

const proposal = {
  id: "proposal_1",
  companyId: "company_1",
  contactId: "contact_1",
  company: { id: "company_1", name: "Acme HVAC" },
  contact: {
    id: "contact_1",
    fullName: "Home Owner",
    email: "HOME@example.com ",
  },
  opportunity: { id: "opportunity_1", title: "System Replacement" },
};

function request() {
  return new Request(
    "https://orbisy.example/api/pro/proposals/proposal_1/invite-homeowner",
    { method: "POST" },
  );
}

describe("/api/pro/proposals/[id]/invite-homeowner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_URL;
    delete process.env.VERCEL_URL;

    requireHvacUserMock.mockResolvedValue(linkedSession);
    authErrorToHttpMock.mockReturnValue(null);
    salesProposalFindFirstMock.mockResolvedValue(proposal);
    userFindUniqueMock.mockResolvedValue(null);
    generateOneTimeTokenMock
      .mockReturnValueOnce("invite-token")
      .mockReturnValue("temporary-password");
    hashOneTimeTokenMock.mockReturnValue("hashed-invite-token");
    hashPasswordMock.mockReturnValue("hashed-temporary-password");
    userCreateMock.mockResolvedValue({ id: "user_homeowner" });
    userUpdateMock.mockResolvedValue({ id: "user_homeowner" });
    inviteUpdateManyMock.mockResolvedValue({ count: 0 });
    inviteCreateMock.mockResolvedValue({ id: "invite_1" });
    sendUserInviteEmailMock.mockResolvedValue({
      success: true,
      messageId: "message_1",
    });
    transactionMock.mockImplementation(async (callback) =>
      callback({
        user: {
          create: userCreateMock,
          update: userUpdateMock,
        },
        inviteToken: {
          updateMany: inviteUpdateManyMock,
          create: inviteCreateMock,
        },
      }),
    );
  });

  it("creates and emails a homeowner setup invite scoped to the HVAC proposal", async () => {
    const response = await POST(request(), {
      params: Promise.resolve({ id: "proposal_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.invite.email).toBe("home@example.com");
    expect(body.setupUrl).toBe(
      "https://orbisy.example/setup-password?token=invite-token",
    );
    expect(salesProposalFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "proposal_1", companyId: "company_1" },
      }),
    );
    expect(userCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "home@example.com",
          name: "Home Owner",
          role: "HOMEOWNER",
          isActive: false,
          customerCompanyId: "company_1",
          customerContactId: "contact_1",
        }),
      }),
    );
    expect(inviteCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_homeowner",
          invitedByUserId: "user_hvac",
          tokenHash: "hashed-invite-token",
          email: "home@example.com",
          role: "HOMEOWNER",
          customerCompanyId: "company_1",
          customerContactId: "contact_1",
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(sendUserInviteEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "home@example.com",
        inviteeName: "Home Owner",
        inviterName: "Sam Sales",
        role: "HOMEOWNER",
        companyName: "Acme HVAC",
        setupUrl: "https://orbisy.example/setup-password?token=invite-token",
      }),
    );
  });

  it("rejects HVAC users without a linked company workspace", async () => {
    requireHvacUserMock.mockResolvedValue({
      ...linkedSession,
      customerCompanyId: null,
    });

    const response = await POST(request(), {
      params: Promise.resolve({ id: "proposal_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(salesProposalFindFirstMock).not.toHaveBeenCalled();
  });

  it("does not re-invite an already active homeowner linked to the proposal company", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "user_homeowner",
      email: "home@example.com",
      role: "HOMEOWNER",
      isActive: true,
      customerCompanyId: "company_1",
      customerContactId: "contact_1",
    });

    const response = await POST(request(), {
      params: Promise.resolve({ id: "proposal_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.alreadyActive).toBe(true);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(sendUserInviteEmailMock).not.toHaveBeenCalled();
  });
});
