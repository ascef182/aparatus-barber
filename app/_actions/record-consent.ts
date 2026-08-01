"use server";

import { headers } from "next/headers";
import { actionClient } from "@/lib/safe-action";
import { checkRateLimit, getClientIp, hashIpAddress } from "@/lib/rate-limit";
import { ActionError } from "@/lib/safe-action";
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
  .inputSchema(
    z.object({ type: z.literal("cookies"), version: z.literal("1") }),
  )
  .action(async ({ parsedInput }) => {
    const ip = await getClientIp();
    const { allowed } = await checkRateLimit(`consent:${ip}`, {
      windowSeconds: 24 * 60 * 60,
      max: 10,
    });
    if (!allowed) throw new ActionError("Muitas solicitações.");
    const ipHash = hashIpAddress(ip);
    const userAgent = (await headers()).get("user-agent")?.slice(0, 500);
    await db.consentLog.create({
      data: {
        type: parsedInput.type,
        version: parsedInput.version,
        ip: ipHash,
        userAgent,
      },
    });
    return { ok: true };
  });
