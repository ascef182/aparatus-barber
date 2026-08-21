import { db } from "@/lib/db";

/**
 * Asserção genérica de posse de recurso. Lança sempre com a mensagem dada
 * (nunca "sem permissão"/"forbidden") quando o registro não existe ou não
 * pertence a quem chamou — convenção do projeto para não confirmar a
 * outro usuário/tenant a existência de um recurso alheio (ver
 * cancel-my-booking.ts).
 */
export function assertOwned<T, K extends keyof T>(
  record: T | null | undefined,
  ownerField: K,
  expectedOwnerId: string,
  notFoundMessage: string,
  ErrorCtor: new (message: string) => Error = Error,
): asserts record is T {
  if (!record || record[ownerField] !== expectedOwnerId) {
    throw new ErrorCtor(notFoundMessage);
  }
}

/**
 * Resolve o Staff vinculado a um membership (o "próprio staff" de um
 * profissional), ou null se este membership não tem Staff vinculado.
 */
export async function getOwnStaffId(
  membershipId: string,
): Promise<string | null> {
  const staff = await db.staff.findFirst({
    where: { memberId: membershipId },
    select: { id: true },
  });
  return staff?.id ?? null;
}

/**
 * Restringe bookings a "próprio staff" para o papel "professional" — regra
 * que a RBAC (lib/auth/permissions.ts) não expressa: booking:update/cancel é
 * concedido a "professional" de forma ampla, e o "_own" do read_own é
 * responsabilidade desta checagem manual. No-op para os demais papéis
 * (manager/owner/receptionist têm acesso a todo o tenant, por design).
 *
 * Um membership "professional" sem Staff vinculado não é dono de nada
 * (fail-closed), nunca de tudo.
 *
 * `ErrorCtor` fica a cargo de quem chama (ex.: ActionError de
 * lib/safe-action.ts) — este módulo não depende de lib/safe-action.ts para
 * evitar import circular com services que o próprio safe-action.ts importa
 * (ex.: customer-service.ts).
 */
export async function assertOwnBookingAccess(
  booking: { staffId: string },
  membership: { id: string; role: string },
  notFoundMessage: string,
  ErrorCtor: new (message: string) => Error = Error,
): Promise<void> {
  if (membership.role !== "professional") return;
  const ownStaffId = await getOwnStaffId(membership.id);
  assertOwned(
    { staffId: ownStaffId },
    "staffId",
    booking.staffId,
    notFoundMessage,
    ErrorCtor,
  );
}
