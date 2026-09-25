"use server";

import { staffActionClient } from "@/lib/safe-action";
import { getDashboardMetrics } from "@/lib/services/dashboard-metrics-service";
import { z } from "zod";

// booking:["read"] (não "read_own"): getDashboardMetrics agrega receita e
// contagens do TENANT INTEIRO, sem escopo de staffId nenhum (ver
// lib/services/dashboard-metrics-service.ts) — "read_own" é o que
// "professional" também tem (lib/auth/permissions.ts), e permitiria a um
// professional invocar esta action diretamente (POST) e ler a receita
// completa da barbearia, mesmo sem nunca alcançar a página que a exibe
// (dashboard/page.tsx redireciona não-owner/manager pra /dashboard/agenda
// — só a UI, não o endpoint). Achado de auditoria da Sprint 2.
export const getDashboardMetricsAction = staffActionClient({ booking: ["read"] })
  .inputSchema(z.object({ range: z.union([z.literal(1), z.literal(7), z.literal(30), z.literal(90)]) }))
  .action(async ({ parsedInput, ctx }) => getDashboardMetrics(ctx.organization.timezone, parsedInput.range));
