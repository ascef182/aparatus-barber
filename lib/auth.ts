import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization, twoFactor } from "better-auth/plugins";
import { prisma } from "./prisma";
import { ac, roles } from "./auth/permissions";

export const auth = betterAuth({
  appName: "Aparatus",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  plugins: [
    // Organization = tenant (barbearia/rede). Roles customizados em
    // lib/auth/permissions.ts. Ver plano de reestruturação, seções 2 e 5.
    organization({
      ac,
      roles,
      creatorRole: "owner",
    }),
    // SuperAdmin da plataforma (User.role = "superadmin") + impersonation.
    admin({
      adminRoles: ["superadmin"],
    }),
    // MFA (TOTP + backup codes) — obrigatório p/ owners e superadmin
    // (enforcement na Fase 5, ver plano seção 8.1).
    twoFactor(),
  ],
});
