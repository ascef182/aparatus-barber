const LAST_SHOP_KEY = "bladiq:lastShop";

export type LastShop = { slug: string; name: string };

/**
 * Lembrança local do último negócio escolhido — usada só pra mostrar um
 * atalho opcional ("Continuar em X") na home de /app, nunca pra
 * redirecionar sozinho: um redirect automático aqui prendia quem volta
 * pra /app querendo buscar outro negócio num loop de volta pro mesmo
 * subdomínio. SSR-safe: no servidor, sempre retorna/ignora sem tocar
 * localStorage.
 */
export function saveLastShopSlug(slug: string, name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SHOP_KEY, JSON.stringify({ slug, name }));
}

// Cache pela string bruta: getLastShop() é usado como getSnapshot de
// useSyncExternalStore, que exige referência estável quando o valor não
// mudou — sem isso, um novo objeto a cada chamada (JSON.parse) faz o React
// achar que a store mudou a cada render e entrar em loop infinito.
let cache: { raw: string | null; value: LastShop | null } = { raw: undefined as unknown as string, value: null };

export function getLastShop(): LastShop | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_SHOP_KEY);
  if (raw === cache.raw) return cache.value;

  let value: LastShop | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.slug === "string" && typeof parsed?.name === "string") value = parsed;
    } catch {
      value = null;
    }
  }
  cache = { raw, value };
  return value;
}
