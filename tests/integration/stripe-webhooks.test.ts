import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { runWithPlatformScope } from "@/lib/tenant-context";
import { getStripe } from "@/lib/stripe";
import { POST as billingWebhook } from "@/app/api/stripe/billing/webhook/route";
import { POST as connectWebhook } from "@/app/api/stripe/connect/webhook/route";
import {
  claimStripeEvent,
  markStripeEventFailed,
  markStripeEventProcessed,
} from "@/lib/services/stripe-event-service";

process.env.STRIPE_SECRET_KEY ||= "sk_test_fake";
const BILLING_SECRET = "whsec_test_billing";
const CONNECT_SECRET = "whsec_test_connect";
process.env.STRIPE_BILLING_WEBHOOK_SECRET = BILLING_SECRET;
process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;

function signedRequest(url: string, payload: object, secret: string) {
  const body = JSON.stringify(payload);
  const signature = getStripe().webhooks.generateTestHeaderString({
    payload: body,
    secret,
  });
  return new Request(url, {
    method: "POST",
    body,
    headers: { "stripe-signature": signature },
  });
}

function subscriptionEvent(
  id: string,
  organizationId: string,
  status: string,
  plan = "GROWTH",
) {
  return {
    id,
    type: `customer.subscription.${status === "canceled" ? "deleted" : "updated"}`,
    data: {
      object: {
        id: `sub_${randomUUID().slice(0, 8)}`,
        status,
        metadata: { organizationId, plan },
        items: {
          data: [
            { current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 },
          ],
        },
      },
    },
  };
}

describe("lifecycle idempotente de StripeEvent", () => {
  test("evento falho é retomado e evento concluído não é reprocessado", async () => {
    const eventId = `evt_${randomUUID()}`;
    expect(await claimStripeEvent({ id: eventId, type: "test.event" })).toBe(
      "claimed",
    );
    expect(await claimStripeEvent({ id: eventId, type: "test.event" })).toBe(
      "in_progress",
    );
    await markStripeEventFailed(eventId, new Error("transient failure"));
    expect(await claimStripeEvent({ id: eventId, type: "test.event" })).toBe(
      "claimed",
    );
    await markStripeEventProcessed(eventId);
    expect(await claimStripeEvent({ id: eventId, type: "test.event" })).toBe(
      "processed",
    );
    const stored = await prisma.stripeEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    expect(stored.attempts).toBe(2);
    expect(stored.processedAt).not.toBeNull();
  });
});

const org = { id: randomUUID(), slug: `wh-${randomUUID().slice(0, 8)}` };

beforeAll(async () => {
  await prisma.organization.create({
    data: { id: org.id, name: "Webhook Org", slug: org.slug },
  });
});

afterAll(async () => {
  // auditLog é append-only por design (UPDATE/DELETE revogados de
  // app_runtime na migração de RLS) -- as linhas somem com o container
  // efêmero do Testcontainers ao final da suíte.
  await runWithPlatformScope(async () => {
    await db.booking.deleteMany({ where: { organizationId: org.id } });
    await db.customer.deleteMany({ where: { organizationId: org.id } });
    await db.service.deleteMany({ where: { organizationId: org.id } });
    await db.staff.deleteMany({ where: { organizationId: org.id } });
    await db.location.deleteMany({ where: { organizationId: org.id } });
  });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("webhook de billing SaaS", () => {
  test("assinatura inválida é rejeitada com 400 sem processar", async () => {
    const body = JSON.stringify({
      id: "evt_bad",
      type: "customer.subscription.updated",
      data: { object: {} },
    });
    const request = new Request("http://localhost/api/stripe/billing/webhook", {
      method: "POST",
      body,
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
    });
    const response = await billingWebhook(request);
    expect(response.status).toBe(400);
  });

  test("customer.subscription.updated atualiza plano e status, e grava SUBSCRIPTION_CHANGED", async () => {
    const eventId = `evt_${randomUUID()}`;
    const response = await billingWebhook(
      signedRequest(
        "http://localhost/api/stripe/billing/webhook",
        subscriptionEvent(eventId, org.id, "active"),
        BILLING_SECRET,
      ),
    );
    expect(response.status).toBe(200);
    const reloaded = await prisma.organization.findUniqueOrThrow({
      where: { id: org.id },
    });
    expect(reloaded.subscriptionPlan).toBe("GROWTH");
    expect(reloaded.subscriptionStatus).toBe("ACTIVE");
    const auditLog = await runWithPlatformScope(() =>
      db.auditLog.findFirst({
        where: { organizationId: org.id, action: "SUBSCRIPTION_CHANGED" },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(auditLog).not.toBeNull();
  });

  test("evento duplicado (mesmo event id) é processado uma única vez", async () => {
    const eventId = `evt_${randomUUID()}`;
    const first = subscriptionEvent(eventId, org.id, "active");
    const second = {
      ...subscriptionEvent(eventId, org.id, "past_due"),
      id: eventId,
    };
    const r1 = await billingWebhook(
      signedRequest(
        "http://localhost/api/stripe/billing/webhook",
        first,
        BILLING_SECRET,
      ),
    );
    const r2 = await billingWebhook(
      signedRequest(
        "http://localhost/api/stripe/billing/webhook",
        second,
        BILLING_SECRET,
      ),
    );
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const reloaded = await prisma.organization.findUniqueOrThrow({
      where: { id: org.id },
    });
    // A 2a entrega tem o MESMO event id (replay) mas conteúdo diferente
    // (past_due); dedupe por StripeEvent.id deve ignorá-la — o status
    // continua refletindo apenas a 1a entrega (active).
    expect(reloaded.subscriptionStatus).toBe("ACTIVE");
    const eventCount = await prisma.stripeEvent.count({
      where: { id: eventId },
    });
    expect(eventCount).toBe(1);
  });

  test("customer.subscription.deleted move Organization.status para CHURNED", async () => {
    const eventId = `evt_${randomUUID()}`;
    const response = await billingWebhook(
      signedRequest(
        "http://localhost/api/stripe/billing/webhook",
        subscriptionEvent(eventId, org.id, "canceled"),
        BILLING_SECRET,
      ),
    );
    expect(response.status).toBe(200);
    const reloaded = await prisma.organization.findUniqueOrThrow({
      where: { id: org.id },
    });
    expect(reloaded.subscriptionStatus).toBe("CANCELED");
    expect(reloaded.status).toBe("CHURNED");
  });
});

describe("webhook Stripe Connect", () => {
  test("checkout.session.expired cancela o booking PENDING_PAYMENT", async () => {
    const sessionId = `cs_${randomUUID().slice(0, 8)}`;
    const booking = await runWithPlatformScope(async () => {
      const location = await db.location.create({
        data: {
          organizationId: org.id,
          name: "Filial",
          addressLine1: "Str 1",
          postalCode: "10115",
          city: "Berlin",
        },
      });
      const staff = await db.staff.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          displayName: "Ana",
        },
      });
      const service = await db.service.create({
        data: {
          organizationId: org.id,
          name: "Corte",
          durationMinutes: 30,
          priceInCents: 3000,
        },
      });
      const customer = await db.customer.create({
        data: {
          organizationId: org.id,
          name: "Cliente",
          email: "c@example.com",
        },
      });
      return db.booking.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          staffId: staff.id,
          serviceId: service.id,
          customerId: customer.id,
          startAt: new Date(Date.now() + 86400000),
          endAt: new Date(Date.now() + 86400000 + 1800000),
          status: "PENDING_PAYMENT",
          priceInCents: 3000,
          paymentMode: "FULL_PREPAYMENT",
          paymentStatus: "PENDING",
          stripeCheckoutSessionId: sessionId,
          expiresAt: new Date(Date.now() + 60000),
        },
      });
    });

    const event = {
      id: `evt_${randomUUID()}`,
      type: "checkout.session.expired",
      data: { object: { id: sessionId } },
    };
    const response = await connectWebhook(
      signedRequest(
        "http://localhost/api/stripe/connect/webhook",
        event,
        CONNECT_SECRET,
      ),
    );
    expect(response.status).toBe(200);
    const reloaded = await runWithPlatformScope(() =>
      db.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    );
    expect(reloaded.status).toBe("CANCELLED");
  });

  test("checkout.session.completed confirma o booking e grava PAYMENT_CAPTURED", async () => {
    const sessionId = `cs_${randomUUID().slice(0, 8)}`;
    const booking = await runWithPlatformScope(async () => {
      const location = await db.location.create({
        data: {
          organizationId: org.id,
          name: "Filial",
          addressLine1: "Str 1",
          postalCode: "10115",
          city: "Berlin",
        },
      });
      const staff = await db.staff.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          displayName: "Ana",
        },
      });
      const service = await db.service.create({
        data: {
          organizationId: org.id,
          name: "Corte",
          durationMinutes: 30,
          priceInCents: 3000,
        },
      });
      const customer = await db.customer.create({
        data: {
          organizationId: org.id,
          name: "Cliente",
          email: "c2@example.com",
        },
      });
      return db.booking.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          staffId: staff.id,
          serviceId: service.id,
          customerId: customer.id,
          startAt: new Date(Date.now() + 86400000),
          endAt: new Date(Date.now() + 86400000 + 1800000),
          status: "PENDING_PAYMENT",
          priceInCents: 3000,
          paymentMode: "FULL_PREPAYMENT",
          paymentStatus: "PENDING",
          stripeCheckoutSessionId: sessionId,
          expiresAt: new Date(Date.now() + 60000),
        },
      });
    });

    const event = {
      id: `evt_${randomUUID()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: sessionId,
          metadata: { bookingId: booking.id },
          payment_intent: `pi_${randomUUID().slice(0, 8)}`,
        },
      },
    };
    const response = await connectWebhook(
      signedRequest(
        "http://localhost/api/stripe/connect/webhook",
        event,
        CONNECT_SECRET,
      ),
    );
    expect(response.status).toBe(200);
    const reloaded = await runWithPlatformScope(() =>
      db.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    );
    expect(reloaded.status).toBe("CONFIRMED");
    const auditLog = await runWithPlatformScope(() =>
      db.auditLog.findFirst({
        where: {
          organizationId: org.id,
          action: "PAYMENT_CAPTURED",
          entityId: booking.id,
        },
      }),
    );
    expect(auditLog).not.toBeNull();
  });

  /**
   * Seção 19 do programa de hardening pede explicitamente "evento X
   * concorrente", distinto de "evento X novamente" (replay sequencial, já
   * coberto acima em "evento duplicado ... é processado uma única vez").
   * claimStripeEvent depende de uma constraint UNIQUE do Postgres
   * (catch de P2002), não de um check-then-act em memória — Promise.all
   * prova que a garantia se sustenta sob concorrência real, não só quando
   * as chamadas já chegam serializadas pelo event loop.
   */
  test("MESMO event.id entregue de verdade em paralelo (Promise.all): booking confirma uma única vez, nunca duas notificações/audit logs", async () => {
    const sessionId = `cs_${randomUUID().slice(0, 8)}`;
    const booking = await runWithPlatformScope(async () => {
      const location = await db.location.create({
        data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
      });
      const staff = await db.staff.create({ data: { organizationId: org.id, locationId: location.id, displayName: "Ana" } });
      const service = await db.service.create({ data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 3000 } });
      const customer = await db.customer.create({ data: { organizationId: org.id, name: "Cliente", email: `c-${randomUUID()}@example.com` } });
      return db.booking.create({
        data: {
          organizationId: org.id, locationId: location.id, staffId: staff.id, serviceId: service.id, customerId: customer.id,
          startAt: new Date(Date.now() + 86400000), endAt: new Date(Date.now() + 86400000 + 1800000),
          status: "PENDING_PAYMENT", priceInCents: 3000, paymentMode: "FULL_PREPAYMENT", paymentStatus: "PENDING",
          stripeCheckoutSessionId: sessionId, expiresAt: new Date(Date.now() + 60000),
        },
      });
    });

    const event = {
      id: `evt_${randomUUID()}`,
      type: "checkout.session.completed",
      data: { object: { id: sessionId, metadata: { bookingId: booking.id }, payment_intent: `pi_${randomUUID().slice(0, 8)}` } },
    };
    const fire = () => connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", event, CONNECT_SECRET));
    const [res1, res2] = await Promise.all([fire(), fire()]);

    // Uma das duas entregas concorrentes vence o claim (200); a outra
    // perde a corrida contra a constraint única — 200 (já processada
    // pouco depois) ou 409 (ainda em progresso), nunca um 500.
    expect([res1.status, res2.status].every((s) => s === 200 || s === 409)).toBe(true);

    const reloaded = await runWithPlatformScope(() => db.booking.findUniqueOrThrow({ where: { id: booking.id } }));
    expect(reloaded.status).toBe("CONFIRMED");

    const auditLogs = await runWithPlatformScope(() =>
      db.auditLog.findMany({ where: { organizationId: org.id, action: "PAYMENT_CAPTURED", entityId: booking.id } }),
    );
    expect(auditLogs).toHaveLength(1); // nunca 2, mesmo com as duas requests batendo ao mesmo tempo
  });

  test("charge.refund.updated aplica reembolso e grava PAYMENT_REFUNDED", async () => {
    const paymentIntentId = `pi_${randomUUID().slice(0, 8)}`;
    const booking = await runWithPlatformScope(async () => {
      const location = await db.location.create({
        data: {
          organizationId: org.id,
          name: "Filial",
          addressLine1: "Str 1",
          postalCode: "10115",
          city: "Berlin",
        },
      });
      const staff = await db.staff.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          displayName: "Ana",
        },
      });
      const service = await db.service.create({
        data: {
          organizationId: org.id,
          name: "Corte",
          durationMinutes: 30,
          priceInCents: 3000,
        },
      });
      const customer = await db.customer.create({
        data: {
          organizationId: org.id,
          name: "Cliente",
          email: "c3@example.com",
        },
      });
      return db.booking.create({
        data: {
          organizationId: org.id,
          locationId: location.id,
          staffId: staff.id,
          serviceId: service.id,
          customerId: customer.id,
          startAt: new Date(Date.now() + 86400000),
          endAt: new Date(Date.now() + 86400000 + 1800000),
          status: "CONFIRMED",
          priceInCents: 3000,
          paymentMode: "FULL_PREPAYMENT",
          paymentStatus: "PAID",
          stripePaymentIntentId: paymentIntentId,
        },
      });
    });

    const event = {
      id: `evt_${randomUUID()}`,
      type: "charge.refund.updated",
      data: {
        object: {
          id: `re_${randomUUID().slice(0, 8)}`,
          status: "succeeded",
          payment_intent: paymentIntentId,
          amount: 3000,
        },
      },
    };
    const response = await connectWebhook(
      signedRequest(
        "http://localhost/api/stripe/connect/webhook",
        event,
        CONNECT_SECRET,
      ),
    );
    expect(response.status).toBe(200);
    const reloaded = await runWithPlatformScope(() =>
      db.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    );
    expect(reloaded.paymentStatus).toBe("REFUNDED");
    const auditLog = await runWithPlatformScope(() =>
      db.auditLog.findFirst({
        where: {
          organizationId: org.id,
          action: "PAYMENT_REFUNDED",
          entityId: booking.id,
        },
      }),
    );
    expect(auditLog).not.toBeNull();
  });

  /**
   * Sprint 3 (hardening) — achado de auditoria de integridade financeira:
   * refund.amount é o valor daquele Refund object individual, NUNCA
   * cumulativo (confirmado via `stripe docs api refund` — "Amount, in the
   * smallest currency unit", por reembolso, não por charge). O código
   * antigo fazia `refundedAmountInCents: amountRefundedInCents` — uma
   * SOBRESCRITA, não soma. Duas devoluções parciais separadas na mesma
   * reserva faziam a segunda apagar o registro da primeira, subestimando
   * quanto já tinha sido devolvido (e superestimando receita líquida em
   * qualquer relatório que leia refundedAmountInCents).
   */
  test("duas devoluções parciais separadas se SOMAM (não a última sobrescreve a anterior)", async () => {
    const paymentIntentId = `pi_${randomUUID().slice(0, 8)}`;
    const booking = await runWithPlatformScope(async () => {
      const location = await db.location.create({
        data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
      });
      const staff = await db.staff.create({ data: { organizationId: org.id, locationId: location.id, displayName: "Ana" } });
      const service = await db.service.create({ data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 10000 } });
      const customer = await db.customer.create({ data: { organizationId: org.id, name: "Cliente", email: `c-${randomUUID()}@example.com` } });
      return db.booking.create({
        data: {
          organizationId: org.id, locationId: location.id, staffId: staff.id, serviceId: service.id, customerId: customer.id,
          startAt: new Date(Date.now() + 86400000), endAt: new Date(Date.now() + 86400000 + 1800000),
          status: "CONFIRMED", priceInCents: 10000, onlinePaymentAmountInCents: 10000,
          paymentMode: "FULL_PREPAYMENT", paymentStatus: "PAID", stripePaymentIntentId: paymentIntentId,
        },
      });
    });

    const refundEvent = (refundId: string, amount: number) => ({
      id: `evt_${randomUUID()}`,
      type: "charge.refund.updated",
      data: { object: { id: refundId, status: "succeeded", payment_intent: paymentIntentId, amount } },
    });

    const firstRefundId = `re_${randomUUID().slice(0, 8)}`;
    const res1 = await connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", refundEvent(firstRefundId, 3000), CONNECT_SECRET));
    expect(res1.status).toBe(200);
    const afterFirst = await runWithPlatformScope(() => db.booking.findUniqueOrThrow({ where: { id: booking.id } }));
    expect(afterFirst.refundedAmountInCents).toBe(3000);
    expect(afterFirst.paymentStatus).toBe("PARTIALLY_REFUNDED");

    const secondRefundId = `re_${randomUUID().slice(0, 8)}`;
    const res2 = await connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", refundEvent(secondRefundId, 4000), CONNECT_SECRET));
    expect(res2.status).toBe(200);
    const afterSecond = await runWithPlatformScope(() => db.booking.findUniqueOrThrow({ where: { id: booking.id } }));
    expect(afterSecond.refundedAmountInCents).toBe(7000); // 3000 + 4000, não 4000
    expect(afterSecond.paymentStatus).toBe("PARTIALLY_REFUNDED");
  });

  test("o mesmo refund.id reprocessado (charge.refund.updated repetido) não soma duas vezes", async () => {
    const paymentIntentId = `pi_${randomUUID().slice(0, 8)}`;
    const booking = await runWithPlatformScope(async () => {
      const location = await db.location.create({
        data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
      });
      const staff = await db.staff.create({ data: { organizationId: org.id, locationId: location.id, displayName: "Ana" } });
      const service = await db.service.create({ data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 10000 } });
      const customer = await db.customer.create({ data: { organizationId: org.id, name: "Cliente", email: `c-${randomUUID()}@example.com` } });
      return db.booking.create({
        data: {
          organizationId: org.id, locationId: location.id, staffId: staff.id, serviceId: service.id, customerId: customer.id,
          startAt: new Date(Date.now() + 86400000), endAt: new Date(Date.now() + 86400000 + 1800000),
          status: "CONFIRMED", priceInCents: 10000, onlinePaymentAmountInCents: 10000,
          paymentMode: "FULL_PREPAYMENT", paymentStatus: "PAID", stripePaymentIntentId: paymentIntentId,
        },
      });
    });

    // Mesmo refund.id, dois event.id DIFERENTES — simula charge.refund.updated
    // disparando de novo pro MESMO refund (ex.: outro campo mudou depois de
    // succeeded), não um retry puro do mesmo event.id (esse já é dedupado
    // por StripeEvent/claimStripeEvent, camada de fora).
    const refundId = `re_${randomUUID().slice(0, 8)}`;
    const makeEvent = () => ({
      id: `evt_${randomUUID()}`,
      type: "charge.refund.updated",
      data: { object: { id: refundId, status: "succeeded", payment_intent: paymentIntentId, amount: 5000 } },
    });
    await connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", makeEvent(), CONNECT_SECRET));
    await connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", makeEvent(), CONNECT_SECRET));

    const reloaded = await runWithPlatformScope(() => db.booking.findUniqueOrThrow({ where: { id: booking.id } }));
    expect(reloaded.refundedAmountInCents).toBe(5000); // não 10000
  });

  test("refund com status pending/failed NÃO é aplicado (só dinheiro que voltou de verdade conta)", async () => {
    const paymentIntentId = `pi_${randomUUID().slice(0, 8)}`;
    const booking = await runWithPlatformScope(async () => {
      const location = await db.location.create({
        data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
      });
      const staff = await db.staff.create({ data: { organizationId: org.id, locationId: location.id, displayName: "Ana" } });
      const service = await db.service.create({ data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 10000 } });
      const customer = await db.customer.create({ data: { organizationId: org.id, name: "Cliente", email: `c-${randomUUID()}@example.com` } });
      return db.booking.create({
        data: {
          organizationId: org.id, locationId: location.id, staffId: staff.id, serviceId: service.id, customerId: customer.id,
          startAt: new Date(Date.now() + 86400000), endAt: new Date(Date.now() + 86400000 + 1800000),
          status: "CONFIRMED", priceInCents: 10000, onlinePaymentAmountInCents: 10000,
          paymentMode: "FULL_PREPAYMENT", paymentStatus: "PAID", stripePaymentIntentId: paymentIntentId,
        },
      });
    });

    const event = {
      id: `evt_${randomUUID()}`,
      type: "charge.refund.updated",
      data: { object: { id: `re_${randomUUID().slice(0, 8)}`, status: "pending", payment_intent: paymentIntentId, amount: 5000 } },
    };
    const response = await connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", event, CONNECT_SECRET));
    expect(response.status).toBe(200);
    const reloaded = await runWithPlatformScope(() => db.booking.findUniqueOrThrow({ where: { id: booking.id } }));
    expect(reloaded.refundedAmountInCents).toBe(0);
    expect(reloaded.paymentStatus).toBe("PAID");
  });

  test("account.updated persiste chargesEnabled/payoutsEnabled", async () => {
    const accountId = `acct_${randomUUID().slice(0, 8)}`;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeConnectAccountId: accountId },
    });
    const event = {
      id: `evt_${randomUUID()}`,
      type: "account.updated",
      account: accountId,
      data: {
        object: {
          id: accountId,
          charges_enabled: true,
          payouts_enabled: false,
        },
      },
    };
    const response = await connectWebhook(
      signedRequest(
        "http://localhost/api/stripe/connect/webhook",
        event,
        CONNECT_SECRET,
      ),
    );
    expect(response.status).toBe(200);
    const reloaded = await prisma.organization.findUniqueOrThrow({
      where: { id: org.id },
    });
    expect(reloaded.chargesEnabled).toBe(true);
    expect(reloaded.payoutsEnabled).toBe(false);
  });
});
