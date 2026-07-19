import { bookingRulesV1Schema, type BookingRulesV1 } from "./v1";

export const CURRENT_SETTINGS_VERSION = 1;

export type ResolvedRules = BookingRulesV1;

/**
 * Parseia settings persistidos de qualquer versão para a versão atual.
 * Ao criar v2: adicionar migrate(v1 -> v2) aqui — tenant antigo nunca quebra.
 */
export function parseSettings(version: number, data: unknown): ResolvedRules {
  switch (version) {
    case 1:
      return bookingRulesV1Schema.parse(data ?? {});
    default:
      throw new Error(`Versão de settings desconhecida: ${version}`);
  }
}

/** Defaults completos (tenant sem settings salvos). */
export function defaultRules(): ResolvedRules {
  return bookingRulesV1Schema.parse({});
}
