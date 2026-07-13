/**
 * Resolução de tenant a partir do host HTTP.
 * Usada pelo proxy (rewrite de subdomínio) e pela cadeia de safe-action
 * clients — o tenant vem SEMPRE do host, nunca de input do cliente.
 */

export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
}

/**
 * Extrai o slug do tenant de um host como "barbearia-x.aparatus.app".
 * Retorna null para o domínio raiz (marketing/admin), www, hosts de outra
 * zona ou subdomínios aninhados.
 */
export function resolveTenantSlug(host: string | null): string | null {
  if (!host) return null;
  const root = getRootDomain();
  const normalized = host.toLowerCase();
  if (normalized === root || normalized === `www.${root}`) return null;
  if (!normalized.endsWith(`.${root}`)) return null;
  const slug = normalized.slice(0, -(root.length + 1));
  if (!slug || slug === "www" || slug.includes(".")) return null;
  return slug;
}
