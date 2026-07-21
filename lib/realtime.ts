/** Intervalos de polling do dashboard (React Query) — um lugar só pra
 * ajustar sem caçar `refetchInterval` espalhado pelos componentes. */
export const POLL_INTERVAL_MS = {
  agenda: 15_000,
  overview: 45_000,
} as const;
