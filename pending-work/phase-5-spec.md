# [Spec] Phase 5: Public DemoAccount access and focused demo quality

## Problem Statement

Portfolio visitors currently need credentials known to the project owner to explore
the hosted Keelwatch application. They cannot independently compare operational
editing with read-only review. Publishing or automatically filling an Auth0 password
would still expose that password to the visitor.

The owner needs a simple public demonstration of the existing workflows, real
server authorization and focused quality evidence, with no additional project cost
or ongoing backup and monitoring obligations.

## Solution

Offer **Demo Manager** and **Demo Auditor** buttons on the sign-in page alongside
normal Auth0 login. Each button opens a one-hour session issued by the existing API
for a fixed, synthetic, shared `DemoAccount`, without entering or sharing a password.
Demo Manager can manage operational records; Demo Auditor can review them. Neither
account can administer access users or roles.

Both accounts use the existing shared synthetic dataset. Changes remain visible
to subsequent visitors, and Activity identifies the shared account rather than an
individual visitor. Explain this limitation clearly in the demo experience.

Close Phase 5 with appropriate access and permission tests, four verified public
journeys, focused accessibility corrections and a small reproducible performance
measurement. Reuse existing tests, logs and health checks.

## User Stories

1. As a portfolio visitor, I want to see Demo Manager and Demo Auditor on the sign-in page, so that I can explore both operational roles without contacting the owner.
2. As a portfolio visitor, I want to open a demo session with one click, so that I do not need to type, copy or receive a password.
3. As a portfolio visitor, I want each button to explain its role, so that I can choose editing or read-only review deliberately.
4. As an existing Auth0 user, I want the normal identity-provider login to remain available, so that public demo access does not replace my normal access.
5. As a Demo Manager, I want to create and edit permitted operational records, so that I can demonstrate the existing management workflows.
6. As a Demo Manager, I want to archive and cancel records where the existing workflow supports it, so that I can demonstrate their lifecycle and retained history.
7. As a Demo Auditor, I want to read the same operational records and Activity, so that I can compare the results of management actions.
8. As a Demo Auditor, I want editing controls to be unavailable and direct write requests to be denied, so that the read-only role is enforced beyond the interface.
9. As a project owner, I want both DemoAccounts denied user and role administration, so that public access cannot change the application's access policies.
10. As a visitor, I want the demo to state that records are synthetic and shared, so that I understand the meaning of the information and the effect of my changes.
11. As a Demo Manager, I want my permitted changes to remain after logout, so that another visitor can review the resulting records.
12. As a reviewer, I want Activity to name the DemoAccount responsible for a change, so that I can inspect account-level traceability without assuming individual visitor identification.
13. As a visitor, I want my session to survive a page reload in the current tab, so that I can inspect internal routes without signing in again unnecessarily.
14. As a project owner, I want demo sessions to expire after one hour, so that public session credentials have a bounded lifetime.
15. As a visitor with an expired session, I want a clear path back to the demo buttons, so that I can resume exploration with another click.
16. As a visitor, I want to log out before choosing the other role, so that switching roles is deliberate.
17. As a visitor switching roles, I want the former session, permissions and displayed data cleared, so that the new session does not inherit the previous role's state.
18. As a visitor, I want a pending sign-in state that prevents duplicate attempts, so that repeated clicks do not create confusing results.
19. As a visitor whose sign-in fails, I want a clear error and a retry action, so that I can recover without refreshing or guessing what happened.
20. As a visitor encountering a usage limit, I want an understandable message and retry guidance, so that I know when to try again.
21. As a project owner, I want configurable limits on demo session issuance, so that public sign-in cannot produce unlimited sessions.
22. As a project owner, I want configurable limits on demo writes, so that a visitor cannot bypass the write budget by repeatedly signing in.
23. As a project owner, I want to disable public demo access through server configuration, so that I can stop demo access while preserving normal Auth0 login.
24. As a project owner, I want inactive demo accounts and invalid or expired credentials denied by the API, so that selecting a public role never bypasses account or session validation.
25. As a project owner, I want arbitrary subjects and privileged roles rejected during session issuance, so that the public selector only represents the two intended DemoAccounts.
26. As a reviewer, I want to verify login, logout, reload, Fleet reading and Manager editing with both demo roles, so that I can assess the protected entry journey.
27. As a reviewer, I want to inspect certificate lifecycle and derived Compliance status, so that I can assess the existing evidence workflow.
28. As a reviewer, I want to inspect CrewAssignment planning and overlap prevention, so that I can assess the existing scheduling rules.
29. As a reviewer, I want to inspect MaintenanceOrder lifecycle, conflicts and history, so that I can assess the existing concurrency workflow.
30. As a keyboard user, I want usable focus, labels and controls through sign-in and these journeys, so that I can explore the demo without a pointer.
31. As a visitor on a small screen, I want readable forms, feedback and operational views, so that the demo remains usable on mobile.
32. As a visitor, I want readable contrast and understandable errors, so that I can complete the main workflows and recover from expected failures.
33. As a reviewer, I want a small performance measurement with its scenario and limitations, so that I can assess evidence rather than an unsupported scalability claim.
34. As a project owner, I want to reuse existing logs, correlation IDs, health checks and regression tests, so that quality evidence does not require a new operational platform.
35. As a project owner, I want the project to remain free of additional monetary costs, so that the portfolio stays within its agreed budget.
36. As a reviewer, I want a durable record distinguishing automated checks from public manual verification, so that I can understand what was actually tested.

## Implementation Decisions

- ADR-0008 is the accepted, narrowly scoped amendment to the existing OIDC decisions.
  Auth0 Authorization Code with PKCE remains the normal authentication path. Public
  demo sessions are a separate server-issued source of identity; the static local
  development adapter remains forbidden in production.
- Modify Access, the authentication composition and the sign-in flow. Reuse the
  existing protected routing, API transport, active-user lookup, permission policies,
  operational modules and audit behavior. Do not introduce a second authorization
  model or weaken protected endpoints to support the public buttons.
- Expose a bounded public session-issuance contract that accepts only the two fixed
  demo choices and returns temporary session information, including expiry. It must
  not accept arbitrary user identifiers, external subjects, permissions or roles.
  Protected operations remain authenticated and server-authorized.
- Provision two distinct synthetic DemoAccounts separately from the owner's Auth0
  identities. Roles and active status remain application-owned. Provisioning must
  be repeatable and must not reset existing operational records.
- Preserve the existing bearer-token transport unless implementation evidence requires
  a change. Select the session credential format within Access; validate its integrity,
  origin and expiry, keep issuance secrets server-only and prevent confusion between
  demo, OIDC and local development credentials. Do not place tokens in URLs or logs.
- Sessions expire one hour after issuance without silent extension. Keep the session
  through reload in the same tab; expiration requires an explicit new sign-in.
  Logout clears the client credential and role-dependent state. No promise of immediate
  revocation of a copied credential on logout is made by this specification.
- Switching between demo roles requires logout followed by selection of the other
  button. Normal Auth0 and demo sessions must not silently override one another or
  reuse stale permissions and operational state.
- Enable demo access only by explicit server configuration; default to disabled.
  Disabling it must stop issuance and acceptance of demo sessions while leaving
  OIDC validation and normal Auth0 login intact. Configuration takes effect through
  the application's existing deployment/restart process, without adding a control panel.
- Apply configurable session-issuance and demo-write limits in the existing API.
  Reissuing a session must not reset the effective write budget. Limits must not turn
  a public role selection into unlimited access, or accidentally restrict Auth0 writes
  as demo writes. Numeric quotas and limiter mechanics are implementation choices,
  to be recorded with the tested behavior; no particular quota was approved in the interview.
- Deny user and role administration for both DemoAccounts. Demo Manager writes stay
  within the existing operational permissions and lifecycle rules; Demo Auditor
  remains read-only at both UI and API boundaries.
- Fleet, Compliance, Crew and Maintenance retain their existing shared data model,
  invariants, transactions and audit attribution. Critical writes and their audit
  events remain atomic. No per-visitor tenancy or visitor ownership is introduced.
- Reuse the current sign-in and operational UI patterns, tokens and responsive
  behavior. Use the shared Toast and ToastProvider for operation feedback; keep
  input-specific validation adjacent to its field and preserve recovery actions.
  Public copy is English and must explain synthetic shared data without exposing
  implementation details or suggesting that the visitor is personally identified.
- Preserve the deployment route handling that fixed internal SPA reloads. Do not
  create new paid services, storage, Redis, queues or monitoring infrastructure.
- No session-table migration, new public control panel or token-format choice was
  approved during the interview. Schema changes must be justified by this access
  slice rather than speculative future requirements.

## Testing Decisions

The owner confirmed the following testing boundaries on 2026-10-11:

- **Primary boundary: the existing HTTP application pipeline.** Exercise real demo
  session issuance followed by protected requests through NestJS, using the existing
  Supertest/Vitest setup. Reuse PostgreSQL integration fixtures where account status,
  persistence and audit attribution are material. Tests must not replace guards or
  inject a privileged actor to make the happy path pass.
- **Complementary boundary: rendered sign-in and session behavior.** Reuse React
  Testing Library, user-event, routing and the existing authentication context to
  verify selection, pending state, errors, retry, expiry, reload and logout/switching
  as observable user behavior. Control the API response and time where appropriate;
  do not test private hook state or component structure.
- Existing Access request-pipeline tests already cover unauthenticated, inactive,
  invalid-token, permitted-role and denied-role behavior. Existing Fleet PostgreSQL
  integration tests cover a committed write with its audit event and Auditor reading.
  OIDC verifier tests and the current sign-in tests provide additional prior art.
- Add coverage for issuance of each fixed account, invalid selection, attempts to
  request arbitrary identities or elevated roles, invalid/tampered/expired demo
  credentials, inactive accounts, unauthorized writes and access administration.
  Verify both demo-disabled behavior and coexistence with valid OIDC access.
- Test limits as observable HTTP refusals and usable recovery, including repeated
  issuance not resetting the write budget. Verify that denied requests do not
  change operational records or create successful-write audit events.
- Use isolated synthetic test configuration for server sessions and OIDC validation;
  production passwords, signing material and Auth0 credentials never enter tests.
  Deterministic expiry and limiting tests do not require waiting an hour or generating
  hostile traffic against the public site.
- Reuse the existing Fleet, Compliance, Crew and Maintenance regression suites.
  Do not require a new full browser E2E suite across every module. Automation is
  added where necessary for the new access behavior or a demonstrated regression.
- Verify the four agreed journeys on the public site using synthetic records:
  access/Fleet with both roles; certificate lifecycle and Compliance; CrewAssignment
  overlap prevention; MaintenanceOrder lifecycle, conflict and history. Record
  who performed each check and distinguish manual acceptance from automation.
- Check keyboard navigation, visible focus, labels, error/retry states, contrast
  and layouts at mobile, tablet and desktop widths using comparable existing views.
  Correct identified barriers; do not claim complete WCAG conformance from these checks.
- Run a small bounded public performance measurement of existing read workflows.
  Record dataset, scenario, concurrency, duration, sample count, environment,
  cold/warm behavior where relevant, latency and errors. Do not invent a pass threshold,
  require a fixed optimization or use the measurement as an availability guarantee.
- Run applicable formatting, lint, typecheck, unit/component/integration tests,
  PostgreSQL tests, environment checks, convention audit, Prisma validation and
  migration checks, production builds and existing CI checks. Record failures,
  exclusions and remaining public verification honestly in the durable progress record.

## Out of Scope

- Publishing, autofilling or sharing Auth0 passwords; replacing normal Auth0 login.
- Anonymous identities with no corresponding account, arbitrary account impersonation,
  public user/role administration or enabling local static development tokens in production.
- Individual visitor identification, isolated workspaces, per-visitor datasets,
  automatic resets and new multitenancy infrastructure.
- Periodic backups, any one-off export/restore exercise, migration/job recovery drills,
  permanent monitoring, new RED metrics/tracing/alerting dashboards and availability targets.
- Added monetary costs, new paid providers or speculative infrastructure.
- New operational modules, file attachments, real personal or operational data,
  employer/client material and official maritime certification claims.
- Rebuilding existing module tests into a full browser suite, heavy load testing,
  predefined performance targets or an optimization without measured need.
- Closing unrelated issues or retroactively claiming that previous phases are complete.

## Further Notes

The owner confirmed the scope on 2026-10-11. ADR-0008, the roadmap, portfolio
strategy and glossary have been updated locally; these documentation changes
have not yet been committed or pushed. Preserve them when implementing this spec.

The earlier Vercel Not Found incident is resolved and CI has passed. The owner
confirmed prior public Auth0 Manager/Auditor scenarios. That evidence does not
verify the new DemoAccount session flow, which is not implemented yet.

Publish this specification with the `ready-for-agent` label. Split it into independently demonstrable
vertical tickets using `to-tickets` before implementation. Phase 5 is complete only
when the scoped outcomes, applicable gates and durable evidence are complete.
