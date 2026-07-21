-- RLS defense-in-depth layer (plano de RLS, seção 4).
--
-- Deploy A: cria a role restrita `app_runtime` e as políticas de RLS, mas
-- SEM `FORCE ROW LEVEL SECURITY` -- a role owner (usada hoje pela aplicação)
-- continua sendo dona das tabelas e, por padrão do Postgres, ignora RLS.
-- Esta migração é portanto um no-op para a aplicação em produção até que
-- lib/prisma.ts passe a conectar como `app_runtime` (Deploy B, mudança de
-- código separada). Ver seção 4.5 do plano para o rollout completo em 3
-- deploys e a senha placeholder abaixo (nunca um segredo real em migração).

-- 1. Role restrita para todo tráfego de runtime (web + worker).
-- CREATE ROLE sem nenhum atributo elevado explícito já cria a role com os
-- defaults restritos do Postgres (NOSUPERUSER NOCREATEDB NOCREATEROLE
-- NOBYPASSRLS NOREPLICATION) -- não usamos ALTER ROLE para reafirmar isso
-- porque a cláusula SUPERUSER/NOSUPERUSER só pode ser alterada por quem já
-- é superuser, e a role owner usada para rodar migrações (ex.: Neon) não é
-- superuser de verdade, mesmo tendo CREATEROLE.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD 'app_runtime_change_me';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;

-- Tabelas append-only: a aplicação nunca dá UPDATE/DELETE nelas, então a
-- role de runtime também não pode -- defesa em profundidade além do RLS.
REVOKE UPDATE, DELETE ON "auditLog", "tenantSettings" FROM app_runtime;

-- Toda tabela criada por uma migração futura (via role owner) já nasce
-- com os grants corretos para app_runtime, sem depender de lembrar disso
-- em cada nova migração.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;

-- 2. Políticas de RLS.
--
-- GUCs de sessão usados pelas políticas:
--   app.tenant_id   -- organizationId do tenant atual (contexto "tenant")
--   app.bypass_rls  -- 'on' quando o contexto é "platform" (SuperAdmin/jobs)
-- Lidos via current_setting(nome, true): retorna NULL se nunca setados
-- nesta sessão/transação, o que faz a política falhar fail-closed por
-- padrão -- mesmo comportamento do MissingTenantContextError na camada de
-- aplicação (lib/db.ts).
--
-- Member/Invitation ficam de fora, por design: são geridos pelo plugin de
-- organização do Better Auth via prisma cru (mesma exceção já documentada
-- em lib/db.ts).

DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'location',
    'staff',
    'staffWorkingHours',
    'staffAbsence',
    'closedPeriod',
    'service',
    'serviceImage',
    'staffService',
    'customer',
    'coupon',
    'couponService',
    'booking',
    'tenantSettings',
    'tenantImpressum'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("organizationId" = current_setting(''app.tenant_id'', true) OR current_setting(''app.bypass_rls'', true) = ''on'')
         WITH CHECK ("organizationId" = current_setting(''app.tenant_id'', true) OR current_setting(''app.bypass_rls'', true) = ''on'')',
      tbl
    );
  END LOOP;
END
$$;

-- auditLog difere: organizationId é anulável (eventos de plataforma usam
-- NULL) -- essas linhas ficam invisíveis sob contexto de tenant, igual ao
-- comportamento já existente na camada de aplicação.
ALTER TABLE "auditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "auditLog"
  USING (
    ("organizationId" IS NOT NULL AND "organizationId" = current_setting('app.tenant_id', true))
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    ("organizationId" IS NOT NULL AND "organizationId" = current_setting('app.tenant_id', true))
    OR current_setting('app.bypass_rls', true) = 'on'
  );
