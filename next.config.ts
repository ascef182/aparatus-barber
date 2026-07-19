import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// CSP pragmática: 'unsafe-inline' em script/style ainda é necessário (Next
// injeta scripts de hidratação inline; não há infra de nonce por request
// ainda — ver proxy.ts). Reforça defesa em profundidade mesmo sem CSP
// estrita; frame-ancestors/X-Frame-Options cobrem clickjacking de verdade.
// Só em produção: Turbopack/Fast Refresh em dev usa eval() e injeta
// estilos de um jeito que uma CSP estrita quebra sem necessidade — não há
// benefício de segurança em CSP no localhost.
const isProduction = process.env.NODE_ENV === "production";
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://utfs.io https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Dev roda em lvh.me:3000 (não localhost) para cookies cross-subdomain
  // funcionarem — sem isso o Next bloqueia recursos de dev (HMR, chunks JS)
  // vindos de um host diferente do esperado (só efeito em dev, sem uso em
  // prod). Precisa também do wildcard de subdomínio: toda rota de tenant
  // ({slug}.lvh.me) serve os mesmos assets de dev, não só o domínio raiz —
  // sem isso a hidratação falha silenciosamente (chunks bloqueados com 403)
  // em qualquer página acessada via subdomínio de tenant.
  allowedDevOrigins: ["lvh.me", "*.lvh.me"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./generated/prisma/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ...(isProduction
            ? [
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
                { key: "Content-Security-Policy", value: CSP },
              ]
            : []),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
