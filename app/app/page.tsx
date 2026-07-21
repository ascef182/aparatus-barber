import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listFeaturedBusinesses, searchBusinesses } from "@/lib/services/directory-service";
import { CustomerAppRedirect } from "./customer-app-redirect";
import { AppSearchBar } from "./search-bar";
import { CategoryPills } from "./category-pills";
import { BusinessCard } from "./business-card";

const VALID_CATEGORIES = [
  "BARBERSHOP", "HAIR_SALON", "NAIL_SALON", "BEAUTY_SALON",
  "MEDICAL", "DENTAL", "ELECTRICIAN", "CONSTRUCTION", "OTHER",
] as const;

/**
 * Entrada do app de cliente final (wrapper TWA/WKWebView aponta pra cá) —
 * sem sessão, cliente não "loga" numa barbearia. Server Component de
 * verdade agora (não só um redirect stub): busca/categoria via searchParams
 * viram uma query real (searchBusinesses); sem filtro, mostra recomendados.
 * CustomerAppRedirect (client, localStorage) só pula pro subdomínio se o
 * cliente já tiver escolhido um negócio antes.
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
    hasFilter ? searchBusinesses({ query: q, category }) : listFeaturedBusinesses(),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <CustomerAppRedirect />
      <header className="border-b p-5">
        <Link href="/" className="text-lg font-bold">
          Bladiq
        </Link>
      </header>

      <div className="flex flex-col gap-6 p-5">
        <AppSearchBar placeholder={t("searchPlaceholder")} initialQuery={q} />
        <CategoryPills active={category} />

        {!hasFilter && (
          <div className="rounded-2xl bg-gradient-to-br from-primary to-emerald-700 p-6 text-primary-foreground">
            <p className="text-xl font-bold">{t("bannerTitle")}</p>
            <p className="mt-1 text-sm text-primary-foreground/85">{t("bannerSubtitle")}</p>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-xs font-semibold text-muted-foreground uppercase">
            {hasFilter ? t("resultsTitle") : t("featuredTitle")}
          </h2>
          {businesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
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
