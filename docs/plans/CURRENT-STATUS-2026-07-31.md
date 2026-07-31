# Status atual e próximos passos — aparatus-barber

**Data:** 2026-07-31  
**Branch:** phase-b-hardening  
**Commit:** e363b47 (messaging + coupons)

---

## ✅ O que foi completo nesta sessão (Passo 0)

### Feature de Mensagens In-App + Carteira de Cupons

1. ✅ Corrigido o P2002 string-match em `lib/services/customer-coupon-service.ts:62` (usar `"Unique constraint failed"` conforme padrão do projeto).
2. ✅ `pnpm typecheck` → passou limpo
3. ✅ `pnpm test` → 172/172 testes passaram (incluindo isolamento de Conversation/Message/CustomerCoupon)
4. ✅ `pnpm lint` → passou (1 warning pré-existente em typewriter.tsx)
5. ✅ **Commit `e363b47` realizado** — `feat(messaging,coupons): in-app messaging + customer coupon wallet with tenant isolation`

**Modelos adicionados:**
- `Conversation` → in-app chat threads
- `Message` → individual messages
- `CustomerCoupon` → customer coupon wallet/redemption tracking

Ambos registrados em `TENANT_MODELS` (`lib/db.ts:36-38`), com RLS policies completas e testes de isolamento em `tests/tenant-isolation.test.ts` (linhas 786, 832, 916).

---

## 📋 Próximas Fases (conforme roadmap 2026-07-21)

### Fase A1 — Settings + Resend + Notificação (Handoff 07-13)
1. **Completar página de Settings:**
   - Nav link no dashboard
   - Campos: cancelamento/no-show/overbooking policies
   - i18n (de/en/pt)

2. **Verificar domínio Resend:**
   - Atualmente `aparatus.app` precisa trocar para `bladiq.com`
   - Quebra password reset/email verification em produção se não configurado

3. **Persistência de logs de notificação:**
   - Confirmar se é exigência de auditoria agora

### Fase A2 — Diretório app.bladiq.com
1. Corrigir routing do subdomínio `app.` (atualmente cai no fallback marketing root)
2. Trocar referências `aparatus.app` → `bladiq.com`
3. Modelo `QuoteRequest` (novo, com TENANT_MODELS + testes isolamento — regra bloqueante CLAUDE.md)
4. Action pública de envio de orçamento + UI condicional por vertical + email notification

### Fase B — Hardening Mínimo
- Cloudflare WAF
- Better Stack (logs + uptime)
- Alertas Sentry
- Rate-limit/failed-login alerting
- Cookie consent banner (German legal requirement — já implementado `app/_components/cookie-consent-banner.tsx`)
- CI migration gate
- Postgres backup/restore test
- 1-2 Playwright E2E tests (Stripe payment flow)

---

## 📊 Prontidão Europa (GDPR/Compliance)

| Item | Status |
|---|---|
| Cookie consent banner | ✅ Implementado |
| Data export/erasure (Art. 20) | ✅ `/api/gdpr/export/` e `/api/gdpr/erase/` |
| Privacy/Terms/Impressum | ✅ Marketing + per-tenant páginas |
| VAT (Stripe Tax) | ✅ `automatic_tax: { enabled: true }` |
| i18n (de/en/pt) | ✅ 831 chaves sincronizadas |
| Currency (EUR) | ✅ Configurável por org/service/booking |
| **Região EU (DB/Redis)** | ❌ Precisa confirmar Railway/Neon EU region |

---

## 🎯 Próximo Passo Imediato (quando retomar)

**Sessão 1 — Exploração Fase A1:**
- Ler `app/(protected)/dashboard/settings/` (já existe? o quê está pronto?)
- Ler `lib/notifications.ts` (estrutura de logs)
- Procurar TODO/FIXME relacionados a Settings
- Criar plano técnico com as descobertas

Ver arquivo: **`FASE-A1-SETTINGS-RESEND.md`** neste diretório.

---

## Referências

- **Roadmap:** `docs/ROADMAP-2026-07-21.md`
- **Handoff:** `docs/HANDOFF-2026-07-13.md`
- **Regras project:** `CLAUDE.md` (multi-tenancy, TENANT_MODELS, RLS)
- **Commit base:** e363b47
- **Branch:** phase-b-hardening
