import { z } from "zod";

/**
 * Regras de negócio configuráveis por tenant — versão 1 (plano §4).
 * Todo campo tem default: um tenant sem settings salvos opera com os
 * defaults; o form do dashboard sempre grava o objeto completo.
 */
export const bookingRulesV1Schema = z.object({
  slotGranularityMinutes: z.number().int().min(5).max(120).default(15),
  minLeadTimeMinutes: z.number().int().min(0).max(10080).default(60),
  maxAdvanceDays: z.number().int().min(1).max(365).default(60),
  cancellation: z
    .object({
      freeUntilHoursBefore: z.number().int().min(0).max(720).default(24),
      feeType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
      feeValue: z.number().int().min(0).default(0), // PERCENT: 0-100; FIXED: cents
    })
    .prefault({}),
  noShow: z
    .object({
      feeInCents: z.number().int().min(0).default(0),
      blockAfterCount: z.number().int().min(0).default(3), // 0 = nunca bloquear
    })
    .prefault({}),
  paymentMode: z
    .enum(["ON_SITE", "DEPOSIT", "FULL_PREPAYMENT"])
    .default("ON_SITE"),
  overbookingDefault: z.boolean().default(false),
});

export type BookingRulesV1 = z.infer<typeof bookingRulesV1Schema>;
