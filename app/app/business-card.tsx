import { ChooseBusinessLink } from "@/app/(marketing)/find/[city]/choose-business-link";
import { getTenantUrl } from "@/lib/tenant-host";
import type { searchBusinesses } from "@/lib/services/directory-service";

type Business = Awaited<ReturnType<typeof searchBusinesses>>[number];

export function BusinessCard({ business }: { business: Business }) {
  const image = business.organization.coverImageUrl ?? business.organization.logo;

  return (
    <ChooseBusinessLink
      slug={business.organization.slug}
      href={getTenantUrl(business.organization.slug)}
      className="relative block h-48 w-64 shrink-0 overflow-hidden rounded-xl bg-muted"
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- vem do Cloudinary, fora dos remotePatterns de next/image
        <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-semibold text-white">{business.organization.name}</p>
        <p className="text-xs text-white/80">
          {business.addressLine1}, {business.city}
        </p>
      </div>
    </ChooseBusinessLink>
  );
}
