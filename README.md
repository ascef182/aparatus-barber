<div align="center">
  <h1>Aparatus Barber</h1>
  <p>Modern barbershop booking platform with an AI scheduling assistant</p>
  <p>
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

## About

**Aparatus Barber** is a full-stack online booking platform for barbershops. Customers can browse barbershops, view services and pricing, pick available time slots, and pay securely via Stripe. The app also features an **AI assistant** that lets users book appointments through natural conversation.

Built as a portfolio project to demonstrate production-grade architecture: Next.js 16 App Router, Server Actions, OAuth authentication, real payment processing, and generative AI integration — all shipped solo under CazaTech.

---

## Features

### For Customers

- **Search & Discovery** — Find barbershops by name or category (Haircut, Beard, Eyebrows, etc.)
- **Barbershop Profile** — View details, photos, services, and pricing
- **Online Booking** — Select date and time slot, confirm in a few clicks
- **Stripe Payments** — Secure checkout in BRL with credit card support
- **Booking Management** — Track confirmed and completed appointments, cancel with refund
- **AI Assistant (Agenda.ai)** — Schedule without navigating: *"I want a haircut tomorrow at 2pm"*

### Technical Highlights

- Google OAuth via Better Auth
- Type-safe Server Actions with Zod validation (next-safe-action)
- Real-time AI streaming with Vercel AI SDK + OpenAI GPT-4o-mini
- Stripe webhook for payment confirmation and booking creation
- Cache invalidation via Next.js `revalidatePath`
- Responsive design with Tailwind CSS 4 + shadcn/ui
- Light/dark theme with next-themes

---

## Tech Stack

| Category | Technologies |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Database** | PostgreSQL, Prisma ORM 6, Prisma Adapter PG |
| **Auth** | Better Auth 1.6 with Google OAuth |
| **Payments** | Stripe (Checkout Sessions + Webhooks) |
| **AI** | AI SDK 5 (Vercel), OpenAI GPT-4o-mini, Google Gemini |
| **UI** | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide React |
| **State** | TanStack React Query |
| **Validation** | Zod 4, next-safe-action 8 |
| **Tooling** | pnpm, ESLint, Prettier, date-fns |

---

## Architecture

```
src/
├── app/
│   ├── _actions/          # Server Actions (next-safe-action)
│   ├── _components/       # Shared components + shadcn/ui
│   │   └── ui/            # UI primitives (button, sheet, dialog...)
│   ├── _providers/        # React providers (QueryClient)
│   ├── api/
│   │   ├── auth/          # Better Auth endpoints
│   │   ├── chat/          # AI streaming (POST)
│   │   └── stripe/        # Payment webhook
│   ├── barbershops/       # Listing + barbershop detail
│   ├── bookings/          # User bookings
│   ├── chat/              # AI assistant interface
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home (/)
├── lib/
│   ├── auth.ts            # Better Auth config (server)
│   ├── auth-client.ts     # Better Auth client (browser)
│   ├── action-client.ts   # Safe action client
│   ├── prisma.ts          # Prisma singleton
│   └── utils.ts           # Utilities (cn)
├── prisma/
│   ├── schema.prisma      # Models: User, Barbershop, Service, Booking
│   └── seed.ts            # Seed with 10 barbershops + services
└── generated/prisma/      # Generated Prisma Client
```

### Booking Flow

```
Search → Barbershop → Service → Calendar → Time Slot → Stripe Checkout → Confirmation
                                                                          ↓
                                                          Webhook creates Booking in DB
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL (local or Neon/Railway)
- Accounts: Google OAuth, Stripe, OpenAI (or Google AI)

### Setup

```bash
# 1. Clone
git clone https://github.com/your-username/aparatus-barber.git
cd aparatus-barber

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see table below)

# 4. Create database and seed sample data
pnpm prisma db push
pnpm prisma db seed

# 5. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL | Yes |
| `BETTER_AUTH_SECRET` | Secret key for JWT | Yes |
| `BETTER_AUTH_URL` | Application base URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes |
| `NEXT_PUBLIC_APP_URL` | Public application URL | Yes |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API Key (AI fallback) | No |
| `OPENAI_API_KEY` | OpenAI API Key (primary AI) | No* |

\* At least one AI key is required for the chat assistant to work.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build + Prisma Generate |
| `pnpm start` | Start production server |
| `pnpm lint` | Lint with ESLint |
| `pnpm prisma db push` | Sync schema to database |
| `pnpm prisma migrate dev` | Create and apply migration |
| `pnpm prisma db seed` | Seed database with sample data |
| `pnpm prisma studio` | Open Prisma Studio GUI |

---

## Deploy

### Vercel + Neon (PostgreSQL)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Create a free PostgreSQL database on [Neon](https://neon.tech)
2. Connect the repository on [Vercel](https://vercel.com)
3. Add **all** environment variables in the Vercel dashboard
4. `vercel.json` already configures the build with `prisma generate`
5. Set up Stripe webhooks pointing to `https://your-site.vercel.app/api/stripe/webhook`
6. Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production URL

> **Note:** The build outputs the Prisma Client to `generated/prisma/`. The `next.config.ts` file already includes the necessary `serverExternalPackages` and `outputFileTracingIncludes` config.

---

## License

MIT — feel free to use this as reference or as a starting point for your own projects.
