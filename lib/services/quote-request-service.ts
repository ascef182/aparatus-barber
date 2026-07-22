import { db } from "@/lib/db";
import { requireTenantId, runWithPlatformScope } from "@/lib/tenant-context";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/services/audit-service";
import { enqueueQuoteRequestNotification } from "@/lib/notifications";
import type { QuoteRequestStatus } from "@/generated/prisma/client";

export type CreateQuoteRequestInput = {
  locationId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  message: string;
};

/** Captura pública (sem auth) — mesmo espírito do guest booking: sem
 * negociação, sem pagamento, só registra e notifica o staff por e-mail. */
export async function createQuoteRequest(input: CreateQuoteRequestInput) {
  const organizationId = requireTenantId();
  const quoteRequest = await db.quoteRequest.create({
    data: {
      organizationId,
      locationId: input.locationId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      message: input.message,
    },
  });
  logger({ organizationId, quoteRequestId: quoteRequest.id }).info({}, "quote_request.created");
  await logAuditEvent({ entity: "QuoteRequest", action: "QUOTE_REQUEST_CREATED", entityId: quoteRequest.id });
  await enqueueQuoteRequestNotification({ quoteRequestId: quoteRequest.id });
  return quoteRequest;
}

export function listQuoteRequests() {
  return db.quoteRequest.findMany({ orderBy: { createdAt: "desc" } });
}

/** Mesmo padrão de getBookingForNotification: worker roda fora de
 * runWithTenant, organização só é conhecida via o próprio registro. */
export function getQuoteRequestForNotification(id: string) {
  return runWithPlatformScope(() =>
    db.quoteRequest.findUnique({ where: { id }, include: { organization: true } }),
  );
}

export async function updateQuoteRequestStatus(id: string, status: QuoteRequestStatus) {
  const quoteRequest = await db.quoteRequest.update({ where: { id }, data: { status } });
  await logAuditEvent({ entity: "QuoteRequest", action: "QUOTE_REQUEST_STATUS_UPDATED", entityId: id, metadata: { status } });
  return quoteRequest;
}
