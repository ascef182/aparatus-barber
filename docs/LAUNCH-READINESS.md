# Launch readiness — segurança, isolamento de dados e prontidão para lançamento

**Última atualização:** 2026-08-21
**Branch avaliada:** `phase-b-hardening` (commit `502659a`)
**Autor:** auditoria assistida (Claude Code), read-only + 1 rodada de correção de dependências

Este documento responde três perguntas do dono do produto: (1) o software já
pode ser lançado com segurança real contra ameaças do mundo real? (2) os
dados de cada tenant/cliente estão de fato isolados e protegidos? (3) o que
falta para chegar lá. Complementa (não substitui) `SECURITY.md`,
`docs/ARCHITECTURE.md`, `docs/ROADMAP-2026-08-01.md`,
`docs/data-retention-policy.md` e `docs/backup-restore.md` — este relatório
cruza esses documentos com o estado real do código e classifica o que falta
por prioridade.

---

## 1. Resumo executivo

**Veredito curto: a base de segurança está claramente acima da média para o
estágio do projeto.** RLS real no Postgres, isolamento de tenant testado de
forma adversarial, correção de IDOR com padrão reutilizável, webhooks Stripe
verificados e idempotentes, MFA obrigatório para papéis privilegiados, CI com
CodeQL + Dependabot + gate de auditoria de dependências. Isso não é
"prometido no roadmap" — está implementado e coberto por teste automatizado
no código hoje.

- **Pode lançar o "assisted beta" (3–5 parceiros em Berlim, roadmap
  `docs/ROADMAP-2026-08-01.md`)?** Sim, do ponto de vista de segurança de
  aplicação e isolamento de dados. Os itens que faltam para esse estágio são
  operacionais/infra (drill de restore contra a Railway real, confirmar
  Cloudflare na frente da origem, confirmar região EU do banco/Redis, definir
  dono dos alertas Sentry) — nenhum é uma falha de código.
- **Pode abrir GA pública (self-service, cartão de crédito de estranhos)
  hoje?** Ainda não, por dois motivos que não são bugs de segurança mas são
  bloqueadores reais: (a) o gap **legal** já declarado no próprio Impressum —
  falta representante Art. 27 GDPR na UE, exigido para operar comercialmente
  na Alemanha; (b) a suíte de testes de integração de reserva/cupom está
  falhando (ver §3, P1) — não é seguro prometer confiabilidade de agenda para
  desconhecidos com esse sinal vermelho aberto.
- **A vulnerabilidade de dependências que bloqueava o gate do CI (`pnpm audit
  --prod --audit-level high`) já foi corrigida nesta sessão** — ver §3, P0.

---

## 2. O que já está bem resolvido (crédito onde é devido)

| Área | Como funciona | Evidência |
|---|---|---|
| **Isolamento de tenant (banco)** | RLS real no Postgres, role de runtime restrita (`app_runtime`) separada da role de migration (owner) | `prisma/migrations/20260720120000_add_rls_policies/`, `.../20260722103200_add_quote_request_rls/`, `.../20260730224142_add_messaging_coupon_wallet_rls/`, `.../20260731170918_add_notification_log_rls/` |
| **Isolamento de tenant (aplicação)** | Extensão Prisma fail-closed injeta `organizationId`; contexto vem só do host, nunca do payload do cliente; FK composta amarra relações ao mesmo tenant | `docs/ARCHITECTURE.md`; testado em `tests/tenant-isolation.test.ts` (~1450 linhas) e `tests/rls-policy.test.ts` (RLS testado direto no Postgres, sem passar pela aplicação) |
| **IDOR (posse de recurso no mesmo tenant)** | `lib/authz.ts`: `assertOwned()` sempre responde "not found" (nunca "forbidden", pra não confirmar existência de recurso alheio a um atacante); `assertOwnBookingAccess()` fail-closed | commit `0c263cb`; `tests/integration/idor-same-tenant.test.ts` |
| **Autenticação / MFA** | Better Auth com TOTP + backup codes; MFA obrigatório pra `owner`/`superadmin` com grace period de ~7 dias | `lib/auth.ts:181`, `app/(protected)/dashboard/layout.tsx:47`, `tests/integration/mfa-enforcement.test.ts` |
| **Rate limiting** | Duas camadas fail-closed: Better Auth (5 tentativas/60s em sign-in/sign-up, 1 a cada 5min em reset de senha) + `lib/rate-limit.ts` (Redis, sem Redis = request rejeitada, não liberada) | `lib/auth.ts:120-131`, `lib/rate-limit.ts`, `tests/security/rate-limit.test.ts` |
| **Webhooks Stripe** | Assinatura verificada no raw body (`stripe.webhooks.constructEvent`), idempotência via `claimStripeEvent()` | `app/api/stripe/billing/webhook/route.ts`, `app/api/stripe/connect/webhook/route.ts`, `tests/integration/stripe-webhooks.test.ts` |
| **Headers de segurança** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` sempre ativos; HSTS + CSP só em produção | `next.config.ts` |
| **Segredos** | `.env` fora do git, `.env.example` só com placeholders; nenhum segredo real encontrado no código; CI usa placeholders explícitos | `.gitignore:39-40`, `.env.example`, `.github/workflows/ci.yml` |
| **Supply chain** | `pnpm-workspace.yaml` já tinha `minimumReleaseAge: 1440` (pacote só é instalável 24h após publicado — mitiga ataque de pacote malicioso recém-publicado) + lista própria de overrides de CVE, além do CodeQL semanal e Dependabot semanal | `pnpm-workspace.yaml`, `.github/workflows/codeql.yml`, `.github/dependabot.yml` |
| **Fraude** | FingerprintJS (biblioteca open source, não o serviço pago) client-side; reuso de dispositivo entre orgs só gera `AuditLog`, nunca bloqueia (evita falso-positivo em rede compartilhada); base legal declarada na política de privacidade | commit `614c59a`, `lib/fingerprint-client.ts`, `lib/services/fingerprint-service.ts` |
| **GDPR — export/apagamento** | `app/api/gdpr/{export,erase}/route.ts` implementados; apagamento anonimiza `Customer` mas preserva `Booking` (obrigatório por lei fiscal alemã, GoBD §147 AO) | `docs/data-retention-policy.md` |
| **Backup/restore** | Ciclo completo dump→restore→verificação testado localmente contra `postgres:16-alpine` (mesma imagem do compose) | `docs/backup-restore.md` |

---

## 3. Achados e recomendações, priorizados

### P0 — corrigido nesta sessão

**Vulnerabilidades de dependência que bloqueavam o gate do CI.**
`pnpm audit --prod` acusava 3 "high" + 1 "moderate", todas em dependências
transitivas de toolchain de build (Sentry webpack plugin, Next/postcss, Vite
via `better-auth→vitest`) — nenhuma exposta a input de atacante em runtime,
mas suficiente pra derrubar `pnpm audit --prod --audit-level high` no CI
(`.github/workflows/ci.yml`). Causa raiz: `pnpm-workspace.yaml` já tinha
`overrides` pra CVEs anteriores desses mesmos pacotes, mas versões novas
foram publicadas com *novas* vulnerabilidades nos exatos pins antigos
(ex.: `brace-expansion@5.0.8` foi o fix de um CVE anterior e é a versão
vulnerável do novo `GHSA-rgw5-rvv9-x895`).

Corrigido atualizando os pins em `pnpm-workspace.yaml`:

| Pacote | Pin anterior | Pin novo | Advisory |
|---|---|---|---|
| `fast-uri` | `<3.1.4` → `3.1.4` | `<3.1.5` → `3.1.5` | GHSA-7p8r-x3mc-p8w7 (high) |
| `brace-expansion` (linha 5.x) | `>=5.0.0 <5.0.8` → `5.0.8` | `>=5.0.0 <5.0.9` → `5.0.9` | GHSA-rgw5-rvv9-x895 (high) |
| `nanoid` | não existia override | `<3.3.18` → `3.3.18` (novo) | GHSA-2v37-7h3g-55p8 (high) |
| `postcss` | `<8.5.18` → `8.5.18` | `<8.5.23` → `8.5.23` | GHSA-fxqj-rqcc-2cmp (moderate) |

Verificado após o fix: `pnpm audit --prod` → **0 critical/high/moderate/low**.
`pnpm typecheck`, `pnpm lint` e `pnpm build` passam limpos. `pnpm test:unit`
→ 11/11. `pnpm test` (suíte completa, com Testcontainers) → 200/208, as 8
falhas são pré-existentes e não relacionadas a este fix (ver P1 abaixo — o
mesmo padrão de falha ocorre revertendo a mudança de dependências).

*Nota:* o campo `"pnpm": { "overrides": ... }` dentro de `package.json` **não
é mais lido pelo pnpm 11+** (movido para `pnpm-workspace.yaml`) — se alguém
tentar corrigir uma vulnerabilidade futura editando `package.json`, o pnpm
avisa mas ignora silenciosamente. Vale documentar isso pra próxima pessoa que
mexer em dependências.

### P1 — antes do assisted beta / antes de confiar a suíte de testes

1. ~~**Suíte de integração com falhas pré-existentes.**~~ **RESOLVIDO em
   2026-08-21 — e a causa não era o que este documento supunha.** A hipótese
   original (colisão de dados entre testes sequenciais disputando o mesmo
   slot) estava errada: os arquivos já usavam horário distinto por teste e
   organização própria com `randomUUID()` e limpeza em `afterAll`. A causa
   real era uma **data literal vencida** no fixture — `const MONDAY =
   "2026-08-10"` em `booking-flow.test.ts` e `coupon-redemption.test.ts`, e
   `"2026-08-17"` em `customer-account.test.ts` (este terceiro arquivo nem
   estava mapeado aqui). Quando essas datas ficaram no passado,
   `getAvailableSlots` passou a recusá-las corretamente pela janela de
   antecedência (`lib/scheduling/availability.ts:49-56`), `createBooking`
   revalidou contra a lista vazia e lançou `SLOT_TAKEN_MESSAGE`
   (`lib/services/booking-service.ts:87-96`).

   **Não havia defeito no motor de agendamento.** A prova: os testes que
   gravam direto com `db.booking.create` e exercitam a exclusion constraint
   do Postgres nunca falharam — só o caminho que passa pela pré-checagem de
   disponibilidade. Corrigido com `tests/helpers/future-date.ts`, que computa
   uma segunda-feira futura em runtime, mais um teste-guarda
   (`tests/unit/future-date.test.ts`) que varre ~4 anos de "hoje" possíveis
   pra impedir que o fixture apodreça de novo. Suíte completa: **211/211**.

   Corrigido junto um **falso verde**: `coupon-redemption.test.ts` afirmava
   só `rejects.toThrow()` genérico no teste de cupom inválido e passava por
   causa do `SLOT_TAKEN_MESSAGE`, não do erro de cupom. Agora afirma a
   mensagem específica.

   *Lição para a próxima auditoria:* "8 testes do fluxo central falhando"
   virou, neste documento e no plano de marketing, um bloqueador de
   lançamento por três meses. Era uma hora de trabalho. Vale confirmar a
   causa antes de deixar um sintoma escalar a bloqueador.
2. **CSP com `unsafe-inline`.** `next.config.ts` já ativa CSP em produção,
   mas com `'unsafe-inline'` em `script-src`/`style-src` (comentário no
   código já admite que é pragmático por causa da hidratação do
   Next/Turbopack, não nonce-based). `frame-ancestors 'none'` +
   `X-Frame-Options: DENY` cobrem clickjacking, mas a CSP atual não mitiga
   XSS de script injetado — se algum vetor de injeção aparecer no futuro
   (ex. rich text não sanitizado), a CSP não vai barrar. Migrar pra CSP
   com nonce por request é trabalho não-trivial no App Router; vale
   avaliar o esforço antes do GA, não necessariamente antes do beta
   assistido com poucos parceiros conhecidos.
3. **`tests/security/auth-bypass.test.ts` tem escopo mais estreito que o
   nome sugere** — hoje cobre só round-trip/TTL do `authSecondaryStorage`
   (Redis), não um teste amplo de bypass de autenticação/autorização.
   Recomendo ampliar ou renomear pra não passar falsa sensação de cobertura.
4. **Itens do "release gate" do próprio `SECURITY.md` ainda não confirmados
   como feitos**: restore verificado só localmente (`docs/backup-restore.md`
   — falta rodar contra a instância real da Railway), Cloudflare na frente
   da origem (hoje é uma opção configurável via `TRUSTED_PROXY_IP_HEADER`,
   não confirmado como ativo em produção), dono definido para alertas
   Sentry/log. Nenhum é bug de código — são itens operacionais que o
   próprio time já havia mapeado.
5. **Região EU do banco/Redis gerenciados não confirmada no código/docs**
   (`docs/plans/CURRENT-STATUS-2026-07-31.md` já sinalizava isso como
   pendente) — vale confirmar no painel da Railway, é relevante para a
   promessa de DPA com subprocessadores.

### P2 — antes de abrir GA ampla / crescer o time

1. **MFA obrigatório só para `owner`/`superadmin`.** Managers/staff com
   acesso a dados de cliente (mensagens, agenda, cupons) não são forçados a
   configurar MFA hoje (`app/(protected)/dashboard/layout.tsx:47`). Pode ser
   intencional para reduzir fricção de onboarding do time do parceiro, mas
   vale confirmar que é decisão deliberada, não lacuna esquecida — esses
   papéis também tocam PII de cliente final.
2. **Gap legal declarado no próprio Impressum**: falta representante Art. 27
   GDPR na União Europeia. A empresa operadora (CazaTech, CNPJ brasileiro)
   não tem estabelecimento na UE nem VAT-ID alemão — o texto legal já é
   transparente sobre isso, mas é um bloqueador real pra operar
   comercialmente na Alemanha de forma plena, não um nice-to-have técnico.
   Resolver antes de sair do "assisted beta" com parceiros que pagam de
   verdade.
3. **Inconsistência de trial**: `PRODUCT.md` e `docs/ROADMAP-2026-08-01.md`
   ainda citam trial de 14 dias; `app/(marketing)/terms/page.tsx` já foi
   corrigido pra 7 dias (commit `a493caf`). Alinhar os documentos de produto
   com o texto legal vigente antes de usar qualquer um deles em material de
   vendas/GTM.

---

## 4. Isolamento e proteção de dados (em detalhe)

Como um tenant não vê dado de outro, em duas camadas independentes:

1. **Camada de aplicação**: o `organizationId` nunca vem do que o cliente
   manda (payload, query param) — vem do host resolvido (`lib/tenant-host.ts`)
   mais a verificação de membership da sessão. Uma extensão do Prisma
   intercepta toda query de um model tenant e injeta esse `organizationId`
   automaticamente; se o código tentar rodar uma query sem esse contexto
   definido, ela **falha** (`MissingTenantContextError`), em vez de rodar
   sem filtro. Relações entre models tenant (ex. reserva → cliente → staff)
   usam foreign key composta (`id + organizationId`), então nem um bug de
   lógica de aplicação consegue ligar dois registros de tenants diferentes.
2. **Camada de banco**: mesmo que a camada de aplicação falhasse por
   completo (bug grave, ou alguém rodando SQL manual com a role de
   runtime), o Postgres tem Row-Level Security ativado nas tabelas de
   tenant, testado diretamente contra o banco — sem contexto de tenant
   setado na sessão SQL, um `SELECT` não retorna nada; um `INSERT`
   cross-tenant é rejeitado pelo próprio banco. Isso foi testado de forma
   adversarial em `tests/rls-policy.test.ts`, batendo direto no Postgres com
   a role restrita `app_runtime`, sem passar pelo código da aplicação.
3. **Posse de recurso dentro do mesmo tenant** (ex. um profissional mexendo
   na reserva de outro cliente do mesmo salão): coberto por `lib/authz.ts`
   desde a correção de IDOR (`0c263cb`) — ver §2.

**Dados sensíveis e onde vivem**: ver `docs/data-retention-policy.md` para o
detalhamento por tipo de dado (PII de cliente, reserva/pagamento, trilha de
auditoria, consentimento, log de notificação). Resumo: PII de cliente pode
ser anonimizada a pedido (GDPR Art. 17), mas reserva/pagamento nunca é
apagada (retenção fiscal alemã, 10 anos, GoBD §147 AO) — a própria GDPR
reconhece essa exceção (Art. 17(3)(b)).

**Subprocessadores e DPA**: Railway (hosting), Stripe (pagamentos), Resend
(e-mail), Cloudinary (upload de mídia), Sentry (erros) — listados no DPA
público (`app/(marketing)/dpa/page.tsx`), com AVV nos termos do Art. 28 GDPR.

---

## 5. Checklist do Gate 0 (`docs/ROADMAP-2026-08-01.md`)

| Item do Gate 0 | Status |
|---|---|
| Ciclo de vida de eventos Stripe recuperável + retry de notificação | ✅ Feito (`claimStripeEvent`, BullMQ) |
| E-mail transacional HTML-safe | ✅ Feito (escapado, protocolo de URL validado — invariante em `SECURITY.md`) |
| FK composta de relação de tenant + testes de isolamento adversariais | ✅ Feito (§2, §4) |
| Política de dependência, audit, Dependabot, CodeQL, validação de env, migrations de release | ✅ Feito — audit agora limpo (P0 corrigido nesta sessão) |
| Hardening de rota pública, consolidação de guest por e-mail verificado, política de retenção, alertas, drill de restore | 🟡 Parcial — retenção documentada mas job de purge de `AuditLog` ainda não implementado (baixa prioridade, volume baixo hoje); drill de restore feito só localmente, falta rodar contra Railway real; "alertas" (dono definido pra Sentry/log) não confirmado no código |

---

## 6. Próximos passos recomendados (em ordem)

1. ~~Investigar e corrigir a causa da falha nos testes de `booking-flow`/`coupon-redemption` (P1.1).~~ **Feito em 2026-08-21** — era data literal vencida no fixture, não defeito de agendamento. Suíte completa em 211/211. Ver P1.1.
2. Rodar o drill de restore contra a Railway real e confirmar Cloudflare + região EU ativos (P1.4, P1.5) — operacional, não código, mas está no próprio release gate do time.
3. Definir dono dos alertas Sentry/log antes de ligar tráfego real de parceiro.
4. Resolver o representante Art. 27 GDPR (P2.2) antes de sair do beta assistido para cobrança recorrente ampla.
5. Alinhar `PRODUCT.md`/roadmap com os 7 dias de trial já vigentes no Terms (P2.3) antes de usar esses documentos em material de vendas.
6. Avaliar CSP com nonce e extensão de MFA pra papéis abaixo de owner (P1.2, P2.1) como trabalho de médio prazo, não bloqueador do beta assistido.

Com o P0 já corrigido, **não há bloqueador de segurança de aplicação para
começar o assisted beta com os 3–5 parceiros de Berlim** — os itens
restantes antes desse passo são operacionais (infra, verificação de drill)
e já estavam mapeados pelo próprio time. GA pública ampla depende de
resolver o gap legal do representante EU e de destravar o sinal vermelho
nos testes de agendamento.
