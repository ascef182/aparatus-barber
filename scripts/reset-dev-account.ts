/**
 * Dev-only: wipes one test user + organization (and every cascaded row)
 * from the local database so onboarding can be redone from scratch.
 *
 * Usage:
 *   tsx scripts/reset-dev-account.ts --email=owner@example.com --yes
 *   tsx scripts/reset-dev-account.ts --slug=my-barbershop --yes
 *
 * Without --yes it only prints what WOULD be deleted (dry run).
 * Refuses to run against anything that doesn't look like a local DB unless
 * --force is also passed.
 */
import { prisma } from "@/lib/prisma";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  return match?.slice(prefix.length);
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  const looksLocal = /localhost|127\.0\.0\.1|::1/i.test(url);
  if (!looksLocal && !flag("force")) {
    throw new Error(
      `DATABASE_URL não parece apontar para um banco local (${url.replace(/:[^:@]*@/, ":***@")}). ` +
        "Passe --force se tiver certeza de que quer rodar mesmo assim.",
    );
  }
}

async function resolveTarget(email?: string, slug?: string) {
  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;
  if (email && !user) {
    throw new Error(`Nenhum User encontrado com email ${email}.`);
  }

  let organization = slug
    ? await prisma.organization.findUnique({ where: { slug } })
    : null;
  if (!organization && user) {
    const ownerMembership = await prisma.member.findFirst({
      where: { userId: user.id, role: "owner" },
    });
    if (ownerMembership) {
      organization = await prisma.organization.findUnique({
        where: { id: ownerMembership.organizationId },
      });
    }
  }
  if (slug && !organization) {
    throw new Error(`Nenhuma Organization encontrada com slug ${slug}.`);
  }

  return { user, organization };
}

async function main() {
  const email = arg("email");
  const slug = arg("slug");
  if (!email && !slug) {
    throw new Error("Passe --email=<email> e/ou --slug=<slug>.");
  }

  assertLocalDatabase();

  const { user, organization } = await resolveTarget(email, slug);
  if (!user && !organization) {
    throw new Error("Nada encontrado para os parâmetros informados.");
  }

  const bookingCount = organization
    ? await prisma.booking.count({ where: { organizationId: organization.id } })
    : 0;

  console.log("Alvo do reset:");
  console.log(`  User:         ${user ? `${user.email} (${user.id})` : "-"}`);
  console.log(
    `  Organization: ${organization ? `${organization.slug} (${organization.id})` : "-"}`,
  );
  console.log(`  Bookings a apagar: ${bookingCount}`);

  if (!flag("yes")) {
    console.log("\nDry run — nada foi apagado. Rode novamente com --yes para confirmar.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (organization) {
      // Ordem importa: Booking bloqueia (RESTRICT) o delete da Organization;
      // TenantImpressum não tem FK e não é apagado em cascata.
      await tx.booking.deleteMany({ where: { organizationId: organization.id } });
      await tx.tenantImpressum.deleteMany({ where: { organizationId: organization.id } });
      await tx.auditLog.deleteMany({ where: { organizationId: organization.id } });
      // Cascata: Member, Invitation, Location, Staff, Service, Customer, TenantSettings.
      await tx.organization.delete({ where: { id: organization.id } });
    }
    if (user) {
      // Cascata: Session, Account, TwoFactor (e Member/Invitation restantes).
      await tx.user.delete({ where: { id: user.id } });
    }
  });

  console.log("\nReset concluído.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
