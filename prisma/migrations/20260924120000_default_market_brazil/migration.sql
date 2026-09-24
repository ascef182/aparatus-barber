-- Pivô de mercado default: Europa (DACH) -> Brasil.
-- Só troca o DEFAULT de colunas para novas linhas (novas orgs/services/
-- bookings/locations criadas a partir de agora). Linhas existentes mantêm
-- seus valores atuais (ex.: currency = 'EUR' em orgs/bookings antigos) --
-- não é um backfill, é só o valor assumido quando nada é informado.

-- AlterTable
ALTER TABLE "service" ALTER COLUMN "currency" SET DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "booking" ALTER COLUMN "currency" SET DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "organization" ALTER COLUMN "timezone" SET DEFAULT 'America/Sao_Paulo';
ALTER TABLE "organization" ALTER COLUMN "defaultLocale" SET DEFAULT 'pt';
ALTER TABLE "organization" ALTER COLUMN "currency" SET DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "location" ALTER COLUMN "countryCode" SET DEFAULT 'BR';

-- AlterTable
ALTER TABLE "tenantImpressum" ALTER COLUMN "country" SET DEFAULT 'BR';
