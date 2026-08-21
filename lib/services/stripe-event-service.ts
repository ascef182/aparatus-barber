import { prisma } from "@/lib/prisma";

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

export type StripeEventClaim = "claimed" | "processed" | "in_progress";

/**
 * Adquire o processamento de um evento sem confundir indisponibilidade do
 * banco com duplicidade. Eventos falhos ou abandonados podem ser retomados;
 * eventos concluídos nunca são executados novamente.
 */
export async function claimStripeEvent(event: {
  id: string;
  type: string;
  accountId?: string | null;
}): Promise<StripeEventClaim> {
  try {
    await prisma.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
        accountId: event.accountId ?? null,
        status: "PROCESSING",
      },
    });
    return "claimed";
  } catch (error) {
    // Checagem estrutural, não `instanceof Prisma.PrismaClientKnownRequestError`:
    // em produção esse `instanceof` falhava mesmo para um P2002 genuíno — o
    // chunking do Turbopack pode carregar o client gerado em módulos
    // diferentes, então o erro lançado em runtime e a classe importada aqui
    // não são a mesma referência, e o catch nunca pegava (entregas
    // duplicadas de webhook, que essa tabela existe justamente pra
    // absorver, quebravam com 500 em vez de virar no-op).
    if ((error as { code?: string } | null)?.code !== "P2002") {
      throw error;
    }
  }

  const existing = await prisma.stripeEvent.findUniqueOrThrow({
    where: { id: event.id },
  });
  if (existing.status === "PROCESSED") return "processed";

  const staleBefore = new Date(Date.now() - PROCESSING_TIMEOUT_MS);
  const claimed = await prisma.stripeEvent.updateMany({
    where: {
      id: event.id,
      OR: [
        { status: "FAILED" },
        { status: "PROCESSING", startedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      attempts: { increment: 1 },
      lastError: null,
    },
  });
  return claimed.count === 1 ? "claimed" : "in_progress";
}

export function markStripeEventProcessed(id: string) {
  return prisma.stripeEvent.update({
    where: { id },
    data: { status: "PROCESSED", processedAt: new Date(), lastError: null },
  });
}

export function markStripeEventFailed(id: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return prisma.stripeEvent.update({
    where: { id },
    data: { status: "FAILED", lastError: message.slice(0, 1000) },
  });
}
