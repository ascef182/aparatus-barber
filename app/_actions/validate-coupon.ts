"use server";

import { publicTenantActionClient } from "@/lib/safe-action";
import { validateCoupon } from "@/lib/services/coupon-service";
import { db } from "@/lib/db";
import { z } from "zod";

/**
 * Preview do desconto antes da confirmação final — só UX (mostra o valor
 * já descontado pro cliente decidir se confirma). A revalidação de
 * verdade, que decide o valor efetivamente cobrado, acontece de novo em
 * createBooking() no momento da criação (nunca confia no preview do
 * cliente como fonte de verdade).
 */
export const validateCouponAction = publicTenantActionClient
  .inputSchema(z.object({ code: z.string().trim().min(1).max(32), serviceId: z.uuid() }))
  .action(async ({ parsedInput }) => {
    const service = await db.service.findUnique({ where: { id: parsedInput.serviceId } });
    if (!service) return { valid: false as const, reasonCode: "invalid" as const, reason: "Serviço não encontrado." };
    return validateCoupon(parsedInput.code, parsedInput.serviceId, service.priceInCents);
  });
