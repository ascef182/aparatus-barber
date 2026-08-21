"use server";

import { customerActionClient, ActionError } from "@/lib/safe-action";
import { claimCoupon } from "@/lib/services/customer-coupon-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const claimCouponAction = customerActionClient
  .inputSchema(z.object({ code: z.string().trim().min(1).max(32) }))
  .action(async ({ parsedInput, ctx }) => {
    const { allowed } = await checkRateLimit(
      `claim-coupon:${ctx.customer.id}`,
      {
        windowSeconds: 3600,
        max: 10,
      },
    );
    if (!allowed) {
      throw new ActionError("Muitas tentativas. Aguarde uma hora e tente novamente.");
    }

    const result = await claimCoupon(ctx.customer.id, parsedInput.code);
    if (!result.success) {
      throw new ActionError(result.message);
    }
    return result;
  });
