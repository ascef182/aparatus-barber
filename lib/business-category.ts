import type { BusinessCategory } from "@/generated/prisma/client";

/**
 * Categorias que não funcionam por horário fixo — o motor de
 * disponibilidade/Booking assume slot marcado, o que não faz sentido pra
 * eletricista/pedreiro (o serviço em si depende de orçamento prévio, não
 * de agenda). Essas categorias usam QuoteRequest em vez de Booking.
 */
const QUOTE_BASED_CATEGORIES: readonly BusinessCategory[] = ["ELECTRICIAN", "CONSTRUCTION"];

export function isQuoteBasedCategory(category: BusinessCategory): boolean {
  return QUOTE_BASED_CATEGORIES.includes(category);
}
