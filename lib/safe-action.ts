import { createSafeActionClient } from "next-safe-action";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Erro de negócio cuja mensagem pode ser exibida ao usuário. */
export class ActionError extends Error {}

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof ActionError) {
      return error.message;
    }
    console.error("Unexpected server action error:", error);
    return "Erro interno. Tente novamente.";
  },
});

/**
 * Cliente para actions que exigem usuário autenticado.
 * Sessão resolvida uma única vez aqui — actions não chamam auth.api.getSession.
 *
 * Fase 1 (multi-tenancy) adiciona à cadeia: tenantActionClient (organização
 * resolvida do host, nunca do input), staffActionClient(permission) e
 * customerActionClient — ver plano de reestruturação.
 */
export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new ActionError("Unauthorized");
  }
  return next({ ctx: { user: session.user, session: session.session } });
});
