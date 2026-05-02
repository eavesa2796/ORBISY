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
