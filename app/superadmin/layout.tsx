import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SecuritySection } from "@/app/(protected)/dashboard/settings/security-section";
import { requireSuperadmin } from "./_lib/require-superadmin";

// Área interna do dono da plataforma — single-locale (pt), sem next-intl,
// seguindo o precedente de app/superadmin/queues/page.tsx.
export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperadmin();

  // MFA obrigatório sem grace period (diferente de owner em
  // dashboard/layout.tsx): superadmin é o maior privilégio da plataforma
  // (acesso cross-tenant, impersonation, audit log de todos os tenants) —
  // sem a fricção de onboarding de massa que justifica o prazo de 14 dias
  // pra owner, então não há razão pra tolerar a mesma janela de exposição
  // aqui. Bloqueia a UI em vez de redirect: reaproveita o SecuritySection
  // já usado por owners (mesmo fluxo testado), sem risco de redirect loop.
  if (!session.user.twoFactorEnabled) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 pt-16 text-center">
        <ShieldAlert className="size-8 text-amber-600" />
        <h1 className="text-lg font-semibold">Autenticação em duas etapas obrigatória</h1>
        <p className="text-sm text-muted-foreground">
          Contas superadmin exigem 2FA ativado antes de acessar a área administrativa da plataforma.
        </p>
        <SecuritySection twoFactorEnabled={false} />
        <Link href="/superadmin" className="text-sm underline">
          Já ativei — continuar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center gap-6 border-b pb-4">
        <h1 className="text-lg font-semibold">Superadmin</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/superadmin" className="hover:underline">
            Visão geral
          </Link>
          <Link href="/superadmin/queues" className="hover:underline">
            Filas
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
