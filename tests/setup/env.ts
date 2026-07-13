import { inject } from "vitest";

// Roda antes do import dos arquivos de teste: o singleton lib/prisma lê
// DATABASE_URL no import, então precisa apontar para o container antes.
process.env.DATABASE_URL = inject("databaseUrl");
