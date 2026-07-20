"use server";

import { publicTenantActionClient } from "@/lib/safe-action";
import { getAvailableSlots } from "@/lib/scheduling/availability";
import { z } from "zod";

export const getPublicAvailability = publicTenantActionClient
  .inputSchema(z.object({ serviceId: z.uuid(), staffId: z.uuid().optional(), dateISO: z.string().date() }))
  .action(async ({ parsedInput }) => getAvailableSlots(parsedInput));
