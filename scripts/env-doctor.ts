import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED = [
  "DATABASE_URL",
  "RUNTIME_DATABASE_URL",
  "REDIS_URL",
  "TRUSTED_PROXY_IP_HEADER",
  "HEALTHCHECK_SECRET",
  "CONSENT_IP_HASH_SECRET",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_ROOT_DOMAIN",
] as const;

const SECRET_MIN_32 = [
  "BETTER_AUTH_SECRET",
  "HEALTHCHECK_SECRET",
  "CONSENT_IP_HASH_SECRET",
] as const;

const UNUSED_PATTERNS = [
  /^OPENAI_API_KEY$/,
  /^UPLOADTHING_/,
  /^REDIS_KV_/,
  /^CLOUDINARY_URL$/,
];

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function inspectEnv(content: string): {
  errors: string[];
  warnings: string[];
} {
  const occurrences = new Map<string, string[]>();
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const values = occurrences.get(key!) ?? [];
    values.push(unquote(rawValue!));
    occurrences.set(key!, values);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, values] of occurrences) {
    if (values.length > 1)
      errors.push(`${key}: definido ${values.length} vezes`);
    if (UNUSED_PATTERNS.some((pattern) => pattern.test(key))) {
      warnings.push(`${key}: não é usado pelo código atual`);
    }
  }

  for (const key of REQUIRED) {
    const value = occurrences.get(key)?.at(-1);
    if (!value) errors.push(`${key}: ausente ou vazio`);
  }

  for (const key of SECRET_MIN_32) {
    const value = occurrences.get(key)?.at(-1) ?? "";
    if (value.length > 0 && value.length < 32) {
      errors.push(`${key}: deve ter pelo menos 32 caracteres`);
    }
    if (/replace|generate|change[_-]?me|secret/i.test(value)) {
      errors.push(`${key}: ainda contém um placeholder previsível`);
    }
  }

  const proxyHeader = occurrences.get("TRUSTED_PROXY_IP_HEADER")?.at(-1);
  if (
    proxyHeader &&
    !["x-real-ip", "cf-connecting-ip", "x-forwarded-for"].includes(
      proxyHeader,
    )
  ) {
    errors.push(
      "TRUSTED_PROXY_IP_HEADER: use x-real-ip localmente, x-forwarded-for na Vercel sem Cloudflare, ou cf-connecting-ip atrás do Cloudflare",
    );
  }

  const redisUrl = occurrences.get("REDIS_URL")?.at(-1);
  const appUrl = occurrences.get("NEXT_PUBLIC_APP_URL")?.at(-1);
  if (
    appUrl?.includes("lvh.me") &&
    redisUrl &&
    !redisUrl.includes("localhost")
  ) {
    warnings.push("REDIS_URL: ambiente local parece estar usando Redis remoto");
  }

  for (const key of [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_BILLING_WEBHOOK_SECRET",
    "STRIPE_CONNECT_WEBHOOK_SECRET",
    "RESEND_API_KEY",
  ]) {
    if (!occurrences.get(key)?.at(-1)) {
      warnings.push(`${key}: integração correspondente não poderá ser testada`);
    }
  }

  return { errors, warnings };
}

function main() {
  const envPath = path.resolve(process.argv[2] ?? ".env");
  if (!fs.existsSync(envPath)) {
    console.error(`ERRO: ${path.basename(envPath)} não encontrado`);
    process.exitCode = 1;
    return;
  }

  const result = inspectEnv(fs.readFileSync(envPath, "utf8"));
  for (const warning of result.warnings) console.warn(`AVISO: ${warning}`);
  for (const error of result.errors) console.error(`ERRO: ${error}`);

  if (result.errors.length > 0) {
    console.error(
      `Ambiente inválido: ${result.errors.length} erro(s), valores não exibidos.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Ambiente válido (${result.warnings.length} aviso(s)); valores não exibidos.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main();
}
