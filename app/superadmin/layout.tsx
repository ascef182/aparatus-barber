import Link from "next/link";
import { requireSuperadmin } from "./_lib/require-superadmin";

// Área interna do dono da plataforma — single-locale (pt), sem next-intl,
// seguindo o precedente de app/superadmin/queues/page.tsx.
export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperadmin();

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
