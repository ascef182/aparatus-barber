import { describe, expect, test, vi, beforeEach } from "vitest";
import Stripe from "stripe";
import { createTaxAwareSubscriptionCheckout } from "@/lib/stripe";

process.env.STRIPE_SECRET_KEY ||= "sk_test_fake";

const createMock = vi.fn();

vi.mock("stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("stripe")>();
  class MockStripe {
    checkout = { sessions: { create: createMock } };
  }
  Object.assign(MockStripe, { errors: actual.default.errors });
  return { ...actual, default: MockStripe };
});

/**
 * Sem esse fallback, uma conta Stripe sem suporte a Stripe Tax (comum em
 * contas de teste fora da UE/EUA) faz checkout.sessions.create() falhar
 * por completo — o botão de assinar simplesmente não faz nada, sem redirect
 * ao Stripe. Ver lib/stripe.ts.
 */
describe("createTaxAwareSubscriptionCheckout", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  test("cai para sem automatic_tax quando a conta não suporta Stripe Tax", async () => {
    const taxError = new Stripe.errors.StripeInvalidRequestError({
      message: "Stripe Tax is not supported for your account country.",
      type: "invalid_request_error",
      code: "stripe_tax_inactive",
    });
    createMock
      .mockRejectedValueOnce(taxError)
      .mockResolvedValueOnce({ id: "cs_test_123", url: "https://checkout.stripe.com/test" });

    const result = await createTaxAwareSubscriptionCheckout({
      line_items: [{ price: "price_123", quantity: 1 }],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
    });

    expect((result as { url: string }).url).toBe("https://checkout.stripe.com/test");
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock.mock.calls[0]![0]).toHaveProperty("automatic_tax");
    expect(createMock.mock.calls[1]![0]).not.toHaveProperty("automatic_tax");
    expect(createMock.mock.calls[1]![0]).not.toHaveProperty("tax_id_collection");
  });

  test("propaga outros erros do Stripe sem tentar de novo", async () => {
    const otherError = new Stripe.errors.StripeInvalidRequestError({
      message: "No such price",
      type: "invalid_request_error",
      code: "resource_missing",
    });
    createMock.mockRejectedValueOnce(otherError);

    await expect(
      createTaxAwareSubscriptionCheckout({
        line_items: [{ price: "bad_price", quantity: 1 }],
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      }),
    ).rejects.toThrow("No such price");
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
