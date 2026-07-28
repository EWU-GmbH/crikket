import "dotenv/config"
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
    // Public origin of the web app for absolute links (e.g. report links in Kan
    // cards). Falls back to CORS_ORIGINS[0], then BETTER_AUTH_URL.
    PUBLIC_APP_URL: z.url().optional(),
    ALLOWED_SIGNUP_DOMAINS: z
      .string()
      .optional()
      .transform(
        (value) =>
          value
            ?.split(",")
            .map((d) => d.trim())
            .filter((d) => d.length > 0) ?? []
      ),
    POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
    POLAR_SUCCESS_URL: z.url().optional(),
    POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
    POLAR_PRO_PRODUCT_ID: z.string().min(1).optional(),
    POLAR_PRO_YEARLY_PRODUCT_ID: z.string().min(1).optional(),
    POLAR_STUDIO_PRODUCT_ID: z.string().min(1).optional(),
    POLAR_STUDIO_YEARLY_PRODUCT_ID: z.string().min(1).optional(),
    CORS_ORIGINS: z
      .string()
      .optional()
      .transform(
        (value) =>
          value
            ?.split(",")
            .map((origin) => origin.trim())
            .filter((origin) => origin.length > 0) ?? []
      ),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.email().optional(),
    ENABLE_PAYMENTS: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    STORAGE_BUCKET: z.string().min(1).optional(),
    STORAGE_REGION: z.string().min(1).optional(),
    STORAGE_ENDPOINT: z.url().optional(),
    STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    STORAGE_PUBLIC_URL: z.url().optional(),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    CAPTURE_SUBMIT_TOKEN_SECRET: z.string().min(32).optional(),
    TURNSTILE_SITE_KEY: z.string().min(1).optional(),
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    // EWU Kan integration (server-side only — never expose to the widget)
    KAN_BASE_URL: z.url().optional(),
    KAN_API_KEY: z.string().min(1).optional(),
    KAN_BUGS_LIST_PUBLIC_ID: z.string().min(12).max(12).optional(),
    KAN_FEATURE_REQUESTS_LIST_PUBLIC_ID: z.string().min(12).max(12).optional(),
    // Per-org routing: {"<organizationId>":{"bugs":"<listPublicId>","featureRequests":"<listPublicId>"}}
    KAN_ORG_LISTS_JSON: z.string().min(2).optional(),
    NODE_ENV: z
      .enum(["development", "production", "staging"])
      .default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
