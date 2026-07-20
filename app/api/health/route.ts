import { NextResponse } from "next/server";
import Redis from "ioredis";
import { checkDatabaseHealth } from "@/lib/services/health-service";
import { bookingNotifications } from "@/lib/notifications";

async function checkRedisHealth(): Promise<{ status: "ok" | "error"; latencyMs: number }> {
  const start = Date.now();
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
  });
  try {
    await client.connect();
    await client.ping();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch {
    return { status: "error", latencyMs: Date.now() - start };
  } finally {
    client.disconnect();
  }
}

export async function GET() {
  const [database, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);
  const queueDepth = await bookingNotifications.getJobCounts("waiting", "active", "delayed").catch(() => null);

  const healthy = database.status === "ok" && redis.status === "ok";
  const body = {
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    checks: {
      database: { status: database.status, latency_ms: database.latencyMs },
      redis: { status: redis.status, latency_ms: redis.latencyMs },
      worker: {
        status: queueDepth ? "ok" : "unknown",
        queue_depth: queueDepth ? (queueDepth.waiting ?? 0) + (queueDepth.active ?? 0) + (queueDepth.delayed ?? 0) : null,
      },
    },
  };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
