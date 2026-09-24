import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Autoriza upload de foto de referência pra um Booking específico sem
 * exigir sessão (cliente final de agendamento público é anônimo). Token
 * curto, assinado com BETTER_AUTH_SECRET (mesmo padrão de hashIpAddress em
 * lib/rate-limit.ts), amarrado ao bookingId -- sem ele, dá pra enviar foto
 * pra reserva de outra pessoa só adivinhando o ID (IDOR). Expira em 15min:
 * tempo de sobra pra terminar o wizard, curto o bastante pra não valer a
 * pena forçar.
 */
const TOKEN_TTL_MS = 15 * 60 * 1000;

function sign(bookingId: string, expiresAt: number): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET não configurado");
  return createHmac("sha256", secret)
    .update(`${bookingId}:${expiresAt}`)
    .digest("hex");
}

export function createBookingUploadToken(bookingId: string): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  return { token: sign(bookingId, expiresAt), expiresAt };
}

export function verifyBookingUploadToken(
  bookingId: string,
  expiresAt: number,
  token: string,
): boolean {
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expected = Buffer.from(sign(bookingId, expiresAt));
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
