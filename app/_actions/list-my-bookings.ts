"use server";

import { customerActionClient } from "@/lib/safe-action";
import { listBookingsForCustomer } from "@/lib/services/booking-service";
import { z } from "zod";

export const listMyBookings = customerActionClient
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => listBookingsForCustomer(ctx.customer.id));
