import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteNav } from "@/app/_components/marketing/site-nav";
import { SiteFooter } from "@/app/_components/marketing/site-footer";
import { listBusinessesByCity } from "@/lib/services/directory-service";
import { getTenantUrl } from "@/lib/tenant-host";
import { ChooseBusinessLink } from "./choose-business-link";

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
    <main className="bg-background">
      <SiteNav />
      <section className="text-foreground mx-auto max-w-3xl px-6 py-16">
        <p className="text-muted-foreground mb-1 text-sm">
          <Link href="/find" className="hover:underline">
            {t("backToCities")}
          </Link>
        </p>
        <h1 className="mb-8 text-3xl font-semibold">{t("title", { city })}</h1>
        {locations.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {locations.map((location) => {
              const image =
                location.organization.coverImageUrl ??
                location.organization.logo;
              return (
                <li
                  key={location.id}
                  className="border-border overflow-hidden rounded-lg border"
                >
                  <div className="bg-muted aspect-[16/9] w-full">
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element -- vem do Cloudinary, fora dos remotePatterns de next/image
                      <img
                        src={image}
                        alt=""
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-foreground text-lg font-medium">
                      {location.organization.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {location.addressLine1}, {location.postalCode}{" "}
                      {location.city}
                    </p>
                    <ChooseBusinessLink
                      slug={location.organization.slug}
                      name={location.organization.name}
                      href={getTenantUrl(location.organization.slug)}
                      className="text-primary mt-2 inline-block text-sm hover:underline"
                    >
                      {t("viewBusiness")}
                    </ChooseBusinessLink>
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
