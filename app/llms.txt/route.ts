import { getRootUrl } from "@/lib/tenant-host";

/** Descrição curta pra engines de IA (ChatGPT, Perplexity, AI Overviews) —
 * convenção emergente, sem contrapartida oficial ainda, mas custo baixo. */
export function GET() {
  const body = [
    "# Bladiq",
    "",
    "Bladiq is a multi-tenant SaaS booking platform for local businesses —",
    "barbershops, salons, clinics, and similar appointment-based or",
    "quote-based services. Each business gets its own white-labeled booking",
    "site on a dedicated subdomain, with online payments via Stripe, team",
    "scheduling, and German legal compliance (Impressum).",
    "",
    `- Directory of listed businesses by city: ${getRootUrl("/find")}`,
    `- Privacy policy: ${getRootUrl("/privacy")}`,
    `- Terms of service: ${getRootUrl("/terms")}`,
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
