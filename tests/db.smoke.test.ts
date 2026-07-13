import { afterAll, expect, test } from "vitest";
import { createTestPrismaClient } from "./helpers/db";

const prisma = createTestPrismaClient();

afterAll(() => prisma.$disconnect());

test("migrations aplicadas: cria e lê um registro", async () => {
  const created = await prisma.barbershop.create({
    data: {
      name: "Smoke Test Shop",
      address: "Teststraße 1, Berlin",
      description: "smoke",
      imageUrl: "https://example.com/x.png",
      phones: ["+49 30 000000"],
    },
  });

  const found = await prisma.barbershop.findUnique({
    where: { id: created.id },
  });
  expect(found?.name).toBe("Smoke Test Shop");

  await prisma.barbershop.delete({ where: { id: created.id } });
});
