import { inject } from "vitest";

// Roda antes do import dos arquivos de teste: o singleton lib/prisma lê
// RUNTIME_DATABASE_URL no import, então precisa apontar para o container
// antes. DATABASE_URL (role owner) continua disponível para código de
// teste que usa o client `prisma` cru diretamente.
process.env.DATABASE_URL = inject("databaseUrl");
process.env.RUNTIME_DATABASE_URL = inject("appRuntimeDatabaseUrl");
