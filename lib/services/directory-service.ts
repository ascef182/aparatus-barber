import { db } from "@/lib/db";
import { runWithPlatformScope } from "@/lib/tenant-context";

/**
 * Único ponto de leitura cross-tenant pública (diretório por cidade,
 * app/(marketing)/find). Sem ator autenticado e sem tenant único em escopo,
 * então usa runWithPlatformScope (bypass explícito já coberto por
 * tests/tenant-isolation.test.ts) — nunca dentro de runWithTenant/db comum.
 * Retorna só campos públicos: nada de billing, branding ou dados de outros
 * tenants além de nome/slug/logo.
 */

function isDirectoryEligible() {
  return {
    isActive: true,
    organization: {
      isListed: true,
      status: { in: ["TRIALING", "ACTIVE"] as ("TRIALING" | "ACTIVE")[] },
    },
  };
}

export function listBusinessesByCity(city: string) {
  return runWithPlatformScope(() =>
    db.location.findMany({
      where: { city: { equals: city, mode: "insensitive" }, ...isDirectoryEligible() },
      select: {
        id: true,
        name: true,
        city: true,
        addressLine1: true,
        postalCode: true,
        organization: { select: { name: true, slug: true, logo: true, coverImageUrl: true } },
      },
      orderBy: { name: "asc" },
    }),
  );
}

export async function listDirectoryCities(): Promise<string[]> {
  const rows = await runWithPlatformScope(() =>
    db.location.findMany({
      where: isDirectoryEligible(),
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    }),
  );
  return rows.map((r) => r.city);
}
