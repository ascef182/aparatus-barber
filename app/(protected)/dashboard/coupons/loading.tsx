import { PageContainer } from "@/app/_components/ui/page";
import { Skeleton } from "@/app/_components/ui/skeleton";

export default function CouponsLoading() {
  return (
    <PageContainer>
      <header className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-32" />
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-12" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
