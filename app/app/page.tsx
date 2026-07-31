import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  listFeaturedBusinesses,
  searchBusinesses,
} from "@/lib/services/directory-service";
import { LastVisitedCard } from "./last-visited-card";
import { AppSearchBar } from "./search-bar";
import { CategoryPills } from "./category-pills";
import { BusinessCard } from "./business-card";

const VALID_CATEGORIES = [
  "BARBERSHOP",
  "HAIR_SALON",
  "NAIL_SALON",
  "BEAUTY_SALON",
  "MEDICAL",
  "DENTAL",
  "ELECTRICIAN",
  "CONSTRUCTION",
  "OTHER",
] as const;

/**
 * Entrada do app de cliente final (wrapper TWA/WKWebView aponta pra cá) —
 * sem sessão, cliente não "loga" numa barbearia. Server Component de
 * verdade agora (não só um redirect stub): busca/categoria via searchParams
 * viram uma query real (searchBusinesses); sem filtro, mostra recomendados.
 * LastVisitedCard (client, localStorage) é só um atalho opcional pro
 * último negócio escolhido — nunca redireciona sozinho.
 */
export default async function CustomerAppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category: rawCategory } = await searchParams;
  const category = VALID_CATEGORIES.find((value) => value === rawCategory);
  const hasFilter = Boolean(q?.trim()) || Boolean(category);

  const [t, businesses] = await Promise.all([
    getTranslations("app"),
    hasFilter
      ? searchBusinesses({ query: q, category })
      : listFeaturedBusinesses(),
  ]);

  return (
    <main className="bg-background min-h-screen">
      <header className="border-border border-b p-5">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Bladiq
        </Link>
      </header>

      <div className="flex flex-col gap-6 p-5">
        {!hasFilter && <LastVisitedCard />}
        <AppSearchBar placeholder={t("searchPlaceholder")} initialQuery={q} />
        <CategoryPills active={category} />

        {!hasFilter && (
          <div className="border-border bg-card relative overflow-hidden rounded-2xl border p-6">
            <div className="bg-primary absolute top-0 right-0 h-full w-1.5" />
            <p className="text-foreground text-xl font-bold">
              {t("bannerTitle")}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("bannerSubtitle")}
            </p>
          </div>
        )}

        <div>
          <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase">
            {hasFilter ? t("resultsTitle") : t("featuredTitle")}
          </h2>
          {businesses.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
              {businesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
