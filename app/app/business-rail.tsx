import type { searchBusinesses } from "@/lib/services/directory-service";
import { BusinessCard } from "./business-card";

type Business = Awaited<ReturnType<typeof searchBusinesses>>[number];

export function BusinessRail({ title, businesses }: { title: string; businesses: Business[] }) {
  return (
    <div>
      <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {businesses.map((business) => (
          <BusinessCard key={business.id} business={business} />
        ))}
      </div>
    </div>
  );
}
