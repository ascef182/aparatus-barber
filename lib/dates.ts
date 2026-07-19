import { TZDate } from "@date-fns/tz";

/**
 * ÚNICO ponto de conversão entre timezone do tenant e UTC (plano §7).
 * Banco e APIs internas falam apenas UTC; conversão só nas bordas.
 * Proibido usar `new Date(string)` / `setHours` para horários de tenant
 * fora deste módulo.
 */

/** "2026-07-15" + "09:30" no tz do tenant -> instante UTC. */
export function tenantTimeToUtc(
  dateISO: string,
  time: string,
  timezone: string,
): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const zoned = new TZDate(year!, month! - 1, day!, hour!, minute!, timezone);
  return new Date(zoned.getTime());
}

/** Início do dia (00:00) do tenant em UTC. */
export function tenantDayStartUtc(dateISO: string, timezone: string): Date {
  return tenantTimeToUtc(dateISO, "00:00", timezone);
}

/** Dia seguinte às 00:00 do tenant em UTC (fim exclusivo do dia). */
export function tenantDayEndUtc(dateISO: string, timezone: string): Date {
  const start = new TZDate(tenantDayStartUtc(dateISO, timezone), timezone);
  const next = new TZDate(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1,
    0,
    0,
    timezone,
  );
  return new Date(next.getTime());
}

/** Weekday (0=domingo..6=sábado) de uma data civil no tz do tenant. */
export function tenantWeekday(dateISO: string, timezone: string): number {
  return new TZDate(
    tenantDayStartUtc(dateISO, timezone),
    timezone,
  ).getDay();
}

/** Instante UTC -> "HH:mm" no tz do tenant (exibição). */
export function formatTimeInTenantTz(date: Date, timezone: string): string {
  const zoned = new TZDate(date, timezone);
  return `${String(zoned.getHours()).padStart(2, "0")}:${String(
    zoned.getMinutes(),
  ).padStart(2, "0")}`;
}

/** Instante UTC -> "YYYY-MM-DD" no tz do tenant. */
export function formatDateInTenantTz(date: Date, timezone: string): string {
  const zoned = new TZDate(date, timezone);
  return `${zoned.getFullYear()}-${String(zoned.getMonth() + 1).padStart(2, "0")}-${String(
    zoned.getDate(),
  ).padStart(2, "0")}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Sobreposição de intervalos semiabertos [aStart,aEnd) x [bStart,bEnd). */
export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
