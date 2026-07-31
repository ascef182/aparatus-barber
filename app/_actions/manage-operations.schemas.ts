import { z } from "zod";

/**
 * Schemas de input das actions de manage-operations.ts, extraídos para um
 * módulo sem "use server" — um arquivo "use server" só pode exportar
 * async functions (regra do Next.js); exportar um schema Zod (objeto, não
 * função) de um arquivo assim quebra em runtime quando um Client Component
 * importa qualquer coisa do módulo ("A 'use server' file can only export
 * async functions, found object.").
 */

const serviceImagesSchema = z.array(z.object({ url: z.url(), publicId: z.string().max(255).optional() })).max(5);

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120), description: z.string().trim().max(1000).optional(),
  durationMinutes: z.coerce.number().int().min(5), priceInCents: z.coerce.number().int().min(0), locationId: z.uuid().optional(),
  paymentMode: z.enum(["ON_SITE", "DEPOSIT", "FULL_PREPAYMENT"]).optional(), depositPercent: z.coerce.number().int().min(1).max(100).optional(),
  images: serviceImagesSchema.default([]),
});
// images fica opcional (não `.default([])`): ausente no input significa "não
// mexer nas fotos existentes"; array vazio significa "remover todas" — um
// default apagaria as fotos em qualquer update que não mande `images` (ex.:
// o toggle de isActive), igual ao caso de serviceIds em updateStaffSchema.
export const updateServiceSchema = serviceSchema.omit({ images: true }).partial().extend({ id: z.uuid(), isActive: z.boolean().optional(), images: serviceImagesSchema.optional() });

// value é percentual (1–100) para PERCENT ou centavos para FIXED — só o
// primeiro caso tem teto. Checagem null-safe: no update parcial, type/value
// podem estar ausentes (campo não sendo alterado nesta submissão).
function validateCouponValue(value: { type?: "PERCENT" | "FIXED"; value?: number }, ctx: z.RefinementCtx) {
  if (value.type === "PERCENT" && value.value !== undefined && value.value > 100) {
    ctx.addIssue({ code: "custom", message: "Desconto percentual deve ser no máximo 100.", path: ["value"] });
  }
}
const couponBaseSchema = z.object({
  code: z.string().trim().min(3).max(32),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().int().positive(),
  // nullable: o form de edição sempre reenvia esses três campos (não é um
  // patch parcial), então precisa poder expressar "sem restrição" (null),
  // não só "não estou tocando nisso" (undefined, via .partial() no update).
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  maxRedemptions: z.coerce.number().int().positive().nullable().optional(),
  scope: z.enum(["ALL_SERVICES", "SELECTED_SERVICES"]),
  serviceIds: z.array(z.uuid()).default([]),
});
export const couponSchema = couponBaseSchema.superRefine(validateCouponValue);
// serviceIds sem `.default([])` no update pela mesma razão de serviceIds em
// updateStaffSchema: omitido = "não mexer no escopo", array vazio = "trocar
// pra nenhum serviço vinculado" (ambos válidos, mas semanticamente diferentes).
export const updateCouponSchema = couponBaseSchema
  .omit({ serviceIds: true })
  .partial()
  .extend({ id: z.uuid(), isActive: z.boolean().optional(), serviceIds: z.array(z.uuid()).optional() })
  .superRefine(validateCouponValue);

const staffBaseSchema = z.object({
  displayName: z.string().trim().min(2).max(120), jobTitle: z.string().trim().max(120).optional(), imageUrl: z.url().optional(), locationId: z.uuid(), color: z.string().max(24).optional(), serviceIds: z.array(z.uuid()).default([]),
  compensationType: z.enum(["MONTHLY", "HOURLY", "PER_SERVICE_COMMISSION"]).optional(), compensationAmountInCents: z.coerce.number().int().positive().optional(), commissionBps: z.coerce.number().int().min(1).max(10000).optional(),
  invite: z.object({ email: z.email(), role: z.enum(["manager", "professional", "receptionist"]) }).optional(),
});
function validateStaffCompensation(value: { compensationType?: "MONTHLY" | "HOURLY" | "PER_SERVICE_COMMISSION"; commissionBps?: number; compensationAmountInCents?: number }, ctx: z.RefinementCtx) {
  if (value.compensationType === "PER_SERVICE_COMMISSION" && !value.commissionBps) ctx.addIssue({ code: "custom", message: "Informe a comissão por serviço.", path: ["commissionBps"] });
  if (value.compensationType && value.compensationType !== "PER_SERVICE_COMMISSION" && !value.compensationAmountInCents) ctx.addIssue({ code: "custom", message: "Informe o valor da remuneração.", path: ["compensationAmountInCents"] });
}
export const staffSchema = staffBaseSchema.superRefine(validateStaffCompensation);
// serviceIds é omitido da base e reintroduzido sem `.default([])`: no update
// parcial, omitir o campo precisa significar "não mexer nos vínculos", não
// "substituir por []" — `.partial()` sozinho preservaria o default do campo
// base e um array vazio é truthy em JS, o que apagaria os serviços do staff
// em qualquer update que não envie serviceIds (ex.: o toggle de isActive).
export const updateStaffSchema = staffBaseSchema
  .omit({ invite: true, serviceIds: true })
  .partial()
  .extend({ id: z.uuid(), isActive: z.boolean().optional(), serviceIds: z.array(z.uuid()).optional() })
  .superRefine(validateStaffCompensation);

export const locationSchema = z.object({ name: z.string().trim().min(2).max(120), addressLine1: z.string().trim().min(3).max(160), postalCode: z.string().trim().min(3).max(12), city: z.string().trim().min(2).max(80) });
export const absenceSchema = z.object({ staffId: z.uuid(), startAt: z.coerce.date(), endAt: z.coerce.date(), type: z.enum(["VACATION", "SICK", "BLOCK", "OTHER"]), note: z.string().max(500).optional() });
export const workingHourEntrySchema = z.object({ weekday: z.number().int().min(0).max(6), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/) });
export const staffWorkingHoursSchema = z.object({ staffId: z.uuid(), hours: z.array(workingHourEntrySchema) });
export const closedPeriodSchema = z.object({ name: z.string().min(2).max(120), startAt: z.coerce.date(), endAt: z.coerce.date(), locationId: z.uuid().optional() });
export const updateCustomerSchema = z.object({ id: z.uuid(), notes: z.string().max(2000).nullable(), isBlocked: z.boolean(), tags: z.array(z.string().trim().min(1).max(30)).max(10) });
export const impressumSchema = z.object({ legalName: z.string().min(2).max(160), addressLine1: z.string().min(3).max(160), postalCode: z.string().min(3).max(12), city: z.string().min(2).max(80), country: z.string().length(2).default("DE"), representedBy: z.string().max(160).optional(), phone: z.string().max(40).optional(), email: z.email().optional(), registerCourt: z.string().max(120).optional(), registerNumber: z.string().max(60).optional(), vatId: z.string().max(40).optional() });
export const toggleDirectoryListingSchema = z.object({
  isListed: z.boolean(),
  category: z.enum(["BARBERSHOP", "HAIR_SALON", "NAIL_SALON", "BEAUTY_SALON", "MEDICAL", "DENTAL", "ELECTRICIAN", "CONSTRUCTION", "OTHER"]).optional(),
});
export const updateCoverImageSchema = z.object({ coverImageUrl: z.url().nullable() });
