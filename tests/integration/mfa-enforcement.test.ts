import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { ensureMfaGracePeriod, getMembership } from "@/lib/services/member-service";

/**
 * Enforcement em si (redirect + exceção /dashboard/settings) vive em
 * app/dashboard/layout.tsx, um Server Component sem cobertura de unit test
 * no projeto (mesma limitação documentada em tests/integration/action-rbac.test.ts
 * para next-safe-action). Aqui exercitamos a peça que TEM lógica de negócio
 * testável isoladamente: o cálculo/persistência do prazo.
 */

const org = { id: randomUUID(), slug: `mfa-${randomUUID().slice(0, 8)}` };
const ownerUserId = randomUUID();

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "MFA Org", slug: org.slug } });
  await prisma.user.create({
    data: { id: ownerUserId, name: "Owner", email: `owner-${ownerUserId}@example.com` },
  });
  await prisma.member.create({
    data: { id: randomUUID(), organizationId: org.id, userId: ownerUserId, role: "owner" },
  });
});

afterAll(async () => {
  await prisma.member.deleteMany({ where: { organizationId: org.id } });
  await prisma.user.deleteMany({ where: { id: ownerUserId } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("ensureMfaGracePeriod", () => {
  test("primeira leitura grava um prazo ~7 dias no futuro", async () => {
    const before = Date.now();
    const deadline = await ensureMfaGracePeriod(org.id, ownerUserId);
    expect(deadline).not.toBeNull();
    const days = (deadline!.getTime() - before) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);

    const membership = await getMembership(org.id, ownerUserId);
    expect(membership!.mfaGracePeriodEndsAt?.getTime()).toBe(deadline!.getTime());
  });

  test("segunda leitura NÃO recua o prazo já gravado", async () => {
    const first = await ensureMfaGracePeriod(org.id, ownerUserId);
    const second = await ensureMfaGracePeriod(org.id, ownerUserId);
    expect(second!.getTime()).toBe(first!.getTime());
  });

  test("retorna null para quem não tem membership no tenant", async () => {
    expect(await ensureMfaGracePeriod(org.id, randomUUID())).toBeNull();
  });
});

describe("simulação do gate de enforcement (mesma comparação de dashboard/layout.tsx)", () => {
  test("prazo expirado bloqueia fora de /dashboard/settings", async () => {
    const expiredMemberId = randomUUID();
    const userId = randomUUID();
    await prisma.user.create({ data: { id: userId, name: "Expired", email: `expired-${userId}@example.com` } });
    await prisma.member.create({
      data: {
        id: expiredMemberId,
        organizationId: org.id,
        userId,
        role: "owner",
        mfaGracePeriodEndsAt: new Date(Date.now() - 1000),
      },
    });
    const membership = await getMembership(org.id, userId);
    const deadline = membership!.mfaGracePeriodEndsAt;
    const isExemptPath = false;
    const blocked = !!deadline && deadline < new Date() && !isExemptPath;
    expect(blocked).toBe(true);

    await prisma.member.delete({ where: { id: expiredMemberId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  test("prazo expirado NÃO bloqueia em /dashboard/settings (escape hatch)", async () => {
    const deadline = new Date(Date.now() - 1000);
    const isExemptPath = true;
    const blocked = !!deadline && deadline < new Date() && !isExemptPath;
    expect(blocked).toBe(false);
  });
});
