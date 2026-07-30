import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenant-context";
import type { CouponScope, CouponType } from "@/generated/prisma/client";

export function listCoupons() {
  return db.coupon.findMany({ orderBy: { createdAt: "desc" } });
}

export function getCouponByCode(code: string) {
  return db.coupon.findUnique({
    where: {
      organizationId_code: {
        organizationId: requireTenantId(),
        code: code.trim().toUpperCase(),
      },
    },
  });
}

/** Usos válidos: bookings não cancelados que aplicaram o cupom. */
export function countRedemptions(couponId: string) {
  return db.booking.count({
    where: { couponId, status: { not: "CANCELLED" } },
  });
}

// Código (não texto livre) — quem chama do lado do cliente escolhe a
// mensagem traduzida (ver couponReasonToMessage em service-item.tsx);
// createBooking usa FALLBACK_MESSAGE ao lançar diretamente (mesmo padrão
// de SLOT_TAKEN_MESSAGE em booking-service.ts: erro de corrida rara,
// não fica atrás de i18n, só o caminho comum de preview fica).
export type CouponReasonCode = "invalid" | "not_yet_valid" | "expired" | "exhausted" | "wrong_service";

const FALLBACK_MESSAGE: Record<CouponReasonCode, string> = {
  invalid: "Cupom inválido.",
  not_yet_valid: "Cupom ainda não é válido.",
  expired: "Cupom expirado.",
  exhausted: "Cupom esgotado.",
  wrong_service: "Cupom não válido para este serviço.",
};

export type CouponValidationResult =
  | { valid: true; couponId: string; discountInCents: number }
  | { valid: false; reasonCode: CouponReasonCode; reason: string };

/**
 * Único ponto de validação de cupom no momento da reserva — checa
 * existência/ativo, janela de validade, limite de resgates (contagem
 * best-effort via countRedemptions; sem constraint atômica no banco, mesmo
 * nível de risco já aceito pela checagem de slot em getAvailableSlots +
 * exclusion constraint como rede final) e escopo (todos os serviços ou só
 * os vinculados via CouponService). Retorna o desconto já calculado e
 * limitado ao preço do serviço (nunca deixa o valor final negativo).
 */
export async function validateCoupon(
  code: string,
  serviceId: string,
  priceInCents: number,
): Promise<CouponValidationResult> {
  function invalid(reasonCode: CouponReasonCode): CouponValidationResult {
    return { valid: false, reasonCode, reason: FALLBACK_MESSAGE[reasonCode] };
  }

  const coupon = await getCouponByCode(code);
  if (!coupon || !coupon.isActive) return invalid("invalid");

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) return invalid("not_yet_valid");
  if (coupon.validUntil && coupon.validUntil < now) return invalid("expired");

  if (coupon.maxRedemptions) {
    const used = await countRedemptions(coupon.id);
    if (used >= coupon.maxRedemptions) return invalid("exhausted");
  }

  if (coupon.scope === "SELECTED_SERVICES") {
    const link = await db.couponService.findFirst({ where: { couponId: coupon.id, serviceId } });
    if (!link) return invalid("wrong_service");
  }

  const rawDiscount = coupon.type === "PERCENT" ? Math.round((priceInCents * coupon.value) / 100) : coupon.value;
  const discountInCents = Math.min(rawDiscount, priceInCents);
  return { valid: true, couponId: coupon.id, discountInCents };
}

export function createCoupon(data: {
  code: string;
  type: CouponType;
  value: number;
  validFrom?: Date | null;
  validUntil?: Date | null;
  maxRedemptions?: number | null;
  scope?: CouponScope;
  serviceIds?: string[];
}) {
  const organizationId = requireTenantId();
  const { serviceIds, scope, ...rest } = data;
  const resolvedScope = scope ?? "ALL_SERVICES";
  // Vínculos com CouponService só fazem sentido em SELECTED_SERVICES —
  // scope ALL_SERVICES ignora serviceIds mesmo que venha preenchido.
  const links = resolvedScope === "SELECTED_SERVICES" ? [...new Set(serviceIds ?? [])] : [];
  return db.coupon.create({
    data: {
      ...rest,
      scope: resolvedScope,
      code: data.code.trim().toUpperCase(),
      organizationId,
      services: { create: links.map((serviceId) => ({ organizationId, serviceId })) },
    },
  });
}

/**
 * scope/serviceIds tratados fora do update principal (CouponService não
 * aceita "substituir todos os vínculos" como um nested update único) —
 * mesmo padrão non-transacional de updateStaff pra serviceIds de Staff
 * (deleteMany + createMany sequenciais, risco de não-atomicidade já aceito
 * ali pro caso análogo).
 */
export async function updateCoupon(
  id: string,
  data: Partial<{
    code: string;
    type: CouponType;
    value: number;
    validFrom: Date | null;
    validUntil: Date | null;
    maxRedemptions: number | null;
    isActive: boolean;
    scope: CouponScope;
    serviceIds: string[];
  }>,
) {
  const organizationId = requireTenantId();
  const { serviceIds, ...rest } = data;
  const coupon = await db.coupon.update({
    where: { id },
    data: { ...rest, code: rest.code?.trim().toUpperCase() },
  });
  if (serviceIds) {
    await db.couponService.deleteMany({ where: { couponId: id } });
    if (serviceIds.length) {
      await db.couponService.createMany({
        data: [...new Set(serviceIds)].map((serviceId) => ({ organizationId, couponId: id, serviceId })),
      });
    }
  }
  return coupon;
}

export function deleteCoupon(id: string) {
  return db.coupon.delete({ where: { id } });
}
