import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteNav } from "@/app/_components/marketing/site-nav";
import { SiteFooter } from "@/app/_components/marketing/site-footer";
import { listBusinessesByCity } from "@/lib/services/directory-service";
import { getTenantUrl } from "@/lib/tenant-host";

export default async function FindCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: rawCity } = await params;
  const city = decodeURIComponent(rawCity);
  const [t, locations] = await Promise.all([
    getTranslations("directory.results"),
    listBusinessesByCity(city),
  ]);

  return (
    <main className="bg-neutral-950">
      <SiteNav />
      <section className="mx-auto max-w-3xl px-6 py-16 text-white">
        <p className="mb-1 text-sm text-neutral-400">
          <Link href="/find" className="hover:underline">
            {t("backToCities")}
          </Link>
        </p>
        <h1 className="mb-8 text-3xl font-semibold">{t("title", { city })}</h1>
        {locations.length === 0 ? (
          <p className="text-neutral-400">{t("empty")}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {locations.map((location) => {
              const image = location.organization.coverImageUrl ?? location.organization.logo;
              return (
                <li key={location.id} className="overflow-hidden rounded-lg border border-neutral-800">
                  <div className="aspect-[16/9] w-full bg-neutral-900">
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element -- vem do Cloudinary, fora dos remotePatterns de next/image
                      <img src={image} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-lg font-medium">{location.organization.name}</p>
                    <p className="text-sm text-neutral-400">
                      {location.addressLine1}, {location.postalCode} {location.city}
                    </p>
                    <a
                      href={getTenantUrl(location.organization.slug)}
                      className="mt-2 inline-block text-sm text-blue-400 hover:underline"
                    >
                      {t("viewBusiness")}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
