/**
 * Resolução de tenant a partir do host HTTP.
 * Usada pelo proxy (rewrite de subdomínio) e pela cadeia de safe-action
 * clients — o tenant vem SEMPRE do host, nunca de input do cliente.
 */

export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
}

/**
 * URL absoluta de um tenant, com o protocolo certo — hardcoded "https://"
 * quebra em dev local (Next dev não serve TLS; https://{slug}.localhost:3000
 * nunca conecta). Protocolo derivado de NEXT_PUBLIC_APP_URL, que já é
 * "http://" localmente e "https://" em produção.
 */
export function getTenantUrl(slug: string, path = ""): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const protocol = new URL(appUrl).protocol;
  return `${protocol}//${slug}.${getRootDomain()}${path}`;
}

/**
 * URL absoluta do domínio raiz (sem slug de tenant) — necessária para
 * navegar a partir de um subdomínio de tenant para uma rota que só existe
 * no domínio raiz (ex.: /sign-in). Um caminho relativo nesse cenário seria
 * capturado pelo rewrite de tenant do proxy e resultaria em 404.
 */
export function getRootUrl(path = ""): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const protocol = new URL(appUrl).protocol;
  return `${protocol}//${getRootDomain()}${path}`;
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
