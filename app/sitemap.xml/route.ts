import type { NextRequest } from "next/server";
import { resolveTenantSlug, getRootUrl, getTenantUrl } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { listDirectoryCities } from "@/lib/services/directory-service";

/**
 * Route Handler explícito (não a convenção app/sitemap.ts) porque o
 * matcher do proxy (proxy.ts) exclui qualquer path com ponto
 * (`/((?!api|_next/static|_next/image|favicon.ico|.*\..*).*)`)  —
 * "/sitemap.xml" nunca passa pelo rewrite de tenant, então o MESMO arquivo
 * atende tanto o domínio raiz quanto qualquer subdomínio de tenant; a
 * distinção é feita aqui lendo o host da request diretamente.
 */

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSitemap(urls: { loc: string; lastmod?: string }[]) {
  const body = urls
    .map((url) => `<url><loc>${xmlEscape(url.loc)}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}</url>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export async function GET(request: NextRequest) {
  const slug = resolveTenantSlug(request.headers.get("host"));
  let urls: { loc: string; lastmod?: string }[];

  if (slug) {
    const organization = await getOrganizationBySlug(slug);
    urls = organization && organization.status !== "CHURNED" && organization.status !== "SUSPENDED"
      ? [{ loc: getTenantUrl(slug) }]
      : [];
  } else {
    const cities = await listDirectoryCities();
    urls = [
      { loc: getRootUrl("/") },
      { loc: getRootUrl("/find") },
      ...cities.map((city) => ({ loc: getRootUrl(`/find/${encodeURIComponent(city)}`) })),
      { loc: getRootUrl("/privacy") },
      { loc: getRootUrl("/terms") },
      { loc: getRootUrl("/impressum") },
      { loc: getRootUrl("/dpa") },
    ];
  }

  return new Response(buildSitemap(urls), { headers: { "Content-Type": "application/xml" } });
}
