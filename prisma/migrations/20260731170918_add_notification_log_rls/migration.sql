-- RLS pra notificationLog, mesmo padrão de 20260722103200_add_quote_request_rls —
-- grants pra app_runtime já vieram automáticos via ALTER DEFAULT PRIVILEGES
-- daquela migração, então aqui só falta habilitar RLS e a política.
--
-- Tabela append-only (mesmo padrão de auditLog/tenantSettings em
-- 20260720120000_add_rls_policies): a aplicação nunca dá UPDATE/DELETE
-- nela, então a role de runtime também não pode -- defesa em profundidade
-- além do RLS.
REVOKE UPDATE, DELETE ON "notificationLog" FROM app_runtime;

ALTER TABLE "notificationLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "notificationLog"
  USING ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
