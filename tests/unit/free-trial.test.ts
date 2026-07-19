import { describe, expect, it } from "vitest";
import { isFreeTrialExpired } from "@/lib/services/organization-service";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("isFreeTrialExpired", () => {
  it("expira depois de 7 dias sem nunca ter tido subscription", () => {
    const createdAt = new Date(Date.now() - 8 * DAY_MS);
    expect(isFreeTrialExpired({ createdAt, stripeSubscriptionId: null })).toBe(true);
  });

  it("não expira dentro dos 7 dias de graça", () => {
    const createdAt = new Date(Date.now() - 1 * DAY_MS);
    expect(isFreeTrialExpired({ createdAt, stripeSubscriptionId: null })).toBe(false);
  });

  it("nunca expira se a organização já teve uma subscription Stripe", () => {
    const createdAt = new Date(Date.now() - 8 * DAY_MS);
    expect(isFreeTrialExpired({ createdAt, stripeSubscriptionId: "sub_123" })).toBe(false);
  });

  it("no limite exato dos 7 dias ainda não expirou", () => {
    const createdAt = new Date(Date.now() - 7 * DAY_MS + 60_000);
    expect(isFreeTrialExpired({ createdAt, stripeSubscriptionId: null })).toBe(false);
  });
});
