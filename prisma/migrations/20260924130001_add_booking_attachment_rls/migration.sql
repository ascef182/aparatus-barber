-- RLS pra bookingAttachment, mesmo padrão de 20260731170918_add_notification_log_rls
-- (grants pra app_runtime já vieram automáticos via ALTER DEFAULT PRIVILEGES
-- de 20260720120000_add_rls_policies). Append-only por design: não existe
-- fluxo na aplicação que atualize ou apague uma linha (upload é write-once;
-- delete de anexo fica pra uma feature futura) -- revogado explicitamente
-- da role de runtime, mesma defesa em profundidade de auditLog/notificationLog.
REVOKE UPDATE, DELETE ON "bookingAttachment" FROM app_runtime;

ALTER TABLE "bookingAttachment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "bookingAttachment"
  USING ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("organizationId" = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
