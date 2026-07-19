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
    <main className="bg-neutral-950">
      <SiteNav />
      <section className="mx-auto max-w-3xl px-6 py-16 text-white">
        <h1 className="mb-2 text-3xl font-semibold">{t("title")}</h1>
        <p className="mb-8 text-neutral-400">{t("subtitle")}</p>
        {cities.length === 0 ? (
          <p className="text-neutral-400">{t("noCities")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cities.map((city) => (
              <li key={city}>
                <Link
                  href={`/find/${encodeURIComponent(city)}`}
                  className="block rounded-md border border-neutral-800 p-4 hover:bg-neutral-900"
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
