# Revisão jurídica pendente — pivô LGPD

**Preparado por:** Claude Code, sessão de execução do plano pós-pivô Brasil
**Data:** 2026-09-24
**Status:** Rascunho estrutural, não é aconselhamento jurídico. Feito pra economizar tempo de advogado — reúne exatamente o que mudou e exatamente onde ainda falta confirmação, em vez do advogado ter que ler o código pra achar isso sozinho.

## Contexto

Até 2026-09-24, a Bladiq era um produto DACH-first: compliance legal modelada em cima da lei alemã (Impressum sob §5 TMG/§18 MStV, DPA/AVV Art. 28 GDPR, retenção fiscal GoBD §147 AO de 10 anos). Com o pivô de mercado pra Brasil, toda essa camada foi reescrita estruturalmente pra referenciar a LGPD (Lei 13.709/2018) em vez da lei alemã — mas é um rascunho técnico, não uma adequação validada por advogado. Este documento existe pra você levar pra quem for contratado, sem precisar garimpar o código.

## O que mudou (revisão técnica, não jurídica)

| Página/arquivo | Antes | Depois |
|---|---|---|
| `app/(marketing)/impressum/page.tsx` | Impressum nos termos do §5 TMG/§18 MStV | Página de transparência "Dados da Empresa" (CNPJ, endereço, contato) — sem citar exigência legal específica, porque não encontrei equivalente brasileiro direto a um Impressum |
| `app/(marketing)/privacy/page.tsx` | Base legal GDPR Art. 6, retenção "10 anos GoBD", seção de representante Art. 27 GDPR na UE | Base legal LGPD Art. 7 (tratamento) e Art. 18 (direitos do titular), retenção marcada como "em revisão jurídica" (não afirma mais um prazo específico), seção de representante removida (não se aplica — CazaTech é estabelecida no Brasil) |
| `app/(marketing)/dpa/page.tsx` | "Data Processing Agreement" citando Art. 28 GDPR (controller/processor) | Mesmo documento citando LGPD Art. 39 (controlador/operador) |
| `app/t/[slug]/legal/impressum/page.tsx`, `.../legal/privacy/page.tsx` | Mesma lógica alemã, por-tenant | Mesma adaptação — "Dados da Empresa" em vez de Impressum, gate de bloqueio do agendamento público mantido mas escopado só a `Location.countryCode === "DE"` (filiais alemãs legadas, não o caminho padrão brasileiro) |
| `docs/data-retention-policy.md`, `lib/services/customer-service.ts`, `prisma/schema.prisma` (comentários) | Citavam GoBD §147 AO / GDPR como base pro prazo de retenção de `Booking` (reserva/pagamento) | Citam LGPD Art. 16/18, mas **sem afirmar um prazo específico** — o comportamento de não apagar `Booking` foi mantido (conservador), só o número "10 anos" foi removido por não ter mais base legal nenhuma |
| Copy pública (`messages/pt.json` e outros locales) | "Conforme GDPR", "conformidade legal alemã" (hero, FAQ, seção de features da landing) | "Conforme LGPD" |

## Perguntas específicas pra quem revisar (economiza tempo de descoberta)

1. **Prazo de retenção de `Booking` (reserva + pagamento).** Hoje o produto nunca apaga esses registros, mesmo quando o cliente pede eliminação de dados (só anonimiza `Customer`, não `Booking`). Isso era justificado por lei fiscal alemã (10 anos). Qual é o prazo/base legal brasileira correta aqui — obrigação fiscal (nota fiscal, Receita Federal), consumerista (CDC), ou outra? É seguro manter o comportamento atual (nunca apagar) até ter a resposta, ou isso já é um risco?
2. **Enquadramento como "agente de pequeno porte" (Resolução CD/ANPD nº 2).** A Bladiq está pré-receita, é uma micro/pequena empresa (CazaTech). Essa resolução da ANPD dá flexibilizações de conformidade pra agentes de pequeno porte — a Bladiq se qualifica? Se sim, isso muda o escopo/custo da adequação?
3. **"Dados da Empresa" no lugar do Impressum.** Não existe exigência legal brasileira equivalente ao Impressum alemão que eu tenha encontrado — a página virou só transparência voluntária (CNPJ, endereço, contato). Isso está correto, ou existe alguma exigência de identificação de fornecedor/prestador de serviço no Brasil (ex.: Marco Civil da Internet, CDC) que a página devesse atender explicitamente?
4. **Modelo controlador/operador (LGPD Art. 39) no DPA.** O documento `/dpa` foi adaptado de "Art. 28 GDPR" pra "LGPD Art. 39" trocando só a citação — vale uma revisão de conteúdo pra confirmar que a estrutura do documento (objeto, subprocessadores, medidas de segurança, direitos do titular, eliminação) cobre o que a LGPD exige nesse tipo de contrato entre controlador (o dono do salão) e operador (a Bladiq).
5. **Retenção de `AuditLog`/`ConsentLog`/`NotificationLog`.** Ver `docs/data-retention-policy.md` — política-alvo documentada (90 dias/3 anos/3 anos) mas nunca teve base legal brasileira confirmada, só um comentário genérico "GDPR + operacional" no schema (já trocado pra "LGPD", mas sem validação de conteúdo).

## Opções de consultoria levantadas (não é indicação, é ponto de partida pra pesquisar)

Pesquisa rápida (2026-09-24) por consultorias/escritórios especializados em LGPD para startups/PMEs no Brasil — nenhuma foi avaliada em profundidade, é só uma lista pra você pesquisar:

- **BL Consultoria Digital** ([blconsultoriadigital.com.br](https://blconsultoriadigital.com.br/)) — consultoria jurídica LGPD/ISO 27001/ISO 42001 pra PMEs/startups, mesmo advogado do início ao fim.
- **Legrow Law** ([legrowlaw.com](https://legrowlaw.com/)) — advocacia focada em empresas de tecnologia, LGPD e contratos de SaaS.
- **Macher Tecnologia** — pacote de consultoria inicial de 5h remota, time multidisciplinar (privacidade/proteção de dados/cibersegurança), voltado a startups/PMEs em estágio inicial de adequação.
- **AdequarLGPD** ([adequarlgpd.com.br](https://adequarlgpd.com.br/)) — estruturação de políticas/processos/governança de dados.

## Próximo passo

Levar este documento (ou as 5 perguntas da seção acima) pra primeira conversa com quem for contratado — deve reduzir bastante o tempo de descoberta inicial, já que o levantamento técnico de "o que mudou e onde" já está feito.
