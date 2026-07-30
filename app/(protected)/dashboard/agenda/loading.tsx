import { Skeleton } from "@/app/_components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <section className="p-5 md:p-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </header>
      <div className="grid gap-3 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="min-h-56 rounded-xl border bg-card">
            <div className="border-b px-3 py-3">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-2 p-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
