import { Skeleton } from "@/app/_components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <section className="p-6">
      <Skeleton className="h-8 w-32" />
      <div className="my-4">
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
