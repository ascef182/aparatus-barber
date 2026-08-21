"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

let agentPromise: ReturnType<typeof FingerprintJS.load> | null = null;

/**
 * Sinal de fraude best-effort (open source, sem API key, sem rede) — nunca
 * deve bloquear signup/checkout, por isso qualquer falha retorna null em vez
 * de propagar o erro.
 */
export async function getVisitorId(): Promise<string | null> {
  try {
    agentPromise ??= FingerprintJS.load();
    const agent = await agentPromise;
    const result = await agent.get();
    return result.visitorId;
  } catch {
    return null;
  }
}
