import { getTranslations } from "next-intl/server";
import { ChooseBusinessLink } from "@/app/(marketing)/find/[city]/choose-business-link";
import { getTenantUrl } from "@/lib/tenant-host";
import type { searchBusinesses } from "@/lib/services/directory-service";
import { CATEGORY_ICONS } from "./category-pills";

type Business = Awaited<ReturnType<typeof searchBusinesses>>[number];

export async function BusinessCard({ business }: { business: Business }) {
  const t = await getTranslations("businessCategories");
  const image =
    business.organization.coverImageUrl ?? business.organization.logo;
  const Icon = CATEGORY_ICONS[business.organization.category];

  return (
    <ChooseBusinessLink
      slug={business.organization.slug}
      name={business.organization.name}
      href={getTenantUrl(business.organization.slug)}
      className="group bg-muted relative block h-52 w-64 shrink-0 overflow-hidden rounded-2xl"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- vem do Cloudinary, fora dos remotePatterns de next/image
        <img
          src={image}
          alt=""
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="bg-secondary absolute inset-0 flex items-center justify-center">
          <Icon className="text-muted-foreground size-10" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
        <span className="bg-primary text-primary-foreground inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
          <Icon className="size-3" />
          {t(business.organization.category)}
        </span>
        <p className="text-base font-bold text-white">
          {business.organization.name}
        </p>
        <p className="text-xs text-white/70">
          {business.addressLine1}, {business.city}
        </p>
      </div>
    </ChooseBusinessLink>
  );
}
