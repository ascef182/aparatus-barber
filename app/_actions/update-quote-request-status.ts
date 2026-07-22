"use server";

import { revalidatePath } from "next/cache";
import { staffWriteActionClient } from "@/lib/safe-action";
import { updateQuoteRequestStatus } from "@/lib/services/quote-request-service";
import { z } from "zod";

export const updateQuoteRequestStatusAction = staffWriteActionClient({ customer: ["manage"] })
  .inputSchema(z.object({ id: z.uuid(), status: z.enum(["NEW", "CONTACTED", "CLOSED"]) }))
  .action(async ({ parsedInput }) => {
    await updateQuoteRequestStatus(parsedInput.id, parsedInput.status);
    revalidatePath("/dashboard/settings");
    return { ok: true };
  });
