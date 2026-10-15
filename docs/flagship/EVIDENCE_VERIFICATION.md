# Integrated public evidence verification — Phase 6

Recorded for [#22](https://github.com/EPraz/keelwatch/issues/22) on 2026-10-14,
using repository `df0f2c9` as the fixed pre-change baseline. The locally completed
maps and five cases from #17–#21 are the authoritative starting point for
[evolution](./EVOLUTION.md). This record separates documentary/source checks from
historical runtime evidence and owner acceptance.

## Scope and navigation

The [reviewer entry](./README.md) reaches the current [system map](./ARCHITECTURE.md),
[data guide](./DOMAIN_MODEL.md), [decision index](./architecture/decisions/README.md),
the central [Maintenance](./MAINTENANCE_CASE.md) and [Crew](./CREW_CASE.md) cases,
and supporting [Access](./ACCESS_CASE.md), [audit rollback](./AUDIT_ROLLBACK_CASE.md)
and [reconciliation](./RECONCILIATION_CASE.md). Evolution is linked after those
mechanisms, not presented as a deployed architecture.

The core public explanations are English. Original ADR text and internal
roadmap/progress/scope records retain their historical language and dates.
Existing product/attachment documents are explicitly contextual or retired
material, rather than rewritten to fabricate history. Personal interview answers,
scripts and study notes are not part of this package or its acceptance criteria.

## Diagram/source agreement and claim traceability

The following table records the important source seams inspected across the
package. Test links are directed evidence; their presence is not a new execution.

| View/case                                                     | Source agreement checked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Existing behavioral evidence and limits                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture: context and deployment                          | [Auth composition](../../apps/web/src/auth/auth-root.tsx), [configured verifier](../../apps/api/src/access/infrastructure/configured-identity.verifier.ts), [HealthController](../../apps/api/src/health/health.controller.ts), [deployment record](../deployment.md). Current Vercel/Render/Neon versus historical paid Blueprint; dashed probe means policy, effective path unverified.                                                                                                                                                        | [Phase 5 journey](./DEMO_JOURNEY_QA.md) and [measurement](./DEMO_PERFORMANCE.md) remain historical public evidence. No dashboard, provider region/idle state or deployed API SHA is newly verified.                                                                                                                                                                                   |
| Architecture: six modules and web/contracts                   | [AppModule](../../apps/api/src/app.module.ts), business `*.module.ts` imports, [web App](../../apps/web/src/app/app.tsx), feature transports and [contract helper](../../apps/api/test/requirement-evaluation-contract.ts). Consumer-to-dependency arrows; global guards/Prisma are distinct.                                                                                                                                                                                                                                                    | [Evaluation](../../apps/api/test/requirement-evaluation.postgres.integration.spec.ts), [composition](../../apps/api/test/composition.postgres.integration.spec.ts) and [Maintenance](../../apps/api/test/maintenance.postgres.integration.spec.ts) synchronize selected types; not a universal SDK or runtime successful-response validator.                                          |
| Data: three relationship views, ownership and applied indexes | [Prisma schema](../../apps/api/prisma/schema.prisma), [SQL migrations](../../apps/api/prisma/migrations), [Activity reader](../../apps/api/src/audit/infrastructure/prisma-audit-event.reader.ts). FKs differ from resource metadata associations; SQL partial indexes/checks exceed Prisma declarations.                                                                                                                                                                                                                                        | Existing application/CI migration evidence is preserved. No new live migration-status/replay check; candidate Audit/query indexes are not described as applied.                                                                                                                                                                                                                       |
| Maintenance: competing edits and state graph                  | [Editor](../../apps/api/src/maintenance/infrastructure/prisma-maintenance-editor.ts), [lifecycle persistence](../../apps/api/src/maintenance/infrastructure/prisma-maintenance-lifecycle.ts), [rules](../../apps/api/src/maintenance/domain/maintenance-lifecycle.ts), DTOs and form/review hooks. Scoped lock + reviewed revision + conditional increment + audit; final states/reasons and current no-op behavior.                                                                                                                             | [PostgreSQL edits](../../apps/api/test/maintenance.postgres.integration.spec.ts), [lifecycle](../../apps/api/test/maintenance-lifecycle.postgres.integration.spec.ts), [React review](../../apps/web/src/features/maintenance/maintenance-form.test.tsx). Existing races do not establish fairness, wait bounds, live isolation or higher-load capacity.                              |
| Crew: reservation and cancellation/reuse sequences            | [Assignment repository](../../apps/api/src/crew/infrastructure/prisma-assignment.repository.ts), [coverage rules](../../apps/api/src/crew/domain/requirement-evaluation.ts), [composition](../../apps/api/src/crew/application/composition.service.ts). Common profile lock, ReadCommitted, inclusive cross-vessel predicate, cancelled-period release and whole-plan coverage.                                                                                                                                                                  | [Assignment](../../apps/api/test/assignment.postgres.integration.spec.ts), [cancellation](../../apps/api/test/assignment-cancellation.postgres.integration.spec.ts), [atomicity](../../apps/api/test/assignment-atomicity.postgres.integration.spec.ts), coverage/composition tests. No exclusion constraint, boarding approval, global qualification snapshot or chosen race winner. |
| Access: issuance and protected-write sequence                 | [Sessions](../../apps/api/src/access/application/demo-sessions.ts), [authentication](../../apps/api/src/access/http/authentication.guard.ts), [permissions](../../apps/api/src/access/http/permission.guard.ts), budget guards, [browser storage](../../apps/web/src/auth/demo-session-storage.ts). One-hour demo versus provider-configured OIDC life; active/fixed-role/grant checks and guard ordering.                                                                                                                                       | [Demo HTTP](../../apps/api/test/demo-access.integration.spec.ts), [PostgreSQL](../../apps/api/test/demo-access.postgres.integration.spec.ts), [React](../../apps/web/src/auth/demo-access.test.tsx). Shared attribution, no server logout revocation, no deployed administration workflow or distributed quota.                                                                       |
| Audit: critical transaction success/rollback sequence         | [Writer port](../../apps/api/src/audit/application/audit-event.writer.ts), [writer](../../apps/api/src/audit/infrastructure/prisma-audit-event.writer.ts), representative Fleet/Crew/Maintenance callbacks, [error filter](../../apps/api/src/common/http/api-exception.filter.ts). Same TransactionClient, awaited append, selected caller metadata and safe failures.                                                                                                                                                                          | [Fleet rollback](../../apps/api/test/fleet.postgres.integration.spec.ts), Crew atomicity and Maintenance tests distinguish repository doubles from HTTP fixtures. Known pre-commit exception differs from lost commit acknowledgment; correlation/logs are not idempotency or transactional success history.                                                                          |
| Compliance: trigger/local-chain/completion sequence           | [Runner](../../apps/api/src/compliance/application/notification-job.service.ts), [repository](../../apps/api/src/compliance/infrastructure/prisma-notification.repository.ts), [condition rule](../../apps/api/src/compliance/domain/notification.ts), [SQL predicates](../../apps/api/prisma/migrations/20261004010000_compliance_notification_jobs/migration.sql), [web polling](../../apps/web/src/features/compliance/use-notification-watch.ts). Active keys, atomic reconciliation/success, separate failure write and explicit retrigger. | [PG idempotency](../../apps/api/test/compliance.postgres.integration.spec.ts), [service doubles](../../apps/api/src/compliance/application/notification-job.service.spec.ts), [React](../../apps/web/src/features/compliance/notification-watch.test.tsx). RUNNING accepted, claim outside try, no fencing/lease/startup scan; test is not crash or multi-worker recovery.            |
| Evolution: quantities, pressure and adoption gates            | [#15 artifact](../measurements/2026-10-12-public-read.json), seed counts, actual queries/index inventory and the five cases. D table arithmetic; C in-flight requests distinct from rate, visitors, tokens and Users; proposed changes labeled investigation.                                                                                                                                                                                                                                                                                    | No benchmark or proposed index/cache/pool/worker design is adopted. Data distribution, no-cost provider headroom, lock/pool timings and combined D/C outcomes remain unknown.                                                                                                                                                                                                         |

## Decision history, vocabulary and numbers

- ADR-0001–0004 remain current for repository, modular API and normal identity;
  provider/provisioning deferrals are historical where subsequently resolved.
  ADR-0005 is historical paid preparation, not current spending authority.
  ADR-0006 is superseded by 0007; attachments are retired. ADR-0008 retains shared
  public DemoAccounts. The index preserves current/historical/superseded status.
- Original ADR-0001–0008 contents match their pre-Phase-6 `748310a` versions.
  ADR-0009–0011 retain their recorded baselines and retrospective labels; this
  slice adopts no new identity, tenancy, recovery, index or infrastructure decision.
  Unknown historical motives remain explicitly unknown.
- [Glossary](../../GLOSSARY.md) and case vocabulary distinguish User/DemoAccount,
  visitor, CrewMember, onboard role and MaintenanceAssignee. Planning/coverage
  remains synthetic and advisory; Activity identifies an account, not a visitor.
- Seed rows total 33, with uniform D=10/100 illustrations totaling 330/3,300;
  observed #15 counts are separate. The 30 attempts split into six bootstrap and
  24 scenario requests, and 29 reads plus one issuance. Timings/sample sizes and
  nearest-rank limitations agree with the artifact, including initial liveness.
- Crew's inclusive/date/coverage rules, twenty-row pages and Maintenance's
  five-row pages remain distinct. Process budgets count attempts, not successful
  writes, requests per second or an authorization-independent capacity ceiling.

## Checks performed for this slice

Local results and review findings are recorded here and in
[durable progress](../progress.md). Diagram/source, reference, unit and local gate
checks and both independent review axes are complete. Their results are recorded
below; owner acceptance remains separate.

| Check                                                                                                 | Result / scope                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mermaid rendering and visual inspection                                                               | Passed: Mermaid 11.12.0 with Chrome headless; 13 SVG/PNG renders inspected, legible and unclipped: 3 architecture, 3 relationship, 2 Maintenance, 2 Crew and 1 each Access/audit/reconciliation. Generated verification artifacts stay in ignored local scratch.                                   |
| Local Markdown targets and heading anchors                                                            | Passed: 507 targets/anchors across 37 Markdown documents, including all flagship/ADR Markdown, root setup, glossary, roadmap, progress and deployment context. Remote sites are not claimed universally live.                                                                                      |
| Source/diagram and important claim agreement                                                          | Inspected source seams in the matrix above, current/historical/hypothetical distinctions, glossary and numerical units.                                                                                                                                                                            |
| Original ADR integrity                                                                                | `git diff --exit-code 748310a HEAD` scoped to original eight ADRs returns no changes.                                                                                                                                                                                                              |
| Formatting, lint, types, focal/full tests, convention audit, Prisma validation/schema diff and builds | Passed locally: format/whitespace, lint, typecheck, coverage focal test (18), npm test (9 CLI local HTTP + 87 API + 140 React), convention audit, Prisma validate/from-empty schema diff and production builds. Known unchanged Vite bundle warning >500 kB remains; no live DB migration applied. |
| Independent Standards and Spec review                                                                 | Passed against fixed baseline df0f2c9: Standards 0 documented-standard findings/0 smells; Spec 0 findings, no partial requirements or scope creep. Independent numerical, source and ADR-history checks agree with this record.                                                                    |

HTTP/PostgreSQL application suites, live UI/provider checks, live migration status
or replay, new environment/OIDC checks and public measurement/load/fault drills
are not applicable to this documentation-only change and are not reported as
new passes. Historical linked results retain their own scope. No secrets, real
operational data, new tests mirroring implementation, permanent monitoring,
keep-alive, paid service, migration or optimization is introduced.

## Delivery and remaining limits

Native GitHub dependencies #17–#21 are still open when inspected for #22; their
implementation deliverables exist in the recorded local commits. This work uses
those verified artifacts without claiming tracker dependencies were closed or
the issue was unblocked. Publication, tracker reconciliation and owner acceptance
are separate from local implementation/verification and are not performed here.

The public technical package's acceptance does not require private practice.
The report establishes readable/navigable, source-grounded documentation, not
capacity at D=10/100 or C=10/100, safe distributed job execution, provider recovery,
availability, production compliance or current deployment state. Historical
runtime evidence and the known application bundle warning remain qualified.
