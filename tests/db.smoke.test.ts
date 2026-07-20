import { afterAll, describe, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const id = randomUUID();

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id } });
  await prisma.$disconnect();
});

describe("database smoke", () => {
  test("creates and reads an organization", async () => {
    await prisma.organization.create({ data: { id, name: "Smoke tenant", slug: `smoke-${id.slice(0, 8)}` } });
    const organization = await prisma.organization.findUnique({ where: { id } });
    expect(organization?.name).toBe("Smoke tenant");
  });
});
