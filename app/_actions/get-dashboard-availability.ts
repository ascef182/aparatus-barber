"use server";

import { staffActionClient } from "@/lib/safe-action";
import { getAvailableSlots } from "@/lib/scheduling/availability";
import { z } from "zod";

/** Disponibilidade pro fluxo de walk-in do staff — mesma engine do wizard
 * público (lib/scheduling/availability.ts), só que atrás de RBAC. */
export const getDashboardAvailability = staffActionClient({ booking: ["read_own"] })
  .inputSchema(z.object({ serviceId: z.uuid(), staffId: z.uuid().optional(), dateISO: z.string().date() }))
  .action(async ({ parsedInput }) => getAvailableSlots(parsedInput));
