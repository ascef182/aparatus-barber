/**
 * Dev-only (Windows): gerencia um bloco de entradas no arquivo hosts para que
 * o domínio raiz de dev (lvh.me) e os subdomínios de tenant resolvam para
 * 127.0.0.1 mesmo em redes cujo roteador tem proteção contra DNS-rebind
 * (ex.: Fritz!Box devolve NXDOMAIN para qualquer domínio público que aponte
 * para IP privado — sintoma no navegador: DNS_PROBE_FINISHED_NXDOMAIN).
 *
 * Usage:
 *   pnpm dev:hosts add <slug...>     # garante lvh.me + {slug}.lvh.me no hosts
 *   pnpm dev:hosts list              # mostra o bloco gerenciado atual
 *   pnpm dev:hosts remove <slug...>  # remove slugs; sem args remove o bloco todo
 *
 * O hosts do Windows não aceita wildcard (*.lvh.me) — cada slug de tenant
 * testado precisa da própria linha; rode `add` de novo a cada tenant novo.
 * Escrever no hosts exige Administrador: o script tenta primeiro escrever
 * direto e, se faltar permissão, auto-eleva via UAC só para a cópia final.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BEGIN_MARKER = "# >>> aparatus dev hosts (managed by scripts/dev-hosts.ts) >>>";
const END_MARKER = "# <<< aparatus dev hosts <<<";
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** "lvh.me:3000" -> "lvh.me" (o hosts não conhece portas). */
export function rootHostname(rootDomain: string): string {
  return rootDomain.replace(/:\d+$/, "").toLowerCase();
}

function eolOf(content: string): string {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function splitBlock(lines: string[]): { before: string[]; block: string[]; after: string[] } {
  const begin = lines.indexOf(BEGIN_MARKER);
  if (begin === -1) return { before: lines, block: [], after: [] };
  const end = lines.indexOf(END_MARKER, begin + 1);
  // END ausente (bloco corrompido/truncado): o bloco é sempre appendado por
  // este script no fim do arquivo, então descartar até o EOF é seguro.
  if (end === -1) return { before: lines.slice(0, begin), block: lines.slice(begin + 1), after: [] };
  return {
    before: lines.slice(0, begin),
    block: lines.slice(begin + 1, end),
    after: lines.slice(end + 1),
  };
}

/** Slugs atualmente no bloco gerenciado (a linha do próprio root não conta). */
export function parseManagedSlugs(content: string, root: string): string[] {
  const { block } = splitBlock(content.split(/\r?\n/));
  const slugs: string[] = [];
  for (const line of block) {
    const host = line.trim().split(/\s+/)[1]?.toLowerCase();
    if (host && host.endsWith(`.${root}`)) slugs.push(host.slice(0, -(root.length + 1)));
  }
  return [...new Set(slugs)].sort();
}

/**
 * Reescreve o hosts substituindo (ou removendo) o bloco gerenciado inteiro —
 * nunca duplica linhas. `slugs === null` remove o bloco; um array (mesmo
 * vazio) gera o bloco com a linha do root + uma por slug, ordenadas.
 */
export function renderHosts(content: string, root: string, slugs: string[] | null): string {
  const eol = eolOf(content);
  const { before, after } = splitBlock(content.split(/\r?\n/));
  const kept = [...before, ...after];
  while (kept.length > 0 && kept[kept.length - 1]!.trim() === "") kept.pop();

  const lines = [...kept];
  if (slugs !== null) {
    const unique = [...new Set(slugs)].sort();
    lines.push(
      "",
      BEGIN_MARKER,
      `127.0.0.1 ${root}`,
      ...unique.map((slug) => `127.0.0.1 ${slug}.${root}`),
      END_MARKER,
    );
  }
  lines.push("");
  return lines.join(eol);
}

function hostsPath(): string {
  if (process.platform !== "win32") return "/etc/hosts";
  return path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "drivers", "etc", "hosts");
}

function printBlock(root: string, slugs: string[] | null) {
  if (slugs === null) {
    console.log("Nenhum bloco gerenciado no hosts.");
    return;
  }
  console.log(`Bloco gerenciado (${hostsPath()}):`);
  console.log(`  127.0.0.1 ${root}`);
  for (const slug of slugs) console.log(`  127.0.0.1 ${slug}.${root}`);
}

function flushDns() {
  if (process.platform !== "win32") return;
  // Pode falhar sem admin em algumas configurações — não é fatal.
  spawnSync("ipconfig", ["/flushdns"], { stdio: "ignore" });
}

/** Escrita elevada: UAC só para copiar o arquivo pronto por cima do hosts. */
function writeElevated(target: string, newContent: string) {
  const tmp = path.join(os.tmpdir(), `aparatus-dev-hosts-${Date.now()}.txt`);
  fs.writeFileSync(tmp, newContent);
  console.log("Sem permissão para escrever no hosts — pedindo elevação (UAC)...");
  try {
    spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile','-Command','Copy-Item -Force "${tmp}" "${target}"; ipconfig /flushdns | Out-Null'`,
      ],
      { stdio: "ignore" },
    );
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function usage() {
  console.log("Usage:");
  console.log("  pnpm dev:hosts add <slug...>     adiciona {slug}.<root> (e o root) ao hosts");
  console.log("  pnpm dev:hosts list              mostra o bloco gerenciado");
  console.log("  pnpm dev:hosts remove [slug...]  remove slugs; sem args remove o bloco todo");
}

function main() {
  const [command, ...slugArgs] = process.argv.slice(2);
  const root = rootHostname(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "lvh.me:3000");
  const slugs = slugArgs.map((s) => s.toLowerCase());
  const invalid = slugs.filter((s) => !SLUG_PATTERN.test(s));
  if (invalid.length > 0) {
    throw new Error(`Slug(s) inválido(s): ${invalid.join(", ")} (use letras minúsculas, números e hífens).`);
  }

  const target = hostsPath();
  const content = fs.readFileSync(target, "utf8");
  const hasBlock = content.includes(BEGIN_MARKER);
  const current = parseManagedSlugs(content, root);

  let next: string[] | null;
  if (command === "list") {
    printBlock(root, hasBlock ? current : null);
    return;
  } else if (command === "add") {
    if (slugs.length === 0) throw new Error("Passe pelo menos um slug: pnpm dev:hosts add <slug>");
    next = [...new Set([...current, ...slugs])].sort();
  } else if (command === "remove") {
    next = slugs.length === 0 ? null : current.filter((s) => !slugs.includes(s));
  } else {
    usage();
    process.exitCode = command ? 1 : 0;
    return;
  }

  const updated = renderHosts(content, root, next);
  if (updated === content) {
    console.log("hosts já configurado — nada a fazer.");
    printBlock(root, next);
    return;
  }

  try {
    fs.writeFileSync(target, updated);
    flushDns();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EPERM" && code !== "EACCES") throw error;
    writeElevated(target, updated);
  }

  // Confere se a escrita (direta ou elevada) de fato aconteceu — o usuário
  // pode ter cancelado o prompt de UAC.
  if (fs.readFileSync(target, "utf8") !== updated) {
    console.error("O hosts não foi alterado (UAC cancelado?).");
    console.error("Abra um terminal como Administrador e rode o comando novamente.");
    process.exitCode = 1;
    return;
  }

  console.log("hosts atualizado.");
  printBlock(root, next);
  console.log("");
  console.log("Se o navegador ainda não resolver:");
  console.log('  - Chrome/Firefox com "DNS seguro" (DoH) ativo ignoram o hosts — desative ou adicione exceção.');
  console.log("  - Chrome: chrome://net-internals/#dns -> Clear host cache.");
}

const isDirectRun =
  !!process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
