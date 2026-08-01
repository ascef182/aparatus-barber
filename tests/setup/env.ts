import { inject } from "vitest";

// Roda antes do import dos arquivos de teste: o singleton lib/prisma lê
// RUNTIME_DATABASE_URL no import, então precisa apontar para o container
// antes. DATABASE_URL (role owner) continua disponível para código de
// teste que usa o client `prisma` cru diretamente.
process.env.DATABASE_URL = inject("databaseUrl");
process.env.RUNTIME_DATABASE_URL = inject("appRuntimeDatabaseUrl");

// Vitest (via Vite) carrega o .env local pro process.env — sobrescreve aqui
// pra os testes não dependerem de qual valor o dev tem configurado
// localmente. tests/security/rate-limit.test.ts simula o proxy mandando
// x-forwarded-for, então é esse o header que getIpFromHeaders precisa
// confiar durante os testes (lib/rate-limit.ts).
process.env.TRUSTED_PROXY_IP_HEADER = "x-forwarded-for";
