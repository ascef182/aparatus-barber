import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteNav } from "@/app/_components/marketing/site-nav";
import { SiteFooter } from "@/app/_components/marketing/site-footer";
import { listDirectoryCities } from "@/lib/services/directory-service";

export default async function FindPage() {
  const [t, cities] = await Promise.all([
    getTranslations("directory.find"),
    listDirectoryCities(),
  ]);

  return (
    <main className="bg-background">
      <SiteNav />
      <section className="text-foreground mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground mb-8">{t("subtitle")}</p>
        {cities.length === 0 ? (
          <p className="text-muted-foreground">{t("noCities")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cities.map((city) => (
              <li key={city}>
                <Link
                  href={`/find/${encodeURIComponent(city)}`}
                  className="border-border hover:bg-muted block rounded-md border p-4"
                >
                  {city}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
