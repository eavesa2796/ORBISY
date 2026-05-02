import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const {
  requireHvacUserMock,
  authErrorToHttpMock,
  findUniqueMock,
  updateMock,
} = vi.hoisted(() => ({
  requireHvacUserMock: vi.fn(),
  authErrorToHttpMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireHvacUser: requireHvacUserMock,
  authErrorToHttp: authErrorToHttpMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    salesCompany: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
  },
}));

import { GET, PUT } from "./route";

describe("/api/pro/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireHvacUserMock.mockResolvedValue({
      userId: "user_1",
      userRole: "HVAC_OWNER",
      customerCompanyId: "company_1",
    });
    authErrorToHttpMock.mockReturnValue(null);
  });

  it("returns the linked HVAC company profile", async () => {
    findUniqueMock.mockResolvedValue({
      id: "company_1",
      name: "Acme HVAC",
      website: "https://acme.example/",
      phone: "555-0100",
      city: "Austin",
      state: "TX",
      country: "US",
      logoUrl: null,
      brandColor: "#14B8A6",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.company.name).toBe("Acme HVAC");
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "company_1" } }),
    );
  });

  it("updates only the linked HVAC company profile", async () => {
    updateMock.mockResolvedValue({
      id: "company_1",
      name: "Acme Air",
      website: "https://acme.example/",
      phone: "555-0100",
      city: "Austin",
      state: "TX",
      country: "US",
      logoUrl: "https://acme.example/logo.png",
      brandColor: "#0F766E",
    });

    const request = new Request("http://localhost/api/pro/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Acme Air",
        website: "https://acme.example",
        phone: "555-0100",
        city: "Austin",
        state: "TX",
        logoUrl: "https://acme.example/logo.png",
        brandColor: "#0f766e",
      }),
    });

    const response = await PUT(request as unknown as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.company.name).toBe("Acme Air");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "company_1" },
        data: expect.objectContaining({
          name: "Acme Air",
          brandColor: "#0F766E",
        }),
      }),
    );
  });

  it("rejects a blank company name", async () => {
    const request = new Request("http://localhost/api/pro/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: " " }),
    });

    const response = await PUT(request as unknown as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
