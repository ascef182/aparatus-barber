# Product Marketing Context

**Document version:** v4
**Last updated:** 2026-09-24

> Este arquivo é lido automaticamente por todas as skills de marketing em
> `.agents/skills/` antes de fazerem qualquer pergunta de intake. Auto-draft
> a partir do código e dos documentos do repo (`PRODUCT.md`,
> `docs/marketing/plan.md`, `docs/LAUNCH-READINESS.md`,
> `lib/billing/plan-limits.ts`). **Precisa de revisão do fundador** — os
> pontos marcados `[VAZIO]` só podem ser preenchidos com cliente real, e não
> devem ser inventados por nenhuma skill.

## Product Overview

**One-liner:** Plataforma de agendamento e pagamentos que devolve ao dono de barbearia/salão a propriedade da relação com o cliente — sem comissão de marketplace sobre quem ele mesmo trouxe.

**What it does:** Agenda online própria (página pública por tenant em `{slug}.bladiq.com`), depósito/pré-pagamento via Stripe pra proteger contra no-show, cupons, mensagens, portal do cliente final, e um diretório público de descoberta (`/find/[city]`). O dono paga assinatura fixa; a Bladiq não tira percentual das reservas.

**Product category:** Software de agendamento para negócios de beleza (a prateleira onde Trinks, Fresha e Booksy competem). A Bladiq não cria categoria nova — redefine os termos dentro dela: **infraestrutura, não marketplace**.

**Product type:** B2B SaaS multi-tenant, self-service com onboarding assistido no estágio atual.

**Business model:**
- Assisted beta: piloto gratuito de 30 dias → Founder Plan R$59/mês por 12 meses (primeiros 20 parceiros).
- GA: trial self-service de **7 dias** (`lib/services/organization-service.ts:43`, `TRIAL_DAYS = 7`), depois Starter R$79 / Growth R$149 / Pro R$249 (`lib/billing/plan-limits.ts:3-11`). **Recalibrados 2026-09-24 contra o pricing real da Trinks (R$76-110/mês) — ainda não é pesquisa de willingness-to-pay brasileira** (ver `docs/marketing/plan.md` §13, decisão aberta #4).
- Limites por plano: Starter 1 local / 5 profissionais · Growth 3 / 20 · Pro ilimitado.
- Taxa do Stripe é separada e transparente — a Bladiq não lucra em cima dela.
- Sem comissão de diretório durante a validação.

## Target Audience

**Target companies:** Barbearia, salão de cabelo, estúdio de unha e salão de beleza **dono-operados**, tipicamente 1-5 profissionais. **Foco geográfico (atualizado 2026-09-24, pivô confirmado): Brasil.** A versão anterior deste documento (v2, 2026-08-24) mirava lusófono-Europa (Lisboa/Porto + diáspora na Alemanha) e afirmava explicitamente que não era um pivô para o Brasil — essa decisão foi revertida: a fundadora está no Brasil e hoje não tem ninguém disponível na Europa pra cuidar de imprensa/relações públicas lá, o que tornava a aposta europeia mais frágil. Cidade-base ou recorte regional específico dentro do Brasil **ainda não definido** (decisão aberta, ver `docs/marketing/plan.md` §13). As listas de prospecção feitas para Portugal/Alemanha (`docs/marketing/prospects-list.md` e os exports Vibe Prospecting) ficam como estão no repo — não descartadas, mas não são mais a lista ativa. O onboarding público só aceita `BARBERSHOP`, `HAIR_SALON`, `NAIL_SALON`, `BEAUTY_SALON`.

**Decision-makers:** O dono-operador. Não há comitê de compra, não há TI, não há procurement — a mesma pessoa que corta cabelo decide, paga e configura. Isso significa: o pitch tem que caber numa conversa, e o setup tem que caber em 15 minutos.

**Primary use case:** Parar de perder receita e tempo com agendamento manual por DM/WhatsApp e com no-show não cobrado.

**Jobs to be done:**
- "Pare de sangrar receita com no-show e cancelamento de última hora" → depósito/pré-pagamento amarrado à reserva.
- "Pare de gastar meu dia respondendo DM pra marcar horário" → página de agendamento pública 24/7.
- "Pare de sentir que estou alugando a minha própria lista de clientes" → assinatura fixa, relação com o cliente é do dono.

**Use cases:** Reserva por cliente final na página pública · reserva criada pelo próprio balcão (source DASHBOARD) · cobrança de depósito antes de confirmar · cupom promocional · portal do cliente pra remarcar/cancelar · listagem no diretório da cidade.

**Contexto do fundador (importante para toda copy e todo plano de canal):** o fundador opera **remoto, do Brasil**, vendendo agora pro próprio mercado onde está — não mais pra Europa. Estar no mesmo país/fuso do cliente reduz fricção (idioma sem tradução, contexto cultural do dia a dia de um salão brasileiro), mas o plano de canal continua assumindo prospecção 100% remota (Instagram DM/WhatsApp), não visita presencial — não porque haja impedimento físico agora, mas porque nenhuma tática de canal presencial foi validada ou planejada ainda.

## Personas

| Persona | Cares about | Challenge | Value we promise |
|---|---|---|---|
| Dono-operador (usuário + campeão + decisor + pagador, tudo a mesma pessoa) | Cadeira cheia, dia previsível, não ser passado pra trás por software | Já foi queimado por app que prometeu clientes e cobrou comissão; tempo zero pra configurar coisa nova | Sua agenda, seus clientes, mensalidade fixa — e no ar em 15 minutos |
| Profissional/staff do salão | Não ter a própria agenda bagunçada por terceiros | Não escolheu a ferramenta, herdou | Vê só o próprio dia, sem fricção |
| Cliente final (não compra, mas pode matar a adoção) | Marcar rápido, sem baixar app, no idioma dele | Costuma marcar por DM e não quer mudar | Página web, sem app, em português (padrão), inglês ou alemão |

## Problems & Pain Points

**Core problem:** O dono agenda por DM/WhatsApp/caderno, perde horas por dia nisso, e quando tenta resolver com um marketplace descobre que passa a pagar comissão sobre reservas — inclusive de clientes que ele mesmo trouxe.

**Why alternatives fall short:**
- Marketplace (Fresha e similares, ~8% do faturamento): monetiza por comissão e/ou visibilidade paga dentro do próprio app deles. O cliente final vira do marketplace, não do salão. (A Trinks, citada antes aqui, na verdade cobra assinatura fixa como a Bladiq — corrigido 2026-09-24, ver changelog.)
- SaaS genérico de agendamento sem foco no Brasil: não trata bem casos de uso locais do dia a dia (ex. Pix, ainda não confirmado no produto — ver decisão aberta em `docs/marketing/plan.md` §13) e não tem português como idioma de verdade, só tradução de última hora.
- Caderno/DM: grátis e funciona "mais ou menos" — é o concorrente real, não os outros softwares.

**What it costs them:** No-show não cobrado (cadeira vazia = receita perdida integral, não parcial) + horas/dia respondendo mensagem + comissão recorrente sobre faturamento próprio.

**Emotional tension:** Sensação de estar alugando a própria clientela. Ceticismo com vendedor de software. Medo de mexer no que funciona e perder cliente na transição.

## Competitive Landscape

**Direct (mesmo modelo, concorrente de preço/features, não de comissão):** Trinks — referência mais conhecida do nicho no Brasil (R$76-110/mês). Cobra assinatura fixa, igual à Bladiq — não citar como exemplo de marketplace/comissão (correção 2026-09-24, ver changelog).
**Direct (marketplace de comissão, confirmado no Brasil):** Fresha — ~8% do faturamento sobre reserva, inclusive de cliente trazido pelo dono; presença confirmada no mercado brasileiro (pesquisa 2026-09-24). Booksy também é citada como concorrente de comissão internacionalmente, mas a penetração dela no Brasil especificamente ainda não foi validada — não citar como confirmada em copy pública sem checar antes.
**Secondary:** Agendar por Instagram DM / WhatsApp — falha porque consome o dia do dono e não cobra depósito.
**Indirect:** Caderno de papel / não fazer nada — falha porque não existe registro, nem lembrete, nem proteção contra no-show. **É o concorrente mais forte e o que mais se subestima.**

## Differentiation

**Key differentiators:**
- Assinatura fixa, **zero comissão** sobre reserva de cliente próprio.
- Depósito/pré-pagamento nativo via Stripe Connect, não add-on.
- Português como idioma principal, não tradução de última hora — inglês e alemão também suportados.
- Compliance alinhado à LGPD (dados do cliente, base legal de tratamento) — **rascunho pronto, pendente revisão jurídica antes de virar argumento de vendas** (ver `docs/marketing/plan.md` §13).
- Isolamento de dados testado adversarialmente: RLS no Postgres + injeção de tenant fail-closed na aplicação + MFA obrigatório pra owner (`docs/LAUNCH-READINESS.md`).

**How we do it differently:** O diretório público (`/find/[city]`) é bônus de descoberta, não a proposta. A monetização é a mensalidade — então não há incentivo em ficar entre o salão e o cliente dele.

**Why that's better:** Um salão com volume razoável paga mais em um ano de comissão de marketplace do que em um ano de assinatura fixa. E a lista de clientes continua dele.

**Why customers choose us:** "Você não paga comissão sobre o cliente que já é seu." (frase central do pitch)

## Objections

| Objection | Response |
|---|---|
| "Qual a diferença pra Fresha?" | Eles cobram por reserva, inclusive as suas. Aqui é mensalidade fixa e a relação com o cliente continua sua. → linkar a página de comparação |
| "Qual a diferença pra Trinks?" | Modelo de cobrança parecido (assinatura fixa, sem comissão) — a diferença é preço/features, não comissão. Vale comparar diretamente sem usar o argumento de "sem comissão" contra ela especificamente. |
| "Sou pequeno demais / não preciso disso" | Não é sobre tamanho, é sobre no-show: uma cadeira vazia custa o valor cheio do serviço. Depósito resolve com 1 configuração |
| "Meus clientes não vão usar" | Não tem app pra baixar — é um link, em português (ou inglês/alemão, se preferir). Você continua marcando por DM pra quem preferir |
| "Não tenho tempo pra configurar" | Eu configuro com você numa chamada; a promessa do produto é página no ar em menos de 15 minutos |
| "Quem é você? Isso é confiável?" | Responder com transparência: CazaTech, CNPJ brasileiro, dados da empresa públicos. **Não maquiar.** Compliance LGPD ainda em revisão jurídica — não prometer mais do que está pronto hoje |
| "E se eu parar de pagar, perco meus dados?" | Export de dados do titular alinhado à LGPD (mesma base técnica do export GDPR já implementado em `app/api/gdpr/export`, sendo revisado pra LGPD); reservas/pagamentos seguem regra de retenção documentada, PII pode ser anonimizada a pedido |

**Anti-persona:** Rede com muitas unidades e time de operações · quem quer POS/integração fiscal ou controle de estoque · clínica médica/estética regulada · quem quer que a plataforma **traga** clientes (isso é marketplace — não é o jogo da Bladiq, e prometer isso queima a confiança logo no primeiro mês).

## Switching Dynamics

**Push:** Comissão sobre cliente próprio · dia consumido por DM · no-show sem cobrança · sensação de não ser dono da própria lista.
**Pull:** Mensalidade fixa previsível · depósito que protege a agenda · página própria no idioma do cliente · setup assistido de graça.
**Habit:** O caderno/DM funciona "mais ou menos" há anos; os clientes fiéis já sabem mandar mensagem; trocar dá trabalho num negócio onde ninguém tem tempo sobrando.
**Anxiety:** "Vou perder cliente na transição" · "cliente mais velho não vai saber usar" · "mais uma assinatura que vou pagar e não usar" · "e se o sistema cair num sábado cheio?"

## Customer Language

**How they describe the problem:** `[VAZIO — zero conversas com cliente real até hoje]`
Preencher com verbatim das primeiras conversas de prospecção e dos pilotos (é a maior fonte de pesquisa disponível no estágio, ver `docs/marketing/plan.md` §5 Move 1). Não inventar frase de cliente.

**How they describe us:** `[VAZIO]`

**Words to use:** sua agenda · seus clientes · mensalidade fixa · sem comissão · depósito · no-show · em 15 minutos · português, inglês e alemão.

**Words to avoid (regra dura, ver `docs/marketing/plan.md` §2):**
- **IA / recepcionista automática / automação inteligente** — a promessa foi deliberadamente removida do produto até haver desenho operacional seguro (`PRODUCT.md`, Boundaries). Reintroduzir na comunicação quebra a disciplina do produto. **Nenhuma skill deve gerar copy com esse ângulo.**
- Qualquer framing de marketplace ("mais clientes pra você", "apareça na frente do concorrente") — é o jogo da Fresha, não o nosso (a Trinks não joga esse jogo, é assinatura fixa como a gente).
- Urgência falsa / pressão de vendas — o ICP já é cético com vendedor de software.
- Falar de roadmap como se já existisse. Só o que está no ar hoje.

**Glossary:**
| Term | Meaning |
|---|---|
| Tenant | Um negócio/organização no sistema; tem subdomínio próprio `{slug}.bladiq.com` |
| Founder Plan | R$59/mês por 12 meses, só os 20 primeiros parceiros |
| Payment attachment | % de reservas com pagamento/depósito anexado — métrica-chave de ativação de valor |
| Hold / PENDING_PAYMENT | Reserva segurando o horário até o pagamento confirmar (expira em 30min) |
| LGPD | Lei Geral de Proteção de Dados (Lei 13.709/2018) — base legal brasileira de tratamento de dados pessoais que substitui a referência a GDPR/GoBD alemã usada até a v2 deste documento |

## Brand Voice

**Tone:** Direto, sóbrio, sem jargão de startup. Fala com dono de negócio pequeno, não com comprador de software.
**Style:** Frase curta. Nomear restrição real (isolamento de dados, base legal de tratamento) como sinal de confiança, não escondê-la. Português é o idioma principal, não cortesia.
**Personality:** honesto · técnico-mas-legível · do lado do dono · nada hypado · discretamente rigoroso.

## Proof Points

**Metrics:** `[VAZIO — pré-receita]`
**Customers:** `[VAZIO — zero clientes]`
**Testimonials:** `[VAZIO — não fabricar]`

**Value themes (o que dá pra provar hoje, sem cliente):**
| Theme | Proof |
|---|---|
| Não é vaporware | Produto completo e demonstrável ao vivo hoje (agenda, depósito, cupom, mensagens, portal) |
| Seus dados de cliente estão isolados de verdade | RLS no Postgres + isolamento testado adversarialmente (`tests/rls-policy.test.ts`, `tests/tenant-isolation.test.ts`) |
| Compliance levado a sério, não improvisado | Rascunho LGPD pronto, pendente revisão jurídica antes de virar prova pública (ver decisão aberta em `docs/marketing/plan.md` §13) |
| Atende seu cliente no idioma dele | pt/en/de em produto e nos textos legais |

## Goals

**Business goal:** Fechar e reter os 3-5 primeiros parceiros piloto no Brasil nos próximos 90 dias, sem mídia paga, e validar willingness to pay (piloto → Founder Plan). Portão de validação: 50 negócios mapeados → 20 conversas → ≥5 pilotos aceitos segue; ≤2 reabre a questão de mercado.
**Conversion action:** Piloto gratuito de 30 dias com onboarding assistido pelo fundador (não é "criar conta", é "marcar a chamada de setup").
**Current metrics:** ARR R$0 · 0 clientes · 0 prospects contatados · analytics: só `@vercel/analytics` (pageview agregado, sem funil).

**North star (de `PRODUCT.md`):** receita confirmada/protegida processada pela Bladiq, por negócio ativo.
**Ativação (de `PRODUCT.md`):** página publicada em <15min **e** primeira reserva em <7 dias.

## Changelog
*Newest first. One line per revision: what changed and why.*
- v4 (2026-09-24) — **Correção factual: Trinks não cobra comissão.** Pesquisei `negocios.trinks.com/planos` — a Trinks cobra assinatura fixa (R$76-110/mês), mesmo modelo da Bladiq, não marketplace. Todo texto anterior usando a Trinks como exemplo de comissão foi corrigido pra Fresha (~8% do faturamento, presença confirmada no Brasil). Pricing recalibrado contra o valor real da Trinks: Founder Plan R$59, Starter R$79, Growth R$149, Pro R$249 (antes R$149/199/399/699 — conversão arbitrária de EUR).
- v3 (2026-09-24) — **Pivô de mercado: lusófono-Europa → Brasil.** Reverte a decisão da v2 (que era explicitamente "não é pivô Brasil"): a fundadora está no Brasil e hoje não tem ninguém disponível na Europa pra imprensa/PR lá, o que fragilizava a aposta europeia. Moeda EUR→BRL (placeholder, não validado). Compliance alemão (Impressum/GoBD/DPA) sai, entra LGPD (rascunho, pendente revisão jurídica). Framing de "negócio liderado por imigrante" sai do ICP (não se aplica dentro do próprio país). Cidade-base no Brasil fica como decisão em aberto, não presumida.
- v2 (2026-08-24) — Alvo geográfico estreitado: de "Berlim, depois DACH" para **lusófono-Europa**, com **Lisboa/Porto como mercado direto** e comunidade lusófona da Alemanha como segunda frente. Não é pivô Brasil — venda continua remota, para clientes na Europa. Decisão registrada em memória do fundador (`project-gtm-market-position`, 2026-08-24); ainda **não validada** — segue o mesmo portão (50 mapeados / 20 conversas / ≥5 pilotos) já definido no `docs/marketing/plan.md`.
- v1 (2026-08-21) — Contexto inicial, auto-draft do repo. Corrige dois pontos onde `docs/marketing/plan.md` v1 está desatualizado: o fundador opera **remoto do Brasil** (não presencial em Berlim), e o trial de GA é de **7 dias** no código, não 14 como diz o `PRODUCT.md`.
