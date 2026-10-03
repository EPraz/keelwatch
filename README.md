# Keelwatch

Keelwatch is an independent maritime compliance and operations portfolio project
built from scratch with synthetic data. It is not affiliated with, derived from,
or representative of any employer or client system.

Phase 0 is complete. Phase 1 now has a locally verified protected Fleet path in
an npm-workspaces repository:

- `apps/web`: React and TypeScript SPA.
- `apps/api`: NestJS modular monolith with Prisma and PostgreSQL.
- `docs`: product, clean-room, architecture, ADRs, roadmap, and progress evidence.

## Prerequisites

- Node.js 24+ and npm 11+.
- PostgreSQL 17 for the complete Fleet workflow. A native installation or an
  explicitly authorized managed database is the normal path; Docker is optional.

## Clean start

The local adapter is deliberately synthetic and must be explicitly enabled. It
exists only for development and automated tests; production configuration rejects
it. Auth0 is the selected hosted OIDC provider, but no external tenant or
credentials are required for local work.

1. Install the lockfile exactly with `npm ci`.
2. Copy the root `.env.example` to `.env`; both workspaces and Prisma read this
   single local file.
3. Create an empty PostgreSQL database, set its URL in `DATABASE_URL`, and set
   `ACCESS_STORE=prisma`. The URL in `.env.example` is an unmistakably local
   placeholder, not a deployed credential.
4. Generate the client, apply checked-in migrations, and load synthetic access
   identities:

   ```text
   npm run prisma:generate
   npm run prisma:migrate:deploy
   npm run prisma:seed
   ```

5. Start web and API together with `npm run dev` and open
   `http://localhost:5173`.
6. Choose Operations Manager to register, list, inspect, and edit vessels. Choose
   Auditor to verify the same records are read-only.

Variables prefixed with `VITE_` are intentionally browser-exposed. Everything
else is server-only. The Auth0 values remain commented until real OIDC is
configured, and no Auth0 client secret belongs in this repository or SPA.

The default example still supports the earlier Access-only shell with an in-memory
directory, but Fleet persistence intentionally fails without PostgreSQL instead of
simulating a successful write. The checked-in Compose file is optional for
evaluators who already use containers; it is not part of the required workflow.

Migrations use `migrate deploy` in clean environments and production. Never use
`migrate reset`, `db push`, or destructive cleanup against a database with data.

## Quality gates

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:postgres
npm run check:env
npm run audit:conventions
npm run prisma:validate
npm run prisma:migration:check
npm run build
npm audit --audit-level=high
```

The PostgreSQL suite uses randomized synthetic registry numbers and deletes only
records tagged by that test run. It never resets, truncates, or drops the database.

## CI and deployment boundary

[`quality.yml`](./.github/workflows/quality.yml) provisions an ephemeral PostgreSQL
17 service, applies migrations from zero, seeds synthetic identities, and runs the
same quality gates. It will become externally verified only after the owner
publishes a commit to a GitHub repository.

[`render.yaml`](./render.yaml) and the
[`deployment runbook`](./docs/deployment.md) prepare a paid, always-active API,
managed PostgreSQL with recovery, and an HTTPS Static Site. Importing the Blueprint
creates billable resources and is deliberately left to the owner. Production
continues to require OIDC, Prisma-backed authorization, HTTPS origins, and secrets
outside Git; local auth cannot be enabled in a production build.

See [`docs/progress.md`](./docs/progress.md) for verified evidence and the exact
external Auth0, GitHub, and Render gates that remain.
