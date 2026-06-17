import { z } from 'zod';

/**
 * Validates `import.meta.env` at boot. Fail fast and loud if the runtime
 * environment is misconfigured instead of discovering it via a 404 later.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_API_PREFIX: z.string().default('/api/v1'),
  VITE_API_TIMEOUT: z.coerce.number().int().positive().default(30_000),
  VITE_APP_NAME: z.string().default('LTA-WMS'),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_FEATURE_FLAGS: z.string().default(''),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. See console for details.');
}

const raw = parsed.data;

export const ENV = {
  apiBaseUrl: raw.VITE_API_BASE_URL,
  apiPrefix: raw.VITE_API_PREFIX,
  apiTimeout: raw.VITE_API_TIMEOUT,
  appName: raw.VITE_APP_NAME,
  appEnv: raw.VITE_APP_ENV,
  isProduction: raw.VITE_APP_ENV === 'production',
  isDevelopment: raw.VITE_APP_ENV === 'development',
  featureFlags: new Set(raw.VITE_FEATURE_FLAGS.split(',').map((f) => f.trim()).filter(Boolean)),
} as const;

export type AppEnv = typeof ENV;
