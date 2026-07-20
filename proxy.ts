import { NextRequest, NextResponse } from "next/server";
import { resolveTenantSlug } from "@/lib/tenant-host";

/**
 * Roteamento por host (plano, seção 7):
 * - {slug}.aparatus.app  -> rewrite interno para /t/{slug}/...
 * - domínio raiz         -> marketing/admin, sem rewrite; /t/* é bloqueado
 *   (as rotas de tenant só existem via rewrite, nunca por path público).
 */
// app/dashboard/ é tenant-scoped (resolve o slug do host, ver
// lib/tenant-host.ts) mas vive fora de app/t/[slug]/ — sem essa exceção, o
// rewrite abaixo mandaria {slug}.{root}/dashboard para /t/{slug}/dashboard,
// que não existe (404 na aplicação autenticada inteira).
const RESERVED_PREFIXES = [
  "/dashboard",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/accept-invitation",
  "/onboarding",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const slug = resolveTenantSlug(request.headers.get("host"));

  // Repassado para permitir que Server Components (ex.: dashboard/layout.tsx,
  // enforcement de MFA) leiam o pathname atual via headers() — Next.js não
  // expõe isso nativamente fora de Client Components.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (!slug) {
    if (pathname === "/t" || pathname.startsWith("/t/")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (RESERVED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/t/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  // Exclui API routes (resolvem tenant pelo host diretamente) e assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
