# Bladiq — Marketing Plan v1

**Prepared by:** fCMO run (Claude Code, metodologia `marketing-plan`)
**For:** Fundador da Bladiq / CazaTech
**Date:** 2026-08-14
**Status:** Draft v1 — **parcialmente superado, ver avisos abaixo**

> ### ⚠️ Aviso de revisão (2026-08-21)
>
> Duas premissas centrais deste plano caíram desde que ele foi escrito. Ele
> continua útil como quadro estratégico (§2), rubrica (§3) e banco de ideias
> (§12), mas **§1, §4 e §9 precisam de v2** antes de serem executados:
>
> 1. **O fundador opera remoto do Brasil, não presencialmente em Berlim.** As
>    apostas #1 e #3 do resumo executivo (prospecção manual com visita ao
>    salão; rede pessoal lusófona local acessada pessoalmente) assumem
>    presença física. Remoto, a ordem inverte: **Instagram DM vira o canal
>    primário** — é o inbox onde o dono de barbearia já agenda hoje, e é
>    literalmente a dor que a Bladiq vende — e o ângulo lusófono sobe de
>    aposta #2 para #1, porque remoto é o único canal com confiança
>    pré-existente. Ver `.agents/product-marketing.md` para o contexto
>    corrigido que todas as skills de marketing leem.
> 2. **O "bloqueador de confiabilidade dos testes de booking" não existe.**
>    Era uma data literal vencida no fixture, não defeito de agendamento.
>    Corrigido em 2026-08-21; suíte completa em 211/211. Ver
>    `docs/LAUNCH-READINESS.md` P1.1. Onde este plano condiciona um passo a
>    "resolver a falha dos testes", o passo está liberado.

> ### ⚠️ Aviso de revisão (2026-08-24) — **superado pelo aviso de 2026-09-24 abaixo**
>
> Este aviso mudava o alvo geográfico para "lusófono-Europa" (Lisboa/Porto +
> comunidade em Berlim/Frankfurt/Munique/Hamburgo) e afirmava explicitamente
> que **não** era um pivô para o Brasil. Essa decisão foi revertida cinco
> dias depois — ver o aviso seguinte. Texto original mantido no histórico do
> git (`git log -p -- docs/marketing/plan.md`) para referência de quem
> revisar o raciocínio anterior.

> ### ⚠️ Aviso de revisão (2026-09-24) — Pivô para o Brasil
>
> **O alvo geográfico muda para o Brasil.** A fundadora está operando do
> Brasil e, diferente da premissa do aviso anterior, decidiu não manter o
> foco comercial na Europa — hoje não há ninguém disponível na Europa para
> cuidar de imprensa/relações públicas lá, o que tornava a aposta lusófona
> europeia mais frágil do que o plano de 08-24 assumia. Lançar no mercado
> onde a fundadora está fisicamente resolve isso e simplifica fuso horário,
> suporte e prospecção ao vivo.
>
> Isso **reverte** o aviso de 2026-08-24 (que era explicitamente "não é pivô
> para o Brasil") — a intenção mudou, e este documento foi reescrito abaixo
> para refletir Brasil como mercado primário, não como nota lateral.
> `.agents/product-marketing.md` v3 tem o mesmo contexto atualizado.
>
> **O que muda de fato:** moeda (EUR→BRL), ICP deixa de mencionar "negócio
> liderado por imigrante"/diáspora (não se aplica dentro do próprio país),
> a camada de compliance legal deixa de ser alemã (Impressum/GoBD/DPA) e
> passa a ser LGPD (ver `PRODUCT.md` e as páginas legais do produto).
> **O que fica em aberto, de propósito, em vez de inventado:** cidade-base
> específica de prospecção, comunidades/associações locais equivalentes às
> mapeadas para Portugal em `community-channels.md`, e comparação direta com
> concorrentes brasileiros validada. Ver decisões em aberto, §13.
> **Status: recomendação aceita, ainda não validada** — o portão de
> validação (50 negócios mapeados → 20 conversas → ≥5 pilotos aceitos)
> segue o mesmo, agora aplicado ao mercado brasileiro.

> ### ⚠️ Aviso de revisão (2026-09-24, correção factual) — Trinks não cobra comissão
>
> Pesquisei o site oficial da Trinks (`negocios.trinks.com/planos`) e a
> afirmação usada em todo este documento até agora — "Trinks cobra
> comissão sobre reserva" — está **errada**. A Trinks cobra assinatura
> mensal fixa (R$76/mês pra 1-2 profissionais, R$110/mês pra 3-4, sob
> consulta acima disso), sem comissão sobre agendamento. O modelo dela é
> igual ao da Bladiq (SaaS de assinatura), não um marketplace. Quem cobra
> comissão de verdade (~8% do faturamento) e já opera no Brasil é a
> **Fresha**. Toda menção a "Trinks" como exemplo de comissão abaixo foi
> corrigida pra Fresha — a Trinks continua citada como concorrente de
> preço/features, com modelo de cobrança igual ao nosso.
>
> Isso também expôs que o pricing placeholder deste plano (herdado
> proporcionalmente do EUR, R$149/199/399/699) ficava bem mais caro que a
> Trinks pro mesmo porte de negócio. Recalibrado pra **Founder Plan R$59 ·
> Starter R$79 · Growth R$149 · Pro R$249** — mais próximo da faixa real
> de mercado, ainda não é pesquisa de willingness-to-pay (ver §13).

---

## 1. Resumo executivo

**Este plano otimiza para uma coisa só: fechar e reter os 3-5 parceiros piloto no Brasil nos próximos 90 dias, sem gastar em mídia paga.** Não é um plano de crescimento — é um plano de primeira tração, porque a Bladiq está em receita zero, com um produto pronto e testado (agenda, depósitos, pagamentos, isolamento de dados) e nenhum canal de aquisição ligado ainda. O gargalo não é produto. É contato humano com donos de salão/barbearia reais.

**Três apostas, em ordem de alavancagem:**

1. **Prospecção remota bate qualquer canal pago neste estágio.** Com R$0-2.500/mês de orçamento e um ICP hiperlocal (1-5 profissionais por negócio), nenhuma verba de mídia paga produz volume suficiente pra validar nada — e o CAC de tráfego pago sobre um ticket de R$79-149/mês provavelmente não fecha a conta. A aposta é: a fundadora usa o navegador (Google Maps, Instagram, busca por nome) pra montar uma lista qualificada de 50-100 barbearias/salões/estúdios de unha no Brasil e faz contato remoto — Instagram DM como canal primário, WhatsApp quando a conversa avança, mensagem curta e específica. Isso é o que qualquer operador bem-sucedido faz antes de existir orçamento de marketing.
2. **Estar no mesmo país e fuso horário do cliente é vantagem real, não só conveniência.** A operação já era remota antes (vendendo pra Europa do Brasil); vender dentro do próprio país remove a fricção de fuso horário, idioma sem tradução alguma e contexto cultural do dia a dia de um salão brasileiro — inclusive nuances de forma de pagamento (Pix é esperado, não opcional) que o produto ainda não trata explicitamente e que vale investigar cedo (ver §13, decisões em aberto).
3. **O diferencial "sem comissão de marketplace sobre o cliente que você mesmo trouxe" precisa virar uma página específica e um argumento repetível, não ficar só no README.** Plataformas de agendamento com comissão sobre reserva — a Fresha é a mais conhecida operando no Brasil, ~8% do faturamento — cobram do dono do salão mesmo sobre clientes que ele mesmo trouxe. Essa é a objeção mais fácil de vencer com um dono cético, e hoje ela não existe em lugar nenhum do site público da Bladiq. (Correção 2026-09-24: a Trinks, citada aqui até então, **não** cobra comissão — é assinatura fixa, mesmo modelo da Bladiq. Ver aviso de revisão no topo do documento.)

**O que doze meses parecem, de forma plausível:**
- 3-5 parceiros ativos no Brasil até o fim do Q1 (piloto gratuito de 30 dias).
- Willingness to pay validada — pelo menos 3 desses convertendo pro Founder Plan (R$59/mês) até o fim do Q2.
- Abertura de GA self-service (trial de **7 dias** — é o valor no código e no Terms —, planos R$79/R$149/R$249) só depois de validar isso, não antes — abrir cedo demais sem prova de retenção desperdiçaria a primeira impressão dos parceiros mais importantes.
- 8-15 negócios ativos no Brasil até o fim do ano, ainda sem verba de mídia paga relevante — crescimento é manual e remoto neste horizonte, não de canal escalável.

**Prioridades dos primeiros 90 dias:**
1. Montar lista de 50-100 prospects qualificados no Brasil (critério: 1-5 profissionais, sem agendamento online decente ou preso a marketplace com comissão).
2. Escrever e testar o script de contato remoto (Instagram DM/WhatsApp) com uma frase central: "você não paga comissão sobre o cliente que já é seu".
3. Publicar uma página "Bladiq vs. marketplace de comissão" no site.
4. Mapear e ativar canais de comunidade de barbeiros/cabeleireiros no Brasil (equivalente ao levantamento já feito pra Portugal — ainda pendente para o mercado brasileiro).
5. Fechar e ativar os primeiros 3-5 pilotos, com acompanhamento semanal de perto (não escalável de propósito — é o único jeito de aprender rápido com n pequeno).
6. Confirmar que o fluxo de pagamento cobre a expectativa do mercado brasileiro (Pix incluso, não só cartão) antes de prometer isso a um prospect.

---

## 2. Quadro estratégico

### O que a Bladiq é, em uma frase
Uma plataforma de agendamento e pagamentos que devolve a um dono de barbearia/salão a propriedade da relação com o cliente — sem comissão de marketplace sobre quem ele mesmo trouxe.

### A categoria que estamos reivindicando
A Bladiq não está criando uma categoria nova (agendamento online para negócios de beleza já existe, com Trinks, Fresha, Booksy, entre outros). Está **redefinindo os termos dentro da categoria**: a maioria dos concorrentes monetiza como marketplace (comissão sobre reserva, inclusive de clientes que o próprio dono trouxe, ou modelo de "leilão de visibilidade" dentro do próprio app deles). A Bladiq se posiciona como **infraestrutura, não marketplace** — o dono paga uma assinatura fixa, mantém 100% da relação com o cliente, e o diretório público (`/find/[city]`) é bônus de descoberta, não a proposta central. Essa é a mesma lógica de "own your audience" que já funcionou pra outras categorias (Substack vs. rede social, Shopify vs. marketplace) aplicada a agendamento de beleza.

### Para quem somos (ICP, destilado)
- Dono-operador de barbearia, salão de cabelo, estúdio de unha ou salão de beleza no Brasil, geralmente com 1-5 profissionais.
- O que dizem que querem: "um site/app de agendamento decente".
- O que realmente querem: parar de sangrar receita com no-show e cancelamento de última hora, parar de gastar o dia respondendo WhatsApp/Instagram pra marcar horário, e parar de sentir que está "alugando" a própria lista de clientes de um marketplace que cobra comissão.
- O que estão comprando de verdade: controle sobre o próprio fluxo de caixa (depósito, cobrança de no-show) e dignidade profissional (não depender de agenda de caderno nem de aparecer "no meio da lista" de um app de terceiros).

### A lógica do modelo de negócio
Assinatura mensal fixa (SaaS clássico), sem comissão sobre reservas trazidas pelo próprio dono — a monetização é a mensalidade, não uma fatia de cada agendamento. Piloto gratuito de 30 dias reduz o risco de decisão pro dono cético; Founder Plan (R$59/mês por 12 meses, só pros 20 primeiros parceiros) cria urgência real e recompensa quem chega cedo; GA (Starter R$79 / Growth R$149 / Pro R$249) segmenta por número de locais/profissionais — recalibrados 2026-09-24 contra o pricing real da Trinks (R$76-110), ainda não é pesquisa de willingness-to-pay brasileira (ver §13). Taxa do Stripe fica separada e transparente — a Bladiq não lucra em cima da taxa de processamento. Tese de canal composto: hoje é 100% prospecção manual + comunidade; a médio prazo, o diretório `/find/[city]` vira ativo de SEO orgânico à medida que parceiros são adicionados — cada parceiro fechado manualmente também melhora o canal orgânico futuro (efeito composto, não é só "mais um cliente").

### Voz de marca (não-negociável)
Não há um documento de voz formal ainda (gap real, ver rubrica §3) — mas os princípios já estão implícitos no próprio código e nos documentos do produto, e devem virar regra explícita a partir deste plano:

- **SIM**: falar só do que está no ar hoje, não do roadmap como se já existisse. Nomear restrições reais (isolamento de dados por tenant, RLS no banco, tratamento de dados alinhado à LGPD) como sinal de confiança, não como jargão técnico assustador. Linguagem direta, sem jargão de startup.
- **NÃO**: nenhuma promessa de IA/recepcionista automática — o próprio README documenta que essa promessa foi removida até haver demanda e desenho operacional seguro; reintroduzir isso na comunicação pública quebraria a própria disciplina do produto. Nenhum framing de "marketplace"/"roube o cliente do concorrente" — não é esse o jogo da Bladiq, é o jogo da Fresha/Booksy (a Trinks é assinatura fixa, como a Bladiq — não citar como exemplo de marketplace). Nenhuma tática de urgência falsa/pressão de vendas com donos de negócio que já são céticos com vendedor de software.

Se alguma peça de copy violar essas regras (especialmente qualquer menção a IA/automação que não existe hoje), ela deve ser reescrita antes de publicar — isso vale para toda copy gerada a partir das Seções 4-8 deste plano.

---

## 3. Estado atual

### Composição do time (superfície de marketing)

| Pessoa | Papel | Superfície de marketing |
|---|---|---|
| Fundador (CazaTech) | Founder/eng/produto | 100% do marketing hoje — growth, product marketing e content marketing, part-time, sem dedicação exclusiva |

Não há hire de marketing, contractor ou agência hoje. Não é tactical-only nem π-shaped — é founder-led puro, o que é normal e correto neste estágio (Tier 1). O primeiro "hire" recomendado não é uma contratação — é liberar as primeiras horas semanais do próprio fundador para prospecção (ver §11 RACI).

### Orçamento de marketing (atual)
- Pago: R$0/mês.
- Tooling: ~R$0-2.500/mês disponíveis, hoje não alocados a nenhuma ferramenta de marketing específica (a stack técnica — Resend, Sentry, Cloudinary — já está paga como custo de produto, não de marketing).
- Retainers/fCMO: nenhum.
- Headcount: 0 dedicado.
- CAC bloomed: desconhecido (pré-receita) — **maior decisão em aberto deste plano, ver §13**.
- % de ARR em marketing: não aplicável (ARR = R$0).

**Tier de funding: Pré-seed/bootstrapped (Tier 1)**, per `funding-stage-unlocks.md`. Implicação prática: todo movimento do plano precisa funcionar com tempo do fundador + as skills/MCPs disponíveis, sem depender de verba paga. Nenhuma recomendação deste plano assume orçamento pago antes que ele seja explicitamente desbloqueado por receita real (ver §10).

### Fase do crescimento SaaS
**Pré-receita — antes até da Fase 1 ($0-10K ARR)** per `growth-patterns.md`. A restrição vinculante não é produto nem funil — é fazer o primeiro contato humano funcionar. Não faz sentido medir "vazamento de funil" porque o funil ainda não existe; a Seção 9 é inteiramente sobre criar o primeiro funil, não otimizar um existente.

### O que já está feito (reconhecer, depois construir em cima)

| Ativo | Status | Alavancagem de marketing |
|---|---|---|
| Produto funcional completo (agenda, depósitos, cupons, mensagens, portal do cliente) | ✅ Pronto | Não é vaporware — dá pra vender e demonstrar hoje, ao vivo |
| Segurança/isolamento de tenant testado adversarialmente (RLS, MFA, rate limiting) | ✅ Pronto (`docs/LAUNCH-READINESS.md`) | Argumento de confiança para donos preocupados com dado de cliente e pagamento |
| Compliance LGPD (dados do cliente, base legal de tratamento, retenção documentada) | 🔄 Rascunho pronto, pendente revisão jurídica (ver `docs/marketing/../PRODUCT.md` e páginas legais) | Diferencial real vs. concorrente que não trata dado com seriedade; reduz objeção jurídica — mas só pode ser usado em vendas depois da revisão |
| i18n pt/en/de em produto e legal | ✅ Pronto | pt-BR é o idioma padrão do produto — sem trabalho extra de tradução pro mercado brasileiro |
| Landing page + seção de preço | ✅ Pronto (nunca testado com tráfego real) | Base pra iterar, não pra reconstruir do zero |
| Diretório público `/find/[city]` | ✅ Esqueleto pronto, vazio de conteúdo | Vira ativo de SEO só depois que houver parceiros reais listados |

### O que está em andamento (rascunhado, não lançado)

| Item | Status | Bloqueio |
|---|---|---|
| Nenhum item de marketing em rascunho | — | Não há trabalho de marketing "quase pronto" — o marketing simplesmente ainda não começou |

### O que está travado (precisa destravar este trimestre)

| Problema | Custo de não agir | Ação |
|---|---|---|
| Zero contato feito com prospects reais até hoje | Cada semana sem contato é uma semana sem sinal de mercado — o maior risco do produto neste momento não é técnico, é de distribuição | Iniciar prospecção manual na Semana 1 (§9) |
| Nenhuma página "vs. marketplace de comissão" | Perde o argumento mais forte de vendas toda vez que um prospect pergunta "qual a diferença pra Fresha" | Publicar na Semana 3-4 (§4, Move 4) |
| Nenhum canal de comunidade brasileiro mapeado | O canal de maior confiança do plano de Europa (comunidade lusófona local) não tem equivalente ainda documentado para o Brasil | Mapear na Semana 1-2 (§4, Move 2) |

### Retrato da rubrica de auditoria (17 seções)

Ver tabela completa em `research.md`. **Total: 23/85 (27%)** — formato "produto forte, pré-marketing": positioning, pricing e internacionalização já têm base sólida por virem do próprio produto; homepage, conteúdo, comparação com concorrente, material de vendas e SEO estão perto de zero simplesmente porque marketing ainda não começou, não porque algo deu errado. Isso é o esperado e correto para o estágio — as Seções 4-8 deste plano fecham exatamente essa lacuna, começando pelo que tem menor custo e maior retorno imediato (comparação com concorrente, prospecção manual) antes do que precisa de escala (SEO de conteúdo, ads).

---

## 4. Acquisition (Aquisição)

### Estado atual
Nenhum canal ativo. Zero tráfego medido, zero contato feito com prospects.

### O plano

**Move 1 — Prospecção remota no Brasil (revisado 2026-09-24, ver aviso de revisão).** Usar busca no Google Maps + Instagram + verificação cruzada por nome do negócio pra montar uma lista de 50-100 barbearias, salões de cabelo, estúdios de unha e salões de beleza, priorizando negócios com 1-5 profissionais, presença fraca ou ausente de agendamento online próprio (ou presos a marketplace com comissão), e sinais de atividade real (avaliações recentes, perfil do Google atualizado). Cidade-base ou recorte regional inicial **não definido neste plano** — ao contrário do recorte Lisboa/Porto (~60%) + Alemanha (~40%) do plano anterior, que tinha uma lógica de dados por trás (mercado direto vs. diáspora), aqui a operação já é 100% remota desde o início, então não há um motivo estrutural óbvio pra recortar por cidade sem o fundador decidir onde tem mais contexto/rede. Ver decisão aberta em §13. Segue o processo de qualificação e scoring do próprio catálogo de skills do projeto (`prospecting` — referência de prospecção local). Não é scraping em massa — é pesquisa manual, business a business, respeitando os termos do Google Maps.

**Move 2 — Comunidade de barbeiros/cabeleireiros no Brasil (mapeamento pendente).** Canal de maior confiança disponível no plano anterior era a rede pessoal do fundador na comunidade lusófona/brasileira na Europa — esse ativo específico não transfere 1:1 pro mercado interno. O equivalente a construir agora é: grupos de WhatsApp/Instagram/Facebook de profissionais de beleza, associações regionais de barbeiros e cabeleireiros, e eventos/feiras do setor no Brasil. `docs/marketing/community-channels.md` tem o mapeamento já feito para Portugal (ACP, ANCC, ANEP, APBCIB, grupos de Facebook, hashtags) como modelo de processo — o equivalente brasileiro ainda não foi levantado e é o primeiro item tático real desta seção. Abordagem, uma vez mapeado: não é "postar num grupo", é conversa 1:1 com introdução por alguém de confiança quando possível.

**Move 3 — Contato direto do fundador (Instagram DM/WhatsApp).** Pitch curto, específico, sem jargão: "você paga comissão hoje sobre cliente que já é seu? Isso não devia acontecer." Oferta: piloto gratuito de 30 dias, sem cartão de crédito, com o próprio fundador ajudando a configurar (concierge setup — ver §5). Meta: 10-15 contatos qualificados por semana a partir da Semana 3.

**Move 4 — Página "Bladiq vs. comissão de marketplace".** Uma página direta comparando o modelo de assinatura fixa da Bladiq contra o modelo de comissão de plataformas como a Fresha (~8% do faturamento, confirmado operando no Brasil) sobre reservas — inclusive as trazidas pelo próprio dono. `docs/marketing/comparison-page-draft.md` já tem um rascunho desse argumento montado pro contexto europeu (Fresha/Treatwell/Booksy) — o argumento central ("comissão mesmo sobre cliente que você trouxe") é market-agnostic, então o rascunho é ponto de partida, não trabalho do zero; adaptar pra citar Fresha como exemplo de comissão e Trinks como comparação de preço/features (modelo de cobrança igual ao nosso, não comissão — correção 2026-09-24). Serve dois papéis: argumento de vendas linkável durante o contato direto, e página de intenção alta pra quando SEO começar a importar (Q2+).

**Move 5 — Diretório `/find/[city]` como ativo composto.** Cada parceiro fechado manualmente entra no diretório da cidade correspondente — não é canal de aquisição por si só ainda (sem tráfego), mas cada adição de hoje é o que faz o diretório valer algo como SEO local em 6-12 meses. Tratar como investimento de longo prazo embutido em cada fechamento manual, não como iniciativa separada.

**Move 6 — Camada paga: explicitamente retida.** Nenhum orçamento de mídia paga neste trimestre — o ticket médio (R$79-149/mês) e o volume necessário (3-5 clientes) não justificam o CAC de aprendizado de um canal pago do zero. Revisitar só depois que o Move 1-3 provar CAC baixo o suficiente via canal manual (ver §10, Q3).

### Movimentos de 90 dias
- Semanas 1-2: montar a lista de 50-100 prospects; mapear comunidades/associações de barbeiros e cabeleireiros no Brasil (Move 2); escrever o script de contato (Instagram DM/WhatsApp) e o pitch de uma frase.
- Semanas 3-4: publicar a página de comparação; iniciar contato direto (10-15/semana); ativar os canais de comunidade mapeados.
- Semanas 5-8: fechar os primeiros pilotos (meta: 3-5 ativos); começar a listar parceiros fechados no diretório da cidade correspondente.
- Semanas 9-12: coletar os primeiros depoimentos/casos reais; refinar o pitch com base nas objeções mais repetidas.

### Perspectiva de 12 meses
- Q1: prospecção manual pura, sem conteúdo/SEO ainda.
- Q2: se a willingness to pay for validada (§10), começar conteúdo leve (a própria página de comparação + 2-3 posts sobre no-show/depósito) e expandir a busca de prospects dentro do Brasil.
- Q3: se o CAC manual continuar viável, primeiro teste pago pequeno (~R$1.500-2.500, intenção local no Google) e expansão pra 1-2 regiões adicionais, conforme onde a conversão validar melhor.
- Q4: reavaliar programa de indicação formal (ver §7) uma vez que exista uma base retida.

### Skills + ferramentas
- **Skills:** `prospecting` (referência local), `competitors` (página de comparação), `community-marketing`, `cold-email` (adaptado pra script de contato direto, não e-mail frio literal), `copywriting`.
- **MCPs/APIs:** nenhum wired hoje para marketing. GA4 (gratuito) deveria ser a primeira ferramenta ligada assim que o contato direto começar a gerar visitas à landing page — sem isso, não dá pra medir nada da Seção 13. Ahrefs/SEO pago: não prioritário no Tier 1 (ver §11).

---

## 5. Activation (Ativação)

### Estado atual
Fluxo de onboarding existe no produto, nunca testado com um dono de negócio real fora do time. Métrica de ativação já definida pelo próprio produto (`PRODUCT.md`): **página de agendamento publicada em menos de 15 minutos + primeira reserva em até 7 dias.**

### O plano

**Move 1 — Onboarding assistido (concierge) para os primeiros 3-5 parceiros.** Com n tão pequeno, escala não importa — o que importa é aprender rápido. O próprio fundador acompanha a configuração de cada parceiro ao vivo (chamada), garantindo que a página seja publicada em menos de 15 minutos como o produto promete. Isso não é só onboarding — é a maior fonte de pesquisa de cliente que a Bladiq vai ter neste trimestre (ver rubrica §3, item 2 = nota 1).

**Move 2 — Cutucão ativo se não houver reserva em 3 dias.** A métrica de ativação real é "primeira reserva em 7 dias", não só "página publicada". Se um parceiro publicar a página mas não tiver reserva em 3 dias, contato proativo do fundador (não e-mail automático — ainda não há volume que justifique automação) para entender o que está travando (divulgação pro próprio cliente final do salão, por exemplo).

**Move 3 — Revisão de fricção pós-piloto.** Ao final de cada um dos primeiros pilotos (convertido ou não), uma conversa curta e direta: o que travou, o que confundiu, o que faria a decisão de pagar mais fácil. Isso alimenta tanto a Seção 4 (pitch) quanto a Seção 8 (pricing) — inclusive se Pix precisa entrar no fluxo de pagamento antes do GA (ver §13).

### Movimentos de 90 dias
Embutidos no cronograma da Seção 4 — ativação e aquisição andam juntas neste tamanho de amostra.

### Perspectiva de 12 meses
Q1-Q2: onboarding 100% assistido pelo fundador. Q3+: se o volume passar de ~10 parceiros, começar a documentar o processo em um guia de self-onboarding (vídeo curto ou checklist) para não depender só do tempo do fundador — pré-requisito pro GA self-service do Q3 (§10).

### Skills + ferramentas
`onboarding`, `signup`, `copywriting`. Nenhum MCP necessário neste volume — quando o self-onboarding for necessário (Q3), instrumentar com GA4 pra medir taxa de conclusão sem intervenção humana.

---

## 6. Retention (Retenção)

### Estado atual
Não aplicável — sem clientes ainda.

### O plano

**Move 1 — Acompanhamento semanal com cada piloto durante os 30 dias gratuitos.** Não escalável de propósito. Com 3-5 parceiros, uma conversa semanal curta (WhatsApp ou ligação) é viável e é o que evita perder um piloto por um problema pequeno que passaria despercebido em um fluxo automatizado.

**Move 2 — Acompanhar taxa de no-show e "payment attachment" desde o dia 1.** Essas já são métricas de suporte definidas pelo produto (`PRODUCT.md`). Se um parceiro não estiver anexando pagamento/depósito às reservas, é sinal de que o valor central da Bladiq (proteger a receita) não está sendo usado — vale intervenção antes do fim do piloto, não depois.

**Move 3 — Conversa de véspera do dia 30 (antes de cobrar o Founder Plan).** Não deixar a cobrança ser surpresa nem depender só do produto pra converter — uma conversa direta sobre o que funcionou e o que não funcionou, antes do cartão (ou Pix) ser cobrado.

### Skills + ferramentas
`churn-prevention`, `emails` (útil só a partir de ~10+ clientes, quando lifecycle automatizado por Resend passa a valer o esforço — antes disso, contato humano é mais barato e mais eficaz).

---

## 7. Referral (Indicação)

### Estado atual
Não aplicável — sem clientes ainda.

### O plano

**Move 1 — Pedido informal de indicação, não programa formal.** Assim que um parceiro converter pro Founder Plan, pedir diretamente por 1 indicação de outro dono de salão/barbearia que ele conheça. Com n pequeno, um programa formal de indicação (comissão, dashboard de tracking) é esforço desproporcional ao retorno — o pedido direto, pessoa a pessoa, é mais forte nesse estágio e mais alinhado à voz de marca (nada de mecanismo "viral" artificial).

**Move 2 — Programa formal de indicação (idea #137, "two-sided referrals"), só a partir de Q3+**, quando existir uma base retida de 10+ parceiros que justifique o esforço de construir tracking/comissão.

### Skills + ferramentas
`referrals` (Q3+, quando formalizar), `emails` (lifecycle de indicação, mesma condição).

---

## 8. Revenue (Receita)

### Estado atual
Estrutura de preço já definida e implementada em código (`lib/billing/plan-limits.ts`): Founder Plan R$59/mês por 12 meses (só os 20 primeiros parceiros, após piloto gratuito de 30 dias), depois GA com trial de **7 dias** (`TRIAL_DAYS` em `lib/services/organization-service.ts`) e planos Starter R$79 / Growth R$149 / Pro R$249. Nunca pressure-testado com cliente real; recalibrados 2026-09-24 contra o pricing real da Trinks (R$76-110/mês) — ainda não é pesquisa de willingness-to-pay brasileira (ver §13).

### O plano

**Move 1 — Não mexer no preço antes de validar com os primeiros 3-5 parceiros.** O preço já está desenhado com uma lógica clara (Founder Plan recompensa quem chega cedo, planos GA segmentam por tamanho). O trabalho da Seção 8 neste trimestre não é redesenhar pricing — é confirmar, via as conversas da Seção 6, se R$59/mês é uma barreira real ou não para o piloto converter, e se os valores fazem sentido pro mercado brasileiro (já recalibrados contra a Trinks, mas ainda não testados com cliente real).

**Move 2 — Página de comparação de preço vs. comissão de marketplace (junto com Move 4 da Seção 4).** O maior argumento de revenue não é o valor absoluto de R$59-249/mês — é mostrar que uma comissão de marketplace sobre reservas ao longo de um ano custa mais do que a assinatura fixa pra um salão com volume razoável.

**Move 3 — Upsell Starter→Growth→Pro: fora de escopo deste trimestre.** Não há base suficiente ainda; volta a ser relevante em Q3+ quando o GA abrir (§10).

### Economia unitária

| Métrica | Valor | Nota |
|---|---|---|
| ARPC (receita média mensal por cliente) | R$59 (Founder Plan) até validação; R$79-249 em GA | Baseline do próprio pricing, recalibrado contra Trinks 2026-09-24, não medido com cliente real ainda |
| CAC blended | **Desconhecido — TBD** | Maior decisão em aberto do plano (§13); hoje o custo real é tempo do fundador, não dinheiro, o que dificulta o cálculo tradicional |
| Retenção anual | **Desconhecido — TBD** | Sem histórico; medir a partir dos primeiros 3-5 pilotos |
| LTV (aprox.) | Não calculável ainda | Depende de retenção, que depende dos primeiros meses reais |
| LTV/CAC | Não calculável ainda | — |

### Skills + ferramentas
`pricing` (validar os valores BRL contra o mercado assim que houver as primeiras conversas de piloto), `sales-enablement` (a página de comparação funciona como material de vendas), `revops` (fora de escopo até haver volume).

---

## 9. Roadmap de 90 dias

### Semanas 1-2 — Destravar

| Movimento | Estágio | Responsável |
|---|---|---|
| Montar lista de 50-100 prospects no Brasil (`prospecting` local) | Acquisition | Fundador |
| Mapear comunidades/associações de barbeiros e cabeleireiros no Brasil | Acquisition | Fundador |
| Escrever script de contato direto (Instagram DM/WhatsApp) + pitch de 1 frase | Acquisition | Fundador |

### Semanas 3-4 — Fundação

| Movimento | Estágio | Responsável |
|---|---|---|
| Publicar página "Bladiq vs. comissão de marketplace" | Acquisition + Revenue | Fundador |
| Ativar canais de comunidade mapeados na Semana 1-2 | Acquisition | Fundador |
| Iniciar contato direto — meta 10-15 contatos qualificados/semana | Acquisition | Fundador |
| Ligar GA4 (gratuito) na landing page | Acquisition (instrumentação) | Fundador |

### Semanas 5-8 — Velocidade

| Movimento | Estágio | Responsável |
|---|---|---|
| Fechar os primeiros pilotos — meta: 3-5 ativos | Acquisition → Activation | Fundador |
| Onboarding assistido (concierge) de cada piloto, garantindo publicação em <15min | Activation | Fundador |
| Acompanhamento semanal de cada piloto (no-show, payment attachment) | Retention | Fundador |
| Cutucão ativo se não houver reserva em 3 dias após publicação | Activation | Fundador |

### Semanas 9-12 — Compor

| Movimento | Estágio | Responsável |
|---|---|---|
| Conversa de fim de piloto (convertido ou não) com cada um dos 3-5 | Retention | Fundador |
| Conversão pro Founder Plan (cobrança dia 30) | Revenue | Fundador |
| Pedido direto de indicação a cada convertido | Referral | Fundador |
| Listar parceiros fechados no diretório da(s) cidade(s) correspondente(s) | Acquisition (composto) | Fundador |
| Revisão de 90 dias: o que funcionou, o que não funcionou, recalibrar Q2 | — | Fundador |

---

## 10. Perspectiva de 12 meses

**Método de orçamento usado:** nenhum dos dois métodos formais (Revenue-Based ou Goal-Based, `budget-planning.md`) é aplicável ainda — ambos exigem uma base de ARR ou CAC histórico que a Bladiq não tem (ARR = R$0 hoje). Aplicar a fórmula agora produziria um número fabricado, não defensável — indo contra o próprio princípio do método. Em vez disso, este plano trata o **tempo do fundador como o orçamento real** do Q1-Q2, e só volta a aplicar o Método 2 (Goal-Based) a partir do Q3, quando houver CAC real medido nos primeiros pilotos pra ancorar o cálculo.

**Orçamento total do ano:** ~R$0-2.500/mês em tooling (sem verba paga) até Q2; primeiro teste pago pequeno (~R$1.500-2.500 pontuais, não recorrente) condicionado a CAC manual comprovado, a partir do Q3.

**Meta de ARR de fim de ano:** não é uma meta de ARR em dinheiro — é uma meta de validação: **8-15 negócios ativos no Brasil, com pelo menos 60-70% de retenção dos que converteram do piloto para o Founder Plan.** Forçar uma meta de ARR específica agora seria promessa vazia (ver `budget-planning.md`: forecast sob controle de startup pré-receita é chute educado, não previsão).

**Padrão de crescimento esperado:** nem linear nem exponencial — **step-function em dois degraus**: primeiro degrau em Q2 (willingness to pay validada, 3-5 → Founder Plan), segundo degrau em Q3 (GA self-service abre, se e somente se o primeiro degrau se provar sólido). Não existe ritmo mensal previsível ainda porque não existe canal escalável ainda — o objetivo do ano é justamente criar as condições pra que um padrão linear (ex.: "+X parceiros/mês") comece a existir a partir do Q3-Q4. Sem âncora VC 3-3-2-2-2 — a empresa é bootstrapped, esse benchmark não se aplica.

### Q1 — Meses 1-3
**Estado de funding:** Tier 1 (pré-seed/bootstrapped).
**Foco:** provar que contato humano remoto consegue fechar pilotos reais no Brasil.
**Resultados até o fim do Q1:**
- Lista de 50-100 prospects qualificados construída.
- Comunidades/associações de barbeiros e cabeleireiros no Brasil mapeadas.
- 3-5 pilotos ativos (30 dias gratuitos), onboarding assistido.
- Página de comparação vs. marketplace publicada.
- GA4 instrumentado na landing page.

**Metas de KPI:** 3-5 pilotos ativos · 50-100 prospects contatados · taxa de resposta ao contato direto medida (mesmo que baixa — é a linha de base) · 0 incidentes críticos de confiabilidade durante os pilotos.

**Posição nas curvas S (canal/produto/mercado):** canal (prospecção remota) começando a subir; produto já maduro pro estágio; mercado (Brasil) ainda não testado.

### Q2 — Meses 4-6
**Estado de funding:** Tier 1, ainda sem verba paga.
**Foco:** validar willingness to pay — os pilotos convertem pro Founder Plan de verdade?
**Resultados até o fim do Q2:**
- Pelo menos 3 dos 3-5 pilotos convertidos pro Founder Plan (R$59/mês).
- Conteúdo leve no ar (comparação + 2-3 posts sobre no-show/depósito).
- Diretório com os primeiros parceiros reais listados.
- Expansão da lista de prospects dentro do Brasil (mais 50-100).

**Metas de KPI:** ≥60% dos pilotos convertendo pro Founder Plan · CAC manual (tempo investido / cliente fechado) medido pela primeira vez · payment attachment rate por parceiro ativo.

**Posição nas curvas S:** canal (prospecção) amadurecendo; começando a testar conteúdo/SEO como segunda curva antes que a primeira sature — coerente com o princípio de "começar a próxima curva antes da atual platô" (`growth-patterns.md`).

### Q3 — Meses 7-9
**Estado de funding:** Tier 1→transição — se MRR justificar, primeiro teste pago pontual (não é "seed close", é "MRR suficiente para financiar teste com receita própria").
**Foco:** abrir GA self-service e testar se o canal escala além do contato manual do fundador.
**Resultados até o fim do Q3:**
- GA aberto (trial 7 dias, Starter/Growth/Pro).
- Primeiro teste pago pequeno (~R$1.500-2.500) em busca de intenção local, condicionado a CAC manual comprovado no Q1-Q2.
- Guia de self-onboarding pronto (reduz dependência do tempo do fundador).
- Avaliação de expansão pra 1-2 regiões adicionais no Brasil.

**Metas de KPI:** primeira conversão via self-service sem intervenção do fundador · CAC pago (se testado) comparado ao CAC manual · 8-12 negócios ativos totais.

### Q4 — Meses 10-12
**Estado de funding:** dependente do resultado real do Q3 — este plano não assume uma rodada de investimento.
**Foco:** consolidar retenção e formalizar indicação antes de qualquer escala maior.
**Resultados até o fim do Q4:**
- Programa formal de indicação avaliado/lançado se a base retida justificar (10+ parceiros).
- Retenção 4/12 semanas medida e reportada (métrica já definida pelo produto).
- Decisão informada sobre expansão geográfica dentro do Brasil para 2027.

**Metas de KPI:** 8-15 negócios ativos totais · retenção de 12 semanas ≥ referência definida pelo produto · pelo menos 1 indicação orgânica fechada.

---

## 11. Stack de operações de marketing

### A tese
Um fundador sozinho, part-time, com R$0-2.500/mês, não substitui um time de marketing tradicional — mas consegue rodar prospecção, copy, comparação competitiva e instrumentação básica sem precisar contratar, usando as skills de marketing já instaladas no projeto (`.agents/skills/`) e ferramentas gratuitas. A diferença entre isso e "um fundador sozinho tentando fazer marketing" é ter um processo estruturado (este plano) em vez de esforço disperso.

### Skills mapeadas por estágio AARRR

| Estágio | Skills principais | Skills de apoio |
|---|---|---|
| Acquisition | `prospecting`, `competitors` | `community-marketing`, `cold-email`, `copywriting` |
| Activation | `onboarding`, `signup` | `copywriting` |
| Retention | `churn-prevention` | `emails` (a partir de Q3+) |
| Referral | `referrals` (Q3+) | `emails` |
| Revenue | `pricing` | `sales-enablement` |
| Cross-cutting | `product-marketing`, `customer-research` | `marketing-ideas` (fonte da Seção 12) |

### MCPs/APIs mapeados por estágio

| Estágio | Conexões existentes | Camada fCMO recomendada |
|---|---|---|
| Acquisition | Nenhuma ligada hoje | GA4 (gratuito) — prioridade Q1, sem isso não há como medir nada deste plano |
| Activation | Nenhuma | GA4, eventos de ativação (já definidos no produto: publicação <15min, primeira reserva <7 dias) |
| Retention | Nenhuma | Não prioritário até Q3+ (volume não justifica Customer.io/lifecycle automatizado ainda) |
| Referral | Nenhuma | Não prioritário até Q3+ |
| Revenue | Stripe (produto, não MCP de marketing) | Painel manual do Stripe é suficiente neste volume — não vale configurar Stripe MCP separado ainda |

**Honestidade sobre o estágio:** nenhum MCP de marketing está de fato conectado hoje (GA4, Ahrefs, Customer.io). Isso é esperado e correto para Tier 1 — a tese do stack agentic só se justifica quando há volume suficiente pra automatizar. Tratar a conexão do GA4 como item de Semana 3-4 (§9), não como pré-requisito para começar a prospecção manual.

### Um exemplo concreto
Ainda não há um momento operacional real registrado (a empresa não começou a prospecção). A primeira prova do stack será: usar a referência `prospecting`/local-prospecting para montar, direto no navegador e sem nenhuma ferramenta paga de lead-gen, uma lista qualificada de 50-100 salões/barbearias no Brasil — validando que um fundador não-especialista em growth consegue produzir uma lista de prospecção decente sozinho, em poucas sessões de pesquisa, seguindo um processo (não intuição pura).

### Desbloqueios de capacidade por estágio de funding

| Estágio | Headcount | Ferramentas | Canais ativos |
|---|---|---|---|
| **Hoje (Tier 1, bootstrapped)** | Fundador sozinho, part-time | GA4 (a ligar) + skills de marketing do projeto | Prospecção manual, comunidades locais mapeadas, contato direto |
| **Após MRR sustentar ~R$2.500-4.000/mês (equivalente a "seed close" local, sem rodada externa)** | + freelancer de conteúdo (contractor, não hire) | + orçamento pago pequeno (~R$1.500-2.500 teste) | + conteúdo leve/SEO, primeiro teste pago local |
| **Após 15-20+ parceiros retidos** | + eventual primeira contratação de growth/conteúdo (Manager, não CMO — ver `team-and-agency-model.md`) | + lifecycle automatizado (Resend já é a infra técnica, falta o programa de marketing) | + programa de indicação formal, expansão regional dentro do Brasil |

### Time e modelo de agência (RACI)

| Função | Dono estratégico (interno) | Executado por |
|---|---|---|
| Growth marketing (motor de demanda) | Fundador | Fundador (100% hoje) |
| Product marketing (motor de narrativa) | Fundador | Fundador — primeiro terceirizado seria um freelancer de copy, não antes de Q3 |
| Content marketing (motor de confiança) | Fundador | Fundador — mesma lógica, freelancer de conteúdo como primeiro contractor, não hire |

Não há função sem dono hoje — o gap real é capacidade de execução, não estratégia. Primeiro movimento de contratação recomendado (Q3+, condicionado a MRR): um contractor freelance pra produção de conteúdo (páginas de comparação por vertical, posts sobre no-show/depósito), não uma agência generalista nem um hire full-time — coerente com `team-and-agency-model.md` ("contractors e agências de nicho pra pré-Series-A", que aqui se traduz em "pré-tração real").

---

## 12. Banco tático de ideias

Este banco cruza as 139 ideias do catálogo de marketing do projeto com o estágio AARRR e a realidade da Bladiq (bootstrapped, hiperlocal, B2B pra pequeníssimo negócio, sem verba paga, voz sem hype). As Seções 4-8 prescrevem o que **está sendo feito**; esta seção mapeia o que é **possível**, com status por trimestre e razão de skip quando aplicável.

**Legenda:** Now (Q1) · Q2 · Q3+ · Q4+ · Skip (motivo)

### 12.1 Acquisition

| # | Ideia | Status | Nota Bladiq |
|---|---|---|---|
| 1 | Easy Keyword Ranking | Q2 | Palavras de intenção local ("agenda barbearia [cidade]") só valem a pena depois que o site tiver conteúdo real |
| 2 | SEO Audit | Q3+ | Auditoria formal só faz sentido com conteúdo publicado pra auditar |
| 3 | Glossary Marketing | Skip | Esforço desproporcional pro volume de busca do nicho |
| 4 | Programmatic SEO | Q3+ | `/find/[city]` é literalmente essa ideia — mas só escala depois de ter parceiros reais em múltiplas cidades |
| 5 | Content Repurposing | Q2 | Reaproveitar as conversas de piloto (§6) como conteúdo é praticamente grátis |
| 6 | Proprietary Data Content | Q3+ | Só depois de ter dados reais de no-show/retenção agregados entre parceiros |
| 7 | Internal Linking | Q2 | Junto com o primeiro conteúdo |
| 8 | Content Refreshing | Skip (por ora) | Não há conteúdo base pra refrescar ainda |
| 9 | Knowledge Base SEO | Q4+ | Ainda não há help docs públicos |
| 10 | Parasite SEO | Skip | Baixo ajuste à voz de marca (posicionamento direto, não growth-hacky) |
| 11 | Competitor Comparison Pages | **Now** | Move 4 da Seção 4 — a maior alavancagem de conteúdo disponível hoje |
| 12 | Marketing Jiu-Jitsu | Q2 | Reaproveitar objeções reais de comissão como copy |
| 13 | Competitive Ad Research | Skip | Sem verba paga, não há o que pesquisar em ads de concorrente ainda |
| 14 | Side Projects | Skip | Sem capacidade de engenharia sobrando pra side project de marketing |
| 15 | Engineering as Marketing | Q4+ | Ex.: calculadora "quanto você paga de comissão por ano" — boa ideia futura, não prioridade Q1 |
| 16 | Importers as Marketing | Skip | Não há dado de concorrente pra importar neste nicho |
| 17 | Quiz Marketing | Skip | Fora da voz de marca (soa como growth-hack, não como parceiro sério) |
| 18 | Calculator Marketing | Q3+ | Mesma ideia da #15, priorizar quando houver tempo de produto sobrando |
| 19 | Chrome Extensions | Skip | Não aplicável à categoria |
| 20 | Microsites | Skip | `/find/[city]` já cobre a função |
| 21 | Scanners | Skip | Não aplicável |
| 22 | Public APIs | Skip | Não aplicável ao ICP (dono de salão não é desenvolvedor) |
| 23-34 | Podcast/Facebook/Instagram/Twitter/LinkedIn/Reddit/Quora/Google/YouTube/Retargeting/Messenger Ads | Skip (por ora) | Toda a categoria de ads pagos retida até Q3, condicionada a CAC manual comprovado (§4, Move 6) |
| 35 | Community Marketing | **Now** | Move 2 da Seção 4 — mapear e ativar comunidade brasileira do nicho |
| 36 | Quora Marketing | Skip | Baixo volume de busca em português sobre o nicho no Quora |
| 37 | Reddit Keyword Research | Skip | Baixa relevância pro ICP (dono de salão não está no Reddit sobre isso) |
| 38 | Reddit Marketing | Skip | Idem |
| 39 | LinkedIn Audience | Q3+ | Mais útil pra B2B de ACV alto; ICP da Bladiq não vive no LinkedIn |
| 40 | Instagram Audience | Q2 | Instagram é onde o ICP realmente está — usar pra prova social depois dos primeiros pilotos, não antes |
| 41 | X Audience | Skip | ICP não está no X |
| 42 | Short Form Video | Q3+ | Vídeo curto mostrando o produto ao vivo pode ser potente, mas exige tempo que compete com prospecção no Q1 |
| 43 | Engagement Pods | Skip | Contra a voz de marca |
| 44 | Comment Marketing | Skip | Baixo retorno pro esforço no nicho |
| 49 | Monthly Newsletters | Q3+ | Sem base de assinantes ainda |
| 54-64 | Partnerships (afiliados via backlink, influencer whitelisting, reseller, expert network, newsletter swap, HARO, pixel sharing, Slack, integração, patrocínio de comunidade) | Skip (maioria) exceto #59 | #59 (citações de imprensa) = Q3+, condicionado a existir capacidade de relação com imprensa — hoje não há ninguém cuidando disso, ver decisão aberta §13; resto não se aplica ao estágio |
| 65-72 | Eventos (webinar, summit, roadshow, meetup, palestra, conferência, patrocínio) | Q3+/Q4+ | Meetup/feira local de donos de salão é a única ideia de evento com ajuste real — Q3+, quando já houver base de parceiros pra convidar |
| 73-76 | PR/Mídia (aquisição de mídia, cobertura de imprensa, PR de captação, documentários) | Skip/Q4+ | Sem captação em andamento (#75 n/a); cobertura de imprensa (#74) fica Q4+ e depende de alguém assumir relações com imprensa — hoje é justamente a lacuna que motivou lançar onde a fundadora está (ver aviso de revisão 2026-09-24) |
| 77-86 | Launches (Black Friday, Product Hunt, early-access, promoção de ano novo, giveaways, lifetime deal) | Skip (maioria) | #86 Lifetime Deals explicitamente fora — dano ao LTV e contra a voz de marca; giveaways/Twitter giveaways fora de voz; Product Hunt (#78) fica Q3+, na abertura do GA, não antes |
| 87-89 | Product-Led (powered by, migração grátis, contract buyout) | Skip | Não aplicável ao modelo (não há "migração" de concorrente formal nem contrato pra comprar) |
| 97-109 | Formatos de conteúdo (playlist, template, vídeo promo, entrevista, prints sociais, curso, livro, relatório anual, wrap de fim de ano, podcast, changelog, demo pública) | Q2-Q4+ (esparso) | #109 Public Demos = Q2, vídeo curto mostrando o produto ao vivo é o formato de maior retorno pro esforço; resto fica pra quando houver capacidade de conteúdo sobrando |
| 110-122 | Unconventional (prêmios, desafios, reality TV, controvérsia, moneyball, curadoria, grants, competição, cameo, OOH, stunts, guerrilla, humor) | Skip (quase todos) | Fora de voz de marca ou fora de escala (OOH é Series A+); #114 Moneyball Marketing (medir tudo, decidir por dado) já é o princípio operacional deste plano, não uma tática separada |
| 123-130 | Plataformas (open source, marketplace de apps, YouTube reviews/canal, source platforms, review sites, live audio) | Skip (maioria) exceto #129 | #129 Review Sites (Google Business Profile bem cuidado dos próprios parceiros) = Now, informalmente — orientar cada piloto a manter o perfil do Google ativo já ajuda a própria prospecção futura |
| 131 | International Expansion | Q4+ | Expansão além do Brasil condicionada ao sucesso local; sem plano de reentrada na Europa definido |
| 132 | Price Localization | Skip (por ora) | Preço já em BRL, mercado único (Brasil) neste horizonte — mas os valores em si ainda não foram validados localmente (ver §13), o que é diferente de "precisar localizar pra outro mercado" |
| 133 | Investor Marketing | Skip | Sem captação em andamento |
| 138 | Podcast Tours | Skip | Sem ângulo de imprensa ainda |

### 12.2 Activation

| # | Ideia | Status | Nota |
|---|---|---|---|
| 47 | Founder Welcome Email | Q3+ | Automatizar só quando o volume não permitir mais boas-vindas pessoais |
| 48 | Dynamic Email Capture | Skip | Sem tráfego suficiente pra popup de captura fazer sentido ainda |
| 51 | Onboarding Emails | Q3+ | Mesma lógica do #47 |
| 90 | One-Click Registration | **Now** | Já é como o produto funciona — reforçar que nenhuma fricção extra seja adicionada |
| 91 | In-App Upsells | Q3+ | Sem base Starter/Growth/Pro ainda pra ter o que upsellar |
| 95 | Concierge Setup | **Now** | Move 1 da Seção 5 — o coração da ativação neste trimestre |
| 96 | Onboarding Optimization | **Now** | Move 3 da Seção 5 (revisão de fricção pós-piloto) |
| 124 | App Store Optimization | Skip | Produto é web app, não app de loja |

### 12.3 Retention

| # | Ideia | Status | Nota |
|---|---|---|---|
| 45 | Mistake Email Marketing | Skip | Oportunístico, sem base pra aplicar ainda |
| 46 | Reactivation Emails | Q3+ | Sem churn medido ainda pra reativar ninguém |
| 50 | Inbox Placement | Q2 | Configuração técnica de e-mail (SPF/DKIM via Resend) — verificar cedo, custa pouco |
| 52 | Win-back Emails | Q3+ | Mesma lógica do #46 |
| 53 | Trial Reactivation | Q3+ | Relevante só a partir do GA self-service |
| 94 | Offboarding Flows | Q2 | Se um piloto não converter, entender por quê é dado valioso — vale um processo simples desde já |
| 135 | Support as Marketing | **Now** | O acompanhamento semanal da Seção 6 já É isso — suporte de perto como diferencial de marca |
| 134 | Certifications | Skip | Não aplicável à categoria |

### 12.4 Referral

| # | Ideia | Status | Nota |
|---|---|---|---|
| 62 | Affiliate Program | Skip (por ora) | Formal demais pro volume — ver Move 1 da Seção 7 (pedido informal) |
| 79 | Early-Access Referrals | Q2 | "Indique outro dono de salão e garanta uma das 20 vagas do Founder Plan" — usa a escassez real do próprio pricing |
| 92 | Newsletter Referrals | Skip | Sem newsletter ainda |
| 93 | Viral Loops | Skip | Fora de voz — o produto não é social/viral por natureza |
| 137 | Two-Sided Referrals | Q3+ | Move 2 da Seção 7, formal, condicionado a base retida |

### 12.5 Revenue

| # | Ideia | Status | Nota |
|---|---|---|---|
| 91 | In-App Upsells | Q3+ | Repetido da Ativação — cross-cut |
| 132 | Price Localization | Skip | Repetido da Aquisição — cross-cut, ver nota lá |

### 12.6 Cross-cutting / fundação de marca

| # | Ideia | Status | Nota |
|---|---|---|---|
| 114 | Moneyball Marketing | **Now** | Princípio operacional deste plano inteiro — decidir por dado (mesmo que só qualitativo, das conversas de piloto), não por intuição |
| 139 | Customer Language | **Now** | Capturar a linguagem exata que os prospects usam pra descrever o problema (§4-6) e usar essa linguagem literal na copy — maior alavancagem de messaging disponível com zero orçamento |

### Resumo do banco de ideias
- **~10 ideias em "Now"** — concentradas em prospecção, comparação competitiva, ativação assistida e linguagem do cliente. Coerente com um plano de primeira tração: poucas coisas, feitas bem, com contato humano real.
- **~15-20 ideias em Q2-Q3+** — sobretudo conteúdo leve, e-mail lifecycle e primeiras automações, condicionadas a validar willingness to pay antes.
- **A maioria das 139 ideias está no Skip** — a maior parte da categoria "Paid Ads" (12 ideias), "Unconventional" (13 ideias) e formatos de conteúdo pesados (cursos, livros, documentários) simplesmente não se aplicam a um bootstrapped B2B hiperlocal com voz sem hype.
- **O que isso prova:** o plano cobre uma fração pequena e deliberada da superfície tática disponível — apropriado para o estágio. a Seção 12 vira inventário pra escalar atividade sem perder coerência estratégica conforme capacidade se abrir em Q2 → Q3 → Q4.

---

## 13. Medição, RACI, decisões em aberto, apêndice

### Medição — as métricas que importam

**North star (já definida pelo próprio produto, `PRODUCT.md`):** receita confirmada/protegida processada pela Bladiq, por negócio ativo. Captura exatamente a tese do modelo — a Bladiq não vende agendamentos, vende proteção de receita (depósito, redução de no-show, cobrança confiável).

**Indicadores líderes por estágio AARRR:**

| Estágio | Indicadores líderes |
|---|---|
| Acquisition | Prospects contatados/semana · taxa de resposta ao contato direto · visitas à landing page (GA4, a partir da Semana 3) |
| Activation | % publicando página em <15min · % com primeira reserva em <7 dias (ambas já definidas pelo produto) |
| Retention | No-show rate · payment attachment rate · retenção 4/12 semanas (já definidas pelo produto) |
| Referral | Indicações pedidas vs. indicações fechadas |
| Revenue | Conversão piloto→Founder Plan · MRR total · CAC manual medido (tempo investido/cliente fechado) |

**Cadência de revisão:**
- Semanal: fundador revisa sozinho os números da semana (prospects contatados, respostas, status dos pilotos ativos) — 15-20 min, formato tabela simples.
- Mensal: revisão mais de perto contra as metas de KPI do trimestre (§10) — decide se algo precisa mudar antes do fim do trimestre.
- Trimestral: recalibração completa do plano — este documento deve virar v2 ao fim do Q1, incorporando o que foi aprendido com os primeiros pilotos reais.

### RACI

| Domínio | Responsável | Aprovador | Consultado | Informado |
|---|---|---|---|---|
| Plano estratégico | Fundador | Fundador | — | — |
| Voz de marca | Fundador | Fundador | — | — |
| Prospecção/contato direto | Fundador | Fundador | — | — |
| Onboarding assistido | Fundador | Fundador | — | — |
| Página de comparação/copy | Fundador (ou freelancer a partir de Q3+) | Fundador | — | — |
| Pricing | Fundador | Fundador | Pilotos ativos (feedback via §6) | — |
| Narrativa pra futura captação | Fundador | Fundador | — | — |
| Futuras contratações | Fundador | Fundador | — | — |

Com time de uma pessoa, o RACI é trivial hoje — o valor de deixá-lo explícito é sinalizar onde o primeiro ponto de alívio deveria entrar (copy/conteúdo, via freelancer, não antes de Q3 — ver §11).

### Decisões em aberto, por impacto

1. **CAC e retenção são completamente desconhecidos.** Toda a Seção 10 depende de medir isso nos primeiros pilotos reais — é a decisão de maior impacto do plano inteiro, porque decide se o canal manual escala ou não.
2. **Cidade-base/recorte regional de prospecção não está definido.** Diferente do plano anterior (Lisboa/Porto vs. Alemanha, com lógica explícita de mercado direto vs. diáspora), este plano não recorta por cidade porque a operação já nasce remota. Vale decidir se faz sentido concentrar os primeiros 50-100 prospects numa região onde o fundador já tem alguma rede/contexto, em vez de espalhar por todo o Brasil desde o início.
3. **Comunidades/associações de barbeiros e cabeleireiros no Brasil ainda não foram mapeadas.** `community-channels.md` tem o modelo pronto pra Portugal; o equivalente brasileiro é trabalho pendente, não feito neste plano por não haver base de pesquisa local confiável sem o fundador confirmar rede/região.
4. **[Parcialmente resolvido 2026-09-24]** Os valores em BRL foram recalibrados contra o pricing real da Trinks (R$76-110/mês) — Founder Plan R$59, Starter R$79, Growth R$149, Pro R$249. Ainda não é pesquisa de willingness-to-pay, só deixou de ser conversão arbitrária de EUR.
5. **[Em andamento 2026-09-24]** Pix habilitado no depósito de reserva via Stripe Connect (capability `pix_payments` na conta do tenant, `country === "BR"`). A cobrança da própria assinatura SaaS (dono do salão pagando a Bladiq) continua só cartão — Pix recorrente não está disponível no Brasil via Stripe (Pix Automático é só por convite). Avaliar migração/complemento com **Asaas** (fintech nativa brasileira, sem essa limitação de Pix recorrente) como próximo projeto — não escopado ainda, decisão do fundador de tratar como rodada separada.
6. **Não há decisão tomada sobre quando abrir GA self-service.** Este plano recomenda condicionar a Q3 e a willingness-to-pay validada — mas é uma escolha do fundador, não uma certeza.
7. **O worker BullMQ precisa estar no ar antes de qualquer prospecção.** Hoje tudo roda na Vercel, que não executa processo longo — então nenhum e-mail transacional sai e holds `PENDING_PAYMENT` nunca expiram. O primeiro prospect que se cadastrar não recebe e-mail nenhum. Migração para Railway em andamento.
8. **Não existe decisão sobre expansão além do recorte inicial dentro do Brasil antes do fim do ano** — este plano trata isso como Q4+/2027, mas é uma escolha explícita, não um default.

### Apêndice — links de aprofundamento

**Publicado neste repo:**
- `docs/LAUNCH-READINESS.md` — auditoria de segurança/prontidão de lançamento (produzida na mesma sessão deste plano)
- `PRODUCT.md` — promessa de produto, princípios, modelo comercial, métricas
- `docs/ROADMAP-2026-08-01.md` — roadmap Gate 0 → assisted beta → GA → growth
- `SECURITY.md`, `docs/ARCHITECTURE.md`, `docs/data-retention-policy.md` — fundamentos técnicos citados na Seção 2 (voz de marca) como sinal de confiança
- `docs/marketing/community-channels.md` — mapeamento de comunidades feito pra Portugal, modelo de processo pro mapeamento brasileiro pendente (decisão aberta #3)
- `docs/marketing/comparison-page-draft.md` — rascunho da página vs. marketplace, feito pro contexto europeu, ponto de partida pra adaptação (Move 4, §4)

**Contexto estratégico do fundador (fora deste repositório de plano):**
- Rede pessoal/comunidade de profissionais de beleza no Brasil — ainda não documentada nem confirmada; diferente do plano de Europa, este plano não assume que ela existe (decisão aberta #2-3)
- Registro completo de intake (research record) mantido junto com os arquivos de trabalho deste plano de marketing

---

*Bladiq Marketing Plan v1. Preparado por fCMO run (Claude Code), 2026-08-14. Revisado 2026-09-24 para o pivô de mercado ao Brasil. Para revisão do fundador.*
