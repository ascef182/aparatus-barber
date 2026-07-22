import type { NextRequest } from "next/server";
import { resolveTenantSlug, getRootUrl, getTenantUrl } from "@/lib/tenant-host";

/** Ver app/sitemap.xml/route.ts para por que isto é um Route Handler
 * explícito em vez da convenção app/robots.ts — mesmo motivo (paths com
 * ponto não passam pelo rewrite de tenant do proxy). */
export function GET(request: NextRequest) {
  const slug = resolveTenantSlug(request.headers.get("host"));

  const body = slug
    ? [
        "User-agent: *",
        "Disallow: /account",
        `Sitemap: ${getTenantUrl(slug, "/sitemap.xml")}`,
      ].join("\n")
    : [
        "User-agent: *",
        "Disallow: /dashboard",
        "Disallow: /api",
        "Disallow: /sign-in",
        "Disallow: /sign-up",
        "Disallow: /forgot-password",
        "Disallow: /reset-password",
        "Disallow: /accept-invitation",
        "Disallow: /onboarding",
        "Disallow: /superadmin",
        `Sitemap: ${getRootUrl("/sitemap.xml")}`,
      ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
