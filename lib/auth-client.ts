import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import {
  adminClient,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { ac, roles } from "./auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({ ac, roles }),
    adminClient(),
    twoFactorClient(),
  ],
});

/**
 * signIn.email() não tipa a resposta de 2FA (o schema OpenAPI de
 * /sign-in/email só declara redirect/token/user), mas em runtime o plugin
 * two-factor devolve { twoFactorRedirect: true, error: null } quando a
 * conta tem 2FA ativo — sem sessão criada ainda, só um cookie temporário.
 * Guard manual porque o tipo gerado não cobre essa união.
 */
export function isTwoFactorRedirect(data: unknown): boolean {
  return !!data && typeof data === "object" && (data as { twoFactorRedirect?: unknown }).twoFactorRedirect === true;
}
