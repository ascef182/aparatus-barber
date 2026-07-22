"use server";

import { publicTenantActionClient } from "@/lib/safe-action";
import { createQuoteRequest } from "@/lib/services/quote-request-service";
import { z } from "zod";

const inputSchema = z
  .object({
    locationId: z.uuid().optional(),
    customerName: z.string().trim().min(2).max(120),
    customerEmail: z.string().trim().email().optional(),
    customerPhone: z.string().trim().max(40).optional(),
    message: z.string().trim().min(10).max(2000),
  })
  .refine((value) => Boolean(value.customerEmail || value.customerPhone), {
    message: "Informe e-mail ou telefone.",
    path: ["customerEmail"],
  });

export const submitQuoteRequest = publicTenantActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => createQuoteRequest(parsedInput));
