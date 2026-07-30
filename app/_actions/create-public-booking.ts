"use server";

import { publicTenantActionClient, ActionError } from "@/lib/safe-action";
import { createBooking } from "@/lib/services/booking-service";
import { z } from "zod";

// Validação de segurança: previne injeção de HTML/scripts e caracteres perigosos
// em campos do cliente (nome, telefone). Permite apenas alfanuméricos, espaços,
// e alguns caracteres seguros.
const safeNameRegex = /^[a-zA-Z0-9À-ÿ\s\-'.,&()]+$/;
const safePhoneRegex = /^[+\-()0-9\s]+$/;

const inputSchema = z.object({
  serviceId: z.uuid(),
  staffId: z.uuid(),
  startAt: z.coerce.date(),
  customer: z.object({
    name: z.string()
      .trim()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(120, "Nome pode ter no máximo 120 caracteres")
      .refine(v => safeNameRegex.test(v), "Nome contém caracteres inválidos"),
    email: z.string()
      .trim()
      .email("Email inválido")
      .refine(v => !v.toLowerCase().includes("javascript:"), "Email inválido")
      .refine(v => !v.includes("<") && !v.includes(">"), "Email inválido"),
    phone: z.string()
      .trim()
      .max(40, "Telefone pode ter no máximo 40 caracteres")
      .refine(v => safePhoneRegex.test(v), "Telefone contém caracteres inválidos")
      .optional(),
    locale: z.enum(["de", "en", "pt"]).optional(),
  }),
});

export const createPublicBooking = publicTenantActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => {
    try {
      return await createBooking(parsedInput);
    } catch (error) {
      if (error instanceof Error) throw new ActionError(error.message);
      throw error;
    }
  });
