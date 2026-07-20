"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isPlanLimitReached } from "@/lib/billing/plan-limits";
import { db } from "@/lib/db";
import { enqueueInvitationEmail } from "@/lib/notifications";
import { bookingRulesV1Schema } from "@/lib/rules/schemas/v1";
import { ActionError, staffWriteActionClient } from "@/lib/safe-action";
import { logAuditEvent } from "@/lib/services/audit-service";
import { upsertImpressum } from "@/lib/services/impressum-service";
import { createLocation as createLocationService } from "@/lib/services/location-service";
import { setCoverImage, setDirectoryListing } from "@/lib/services/organization-service";
import { saveRules } from "@/lib/services/settings-service";
import { getRootDomain } from "@/lib/tenant-host";
import { requireTenantId } from "@/lib/tenant-context";
import {
  absenceSchema,
  closedPeriodSchema,
  impressumSchema,
  locationSchema,
  serviceSchema,
  staffSchema,
  staffWorkingHoursSchema,
  toggleDirectoryListingSchema,
  updateCoverImageSchema,
  updateCustomerSchema,
  updateServiceSchema,
  updateStaffSchema,
} from "./manage-operations.schemas";

export const createService = staffWriteActionClient({ service: ["manage"] }).inputSchema(serviceSchema).action(async ({ parsedInput }) => {
  const { images, promotion, ...data } = parsedInput;
  if (data.paymentMode === "DEPOSIT" && !data.depositPercent) throw new ActionError("Informe o percentual do depósito.");
  if (promotion?.type === "PERCENT" && promotion.value > 100) throw new ActionError("O desconto percentual deve ser de no máximo 100%.");
  const organizationId = requireTenantId();
  const service = await db.service.create({ data: { ...data, organizationId, imageUrl: images[0]?.url, images: { create: images.map((image, sortOrder) => ({ ...image, organizationId, sortOrder })) } } });
  if (promotion) {
    const serviceIds = promotion.scope === "ALL_SERVICES" ? [] : [...new Set([service.id, ...promotion.serviceIds])];
    await db.coupon.create({ data: { organizationId, code: promotion.code.toUpperCase(), type: promotion.type, value: promotion.value, validUntil: promotion.validUntil, maxRedemptions: promotion.maxRedemptions, scope: promotion.scope, services: { create: serviceIds.map((serviceId) => ({ organizationId, serviceId })) } } });
  }
  revalidatePath("/dashboard/services"); return service;
});

export const createStaff = staffWriteActionClient({ staff: ["manage"] }).inputSchema(staffSchema).action(async ({ parsedInput, ctx }) => {
  const count = await db.staff.count(); if (isPlanLimitReached(ctx.organization.subscriptionPlan, count, "staff")) throw new ActionError("O limite de profissionais do seu plano foi atingido.");
  const organizationId = requireTenantId(); const { invite, serviceIds, ...staffData } = parsedInput;
  const staff = await db.staff.create({ data: { organizationId, ...staffData, services: { create: serviceIds.map((serviceId) => ({ organizationId, serviceId })) } } });
  if (invite) {
    const invitation = await auth.api.createInvitation({ body: { email: invite.email, role: invite.role, organizationId }, headers: await headers() });
    await db.staff.update({ where: { id: staff.id }, data: { invitationId: invitation.id } });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL; const inviteUrl = appUrl ? `${appUrl}/accept-invitation/${invitation.id}` : `https://${getRootDomain()}/accept-invitation/${invitation.id}`;
    await enqueueInvitationEmail({ invitationId: invitation.id, email: invitation.email, organizationName: ctx.organization.name, inviteUrl });
    await logAuditEvent({ entity: "Invitation", action: "INVITE_SENT", entityId: invitation.id, actorId: ctx.user.id, organizationId });
  }
  revalidatePath("/dashboard/staff"); return staff;
});

export const updateStaff = staffWriteActionClient({ staff: ["manage"] }).inputSchema(updateStaffSchema).action(async ({ parsedInput }) => {
  const organizationId = requireTenantId(); const { id, serviceIds, ...data } = parsedInput;
  const staff = await db.staff.update({ where: { id }, data });
  if (serviceIds) {
    await db.staffService.deleteMany({ where: { staffId: id } });
    if (serviceIds.length) await db.staffService.createMany({ data: serviceIds.map((serviceId) => ({ organizationId, staffId: id, serviceId })) });
  }
  revalidatePath("/dashboard/staff"); return staff;
});

export const createLocation = staffWriteActionClient({ location: ["manage"] }).inputSchema(locationSchema).action(async ({ parsedInput }) => { try { const location = await createLocationService(parsedInput); revalidatePath("/dashboard/staff"); revalidatePath("/dashboard/settings"); return location; } catch (error) { throw new ActionError(error instanceof Error ? error.message : "Não foi possível criar a filial."); } });
export const updateService = staffWriteActionClient({ service: ["manage"] }).inputSchema(updateServiceSchema).action(async ({ parsedInput: { id, images, ...data } }) => {
  if (data.paymentMode === "DEPOSIT" && !data.depositPercent) throw new ActionError("Informe o percentual do depósito.");
  const organizationId = requireTenantId();
  const service = await db.service.update({
    where: { id },
    data: {
      ...data,
      ...(images && {
        imageUrl: images[0]?.url ?? null,
        images: { deleteMany: {}, create: images.map((image, sortOrder) => ({ ...image, organizationId, sortOrder })) },
      }),
    },
  });
  revalidatePath("/dashboard/services"); return service;
});
export const createAbsence = staffWriteActionClient({ staff: ["manage"] }).inputSchema(absenceSchema).action(async ({ parsedInput }) => { if (parsedInput.endAt <= parsedInput.startAt) throw new ActionError("Fim deve ser posterior ao início."); const absence = await db.staffAbsence.create({ data: { ...parsedInput, organizationId: requireTenantId() } }); revalidatePath("/dashboard/staff"); return absence; });
export const setStaffWorkingHours = staffWriteActionClient({ staff: ["manage"] }).inputSchema(staffWorkingHoursSchema).action(async ({ parsedInput }) => { const organizationId = requireTenantId(); await db.staffWorkingHours.deleteMany({ where: { staffId: parsedInput.staffId } }); if (parsedInput.hours.length) await db.staffWorkingHours.createMany({ data: parsedInput.hours.map((h) => ({ ...h, staffId: parsedInput.staffId, organizationId })) }); revalidatePath("/dashboard/staff"); return { ok: true }; });
export const createClosedPeriod = staffWriteActionClient({ settings: ["manage"] }).inputSchema(closedPeriodSchema).action(async ({ parsedInput }) => { if (parsedInput.endAt <= parsedInput.startAt) throw new ActionError("Fim deve ser posterior ao início."); const period = await db.closedPeriod.create({ data: { ...parsedInput, organizationId: requireTenantId() } }); revalidatePath("/dashboard/settings"); return period; });
export const updateCustomer = staffWriteActionClient({ customer: ["manage"] }).inputSchema(updateCustomerSchema).action(async ({ parsedInput }) => { const customer = await db.customer.update({ where: { id: parsedInput.id }, data: { notes: parsedInput.notes, isBlocked: parsedInput.isBlocked } }); revalidatePath("/dashboard/customers"); return customer; });
export const updateRules = staffWriteActionClient({ settings: ["manage"] }).inputSchema(bookingRulesV1Schema).action(async ({ parsedInput, ctx }) => { await saveRules(parsedInput, ctx.user.id); revalidatePath("/dashboard/settings"); return { ok: true }; });
export const updateImpressum = staffWriteActionClient({ settings: ["manage"] }).inputSchema(impressumSchema).action(async ({ parsedInput, ctx }) => { const impressum = await upsertImpressum(parsedInput, ctx.user.id); await logAuditEvent({ entity: "TenantImpressum", action: "IMPRESSUM_UPDATED", entityId: impressum.id, actorId: ctx.user.id, organizationId: ctx.organization.id }); revalidatePath("/dashboard/settings"); revalidatePath("/t/[slug]", "page"); return { ok: true }; });
export const toggleDirectoryListing = staffWriteActionClient({ settings: ["manage"] }).inputSchema(toggleDirectoryListingSchema).action(async ({ parsedInput, ctx }) => { await setDirectoryListing(ctx.organization.id, parsedInput.isListed); revalidatePath("/dashboard/settings"); return { ok: true }; });
export const updateCoverImage = staffWriteActionClient({ settings: ["manage"] }).inputSchema(updateCoverImageSchema).action(async ({ parsedInput, ctx }) => { await setCoverImage(ctx.organization.id, parsedInput.coverImageUrl); revalidatePath("/dashboard/settings"); revalidatePath("/t/[slug]", "page"); return { ok: true }; });
