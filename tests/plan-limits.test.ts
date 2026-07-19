import { describe, expect, test } from "vitest";
import { isPlanLimitReached } from "@/lib/billing/plan-limits";

describe("plan limits", () => {
  test("enforces Starter and Growth limits", () => { expect(isPlanLimitReached("STARTER", 1, "locations")).toBe(true); expect(isPlanLimitReached("STARTER", 4, "staff")).toBe(false); expect(isPlanLimitReached("GROWTH", 20, "staff")).toBe(true); });
  test("does not limit Pro", () => expect(isPlanLimitReached("PRO", 9999, "staff")).toBe(false));
  test("uses Starter limits during trial", () => expect(isPlanLimitReached(null, 1, "locations")).toBe(true));
});
