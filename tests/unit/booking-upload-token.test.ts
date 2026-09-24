import { describe, expect, it } from "vitest";
import {
  createBookingUploadToken,
  verifyBookingUploadToken,
} from "@/lib/booking-upload-token";

process.env.BETTER_AUTH_SECRET ||= "test-secret-at-least-32-characters-long";

describe("booking upload token", () => {
  it("aceita um token recém-criado para o bookingId certo", () => {
    const { token, expiresAt } = createBookingUploadToken("booking-1");
    expect(verifyBookingUploadToken("booking-1", expiresAt, token)).toBe(true);
  });

  it("rejeita o token pra um bookingId diferente (IDOR)", () => {
    const { token, expiresAt } = createBookingUploadToken("booking-1");
    expect(verifyBookingUploadToken("booking-2", expiresAt, token)).toBe(false);
  });

  it("rejeita token expirado", () => {
    const { token } = createBookingUploadToken("booking-1");
    const expiredAt = Date.now() - 1;
    expect(verifyBookingUploadToken("booking-1", expiredAt, token)).toBe(false);
  });

  it("rejeita token adulterado", () => {
    const { expiresAt } = createBookingUploadToken("booking-1");
    expect(verifyBookingUploadToken("booking-1", expiresAt, "0".repeat(64))).toBe(
      false,
    );
  });

  it("rejeita expiresAt não numérico", () => {
    const { token } = createBookingUploadToken("booking-1");
    expect(verifyBookingUploadToken("booking-1", Number.NaN, token)).toBe(false);
  });
});
