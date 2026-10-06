import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      'postgresql://keelwatch:keelwatch-local-only@localhost:5432/keelwatch?schema=public',
    ),
  AUTH_MODE: z.enum(['disabled', 'local', 'oidc']).default('disabled'),
  ACCESS_STORE: z.enum(['memory', 'prisma']).default('memory'),
  OIDC_ISSUER: z
    .url()
    .transform((value) => new URL(value).toString())
    .optional(),
  OIDC_AUDIENCE: z.string().trim().min(1).optional(),
  SEED_OPERATIONS_MANAGER_SUBJECT: z.string().trim().min(1).optional(),
  SEED_AUDITOR_SUBJECT: z.string().trim().min(1).optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  rawEnvironment: Record<string, unknown>,
): Environment {
  const environment = environmentSchema.parse(rawEnvironment);

  if (environment.NODE_ENV === 'production' && environment.AUTH_MODE !== 'oidc') {
    throw new Error('Production requires AUTH_MODE=oidc.');
  }

  if (environment.NODE_ENV === 'production' && environment.ACCESS_STORE !== 'prisma') {
    throw new Error('Production requires ACCESS_STORE=prisma.');
  }

  if (environment.NODE_ENV === 'production' && !rawEnvironment.DATABASE_URL) {
    throw new Error('Production requires an explicit DATABASE_URL.');
  }

  if (environment.NODE_ENV === 'production' && !rawEnvironment.WEB_ORIGIN) {
    throw new Error('Production requires an explicit WEB_ORIGIN.');
  }

  if (environment.AUTH_MODE === 'oidc') {
    if (!environment.OIDC_ISSUER || !environment.OIDC_AUDIENCE) {
      throw new Error('OIDC_ISSUER and OIDC_AUDIENCE are required in OIDC mode.');
    }
    if (new URL(environment.OIDC_ISSUER).protocol !== 'https:') {
      throw new Error('OIDC mode requires an HTTPS OIDC_ISSUER.');
    }
  }

  const hasManagerSeedSubject = Boolean(environment.SEED_OPERATIONS_MANAGER_SUBJECT);
  const hasAuditorSeedSubject = Boolean(environment.SEED_AUDITOR_SUBJECT);
  if (hasManagerSeedSubject !== hasAuditorSeedSubject) {
    throw new Error('Configure both synthetic Auth0 seed subjects together.');
  }
  if (
    environment.SEED_OPERATIONS_MANAGER_SUBJECT &&
    environment.SEED_OPERATIONS_MANAGER_SUBJECT === environment.SEED_AUDITOR_SUBJECT
  ) {
    throw new Error('Synthetic Auth0 seed subjects must be distinct.');
  }

  if (
    environment.NODE_ENV === 'production' &&
    new URL(environment.WEB_ORIGIN).protocol !== 'https:'
  ) {
    throw new Error('Production requires an HTTPS WEB_ORIGIN.');
  }

  return environment;
}
