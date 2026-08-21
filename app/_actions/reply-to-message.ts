"use server";

import { ActionError, staffActionClient } from "@/lib/safe-action";
import { createStaffReply } from "@/lib/services/conversation-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const replyToMessageAction = staffActionClient({ messages: ["reply"] })
  .inputSchema(
    z.object({
      conversationId: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { allowed } = await checkRateLimit(
      `reply-message:${ctx.membership.id}`,
      {
        windowSeconds: 600,
        max: 60,
      },
    );
    if (!allowed) {
      throw new Error(
        "Muitas respostas. Aguarde alguns minutos e tente novamente.",
      );
    }

    try {
      return await createStaffReply(
        parsedInput.conversationId,
        ctx.user.id,
        parsedInput.body,
      );
    } catch (error) {
      if (error instanceof Error) throw new ActionError(error.message);
      throw error;
    }
  });
