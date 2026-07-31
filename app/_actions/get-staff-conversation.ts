"use server";

import { staffActionClient } from "@/lib/safe-action";
import { getConversationForStaff } from "@/lib/services/conversation-service";
import { z } from "zod";

export const getStaffConversationAction = staffActionClient({
  messages: ["read"],
})
  .inputSchema(z.object({ conversationId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    return getConversationForStaff(parsedInput.conversationId);
  });
