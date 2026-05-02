import { describe, expect, it } from "vitest";
import {
  buildPublicProposalUrl,
  prepareMarkProposalSent,
  preparePublicProposalView,
} from "./workflow";

describe("proposal workflow", () => {
  it("DRAFT cannot be viewed publicly", () => {
    const result = preparePublicProposalView({
      publicToken: "token_1",
      status: "DRAFT",
      sentAt: null,
      viewedAt: null,
    });

    expect(result).toEqual({ available: false });
  });

  it("DRAFT -> SENT works from internal mark sent action", () => {
    const now = new Date("2026-05-01T12:00:00.000Z");
    const result = prepareMarkProposalSent(
      {
        publicToken: "token_1",
        status: "DRAFT",
        sentAt: null,
        viewedAt: null,
      },
      "https://orbisy.example.com",
      now,
    );

    expect(result.update).toEqual({
      status: "SENT",
      sentAt: now,
    });
    expect(result.event.eventType).toBe("SENT");
    expect(result.publicUrl).toBe(buildPublicProposalUrl("https://orbisy.example.com", "token_1"));
  });

  it("SENT -> VIEWED works on first public open", () => {
    const now = new Date("2026-05-01T13:00:00.000Z");
    const result = preparePublicProposalView(
      {
        publicToken: "token_1",
        status: "SENT",
        sentAt: new Date("2026-05-01T12:00:00.000Z"),
        viewedAt: null,
      },
      now,
    );

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.update).toEqual({
        status: "VIEWED",
        viewedAt: now,
      });
      expect(result.event?.eventType).toBe("VIEWED");
    }
  });

  it("repeat public opens log view events without changing status again", () => {
    const now = new Date("2026-05-01T14:00:00.000Z");
    const result = preparePublicProposalView(
      {
        publicToken: "token_1",
        status: "VIEWED",
        sentAt: new Date("2026-05-01T12:00:00.000Z"),
        viewedAt: new Date("2026-05-01T13:00:00.000Z"),
      },
      now,
    );

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.update).toBeUndefined();
      expect(result.event.eventType).toBe("VIEWED");
      expect(result.event.metadata).toMatchObject({
        source: "public_page_open",
        firstView: false,
        statusAtOpen: "VIEWED",
      });
    }
  });
});
