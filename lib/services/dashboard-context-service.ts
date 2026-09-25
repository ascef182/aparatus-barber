import { cache } from "react";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { getMembership } from "@/lib/services/member-service";

/**
 * Sessão + organização + membership resolvidos a partir do host, com
 * cache() do React — dashboard/layout.tsx e cada page.tsx sob
 * app/(protected)/dashboard/ resolviam essa mesma cadeia de novo, cada um
 * batendo em Postgres (sessão + organização + membership) e Redis (cache
 * de sessão do Better Auth) independentemente, dobrando (ou mais, com
 * várias pages) a exposição a qualquer instabilidade de rede num único
 * request. cache() faz React reusar a mesma Promise entre Server
 * Components do mesmo request quando chamado com o mesmo objeto Headers
 * (headers() do Next.js retorna a mesma instância dentro de um request).
 */
// Verificado ao vivo (Sprint 1 do programa de hardening, 2026-09-25): uma
// única request real a /dashboard com layout.tsx + dashboard/page.tsx
// ambos chamando esta função só executa o corpo UMA vez — cache() dedupe
// corretamente dentro do render real do Next.js. Isso não é testável de
// forma confiável em vitest (cache() só memoiza dentro do cache scope de
// uma render de Server Component de verdade; chamado direto, fora de
// render, executa a cada chamada sem memoização — comportamento inerente
// do React, não um bug daqui). Regressão futura deve ser pega por um teste
// E2E que meça queries por request real (candidato: Sprint 8), não por
// unit test desta função isolada.
export const getDashboardContext = cache(async (requestHeaders: Headers) => {
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) return null;
  const organization = await getOrganizationBySlug(slug);
  if (!organization) return null;
  const membership = await getMembership(organization.id, session.user.id);
  if (!membership) return null;
  return { session, organization, membership };
});
