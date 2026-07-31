# Fase A1 — Settings + Resend + Hardening

**Status:** Planejamento (não iniciado)  
**Data criação:** 2026-07-31  
**Próximo passo:** Exploração + planejamento técnico  
**Branch:** phase-b-hardening  
**Commit base:** e363b47

---

## Contexto

Após completar a feature de mensagens in-app + carteira de cupons (commit e363b47), os próximos itens bloqueantes são:

1. **Completar página de Settings** — nav link, cancelamento/no-show/overbooking policies, i18n
2. **Verificar domínio Resend** — troca de aparatus.app para bladiq.com
3. **Persistência de logs de notificação** — a confirmar se é exigência agora

---

## Próximas Sessões

### Sessão 1: Exploração

1. Ler `app/(protected)/dashboard/settings/`
2. Ler `lib/notifications.ts`
3. Procurar TODO/FIXME relacionados a Settings
4. Responder perguntas e criar plano técnico

### Sessão 2+: Implementação

1. Implementar página de Settings (campos + i18n)
2. Corrigir domínio Resend
3. Implementar logs de notificação (se exigido)

### Sessão 3: Fase A2

Explorar routing de subdomínio (`proxy.ts`) para app.bladiq.com directory e modelo QuoteRequest.

---

## Setup no Mac

```bash
git clone <repo>
cd aparatus-barber
git checkout phase-b-hardening
pnpm install
pnpm db:up
pnpm dev
```

---

## Referências

- `docs/ROADMAP-2026-07-21.md` — Fase A1/A2/B
- `docs/HANDOFF-2026-07-13.md` — 3 itens pendentes
- `CLAUDE.md` — TENANT_MODELS, RLS rules
- `tests/tenant-isolation.test.ts` — padrão para novos modelos
- `docs/plans/CURRENT-STATUS-2026-07-31.md` — status completo
