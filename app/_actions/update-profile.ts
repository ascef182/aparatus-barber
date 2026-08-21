"use server";

import { customerActionClient } from "@/lib/safe-action";
import { updateCustomerProfile } from "@/lib/services/customer-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const updateProfileAction = customerActionClient
  .inputSchema(
    z.object({
      name: z.string().trim().min(1).max(100),
      email: z.string().trim().email().max(100).nullable(),
      phone: z.string().trim().max(20).nullable(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { allowed } = await checkRateLimit(
      `update-profile:${ctx.customer.id}`,
      {
        windowSeconds: 5,
        max: 1,
      },
    );
    if (!allowed) {
      throw new Error("Aguarde alguns segundos antes de atualizar novamente.");
    }

    return updateCustomerProfile(ctx.customer.id, ctx.user.id, parsedInput);
  });
