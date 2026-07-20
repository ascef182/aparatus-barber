import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { getInvitationById, listMembers, listPendingInvitations } from "@/lib/services/member-service";
import { logAuditEvent } from "@/lib/services/audit-service";

/**
 * Convite de equipe é gerenciado pelo plugin organization do Better Auth
 * (Invitation/Member via prisma cru) — aqui exercitamos as mesmas leituras
 * que app/accept-invitation/[id]/page.tsx e o settings da equipe fazem,
 * contra um Postgres real, sem precisar mockar sessão/next/headers.
 */

const org = { id: randomUUID(), slug: `invite-${randomUUID().slice(0, 8)}` };
const ownerUserId = randomUUID();
const inviteeUserId = randomUUID();
const inviteeEmail = `invitee-${randomUUID()}@example.com`;

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "Invite Org", slug: org.slug } });
  await prisma.user.create({
    data: { id: ownerUserId, name: "Owner", email: `owner-${ownerUserId}@example.com` },
  });
  await prisma.member.create({
    data: { id: randomUUID(), organizationId: org.id, userId: ownerUserId, role: "owner" },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organizationId: org.id } });
  await prisma.invitation.deleteMany({ where: { organizationId: org.id } });
  await prisma.member.deleteMany({ where: { organizationId: org.id } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerUserId, inviteeUserId] } } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("getInvitationById — leitura pré-autenticação (bypassa getInvitation session-gated do Better Auth)", () => {
  test("retorna e-mail/organização para um convite pendente", async () => {
    const invitationId = randomUUID();
    await prisma.invitation.create({
      data: {
        id: invitationId,
        organizationId: org.id,
        email: inviteeEmail,
        role: "professional",
        status: "pending",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        inviterId: ownerUserId,
      },
    });

    const invitation = await getInvitationById(invitationId);
    expect(invitation).not.toBeNull();
    expect(invitation!.email).toBe(inviteeEmail);
    expect(invitation!.status).toBe("pending");
    expect(invitation!.organization.slug).toBe(org.slug);

    await logAuditEvent({
      entity: "Invitation",
      action: "INVITE_SENT",
      entityId: invitation!.id,
      actorId: ownerUserId,
      organizationId: org.id,
    });
    const invites = await listPendingInvitations(org.id);
    expect(invites.map((i) => i.id)).toContain(invitationId);
  });

  test("retorna null para convite inexistente", async () => {
    expect(await getInvitationById(randomUUID())).toBeNull();
  });

  test("convite expirado é lido normalmente — a página quem decide bloquear pelo expiresAt", async () => {
    const invitationId = randomUUID();
    await prisma.invitation.create({
      data: {
        id: invitationId,
        organizationId: org.id,
        email: `expired-${randomUUID()}@example.com`,
        role: "professional",
        status: "pending",
        expiresAt: new Date(Date.now() - 1000 * 60),
        inviterId: ownerUserId,
      },
    });
    const invitation = await getInvitationById(invitationId);
    expect(invitation!.expiresAt.getTime()).toBeLessThan(Date.now());
  });
});

describe("aceite de convite — status transita e membership passa a existir", () => {
  test("após aceite, listMembers inclui o convidado e o convite sai de pending", async () => {
    const invitationId = randomUUID();
    await prisma.invitation.create({
      data: {
        id: invitationId,
        organizationId: org.id,
        email: inviteeEmail,
        role: "professional",
        status: "pending",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        inviterId: ownerUserId,
      },
    });
    await prisma.user.create({ data: { id: inviteeUserId, name: "Invitee", email: inviteeEmail } });

    // Simula o que auth.api.acceptInvitation faz internamente.
    await prisma.$transaction([
      prisma.invitation.update({ where: { id: invitationId }, data: { status: "accepted" } }),
      prisma.member.create({
        data: { id: randomUUID(), organizationId: org.id, userId: inviteeUserId, role: "professional" },
      }),
    ]);
    await logAuditEvent({
      entity: "Invitation",
      action: "INVITE_ACCEPTED",
      entityId: invitationId,
      actorId: inviteeUserId,
      organizationId: org.id,
    });

    const members = await listMembers(org.id);
    expect(members.some((m) => m.userId === inviteeUserId && m.role === "professional")).toBe(true);

    const invitation = await getInvitationById(invitationId);
    expect(invitation!.status).toBe("accepted");

    const auditRows = await prisma.auditLog.findMany({ where: { organizationId: org.id, action: "INVITE_ACCEPTED" } });
    expect(auditRows).toHaveLength(1);
  });
});
