FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
# Placeholders só de build, no estágio `base` que é descartado -- nenhum deles
# chega ao runner nem abre conexão com banco algum.
#  DATABASE_URL: o postinstall roda `prisma generate`, que carrega
#    prisma.config.ts, que exige a variável só pra parsear a config (generate
#    é offline). A URL de owner real só existe no job de migration.
#  RUNTIME_DATABASE_URL: `next build` importa lib/prisma.ts ao coletar as
#    rotas (ex. /sitemap.xml), e esse módulo se recusa a carregar sem a
#    variável -- de propósito, pra falhar com mensagem clara em vez de um
#    parse error do pg. O valor real entra no runtime de web e worker.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    RUNTIME_DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN pnpm install --frozen-lockfile
COPY . .
# `pnpm build` é `tsx scripts/check-runtime-env.ts && next build`, e esse check
# roda com force=true -- exigiria passar os ~20 secrets como build args só pra
# compilar. A validação acontece no boot, onde os valores de verdade existem:
# `pnpm start` (assertRuntimeEnv("web") em produção) e worker/index.ts:32.
RUN pnpm prisma generate && pnpm exec next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=base /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
# prisma.config.ts -> `pnpm release:migrate` (job de migration) o lê
# tsconfig.json  -> aliases "@/..." que o tsx resolve em RUNTIME, não só no build
# next.config.ts -> CSP/HSTS de produção e o plugin next-intl; sem ele o
#                   `next start` sobe sem nenhum header de segurança
COPY --from=base /app/prisma.config.ts /app/tsconfig.json /app/next.config.ts ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/generated ./generated
# Fontes necessárias em runtime (o estágio runner anterior não as copiava, e o
# container saía na hora porque nem `pnpm start` nem `pnpm worker` achavam o
# próprio entrypoint):
#   scripts/  -> `pnpm start` valida o env antes de servir
#   worker/   -> o processo BullMQ (e-mails + expiração de holds)
#   lib/, i18n/, messages/ -> importados por worker/index.ts via tsx
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/worker ./worker
COPY --from=base /app/lib ./lib
COPY --from=base /app/i18n ./i18n
COPY --from=base /app/messages ./messages
EXPOSE 3000
CMD ["pnpm", "start"]
