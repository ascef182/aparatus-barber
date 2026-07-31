# Backup e restore do Postgres — runbook

**Status:** procedimento verificado localmente (2026-07-31) contra `postgres:16-alpine` (mesma imagem do `docker-compose.yml`) — ainda falta rodar uma vez de verdade contra a instância da Railway (não tenho acesso às credenciais de produção a partir daqui).

## O que foi verificado

Rodada completa de dump → restore → verificação, num banco descartável, sem tocar no banco de dev original:

1. `pg_dump -Fc` (formato custom, comprime e permite restore seletivo) do banco `aparatus`.
2. `pg_restore` num banco novo e vazio (`aparatus_restore_test`), na mesma instância Postgres.
3. Conferido: contagem de tabelas idêntica (31/31), uma linha marcadora sobrevive ao ciclo completo, `prisma migrate status` reconhece o banco restaurado como "up to date" sem rodar nenhuma migration de novo (a tabela `_prisma_migrations` também é restaurada).
4. Conferido que a role `app_runtime` (restrita, sob RLS — ver `prisma/migrations/20260720120000_add_rls_policies`) consegue conectar e consultar o banco restaurado exatamente como em produção.

**Achado importante:** `pg_restore --no-owner --no-privileges` (opção comum em tutoriais genéricos, pra evitar erro de role/ownership) **quebra a aplicação** depois do restore — ela remove os grants de `app_runtime` nas tabelas, então toda query do app volta com "permission denied" até alguém re-conceder os grants manualmente. **Não usar essas duas flags** — como a role `app_runtime` já existe no cluster de destino (grants são por role, não por dump), o restore sem essas flags preserva os grants corretos automaticamente. Confirmado nos dois cenários acima.

## Procedimento (Railway)

### Backup

Railway faz snapshot automático do Postgres gerenciado, mas o passo abaixo é o backup manual/portátil (o que este runbook testa) — útil pra restaurar fora da Railway também, ou como segunda camada além do snapshot automático.

```bash
# DATABASE_URL da Railway (role owner, não a app_runtime) — pegar no
# dashboard do serviço Postgres, aba "Connect".
railway run --service postgres pg_dump -Fc "$DATABASE_URL" -f backup-$(date +%Y%m%d).dump
```

Ou, sem o Railway CLI, direto com a connection string (encontrada no dashboard):

```bash
pg_dump -Fc "postgresql://postgres:<senha>@<host>.railway.app:<porta>/railway" -f backup-$(date +%Y%m%d).dump
```

### Restore (drill — banco de teste, nunca direto em produção)

```bash
# 1. Criar um banco novo (Railway: novo serviço Postgres, ou localmente
#    via docker exec, como verificado acima).
createdb -h <host> -U postgres -p <porta> aparatus_restore_drill

# 2. Restaurar SEM --no-owner e SEM --no-privileges.
pg_restore -h <host> -U postgres -p <porta> -d aparatus_restore_drill backup-YYYYMMDD.dump

# 3. Confirmar que o schema bate com o histórico de migrations do repo.
DATABASE_URL="postgresql://postgres:<senha>@<host>:<porta>/aparatus_restore_drill" \
  pnpm exec prisma migrate status
# Esperado: "Database schema is up to date!" sem aplicar nada.

# 4. Confirmar que app_runtime consegue ler (RLS bypassado só pra checagem).
psql "postgresql://app_runtime:<senha_app_runtime>@<host>:<porta>/aparatus_restore_drill" \
  -c "SET app.bypass_rls = 'on'; SELECT count(*) FROM organization;"
```

### Restore real (incidente de produção)

Mesmo procedimento acima, mas restaurando num banco Postgres novo que substituirá o de produção — nunca sobrescrever o banco vivo em cima de si mesmo. Trocar `DATABASE_URL`/`RUNTIME_DATABASE_URL` do serviço web e do worker na Railway pro novo banco só depois de confirmar os passos 3 e 4.

## O que falta pra fechar este item do roadmap

- [ ] Rodar este procedimento uma vez de verdade contra um snapshot/backup real da Railway (não o Docker local) — precisa das credenciais de produção, que eu não tenho aqui.
- [ ] Decidir uma cadência de drill (ex.: 1x por trimestre) se quiser virar rotina, não só o teste único que o roadmap pedia.
