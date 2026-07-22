import "dotenv/config";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const FIXTURE_PATH = "./tests/e2e/.fixture.json";

export default async function globalTeardown() {
  if (!existsSync(FIXTURE_PATH)) return;
  const { organizationId } = JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await prisma.booking.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  } catch {
    // Se o setup falhou antes de criar a org, não há nada pra apagar.
  } finally {
    await prisma.$disconnect();
    rmSync(FIXTURE_PATH, { force: true });
  }
}
