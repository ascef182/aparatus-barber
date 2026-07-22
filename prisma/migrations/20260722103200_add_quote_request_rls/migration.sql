-- RLS pra quoteRequest, mesmo padrão de 20260720120000_add_rls_policies —
-- grants pra app_runtime já vieram automáticos via ALTER DEFAULT PRIVILEGES
-- daquela migração, então aqui só falta habilitar RLS e a política.
ALTER TABLE "quoteRequest" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "quoteRequest"
  USING ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
