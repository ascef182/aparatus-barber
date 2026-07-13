import { NextRequest, NextResponse } from "next/server";
import { resolveTenantSlug } from "@/lib/tenant-host";

/**
 * Roteamento por host (plano, seção 7):
 * - {slug}.aparatus.app  -> rewrite interno para /t/{slug}/...
 * - domínio raiz         -> marketing/admin, sem rewrite; /t/* é bloqueado
 *   (as rotas de tenant só existem via rewrite, nunca por path público).
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const slug = resolveTenantSlug(request.headers.get("host"));

  if (!slug) {
    if (pathname === "/t" || pathname.startsWith("/t/")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/t/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Exclui API routes (resolvem tenant pelo host diretamente) e assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
