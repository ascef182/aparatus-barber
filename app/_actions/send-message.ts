"use server";

import { customerActionClient } from "@/lib/safe-action";
import { createCustomerMessage } from "@/lib/services/conversation-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const sendMessageAction = customerActionClient
  .inputSchema(z.object({ body: z.string().trim().min(1).max(2000) }))
  .action(async ({ parsedInput, ctx }) => {
    const { allowed } = await checkRateLimit(
      `send-message:${ctx.customer.id}`,
      {
        windowSeconds: 600,
        max: 30,
      },
    );
    if (!allowed) {
      throw new Error(
        "Muitas mensagens. Aguarde alguns minutos e tente novamente.",
      );
    }

    return createCustomerMessage(
      ctx.customer.id,
      ctx.user.id,
      parsedInput.body,
    );
  });
