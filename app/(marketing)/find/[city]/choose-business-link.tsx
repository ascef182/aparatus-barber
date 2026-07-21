"use client";

import { saveLastShopSlug } from "@/lib/customer-app-storage";

export function ChooseBusinessLink({
  slug,
  name,
  href,
  children,
  className,
}: {
  slug: string;
  name: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a href={href} className={className} onClick={() => saveLastShopSlug(slug, name)}>
      {children}
    </a>
  );
}
