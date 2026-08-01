import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import Redis from "ioredis";
import { checkDatabaseHealth } from "@/lib/services/health-service";
import { bookingNotifications } from "@/lib/notifications";

function authorized(request: Request): boolean {
  const secret = process.env.HEALTHCHECK_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redisStart = Date.now();
  const redisClient = new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
  });
  const [database, redis] = await Promise.all([
    checkDatabaseHealth(),
    redisClient
      .connect()
      .then(() => redisClient.ping())
      .then(() => ({
        status: "ok" as const,
        latencyMs: Date.now() - redisStart,
      }))
      .catch(() => ({
        status: "error" as const,
        latencyMs: Date.now() - redisStart,
      })),
  ]);
  redisClient.disconnect();
  const queueDepth = await bookingNotifications
    .getJobCounts("waiting", "active", "delayed")
    .catch(() => null);
  const healthy = database.status === "ok" && redis.status === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      version:
        process.env.RAILWAY_GIT_COMMIT_SHA ??
        process.env.VERCEL_GIT_COMMIT_SHA ??
        "dev",
      checks: {
        database: { status: database.status, latency_ms: database.latencyMs },
        redis: { status: redis.status, latency_ms: redis.latencyMs },
        worker: {
          status: queueDepth ? "ok" : "unknown",
          queue_depth: queueDepth
            ? (queueDepth.waiting ?? 0) +
              (queueDepth.active ?? 0) +
              (queueDepth.delayed ?? 0)
            : null,
        },
      },
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
