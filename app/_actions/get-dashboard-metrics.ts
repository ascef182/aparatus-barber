"use server";

import { staffActionClient } from "@/lib/safe-action";
import { getDashboardMetrics } from "@/lib/services/dashboard-metrics-service";
import { z } from "zod";

export const getDashboardMetricsAction = staffActionClient({ booking: ["read_own"] })
  .inputSchema(z.object({ range: z.union([z.literal(1), z.literal(7), z.literal(30), z.literal(90)]) }))
  .action(async ({ parsedInput, ctx }) => getDashboardMetrics(ctx.organization.timezone, parsedInput.range));
