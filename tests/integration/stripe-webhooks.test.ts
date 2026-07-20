import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { POST as billingWebhook } from "@/app/api/stripe/billing/webhook/route";
import { POST as connectWebhook } from "@/app/api/stripe/connect/webhook/route";

process.env.STRIPE_SECRET_KEY ||= "sk_test_fake";
const BILLING_SECRET = "whsec_test_billing";
const CONNECT_SECRET = "whsec_test_connect";
process.env.STRIPE_BILLING_WEBHOOK_SECRET = BILLING_SECRET;
process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;

function signedRequest(url: string, payload: object, secret: string) {
  const body = JSON.stringify(payload);
  const signature = getStripe().webhooks.generateTestHeaderString({ payload: body, secret });
  return new Request(url, {
    method: "POST",
    body,
    headers: { "stripe-signature": signature },
  });
}

function subscriptionEvent(id: string, organizationId: string, status: string, plan = "GROWTH") {
  return {
    id,
    type: `customer.subscription.${status === "canceled" ? "deleted" : "updated"}`,
    data: {
      object: {
        id: `sub_${randomUUID().slice(0, 8)}`,
        status,
        metadata: { organizationId, plan },
        items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
      },
    },
  };
}

const org = { id: randomUUID(), slug: `wh-${randomUUID().slice(0, 8)}` };

beforeAll(async () => {
  await prisma.organization.create({ data: { id: org.id, name: "Webhook Org", slug: org.slug } });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organizationId: org.id } });
  await prisma.booking.deleteMany({ where: { organizationId: org.id } });
  await prisma.customer.deleteMany({ where: { organizationId: org.id } });
  await prisma.service.deleteMany({ where: { organizationId: org.id } });
  await prisma.staff.deleteMany({ where: { organizationId: org.id } });
  await prisma.location.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });
  await prisma.$disconnect();
});

describe("webhook de billing SaaS", () => {
  test("assinatura inválida é rejeitada com 400 sem processar", async () => {
    const body = JSON.stringify({ id: "evt_bad", type: "customer.subscription.updated", data: { object: {} } });
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
      signedRequest("http://localhost/api/stripe/billing/webhook", subscriptionEvent(eventId, org.id, "active"), BILLING_SECRET),
    );
    expect(response.status).toBe(200);
    const reloaded = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(reloaded.subscriptionPlan).toBe("GROWTH");
    expect(reloaded.subscriptionStatus).toBe("ACTIVE");
    const auditLog = await prisma.auditLog.findFirst({
      where: { organizationId: org.id, action: "SUBSCRIPTION_CHANGED" },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLog).not.toBeNull();
  });

  test("evento duplicado (mesmo event id) é processado uma única vez", async () => {
    const eventId = `evt_${randomUUID()}`;
    const first = subscriptionEvent(eventId, org.id, "active");
    const second = { ...subscriptionEvent(eventId, org.id, "past_due"), id: eventId };
    const r1 = await billingWebhook(signedRequest("http://localhost/api/stripe/billing/webhook", first, BILLING_SECRET));
    const r2 = await billingWebhook(signedRequest("http://localhost/api/stripe/billing/webhook", second, BILLING_SECRET));
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const reloaded = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    // A 2a entrega tem o MESMO event id (replay) mas conteúdo diferente
    // (past_due); dedupe por StripeEvent.id deve ignorá-la — o status
    // continua refletindo apenas a 1a entrega (active).
    expect(reloaded.subscriptionStatus).toBe("ACTIVE");
    const eventCount = await prisma.stripeEvent.count({ where: { id: eventId } });
    expect(eventCount).toBe(1);
  });

  test("customer.subscription.deleted move Organization.status para CHURNED", async () => {
    const eventId = `evt_${randomUUID()}`;
    const response = await billingWebhook(
      signedRequest("http://localhost/api/stripe/billing/webhook", subscriptionEvent(eventId, org.id, "canceled"), BILLING_SECRET),
    );
    expect(response.status).toBe(200);
    const reloaded = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(reloaded.subscriptionStatus).toBe("CANCELED");
    expect(reloaded.status).toBe("CHURNED");
  });
});

describe("webhook Stripe Connect", () => {
  test("checkout.session.expired cancela o booking PENDING_PAYMENT", async () => {
    const location = await prisma.location.create({
      data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
    });
    const staff = await prisma.staff.create({ data: { organizationId: org.id, locationId: location.id, displayName: "Ana" } });
    const service = await prisma.service.create({ data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 3000 } });
    const customer = await prisma.customer.create({ data: { organizationId: org.id, name: "Cliente", email: "c@example.com" } });
    const sessionId = `cs_${randomUUID().slice(0, 8)}`;
    const booking = await prisma.booking.create({
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

    const event = { id: `evt_${randomUUID()}`, type: "checkout.session.expired", data: { object: { id: sessionId } } };
    const response = await connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", event, CONNECT_SECRET));
    expect(response.status).toBe(200);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CANCELLED");
  });

  test("checkout.session.completed confirma o booking e grava PAYMENT_CAPTURED", async () => {
    const location = await prisma.location.create({
      data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
    });
    const staff = await prisma.staff.create({ data: { organizationId: org.id, locationId: location.id, displayName: "Ana" } });
    const service = await prisma.service.create({ data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 3000 } });
    const customer = await prisma.customer.create({ data: { organizationId: org.id, name: "Cliente", email: "c2@example.com" } });
    const sessionId = `cs_${randomUUID().slice(0, 8)}`;
    const booking = await prisma.booking.create({
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

    const event = {
      id: `evt_${randomUUID()}`,
      type: "checkout.session.completed",
      data: { object: { id: sessionId, metadata: { bookingId: booking.id }, payment_intent: `pi_${randomUUID().slice(0, 8)}` } },
    };
    const response = await connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", event, CONNECT_SECRET));
    expect(response.status).toBe(200);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CONFIRMED");
    const auditLog = await prisma.auditLog.findFirst({
      where: { organizationId: org.id, action: "PAYMENT_CAPTURED", entityId: booking.id },
    });
    expect(auditLog).not.toBeNull();
  });

  test("charge.refund.updated aplica reembolso e grava PAYMENT_REFUNDED", async () => {
    const location = await prisma.location.create({
      data: { organizationId: org.id, name: "Filial", addressLine1: "Str 1", postalCode: "10115", city: "Berlin" },
    });
    const staff = await prisma.staff.create({ data: { organizationId: org.id, locationId: location.id, displayName: "Ana" } });
    const service = await prisma.service.create({ data: { organizationId: org.id, name: "Corte", durationMinutes: 30, priceInCents: 3000 } });
    const customer = await prisma.customer.create({ data: { organizationId: org.id, name: "Cliente", email: "c3@example.com" } });
    const paymentIntentId = `pi_${randomUUID().slice(0, 8)}`;
    const booking = await prisma.booking.create({
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

    const event = {
      id: `evt_${randomUUID()}`,
      type: "charge.refund.updated",
      data: { object: { payment_intent: paymentIntentId, amount: 3000 } },
    };
    const response = await connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", event, CONNECT_SECRET));
    expect(response.status).toBe(200);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.paymentStatus).toBe("REFUNDED");
    const auditLog = await prisma.auditLog.findFirst({
      where: { organizationId: org.id, action: "PAYMENT_REFUNDED", entityId: booking.id },
    });
    expect(auditLog).not.toBeNull();
  });

  test("account.updated persiste chargesEnabled/payoutsEnabled", async () => {
    const accountId = `acct_${randomUUID().slice(0, 8)}`;
    await prisma.organization.update({ where: { id: org.id }, data: { stripeConnectAccountId: accountId } });
    const event = {
      id: `evt_${randomUUID()}`,
      type: "account.updated",
      account: accountId,
      data: { object: { id: accountId, charges_enabled: true, payouts_enabled: false } },
    };
    const response = await connectWebhook(signedRequest("http://localhost/api/stripe/connect/webhook", event, CONNECT_SECRET));
    expect(response.status).toBe(200);
    const reloaded = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(reloaded.chargesEnabled).toBe(true);
    expect(reloaded.payoutsEnabled).toBe(false);
  });
});
