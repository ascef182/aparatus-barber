# Manual de marca — Bladiq

> **STATUS (2026-10-29):** a paleta implementada em código é diferente da
> descrita abaixo. O usuário aprovou uma direção dark estilo Spotify
> (fundo #121212, superfícies #181818, acento verde #1ED760) — ver
> `.theme-marketing` em `app/globals.css` como fonte da verdade atual.
> O "Coral Profundo" (#9C3B4A) deste documento é um conceito anterior,
> nunca migrado para o código, e está obsoleto. Este manual precisa de
> uma revisão completa para refletir a paleta escura; até lá, trate o
> código como autoritativo para cor.

Primeira versão do manual de marca. Criado depois de rejeitar uma primeira
rodada de conceitos de logo baseados em "lâmina/navalha" — bom para
barbearia, mas alheio a salão de unha. Este documento existe pra fixar
posicionamento, voz e cor **antes** de qualquer novo conceito visual, e pra
isso não recria nada que já exista: reaproveita e cita `PRODUCT.md` e
`.agents/product-marketing.md`.

## 1. Posicionamento e promessa

Fonte: `PRODUCT.md`.

Bladiq é um SaaS de agendamento para negócios donos-operados de cuidado
pessoal no Brasil: **barbearia, salão de cabelo, estúdio de unha e salão de
beleza**. Promessa: o dono é proprietário da relação com o cliente, recebe
reservas e depósitos 24h, e protege o dia de trabalho sem comissão de
marketplace sobre clientes que ele mesmo trouxe.

North star: receita confirmada/protegida processada pela Bladiq, por negócio
ativo. Ativação: página publicada em <15min **e** primeira reserva em <7
dias.

## 2. Público — quatro segmentos co-iguais

Fonte: `.agents/product-marketing.md`.

Barbearia, salão de cabelo, estúdio de unha e salão de beleza são tratados
como **igualmente prioritários** — não há beachhead único, nem cidade-base
definida ainda. Isso é uma restrição de design, não um detalhe:

> **Nenhum elemento visual da marca pode favorecer um segmento sobre os
> outros três.** Um ícone de navalha fala só com barbearia; um ícone de
> esmalte fala só com unha. O ícone principal precisa representar o
> *agendamento em si* — a coisa que os quatro segmentos têm em comum — não a
> ferramenta de um ofício específico.

## 3. Personalidade e voz

Fonte: `.agents/product-marketing.md` → seção "Brand Voice" (reproduzida
aqui, não reescrita):

> **Tone:** Direto, sóbrio, sem jargão de startup. Fala com dono de negócio
> pequeno, não com comprador de software.
> **Style:** Frase curta. Nomear restrição real (isolamento de dados, base
> legal de tratamento) como sinal de confiança, não escondê-la. Português é
> o idioma principal, não cortesia.
> **Personality:** honesto · técnico-mas-legível · do lado do dono · nada
> hypado · discretamente rigoroso.

**Palavras a usar:** sua agenda · seus clientes · mensalidade fixa · sem
comissão · depósito · no-show · em 15 minutos.

**Palavras a evitar** (regra dura — ver `docs/marketing/plan.md` §2): IA /
recepcionista automática / automação inteligente; qualquer framing de
marketplace ("mais clientes pra você"); urgência falsa; roadmap como se já
existisse.

Essa voz direta e sóbria é o motivo pelo qual a cor da marca (seção 5) é
quente mas nunca pastel/lúdica — o tom é "ferramenta de trabalho confiável",
não "app de beleza fofo".

## 4. Cor — Direção escolhida: Coral Profundo

Três direções foram propostas e comparadas visualmente (Ametista, Âmbar &
Carvão, Coral Profundo — ver `logos/paleta-bladiq.html`). **Coral Profundo
foi a escolhida.** Racional: tom quente e humano, alinhado à voz "do lado do
dono"; não é pastel de salão de beleza nem associado a nenhum segmento
específico; passa contraste AA.

Esta paleta **substitui** a paleta "Minimal Premium" verde atualmente em
`app/globals.css` como referência de marca — a migração dos tokens no código
é um passo separado, feito só quando o usuário pedir.

### Tokens — modo claro

| Token | Hex | Uso |
|---|---|---|
| `--background` | `#FBF8F7` | Fundo da aplicação |
| `--foreground` | `#2B1A1D` | Texto principal |
| `--card` / `--popover` | `#FFFFFF` | Superfícies elevadas |
| `--card-foreground` / `--popover-foreground` | `#2B1A1D` | Texto em superfícies elevadas |
| `--primary` | `#9C3B4A` | Botão primário, links, foco, KPIs de marca |
| `--primary-foreground` | `#FFFFFF` | Texto sobre primária (contraste 6.7:1, AA) |
| `--secondary` | `#F2DEE2` | Fundos secundários suaves |
| `--secondary-foreground` | `#5C2630` | Texto sobre secundária |
| `--muted` | `#FBF3F1` | Fundos neutros discretos |
| `--muted-foreground` | `#8A6B6E` | Texto discreto |
| `--accent` | `#D8A24A` | Destaque decorativo (marketing, ilustração) |
| `--accent-foreground` | `#2B1E10` | Texto sobre accent |
| `--destructive` | `#E0393F` | Ações destrutivas |
| `--destructive-foreground` | `#FFFFFF` | Texto sobre destructive |
| `--success` | `#1FA971` | Estado positivo (mantido — já distinto da primária) |
| `--warning` | `#C98A2E` | Estado de alerta (mais saturado que `--accent`, de propósito) |
| `--info` | `#4D8BF7` | Estado informativo (mantido) |
| `--border` | `#EFDCDF` | Bordas |
| `--input` | `#FFFFFF` | Fundo de inputs |
| `--ring` | `#9C3B4A` | Anel de foco |
| `--chart-1..5` | `#9C3B4A` / `#C97683` / `#D8A24A` / `#5C2630` / `#8A6B6E` | Séries de gráfico |
| `--sidebar` | `#241317` | Sidebar (sempre escura, independente do tema — mesmo padrão já usado hoje) |
| `--sidebar-foreground` | `#F2DEE2` | Texto da sidebar |
| `--sidebar-primary` | `#9C3B4A` | Item ativo da sidebar |
| `--sidebar-accent` | `#3A1F24` | Hover/seleção da sidebar |
| `--sidebar-border` / `--sidebar-ring` | `#3A1F24` / `#C97683` | — |

### Tokens — modo escuro

| Token | Hex |
|---|---|
| `--background` | `#1C1113` |
| `--foreground` | `#F2E6E8` |
| `--card` | `#271A1D` |
| `--primary` | `#C97683` (mais claro que o modo claro, pra legibilidade sobre fundo escuro — mesmo princípio já usado hoje, onde a primária também muda no dark mode) |
| `--primary-foreground` | `#241317` |
| `--secondary` | `#3A2327` |
| `--muted` | `#241619` |
| `--accent` | `#E3B569` |
| `--destructive` | `#F0535A` |
| `--success` | `#34D399` |
| `--warning` | `#E3B569` |
| `--info` | `#60A5FA` |
| `--border` / `--input` | `#3A2327` / `#271A1D` |
| `--ring` | `#C97683` |

*(Sidebar permanece igual à do modo claro — já é sempre escura.)*

### Ponto de atenção herdado da escolha

Vermelho-tijolo como primária deixa a primária e o `--destructive` na mesma
família de cor. Resolvido mantendo o destructive **mais saturado e mais
"quente-puro"** (`#E0393F`) enquanto a primária é **dessaturada/amarronzada**
(`#9C3B4A`) — a diferença de saturação evita confusão entre "botão
principal" e "excluir". Revisar visualmente lado a lado antes de aplicar no
código.

## 5. Tipografia

Inter, já usada em todo o produto (`--font-sans: Inter, sans-serif` em
`app/globals.css`). O manual não propõe trocar a fonte do produto — só o
logo (seção 6) pode usar um tratamento tipográfico próprio, desde que
funcione ao lado do Inter nas telas do app.

## 6. Diretrizes de ícone para o logo

Regra central (ver seção 2): **o ícone principal representa agendamento,
não o ofício de um segmento só.**

**Favorecer:**
- Agenda/calendário, confirmação (check), relógio/horário
- Marca abstrata/monograma baseado nas letras de "Bladiq"
- Silhueta genérica de cadeira (comum a barbearia, salão e manicure, sem
  detalhar ferramenta de nenhum ofício)

**Evitar como ícone principal:**
- Navalha, lâmina, tesoura de barbeiro (fala só com barbearia)
- Esmalte, lixa de unha (fala só com manicure)
- Secador, escova, prancha (fala só com cabelo)
- Qualquer clichê de gênero (laço, flor genérica de "salão de beleza"
  feminino; navalha/riscas de barbearia masculina)

Esses ofícios podem aparecer como **ilustração secundária** (ex.: banner de
marketing, onboarding por segmento), nunca no ícone/wordmark principal da
marca.

## 7. Próximo passo

Com cor e diretrizes de ícone fechadas aqui, retomar a fase *Explore* da
skill `logo-designer` (já instalada em `~/.claude/skills/logo-designer` e em
`bladiq/.claude/skills/logo-designer`) com um brief corrigido: paleta Coral
Profundo + metáforas de agendamento neutras, nunca ligadas a um único
segmento.
