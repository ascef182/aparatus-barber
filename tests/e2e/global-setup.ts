import "dotenv/config";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Slug fixo (não aleatório) — precisa resolver via hosts local uma única
 * vez (`pnpm dev:hosts add e2e-test`), não a cada run. Setup faz
 * find-or-create: apaga qualquer resquício de um run anterior que tenha
 * falhado no teardown, antes de recriar do zero.
 *
 * Conecta como owner (DATABASE_URL), igual scripts/reset-dev-account.ts —
 * script administrativo de dev, não tráfego de runtime (bypassa RLS de
 * propósito pra seedar em qualquer organização).
 */
const SLUG = "e2e-test";
const FIXTURE_PATH = "./tests/e2e/.fixture.json";

export default async function globalSetup() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const existing = await prisma.organization.findUnique({ where: { slug: SLUG } });
    if (existing) {
      await prisma.booking.deleteMany({ where: { organizationId: existing.id } });
      await prisma.organization.delete({ where: { id: existing.id } });
    }

    const organizationId = randomUUID();
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: "E2E Test Business",
        slug: SLUG,
        subscriptionStatus: "TRIALING",
        defaultLocale: "en",
      },
    });
    const location = await prisma.location.create({
      data: {
        organizationId,
        name: "Filial E2E",
        addressLine1: "Teststraße 1",
        postalCode: "10115",
        city: "Berlin",
      },
    });
    const staff = await prisma.staff.create({
      data: { organizationId, locationId: location.id, displayName: "Staff E2E" },
    });
    const service = await prisma.service.create({
      data: {
        organizationId,
        name: "Serviço E2E (pré-pagamento)",
        durationMinutes: 30,
        priceInCents: 3000,
        currency: "EUR",
        paymentMode: "FULL_PREPAYMENT",
      },
    });
    await prisma.staffService.create({
      data: { organizationId, staffId: staff.id, serviceId: service.id },
    });
    // Todos os dias da semana, aberto o dia inteiro — o teste roda em
    // qualquer horário/dia, sem depender de mockar Date.
    await prisma.staffWorkingHours.createMany({
      data: Array.from({ length: 7 }, (_, weekday) => ({
        organizationId,
        staffId: staff.id,
        weekday,
        startTime: "00:00",
        endTime: "23:59",
      })),
    });

    writeFileSync(FIXTURE_PATH, JSON.stringify({ slug: SLUG, organizationId }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
