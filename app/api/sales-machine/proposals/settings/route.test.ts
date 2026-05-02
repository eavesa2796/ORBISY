import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalUserMock,
  authErrorToHttpMock,
  settingsFindUniqueMock,
  settingsUpsertMock,
} = vi.hoisted(() => ({
  requireInternalUserMock: vi.fn(),
  authErrorToHttpMock: vi.fn(),
  settingsFindUniqueMock: vi.fn(),
  settingsUpsertMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireInternalUser: requireInternalUserMock,
  authErrorToHttp: authErrorToHttpMock,
  isHvacRole: (role: string) => role === "HVAC_OWNER" || role === "HVAC_SALES",
  AuthError: class AuthError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    salesProposalSettings: {
      findUnique: settingsFindUniqueMock,
      upsert: settingsUpsertMock,
    },
  },
}));

import { GET, PUT } from "./route";

describe("GET /api/sales-machine/proposals/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalUserMock.mockResolvedValue({
      userId: "user_1",
      userRole: "ORBISY_ADMIN",
    });
    authErrorToHttpMock.mockReturnValue(null);
  });

  it("returns sensible defaults when settings row does not exist", async () => {
    settingsFindUniqueMock.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.settings.defaultLaborCost).toBe(1500);
    expect(body.settings.defaultFinancingApr).toBe(8.99);
    expect(body.settings.defaultFinancingMonths).toBe(120);
    expect(body.settings.defaultWarrantyGood).toBe("10-year parts");
    expect(body.settings.permitFeeDefault).toBe(0);
    expect(body.settings.taxRatePercent).toBe(0);
    expect(typeof body.settings.companyProposalFooter).toBe("string");
    expect(typeof body.settings.proposalDisclaimer).toBe("string");
  });
});

describe("PUT /api/sales-machine/proposals/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalUserMock.mockResolvedValue({
      userId: "user_1",
      userRole: "ORBISY_ADMIN",
    });
    authErrorToHttpMock.mockReturnValue(null);
    settingsFindUniqueMock.mockResolvedValue(null);
  });

  it("saves and returns normalized settings", async () => {
    const savedRow = {
      id: "default",
      defaultLaborCost: "1800",
      defaultFinancingApr: 7.5,
      defaultFinancingMonths: 96,
      defaultWarrantyGood: "8-year parts",
      defaultWarrantyBetter: "10-year parts + 1-year labor",
      defaultWarrantyBest: "12-year parts + 5-year labor",
      permitFeeDefault: "150",
      taxRatePercent: 6.5,
      companyProposalFooter: "Thank you.",
      proposalDisclaimer: "Valid 30 days.",
    };
    settingsUpsertMock.mockResolvedValue(savedRow);

    const request = new Request(
      "http://localhost/api/sales-machine/proposals/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultLaborCost: 1800,
          defaultFinancingApr: 7.5,
          defaultFinancingMonths: 96,
          defaultWarrantyGood: "8-year parts",
          defaultWarrantyBetter: "10-year parts + 1-year labor",
          defaultWarrantyBest: "12-year parts + 5-year labor",
          permitFeeDefault: 150,
          taxRatePercent: 6.5,
          companyProposalFooter: "Thank you.",
          proposalDisclaimer: "Valid 30 days.",
        }),
      },
    );

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.settings.defaultLaborCost).toBe(1800);
    expect(body.settings.defaultFinancingApr).toBe(7.5);
    expect(body.settings.defaultFinancingMonths).toBe(96);
    expect(body.settings.defaultWarrantyGood).toBe("8-year parts");
    expect(body.settings.permitFeeDefault).toBe(150);
    expect(body.settings.taxRatePercent).toBe(6.5);
    expect(settingsUpsertMock).toHaveBeenCalledOnce();
    expect(settingsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "default" },
        create: expect.objectContaining({ id: "default", companyId: null }),
      }),
    );
  });

  it("saves company-scoped settings for HVAC users", async () => {
    requireInternalUserMock.mockResolvedValue({
      userId: "user_1",
      userRole: "HVAC_OWNER",
      customerCompanyId: "company_1",
    });
    settingsFindUniqueMock.mockResolvedValue(null);
    settingsUpsertMock.mockResolvedValue({
      id: "company:company_1",
      companyId: "company_1",
      defaultLaborCost: "2100",
      defaultFinancingApr: 8.25,
      defaultFinancingMonths: 120,
      defaultWarrantyGood: "10-year parts",
      defaultWarrantyBetter: "10-year parts + 2-year labor",
      defaultWarrantyBest: "10-year parts + 10-year labor",
      permitFeeDefault: "125",
      taxRatePercent: 7,
      companyProposalFooter: "Thanks.",
      proposalDisclaimer: "Valid 14 days.",
    });

    const request = new Request(
      "http://localhost/api/sales-machine/proposals/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultLaborCost: 2100,
          permitFeeDefault: 125,
          taxRatePercent: 7,
          companyProposalFooter: "Thanks.",
          proposalDisclaimer: "Valid 14 days.",
        }),
      },
    );

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scope).toBe("company");
    expect(body.companyId).toBe("company_1");
    expect(settingsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "company:company_1" },
        create: expect.objectContaining({
          id: "company:company_1",
          companyId: "company_1",
        }),
      }),
    );
  });

  it("returns 401 when user is not authenticated", async () => {
    requireInternalUserMock.mockRejectedValue(new Error("Unauthorized"));
    authErrorToHttpMock.mockReturnValue({
      message: "Unauthorized",
      status: 401,
    });

    const request = new Request(
      "http://localhost/api/sales-machine/proposals/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
  });
});
