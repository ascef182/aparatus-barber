"use server";

import { headers } from "next/headers";
import { actionClient } from "@/lib/safe-action";
import { getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { z } from "zod";

/**
 * ConsentLog é escopo de plataforma (fora de TENANT_MODELS) — sem tenant
 * nem sessão obrigatórios, pra funcionar tanto no domínio raiz quanto em
 * qualquer subdomínio de tenant, antes de login. Best-effort: se a
 * gravação falhar, o banner já escondeu o aviso via localStorage do lado
 * do cliente mesmo assim (não bloqueia a navegação por causa de auditoria).
 */
export const recordConsent = actionClient
  .inputSchema(z.object({ type: z.literal("cookies"), version: z.string() }))
  .action(async ({ parsedInput }) => {
    const ip = await getClientIp();
    const userAgent = (await headers()).get("user-agent");
    await db.consentLog.create({
      data: { type: parsedInput.type, version: parsedInput.version, ip, userAgent },
    });
    return { ok: true };
  });
