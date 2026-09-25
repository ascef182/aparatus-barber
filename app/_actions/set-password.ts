"use server";

import { APIError } from "better-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ActionError, authActionClient } from "@/lib/safe-action";

/**
 * setPassword é serverOnly no Better Auth (node_modules/better-auth/dist/
 * api/routes/update-user.mjs) — não existe em authClient, só pode ser
 * chamado do servidor. Usado por contas que só entraram via Google (sem
 * credential account) pra definir uma senha direto nas Configurações, sem
 * precisar passar pelo fluxo de e-mail de "esqueci minha senha".
 *
 * Não há reautenticação/step-up explícito aqui além da sessão exigida por
 * authActionClient: auth.api.setPassword sempre atua sobre o usuário da
 * sessão atual (nunca recebe um userId), então não há como um usuário
 * autenticado alterar a senha de outra conta por esta action.
 */
export const setPasswordAction = authActionClient
  .inputSchema(z.object({ newPassword: z.string().min(8) }))
  .action(async ({ parsedInput }) => {
    try {
      await auth.api.setPassword({
        body: { newPassword: parsedInput.newPassword },
        headers: await headers(),
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw new ActionError(error.message || "Não foi possível definir a senha.");
      }
      throw error;
    }
    return { ok: true };
  });
