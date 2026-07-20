import { prisma } from "@/lib/prisma";

export async function checkDatabaseHealth(): Promise<{ status: "ok" | "error"; latencyMs: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch {
    return { status: "error", latencyMs: Date.now() - start };
  }
}
