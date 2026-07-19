import { bookingMaintenance, bookingNotifications } from "@/lib/notifications";
import { requireSuperadmin } from "../_lib/require-superadmin";

/**
 * Não existe adapter oficial @bull-board/nextjs (só express/fastify/hono/
 * koa/...) — em vez de reverse-engineering de um bridge não suportado,
 * esta página lê os contadores/falhas direto via API do BullMQ (mesmo
 * client já usado em /api/health). Read-only, gated por superadmin.
 */
async function queueSummary(queue: typeof bookingNotifications) {
  const [counts, failed] = await Promise.all([
    queue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    queue.getFailed(0, 9),
  ]);
  return { counts, failed };
}

export default async function QueuesPage() {
  await requireSuperadmin();

  const [notifications, maintenance] = await Promise.all([
    queueSummary(bookingNotifications),
    queueSummary(bookingMaintenance),
  ]);

  return (
    <section className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Filas (BullMQ)</h1>
      {[
        { name: "booking-notifications", summary: notifications },
        { name: "booking-maintenance", summary: maintenance },
      ].map(({ name, summary }) => (
        <div key={name} className="mb-8 rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">{name}</h2>
          <div className="mb-4 grid grid-cols-5 gap-2 text-center text-sm">
            {Object.entries(summary.counts).map(([state, count]) => (
              <div key={state} className="rounded-md bg-muted p-2">
                <p className="text-muted-foreground">{state}</p>
                <p className="text-lg font-semibold">{count}</p>
              </div>
            ))}
          </div>
          {summary.failed.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-destructive">Últimas falhas</p>
              <ul className="flex flex-col gap-1 text-xs">
                {summary.failed.map((job) => (
                  <li key={job.id} className="rounded-md border p-2">
                    <span className="font-mono">{job.id}</span> — {job.failedReason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
