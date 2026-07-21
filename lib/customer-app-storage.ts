const LAST_SHOP_SLUG_KEY = "bladiq:lastShopSlug";

/**
 * Lembrança local de qual barbearia o cliente escolheu por último — usada
 * pela rota de entrada do futuro app de cliente final (wrapper TWA/WKWebView
 * apontando pra /app) pra pular o diretório e abrir direto no subdomínio
 * certo. SSR-safe: no servidor, sempre retorna/ignora sem tocar localStorage.
 */
export function saveLastShopSlug(slug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SHOP_SLUG_KEY, slug);
}

export function getLastShopSlug(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_SHOP_SLUG_KEY);
}
