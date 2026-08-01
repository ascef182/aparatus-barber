import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ownerUrl = process.env.DATABASE_URL;
if (!ownerUrl) throw new Error("DATABASE_URL (migration owner) is required");

const apply = process.argv.includes("--yes");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: ownerUrl }),
});
const now = Date.now();
const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000);

const targets = [
  {
    name: "consentLog",
    cutoff: daysAgo(3 * 365),
    count: (cutoff: Date) =>
      prisma.consentLog.count({ where: { createdAt: { lt: cutoff } } }),
    purge: (cutoff: Date) =>
      prisma.consentLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  },
  {
    name: "notificationLog",
    cutoff: daysAgo(365),
    count: (cutoff: Date) =>
      prisma.notificationLog.count({ where: { createdAt: { lt: cutoff } } }),
    purge: (cutoff: Date) =>
      prisma.notificationLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      }),
  },
  {
    name: "stripeEvent",
    cutoff: daysAgo(365),
    count: (cutoff: Date) =>
      prisma.stripeEvent.count({ where: { startedAt: { lt: cutoff } } }),
    purge: (cutoff: Date) =>
      prisma.stripeEvent.deleteMany({ where: { startedAt: { lt: cutoff } } }),
  },
  {
    name: "auditLog",
    cutoff: daysAgo(3 * 365),
    count: (cutoff: Date) =>
      prisma.auditLog.count({ where: { createdAt: { lt: cutoff } } }),
    purge: (cutoff: Date) =>
      prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  },
];

try {
  for (const target of targets) {
    const count = await target.count(target.cutoff);
    process.stdout.write(
      `${target.name}: ${count} rows older than ${target.cutoff.toISOString()}\n`,
    );
    if (apply && count) await target.purge(target.cutoff);
  }
  if (!apply)
    process.stdout.write("Dry run only. Re-run with --yes to apply.\n");
} finally {
  await prisma.$disconnect();
}
