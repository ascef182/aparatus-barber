import { db } from "@/lib/db";
import { runWithPlatformScope } from "@/lib/tenant-context";
import type { BusinessCategory } from "@/generated/prisma/client";

const DIRECTORY_SELECT = {
  id: true,
  name: true,
  city: true,
  addressLine1: true,
  postalCode: true,
  organization: { select: { name: true, slug: true, logo: true, coverImageUrl: true, category: true } },
} as const;

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
      select: DIRECTORY_SELECT,
      orderBy: { name: "asc" },
    }),
  );
}

/**
 * Lista pra "Recomendados" em app/app — sem filtro nenhum além de
 * elegibilidade, ordenado pelos listados mais recentemente (não é uma
 * métrica de popularidade real, só um proxy razoável até existir uma).
 */
export function listFeaturedBusinesses(limit = 12) {
  return runWithPlatformScope(() =>
    db.location.findMany({
      where: isDirectoryEligible(),
      select: DIRECTORY_SELECT,
      orderBy: { organization: { listedAt: "desc" } },
      take: limit,
    }),
  );
}

/**
 * Busca do app/app: nome do negócio OU cidade contém a query (case
 * insensitive), opcionalmente restrita a uma categoria — os dois filtros
 * são independentes e combináveis (usados pelos chips e pela busca livre
 * na mesma tela).
 */
export function searchBusinesses({ query, category }: { query?: string; category?: BusinessCategory }) {
  const trimmed = query?.trim();
  return runWithPlatformScope(() =>
    db.location.findMany({
      where: {
        ...isDirectoryEligible(),
        ...(category ? { organization: { ...isDirectoryEligible().organization, category } } : {}),
        ...(trimmed
          ? {
              OR: [
                { city: { contains: trimmed, mode: "insensitive" } },
                { organization: { name: { contains: trimmed, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      select: DIRECTORY_SELECT,
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
