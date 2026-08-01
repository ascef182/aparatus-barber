import { z } from "zod";

const loggingEnvSchema = z
  .object({
    LOGTAIL_SOURCE_TOKEN: z.string().optional(),
    LOGTAIL_INGESTING_HOST: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (
      Boolean(env.LOGTAIL_SOURCE_TOKEN) !== Boolean(env.LOGTAIL_INGESTING_HOST)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["LOGTAIL_SOURCE_TOKEN"],
        message:
          "LOGTAIL_SOURCE_TOKEN and LOGTAIL_INGESTING_HOST must be configured together",
      });
    }
  });

const commonEnvShape = {
  RUNTIME_DATABASE_URL: z.string().url().startsWith("postgresql://"),
  REDIS_URL: z.string().url(),
};

const webEnvSchema = loggingEnvSchema.and(
  z.object({
    ...commonEnvShape,
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(3),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_BILLING_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_CONNECT_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_PRICE_STARTER_MONTHLY: z.string().min(1),
    STRIPE_PRICE_GROWTH_MONTHLY: z.string().min(1),
    STRIPE_PRICE_PRO_MONTHLY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(3),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    HEALTHCHECK_SECRET: z.string().min(32),
    CONSENT_IP_HASH_SECRET: z.string().min(32),
    TRUSTED_PROXY_IP_HEADER: z.enum(["cf-connecting-ip", "x-real-ip"]),
  }),
);

const workerEnvSchema = loggingEnvSchema.and(
  z.object({
    ...commonEnvShape,
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(3),
  }),
);

export function assertRuntimeEnv(
  target: "web" | "worker" = "web",
  force = false,
): void {
  if (!force && process.env.NODE_ENV !== "production") return;
  const result = (
    target === "worker" ? workerEnvSchema : webEnvSchema
  ).safeParse(process.env);
  if (result.success) return;
  const details = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid ${target} production environment: ${details}`);
}
