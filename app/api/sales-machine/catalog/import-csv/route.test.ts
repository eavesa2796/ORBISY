import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { CATALOG_CSV_COLUMNS } from "@/lib/sales/catalog/csv";

const {
  requireInternalUserMock,
  authErrorToHttpMock,
  findFirstMock,
  createMock,
  updateMock,
} = vi.hoisted(() => ({
  requireInternalUserMock: vi.fn(),
  authErrorToHttpMock: vi.fn(),
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
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
    salesHvacCatalogItem: {
      findFirst: findFirstMock,
      create: createMock,
      update: updateMock,
    },
  },
}));

import { POST } from "./route";

describe("POST /api/sales-machine/catalog/import-csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalUserMock.mockResolvedValue({
      userId: "user_1",
      userRole: "ORBISY_ADMIN",
    });
    authErrorToHttpMock.mockReturnValue(null);
  });

  it("valid import creates items", async () => {
    const csv = [
      CATALOG_CSV_COLUMNS.join(","),
      "HEAT_PUMP,Carrier,25VNA4,4-ton,SEER2 18,6400,COST_PLUS_MARGIN,,35,desc,,,true",
    ].join("\n");

    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "cat_1" });

    const request = new Request(
      "https://app.orbisy.com/api/sales-machine/catalog/import-csv",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csvText: csv }),
      },
    );

    const response = await POST(request as unknown as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.summary.created).toBe(1);
    expect(json.summary.updated).toBe(0);
    expect(json.summary.errors).toBe(0);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("matching row updates existing item", async () => {
    const csv = [
      CATALOG_CSV_COLUMNS.join(","),
      "FURNACE,Trane,XV95,,95 AFUE,3900,FIXED_SELL_PRICE,6900,,desc,,,true",
    ].join("\n");

    findFirstMock.mockResolvedValue({
      id: "cat_1",
      equipmentType: "FURNACE",
      brand: "Trane",
      modelNumber: "XV95",
      sizeTonnage: null,
      efficiencyRating: "95 AFUE",
      cost: 3200,
      pricingMode: "FIXED_SELL_PRICE",
      sellPrice: 6100,
      marginPercent: null,
      description: "old",
      imageUrl: null,
      brochureUrl: null,
      isActive: true,
    });
    updateMock.mockResolvedValue({ id: "cat_1" });

    const request = new Request(
      "https://app.orbisy.com/api/sales-machine/catalog/import-csv",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csvText: csv }),
      },
    );

    const response = await POST(request as unknown as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.summary.updated).toBe(1);
    expect(json.summary.created).toBe(0);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("invalid rows return row-level errors", async () => {
    const csv = [
      CATALOG_CSV_COLUMNS.join(","),
      "INVALID,Carrier,ABC,4-ton,SEER2 18,6400,COST_PLUS_MARGIN,,35,desc,,,true",
      "HEAT_PUMP,Carrier,DEF,4-ton,SEER2 18,6500,COST_PLUS_MARGIN,,35,desc,,,true",
    ].join("\n");

    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "cat_2" });

    const request = new Request(
      "https://app.orbisy.com/api/sales-machine/catalog/import-csv",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csvText: csv }),
      },
    );

    const response = await POST(request as unknown as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.summary.created).toBe(1);
    expect(json.summary.errors).toBe(1);
    expect(json.rowErrors[0].rowNumber).toBe(2);
  });
});
