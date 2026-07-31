-- RLS pra conversation/message/customerCoupon, mesmo padrão de
-- 20260720120000_add_rls_policies — grants pra app_runtime já vieram
-- automáticos via ALTER DEFAULT PRIVILEGES daquela migração, então aqui só
-- falta habilitar RLS e a política em cada tabela nova.
ALTER TABLE "conversation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "conversation"
  USING ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "message" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "message"
  USING ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "customerCoupon" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "customerCoupon"
  USING ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
