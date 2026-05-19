<div align="center">
  <img src="./public/logo.svg" alt="Aparatus Logo" width="200" />
  <h1 align="center" style="margin-top: 0;">Aparatus Barber</h1>
  <p align="center">
    Plataforma moderna de agendamento para barbearias com assistente de IA
  </p>
  <p align="center">
    <a href="#features">Features</a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="#tech-stack">Tech Stack</a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="#quick-start">Quick Start</a>&nbsp;&nbsp;|&nbsp;&nbsp;
    <a href="#deploy">Deploy</a>
  </p>
</div>

<br />

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <br />
  <img src="https://img.shields.io/badge/Stripe-008CDD?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/Better_Auth-000000?style=for-the-badge&logo=auth0&logoColor=white" alt="Better Auth" />
  <img src="https://img.shields.io/badge/AI_SDK-FF6F00?style=for-the-badge&logo=openai&logoColor=white" alt="AI SDK" />
  <img src="https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcnui&logoColor=white" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm" />
</p>

---

## Sobre

**Aparatus Barber** é uma aplicação full-stack para agendamento online em barbearias. O cliente pode navegar por barbearias, visualizar serviços, escolher horários disponíveis e pagar online via Stripe. Conta também com um **assistente de IA** que permite agendar serviços por conversa natural.

Projeto desenvolvido como portfólio, demonstrando arquitetura moderna com Next.js 16 App Router, Server Actions, autenticação OAuth, pagamentos reais e integração com IA generativa.

---

## Features

### Para Clientes

- **Busca e descoberta** — Encontre barbearias por nome ou categoria (Cabelo, Barba, Sobrancelha, etc.)
- **Perfil da barbearia** — Veja detalhes, fotos, serviços e preços
- **Agendamento online** — Selecione data, horário disponível e confirme em poucos cliques
- **Pagamento com Stripe** — Checkout seguro em reais (BRL) com cartão de crédito
- **Gerenciamento de agendamentos** — Acompanhe reservas confirmadas, finalizadas e cancele com reembolso
- **Assistente IA** — Converse com a Agenda.ai para agendar sem navegar: *"Quero cortar o cabelo amanhã às 14h"*

### Técnicas

- Autenticação com Google OAuth (Better Auth)
- Server Actions tipadas com validação Zod (next-safe-action)
- Streaming de IA em tempo real com `ai` SDK + OpenAI GPT-4o-mini
- Webhook Stripe para confirmação de pagamentos
- Revalidação de cache via Next.js `revalidatePath`
- Design responsivo com Tailwind CSS 4 + shadcn/ui
- Tema claro/escuro com next-themes

---

## Tech Stack

| Categoria | Tecnologias |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Database** | PostgreSQL, Prisma ORM 6, Prisma Adapter PG |
| **Auth** | Better Auth 1.6 com Google OAuth |
| **Pagamentos** | Stripe (Checkout Sessions + Webhooks) |
| **IA** | AI SDK 5 (Vercel), OpenAI GPT-4o-mini, Google Gemini |
| **UI** | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide React |
| **Estado** | TanStack React Query |
| **Validação** | Zod 4, next-safe-action 8 |
| **Ferramentas** | pnpm, ESLint, Prettier, date-fns |

---

## Arquitetura

```
src/
├── app/
│   ├── _actions/          # Server Actions (next-safe-action)
│   ├── _components/       # Componentes compartilhados + shadcn/ui
│   │   └── ui/            # Primitivos UI (button, sheet, dialog...)
│   ├── _providers/        # Providers React (QueryClient)
│   ├── api/
│   │   ├── auth/          # Better Auth endpoints
│   │   ├── chat/          # Streaming de IA (POST)
│   │   └── stripe/        # Webhook de pagamento
│   ├── barbershops/       # Listagem + detalhe da barbearia
│   ├── bookings/          # Agendamentos do usuário
│   ├── chat/              # Interface do assistente IA
│   ├── layout.tsx         # Layout raiz
│   └── page.tsx           # Home (/)
├── lib/
│   ├── auth.ts            # Configuração Better Auth (server)
│   ├── auth-client.ts     # Client Better Auth (browser)
│   ├── action-client.ts   # Safe action client
│   ├── prisma.ts          # Singleton Prisma
│   └── utils.ts           # Utilitários (cn)
├── prisma/
│   ├── schema.prisma      # Modelos: User, Barbershop, Service, Booking
│   └── seed.ts            # Seed com 10 barbearias + serviços
└── generated/prisma/      # Prisma Client gerado
```

### Fluxo de Agendamento

```
Busca → Barbearia → Serviço → Calendário → Horário → Stripe Checkout → Confirmação
                                                                         ↓
                                                         Webhook cria Booking no DB
```

---

## Quick Start

### Pré-requisitos

- Node.js 20+
- pnpm
- PostgreSQL (local ou Neon/Railway)
- Contas: Google OAuth, Stripe, OpenAI (ou Google AI)

### Passo a passo

```bash
# 1. Clone
git clone https://github.com/seu-usuario/aparatus-barber.git
cd aparatus-barber

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais (veja tabela abaixo)

# 4. Crie o banco e popule com dados de exemplo
pnpm prisma db push
pnpm prisma db seed

# 5. Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|---|---|---|
| `DATABASE_URL` | URL de conexão PostgreSQL | Sim |
| `BETTER_AUTH_SECRET` | Chave secreta para JWT | Sim |
| `BETTER_AUTH_URL` | URL base da aplicação | Sim |
| `GOOGLE_CLIENT_ID` | Client ID do Google OAuth | Sim |
| `GOOGLE_CLIENT_SECRET` | Client Secret do Google OAuth | Sim |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave pública Stripe | Sim |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | Sim |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe | Sim |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação | Sim |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API Key Google Gemini (fallback IA) | Não |
| `OPENAI_API_KEY` | API Key OpenAI (IA principal) | Não* |

\* Pelo menos uma das chaves de IA é necessária para o chat funcionar.

---

## Scripts

| Comando | Descrição |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção + Prisma Generate |
| `pnpm start` | Iniciar servidor de produção |
| `pnpm lint` | Verificar código com ESLint |
| `pnpm prisma db push` | Sincronizar schema com o banco |
| `pnpm prisma migrate dev` | Criar e aplicar migration |
| `pnpm prisma db seed` | Popular banco com dados iniciais |
| `pnpm prisma studio` | GUI do Prisma Studio |

---

## Deploy

### Vercel + Neon (PostgreSQL)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Crie um banco PostgreSQL gratuito no [Neon](https://neon.tech)
2. Conecte o repositório na [Vercel](https://vercel.com)
3. Adicione **todas** as variáveis de ambiente no painel da Vercel
4. O `vercel.json` já configura o build com `prisma generate`
5. Configure os webhooks do Stripe apontando para `https://seu-site.vercel.app/api/stripe/webhook`
6. Atualize `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL` para a URL de produção

> **Importante:** O build gera o Prisma Client em `generated/prisma/`. O arquivo `next.config.ts` já inclui `serverExternalPackages` e `outputFileTracingIncludes` necessários.

---

## Licença

MIT &mdash; sinta-se à vontade para usar como referência ou base para seus projetos.
