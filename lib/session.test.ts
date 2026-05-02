import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import {
  AuthError,
  type ValidatedSession,
  requireCustomerResourceAccess,
} from "./session";

const baseCustomerSession: ValidatedSession = {
  userId: "user_1",
  userEmail: "customer@example.com",
  userName: "Homeowner User",
  userRole: "HOMEOWNER",
  customerCompanyId: "company_1",
  customerContactId: "contact_1",
};

describe("requireCustomerResourceAccess", () => {
  it("allows access when company matches", () => {
    expect(() =>
      requireCustomerResourceAccess(baseCustomerSession, {
        companyId: "company_1",
        contactId: null,
      }),
    ).not.toThrow();
  });

  it("allows access when contact matches", () => {
    expect(() =>
      requireCustomerResourceAccess(baseCustomerSession, {
        companyId: "company_other",
        contactId: "contact_1",
      }),
    ).not.toThrow();
  });

  it("rejects access when neither company nor contact match", () => {
    expect(() =>
      requireCustomerResourceAccess(baseCustomerSession, {
        companyId: "company_other",
        contactId: "contact_other",
      }),
    ).toThrow(AuthError);
  });

  it("rejects non-customer users", () => {
    const internalSession: ValidatedSession = {
      ...baseCustomerSession,
      userRole: "ORBISY_SALES",
    };

    expect(() =>
      requireCustomerResourceAccess(internalSession, {
        companyId: "company_1",
        contactId: "contact_1",
      }),
    ).toThrow("Forbidden");
  });
});
