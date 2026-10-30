/**
 * Oferta comercial exibida na landing (ver docs/marketing/grand-slam-offer.md).
 *
 * O Founder Plan não é um SubscriptionPlan do Prisma — é o piloto assistido
 * (PRODUCT.md, "Commercial model"), fechado por contato direto e cobrado à
 * mão. Por isso vive aqui, e não em lib/billing/plan-limits.ts.
 */
export const FOUNDER_PLAN = {
  priceInCents: 5900,
  months: 12,
  spots: 20,
  pilotDays: 30,
} as const;

/**
 * Garantia "Cadeira Protegida". Desligada até a cláusula correspondente nos
 * Termos passar por revisão jurídica — a mesma flag liga o bloco na landing,
 * a pergunta do FAQ e a cláusula em app/(marketing)/terms/page.tsx, para as
 * três nunca divergirem.
 */
export const GUARANTEE_ENABLED = false;
export const GUARANTEE_DAYS = 30;

/**
 * Link de contato do piloto assistido (ex.: https://wa.me/55...). Sem ele, o
 * CTA do Founder Plan cai no cadastro normal — nunca num contato inventado.
 */
export function getFounderContactUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_FOUNDER_CONTACT_URL?.trim();
  return url ? url : null;
}

/** Semanas médias por mês, usado para projetar faltas semanais em R$/mês. */
export const WEEKS_PER_MONTH = 4.33;

export function monthlyNoShowLoss(averageTicket: number, noShowsPerWeek: number): number {
  if (!Number.isFinite(averageTicket) || !Number.isFinite(noShowsPerWeek)) return 0;
  if (averageTicket <= 0 || noShowsPerWeek <= 0) return 0;
  return Math.round(averageTicket * noShowsPerWeek * WEEKS_PER_MONTH);
}
