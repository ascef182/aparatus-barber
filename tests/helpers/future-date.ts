/**
 * Segunda-feira futura (weekday=1, que é o dia coberto pelos fixtures de
 * staffWorkingHours) calculada em runtime, no timezone do tenant.
 *
 * Uma data literal aqui vence: `getAvailableSlots` recusa qualquer dia fora
 * da janela de antecedência (`lib/scheduling/availability.ts`), e
 * `createBooking` revalida contra ela antes de gravar — então um fixture com
 * data fixa derruba todo teste que passa por `createBooking` assim que a
 * data escolhida fica pra trás. Foi exatamente o que aconteceu com
 * `const MONDAY = "2026-08-10"` em 2026-08.
 *
 * O resultado fica entre 7 e 13 dias à frente: longe o bastante do
 * `minLeadTimeMinutes` (60min) e bem dentro do `maxAdvanceDays` (60 dias),
 * ambos em `lib/rules/schemas/v1.ts`.
 */
export function futureMondayISO(now: Date = new Date()): string {
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7),
  );
  // getUTCDay(): 0 = domingo, 1 = segunda.
  day.setUTCDate(day.getUTCDate() + ((1 - day.getUTCDay() + 7) % 7));
  return day.toISOString().slice(0, 10);
}

/**
 * Helper de slot: hora cheia em UTC no dia devolvido por `futureMondayISO`.
 * Mantido em UTC porque o tenant dos testes usa `Europe/Berlin` (UTC+1/+2) —
 * horas entre 8 e 17 UTC caem no meio do dia local em qualquer estação, sem
 * atravessar a fronteira do dia do tenant.
 */
export function futureMondayAt(hour: number, dateISO = futureMondayISO()) {
  return new Date(`${dateISO}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}
