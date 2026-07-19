import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Guard do /superadmin — chamado no layout E em cada página (layout do
 * Next.js não é fronteira de auth suficiente sozinho: pode ser bypassado
 * por navegação parcial/prefetch em edge cases).
 *
 * TODO: superadmin ainda não exige MFA fora do /dashboard (o enforcement em
 * app/dashboard/layout.tsx não cobre estas rotas) — gap conhecido, aceito
 * no v1 por consistência com a página de filas pré-existente.
 */
export async function requireSuperadmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "superadmin") redirect("/");
  return session;
}
