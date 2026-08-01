import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { logger } from "@/lib/logger";
import { getIpFromRequest } from "@/lib/rate-limit";

const { GET: authGet, POST: authPost } = toNextJsHandler(auth.handler);

// Mesma extração de IP de lib/rate-limit.ts#getClientIp, mas direto do
// Request em vez de next/headers: um Route Handler já recebe o Request,
// e next/headers só funciona dentro do request-scope que o próprio Next.js
// monta ao invocar este handler -- chamar a função exportada diretamente
// (como um teste faz) lança "headers was called outside a request scope".
/**
 * O rate limit nativo do Better Auth (lib/auth.ts `rateLimit.customRules`,
 * cobre /sign-in/email, /sign-up/email, /request-password-reset) decide e
 * retorna o 429 dentro do próprio `onRequest` do router interno, antes de
 * qualquer hook de plugin (`onRequest`/`onResponse`) rodar -- não existe
 * ponto de interceptação público do Better Auth pra essas negações (ver
 * lib/rate-limit.ts). Único jeito limpo de observar: checar o status da
 * Response aqui, na borda HTTP.
 */
function logIfRateLimited(request: Request, response: Response) {
  if (response.status === 429) {
    const { pathname } = new URL(request.url);
    logger({ authPath: pathname, ip: getIpFromRequest(request) }).warn(
      {},
      "rate_limit.denied",
    );
  }
}

export async function GET(request: Request) {
  const response = await authGet(request);
  logIfRateLimited(request, response);
  return response;
}

export async function POST(request: Request) {
  const response = await authPost(request);
  logIfRateLimited(request, response);
  return response;
}
