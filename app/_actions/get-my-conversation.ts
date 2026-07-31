"use server";

import { customerActionClient } from "@/lib/safe-action";
import { getConversationForCustomer } from "@/lib/services/conversation-service";
import { z } from "zod";

export const getMyConversationAction = customerActionClient
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    return getConversationForCustomer(ctx.customer.id);
  });
