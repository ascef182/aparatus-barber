import { describe, expect, test } from "vitest";
import { futureMondayISO, futureMondayAt } from "../helpers/future-date";

/**
 * Guarda contra a regressão que derrubou 8 testes de booking/cupom: o
 * fixture usava `const MONDAY = "2026-08-10"` e quebrou sozinho quando essa
 * data ficou no passado. Aqui varremos ~4 anos de "hoje" possíveis — se o
 * helper voltasse a produzir uma data fixa, ou uma que não é segunda, ou uma
 * fora da janela de antecedência, isso falha.
 */
describe("futureMondayISO", () => {
  const DAYS = 1500; // ~4 anos, cobre bissextos, viradas de ano e DST

  test("é sempre uma segunda-feira, entre 7 e 13 dias à frente", () => {
    const start = Date.UTC(2026, 0, 1);
    for (let i = 0; i < DAYS; i++) {
      const now = new Date(start + i * 86_400_000);
      const iso = futureMondayISO(now);

      const result = new Date(`${iso}T00:00:00.000Z`);
      expect(result.getUTCDay(), `${iso} deveria ser segunda`).toBe(1);

      const todayUtc = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      );
      const daysAhead = (result.getTime() - todayUtc) / 86_400_000;
      expect(daysAhead).toBeGreaterThanOrEqual(7);
      expect(daysAhead).toBeLessThanOrEqual(13);
      // maxAdvanceDays padrão = 60 (lib/rules/schemas/v1.ts)
      expect(daysAhead).toBeLessThan(60);
    }
  });

  test("não é uma constante — anda junto com o relógio", () => {
    const a = futureMondayISO(new Date("2026-03-02T12:00:00.000Z"));
    const b = futureMondayISO(new Date("2026-09-02T12:00:00.000Z"));
    expect(a).not.toBe(b);
  });

  test("futureMondayAt devolve a hora cheia em UTC no dia pedido", () => {
    const iso = futureMondayISO(new Date("2026-08-21T12:00:00.000Z"));
    const slot = futureMondayAt(9, iso);
    expect(slot.toISOString()).toBe(`${iso}T09:00:00.000Z`);
  });
});
