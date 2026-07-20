/**
 * Promove (ou revoga) o papel de superadmin da plataforma de um usuário
 * existente — dá acesso ao /superadmin e ao platformAdminActionClient.
 *
 * Usage:
 *   tsx scripts/make-superadmin.ts --email=you@example.com --yes
 *   tsx scripts/make-superadmin.ts --email=you@example.com --revoke --yes
 *
 * Sem --yes só imprime o que FARIA (dry run). Recusa rodar contra banco que
 * não pareça local, a menos que --force seja passado.
 *
 * A sessão do Better Auth cacheia o user: depois de mudar o role, deslogue
 * e logue de novo para o guard do /superadmin enxergar a mudança.
 */
import "dotenv/config";
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

async function main() {
  const email = arg("email");
  if (!email) {
    throw new Error("Passe --email=<email>.");
  }

  assertLocalDatabase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Nenhum User encontrado com email ${email}.`);
  }

  const revoke = flag("revoke");
  const nextRole = revoke ? null : "superadmin";

  console.log(`User:        ${user.email} (${user.id})`);
  console.log(`Role atual:  ${user.role ?? "-"}`);
  console.log(`Role novo:   ${nextRole ?? "-"}`);

  if (!flag("yes")) {
    console.log("\nDry run — nada foi alterado. Rode novamente com --yes para confirmar.");
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: nextRole } });

  console.log(`\n${revoke ? "Superadmin revogado" : "Superadmin concedido"}.`);
  console.log("Deslogue e logue de novo para a sessão refletir o novo role.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
