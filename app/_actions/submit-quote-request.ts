"use server";

import { publicTenantActionClient, ActionError } from "@/lib/safe-action";
import { createQuoteRequest } from "@/lib/services/quote-request-service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
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
  .action(async ({ parsedInput, ctx }) => {
    // Rate limiting mais rigoroso para requisições de orçamento (5 por hora por IP+org)
    // Protege contra spam e abuso do formulário.
    const ip = await getClientIp();
    const { allowed } = await checkRateLimit(
      `quote-request:${ip}:${ctx.organization.id}`,
      { windowSeconds: 3600, max: 5 },
    );
    if (!allowed) {
      throw new ActionError("Muitas requisições de orçamento. Aguarde uma hora e tente novamente.");
    }
    return createQuoteRequest(parsedInput);
  });
