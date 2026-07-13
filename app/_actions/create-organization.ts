"use server";
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ActionError, authActionClient } from "@/lib/safe-action";
import { createLocation } from "@/lib/services/location-service";
import { runWithTenant } from "@/lib/tenant-context";

const inputSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens.",
    ),
  addressLine1: z.string().min(3).max(120),
  postalCode: z.string().min(3).max(12),
  city: z.string().min(2).max(80),
});

export const createOrganization = authActionClient
  .inputSchema(inputSchema)
  .action(
    async ({ parsedInput: { name, slug, addressLine1, postalCode, city } }) => {
      let organization;
      try {
        // Cria organization + member owner via plugin do Better Auth.
        organization = await auth.api.createOrganization({
          body: { name, slug },
          headers: await headers(),
        });
      } catch (error) {
        if (error instanceof APIError) {
          throw new ActionError(
            error.message || "Não foi possível criar a organização.",
          );
        }
        throw error;
      }
      if (!organization) {
        throw new ActionError("Não foi possível criar a organização.");
      }

      // Filial padrão dentro do escopo do novo tenant.
      await runWithTenant(organization.id, () =>
        createLocation({ name, addressLine1, postalCode, city }),
      );

      return { id: organization.id, slug: organization.slug };
    },
  );
