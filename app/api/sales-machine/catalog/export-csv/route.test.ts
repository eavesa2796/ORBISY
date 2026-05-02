import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { CATALOG_CSV_COLUMNS } from "@/lib/sales/catalog/csv";

const { requireInternalUserMock, authErrorToHttpMock, findManyMock } =
  vi.hoisted(() => ({
    requireInternalUserMock: vi.fn(),
    authErrorToHttpMock: vi.fn(),
    findManyMock: vi.fn(),
  }));

vi.mock("@/lib/session", () => ({
  requireInternalUser: requireInternalUserMock,
  authErrorToHttp: authErrorToHttpMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    salesHvacCatalogItem: {
      findMany: findManyMock,
    },
  },
}));

import { GET } from "./route";

describe("GET /api/sales-machine/catalog/export-csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalUserMock.mockResolvedValue({
      userId: "user_1",
      userRole: "HVAC_SALES",
    });
    authErrorToHttpMock.mockReturnValue(null);
  });

  it("default export includes active and inactive items", async () => {
    findManyMock.mockResolvedValue([
      {
        equipmentType: "HEAT_PUMP",
        brand: "Carrier",
        modelNumber: "25VNA4",
        sizeTonnage: "4-ton",
        efficiencyRating: "SEER2 18",
        cost: 6400,
        pricingMode: "COST_PLUS_MARGIN",
        sellPrice: null,
        marginPercent: 35,
        description: "desc",
        imageUrl: null,
        brochureUrl: null,
        isActive: true,
      },
      {
        equipmentType: "FURNACE",
        brand: "Trane",
        modelNumber: "XV95",
        sizeTonnage: null,
        efficiencyRating: "95 AFUE",
        cost: 3200,
        pricingMode: "FIXED_SELL_PRICE",
        sellPrice: 6100,
        marginPercent: null,
        description: "desc 2",
        imageUrl: null,
        brochureUrl: null,
        isActive: false,
      },
    ]);

    const response = await GET(
      new Request(
        "https://app.orbisy.com/api/sales-machine/catalog/export-csv",
      ) as unknown as NextRequest,
    );
    const csv = await response.text();
    const [header, firstRow, secondRow] = csv.split("\n");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(header).toBe(CATALOG_CSV_COLUMNS.join(","));
    expect(findManyMock).toHaveBeenCalledWith({
      where: undefined,
      orderBy: [{ equipmentType: "asc" }, { brand: "asc" }, { modelNumber: "asc" }],
    });
    expect(firstRow.endsWith(",true")).toBe(true);
    expect(secondRow.endsWith(",false")).toBe(true);
  });

  it("activeOnly export includes only active items", async () => {
    findManyMock.mockResolvedValue([
      {
        equipmentType: "HEAT_PUMP",
        brand: "Carrier",
        modelNumber: "25VNA4",
        sizeTonnage: "4-ton",
        efficiencyRating: "SEER2 18",
        cost: 6400,
        pricingMode: "COST_PLUS_MARGIN",
        sellPrice: null,
        marginPercent: 35,
        description: "desc",
        imageUrl: null,
        brochureUrl: null,
        isActive: true,
      },
    ]);

    const response = await GET(
      new Request(
        "https://app.orbisy.com/api/sales-machine/catalog/export-csv?activeOnly=true",
      ) as unknown as NextRequest,
    );
    const csv = await response.text();
    const [, onlyRow] = csv.split("\n");

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ equipmentType: "asc" }, { brand: "asc" }, { modelNumber: "asc" }],
    });
    expect(onlyRow.endsWith(",true")).toBe(true);
  });
});
