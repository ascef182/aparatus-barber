import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma client gerado:
    "generated/**",
  ]),
  {
    // Acesso ao banco só pela camada de serviço (lib/services). O isolamento
    // de tenant será aplicado nessa camada — imports diretos de prisma fora
    // dela burlariam o escopo. Ver plano de reestruturação, seção 2.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message:
                "Acesse o banco pela camada de serviço (lib/services/*), nunca pelo prisma direto.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/**", "lib/prisma.ts", "tests/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
