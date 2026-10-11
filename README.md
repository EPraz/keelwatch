# Keelwatch

Keelwatch is an independent maritime compliance and operations portfolio project
built from scratch with synthetic data. It is not affiliated with, derived from,
or representative of any employer or client system.

Fleet, Compliance, Crew and Maintenance are implemented and verified in an
npm-workspaces repository. Phase 5 adds public demo access; its first slice,
Demo Auditor, is locally implemented and remains disabled by default:

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
it. The default local path requires no external tenant or credentials. The optional
hosted path has also been verified locally with synthetic accounts in an Auth0
tenant owned by the project owner. The existing public deployment has been
verified with Auth0 accounts; the new password-free Demo Auditor path has not
yet been deployed or enabled.

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
6. Choose Operations Manager to register, list, inspect, and edit vessels, then
   record synthetic certificate evidence from a vessel workspace. Choose Auditor
   to verify the same Fleet, derived compliance state, evidence history, and
   Activity are read-only.

The implemented certificate slice derives `MISSING`, `EXPIRED`,
`EXPIRING_SOON`, or `VALID` in server UTC without persisting the status. See the
[`first vertical-slice contract`](./docs/flagship/FIRST_VERTICAL_SLICE.md) and
[`domain rules`](./docs/flagship/DOMAIN_MODEL.md). Certificate editing and
non-destructive archiving are also implemented with atomic audit events. The
Compliance route adds server-authorized, URL-backed status/search filters and
traceable counts. Overview reuses those results for linked risk totals and next
actions. Its notification watch lets a Manager trigger a bounded asynchronous
reconciliation while both roles inspect active alerts and the latest run; database
constraints prevent duplicate active conditions and concurrent active runs. File attachments are deliberately excluded from this portfolio demo; see
[ADR-0007](./docs/flagship/architecture/decisions/0007-disable-file-attachments-in-portfolio-demo.md).
Crew supports synthetic profiles and dated demo qualifications with server-enforced
permissions, explained validity and atomic audit events. No files or real-world
fitness certification are involved. Vessel workspaces support dated assignment
plans, fleet-wide overlap prevention and irreversible audited cancellation with
retained history. Plans are synthetic planning, not boarding or fitness approval;
an optional draft evaluation explains full-period demo qualification coverage and
gaps without blocking valid planning. Results use currently registered evidence;
they do not certify fitness or preserve historical approval.

### Local Auth0 verification

To exercise hosted OIDC locally, set `AUTH_MODE=oidc`, `VITE_AUTH_MODE=oidc`,
`ACCESS_STORE=prisma`, and the five OIDC values plus both synthetic Auth0 `sub`
values in `.env`. Use the full Auth0 origin (`https://<domain>/`) for both issuer
and authority, and keep API/browser audiences identical.

Configure the Auth0 SPA with these local values:

- callback: `http://localhost:5173/auth/callback`;
- logout URL: `http://localhost:5173/sign-in`;
- web origin: `http://localhost:5173`.

Under **Auth0 Dashboard → Applications → APIs → Keelwatch API → Application
Access**, keep user-delegated and client access on **Per-app authorization**, then
explicitly grant the Keelwatch SPA user access to that API.
Third-party applications remain unauthorized by default. Keelwatch currently
requests no custom API scopes; business permissions continue to come from its own
PostgreSQL role assignments.

Run `npm run oidc:normalize-local-env` once if the dashboard domain was copied as
a bare hostname, then `npm run check:oidc-env`. Both commands redact configured
values. `npm run prisma:seed` remains idempotent: development retains the three
local identities and adds both configured Auth0 identities; production seeds the
two configured Auth0 identities. When demo access is explicitly enabled, both
environments also provision the separate fixed Demo Auditor account.

Variables prefixed with `VITE_` are intentionally browser-exposed. Everything
else is server-only. The Auth0 values remain commented until real OIDC is
configured, and no Auth0 client secret belongs in this repository or SPA.

The default example still supports the earlier Access-only shell with an in-memory
directory, but Fleet persistence intentionally fails without PostgreSQL instead of
simulating a successful write. The checked-in Compose file is optional for
evaluators who already use containers; it is not part of the required workflow.

Migrations use `migrate deploy` in clean environments and production. Never use
`migrate reset`, `db push`, or destructive cleanup against a database with data.

### Optional password-free Demo Auditor access

Demo Auditor uses a server-issued, signed one-hour session for a fixed synthetic
read-only account. Auth0 login and server-enforced business permissions remain
available. No Auth0 password or session-signing secret is sent to the browser.
The browser keeps its issued credential in the current tab's session storage;
reload preserves it, logout clears it, and expiration requires another explicit
sign-in. The data is shared and Activity identifies the account, not the visitor.
Demo Manager belongs to the next slice and is not implemented here.

To enable this optional path in an already configured API:

1. Set server-only `DEMO_ACCESS_ENABLED=true` and `DEMO_SESSION_SECRET` to a
   privately generated random 32-byte key encoded as base64url (43 characters).
   Keep the value in server configuration; never prefix it with `VITE_` or commit it.
2. Run `npm run prisma:seed` with that configuration. It provisions Demo Auditor
   without resetting operational records. Production still requires valid OIDC
   configuration, Prisma-backed access and the two configured Auth0 subjects.
3. Restart the API using its existing process. The sign-in page discovers the
   available demo role from `GET /api/v1/access/demo`; its button requests a
   session from `POST /api/v1/access/demo/sessions`.

Issuance defaults to **30 attempts per 60-second fixed window, globally per API
process**, including invalid payload attempts. Set `DEMO_SESSION_LIMIT` (1–300)
and `DEMO_SESSION_WINDOW_SECONDS` (1–3600) to change it. Exhaustion returns `429`,
`Retry-After` and a safe retry message. Process restart resets the counter; this
is not a distributed quota and adds no service or cost. Session responses use
`Cache-Control: no-store`. Setting `DEMO_ACCESS_ENABLED=false` and restarting
rejects new and previously issued demo sessions while valid OIDC access remains.

Local HTTP/PostgreSQL and rendered React tests cover issuance, expiry, disabling,
limits, account status, role denial and OIDC coexistence. Public acceptance of this
new path remains pending; see [progress](./docs/progress.md).

## Certificate records without file attachments

The demo records certificate metadata, dates, status and history. It does not
accept or serve files. Upload, download and file-maintenance routes and controls
have been removed; the UI explains this boundary.

No Supabase Storage account, bucket, scanner, signing key or document scheduler is
required. The former database migration and historical attachment records/files
are preserved, but the application no longer accesses or cleans them. Existing
audit events remain readable. There is no automatic 30-day deletion promise.

See [ADR-0007](./docs/flagship/architecture/decisions/0007-disable-file-attachments-in-portfolio-demo.md).
Additional services must justify their portfolio value, effort and operational
risk and receive approval before implementation.

## Quality gates

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:postgres
npm run check:env
npm run check:oidc-env
npm run audit:conventions
npm run prisma:validate
npm run prisma:migration:check
npm run build
npm audit --audit-level=high
```

The PostgreSQL suite uses randomized synthetic registry numbers and deletes only
records tagged by that test run. The demo provisioning tests create and remove
their own uniquely named isolated schema. The suite never resets, truncates or
drops the existing database.

## CI and deployment boundary

[`quality.yml`](./.github/workflows/quality.yml) provisions an ephemeral PostgreSQL
17 service, applies migrations from zero, seeds synthetic identities, and runs the
same quality gates. Its published run on `9cfa81d` passed; see
[the verified run](https://github.com/EPraz/keelwatch/actions/runs/38113126277).
The current Demo Auditor increment still requires a published CI run.

The owner confirms the current cloud deployment is free; the project will incur
no additional cost. Vercel serves the SPA with the internal-route fallback and the
existing API uses the configured public origin. Earlier paid hosting preparation
in [`render.yaml`](./render.yaml) and the
[`deployment runbook`](./docs/deployment.md) is historical and does not authorize
creating billable resources. Production requires OIDC, Prisma-backed authorization,
HTTPS origins and secrets outside Git; local auth cannot be enabled in production.

See [`docs/progress.md`](./docs/progress.md) for verified evidence and the exact
public verification and deployment work that remains.
