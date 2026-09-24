import { randomUUID, createHmac } from "node:crypto";
import { afterAll, describe, expect, test } from "vitest";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Cobre o contrato de servidor que app/sign-in/sign-in-form.tsx (e as duas
 * outras telas de login) dependem para funcionar com 2FA ativo:
 * signIn.email() NÃO retorna erro quando a conta tem TOTP habilitado — ele
 * devolve { twoFactorRedirect: true } sem criar sessão, e só o POST em
 * /two-factor/verify-totp (com o cookie temporário) completa o login. Antes
 * do fix em two-factor-verify-form.tsx, os forms ignoravam esse campo e
 * recarregavam sem sessão nenhuma.
 *
 * Cria usuário + credential account direto via Prisma (em vez de
 * signUp.email) para não depender do envio real de e-mail de verificação
 * (Resend) nem da rede em teste.
 */

const email = `totp-${randomUUID()}@example.com`;
const password = "Sup3rSecret!23";
let userId = "";

function cookieHeaderFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((raw) => raw.split(";")[0])
    .join("; ");
}

// Mesmo algoritmo usado por @better-auth/utils/otp (HOTP RFC 4226, SHA-1,
// contador = floor(epoch / period)) — replicado aqui só pra gerar o código
// esperado a partir do secret devolvido no totpURI, sem depender de import
// de subpath que não é dependência direta deste projeto.
function totpFromUri(totpURI: string): string {
  const secretParam = new URL(totpURI).searchParams.get("secret");
  if (!secretParam) throw new Error("totpURI sem parâmetro secret");
  const secretBytes = base32Decode(secretParam);
  const period = 30;
  const digits = 6;
  const counter = Math.floor(Date.now() / 1000 / period);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secretBytes).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const truncated =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (truncated % 10 ** digits).toString().padStart(digits, "0");
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Decode(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of input.replace(/=+$/, "").toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

afterAll(async () => {
  if (userId) {
    await prisma.twoFactor.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("login com TOTP ativo", () => {
  test("signIn.email não cria sessão (twoFactorRedirect); verify-totp com o cookie temporário completa o login", async () => {
    userId = randomUUID();
    await prisma.user.create({
      data: { id: userId, name: "TOTP Test", email, emailVerified: true },
    });
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId,
        providerId: "credential",
        accountId: userId,
        password: await hashPassword(password),
      },
    });

    const signInResponse = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
    const enrollSessionCookie = cookieHeaderFrom(signInResponse);
    expect((await signInResponse.json()).user.id).toBe(userId);

    const enableResponse = await auth.api.enableTwoFactor({
      body: { password },
      headers: new Headers({ cookie: enrollSessionCookie }),
      asResponse: true,
    });
    expect(enableResponse.status).toBeLessThan(300);
    const { totpURI } = (await enableResponse.json()) as { totpURI: string };

    const confirmResponse = await auth.api.verifyTOTP({
      body: { code: totpFromUri(totpURI) },
      headers: new Headers({ cookie: enrollSessionCookie }),
      asResponse: true,
    });
    expect(confirmResponse.status).toBeLessThan(300);

    // Login "de verdade" (nova sessão, mesmo padrão de um novo dispositivo
    // ou sessão expirada): este era o caminho quebrado.
    const freshSignIn = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
    expect(freshSignIn.status).toBeLessThan(300);
    const freshSignInBody = (await freshSignIn.json()) as { twoFactorRedirect?: boolean };
    expect(freshSignInBody.twoFactorRedirect).toBe(true);

    const twoFactorCookie = cookieHeaderFrom(freshSignIn);
    expect(twoFactorCookie).not.toBe("");

    // Sem sessão completa ainda — é exatamente essa lacuna que os forms de
    // login ignoravam antes do fix.
    const sessionBeforeVerify = await auth.api.getSession({
      headers: new Headers({ cookie: twoFactorCookie }),
    });
    expect(sessionBeforeVerify).toBeNull();

    const verifyResponse = await auth.api.verifyTOTP({
      body: { code: totpFromUri(totpURI) },
      headers: new Headers({ cookie: twoFactorCookie }),
      asResponse: true,
    });
    expect(verifyResponse.status).toBeLessThan(300);
    const fullSessionCookie = cookieHeaderFrom(verifyResponse);

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: fullSessionCookie }),
    });
    expect(session?.user.id).toBe(userId);
    expect(session?.user.twoFactorEnabled).toBe(true);
  });
});
