# Keelwatch — engineering evidence

Keelwatch is an independent, clean-room maritime operations portfolio built with
original code and synthetic data. Fleet, Compliance, Crew and Maintenance are
implemented; Access enforces server permissions and Audit records critical changes.
Public Demo Manager and Demo Auditor journeys were owner-accepted in Phase 5.

This entry and the current maps implement
[#17](https://github.com/EPraz/keelwatch/issues/17), inspected at repository
`748310a` on 2026-10-14. They explain the actual system without claiming production
scale, regulatory fitness, personal visitor attribution or provider availability.

## Reviewer path

For a short introduction, read the [editorial case study](./CASE_STUDY.md): the
problem, personal scope, Maintenance journey and two decisions. The technical
path below supplies the implementation details and qualified evidence.

Start with Maintenance and Crew for the two central consistency cases; use the
maps to locate their boundaries and the supporting cases to examine failures.

1. Read the [current architecture](./ARCHITECTURE.md): context, Vercel/Render/Neon
   deployment, identity/trust boundaries, six modules and actual web contracts.
2. Inspect the [data and invariants](./DOMAIN_MODEL.md): foreign keys, ownership,
   SQL checks/indexes, application write protocols and bounded query examples.
3. Follow the [decision index](./architecture/decisions/README.md) for current,
   superseded and historical decisions, with original ADR history preserved.
4. Read the [Maintenance competing-edit case](./MAINTENANCE_CASE.md) and
   [Crew reservation/cancellation case](./CREW_CASE.md), then inspect
   the two central mechanisms in existing code and evidence:
   [Maintenance revision/locking](../../apps/api/src/maintenance/infrastructure/prisma-maintenance-editor.ts)
   and [concurrency/rollback tests](../../apps/api/test/maintenance.postgres.integration.spec.ts);
   [Crew reservation/cancellation](../../apps/api/src/crew/infrastructure/prisma-assignment.repository.ts)
   and [cancellation tests](../../apps/api/test/assignment-cancellation.postgres.integration.spec.ts).
5. Follow the supporting [Access session/permission case](./ACCESS_CASE.md) for
   identity, shared account attribution, expiry, logout and process-local budgets.
6. Compare [critical-write audit rollback](./AUDIT_ROLLBACK_CASE.md) with
   [Compliance reconciliation and runner limits](./RECONCILIATION_CASE.md):
   atomic success history is a different boundary from idempotent derived state
   and explicit retriggering of interrupted work.
7. Read the [conditional evolution](./EVOLUTION.md) for separate data/concurrency
   pressures, evidence gates and ordering. Inspect the
   [package verification](./EVIDENCE_VERIFICATION.md) for diagram/source checks,
   ADR history, vocabulary/units and remaining limits.

The Maintenance and Crew cases implement [#18](https://github.com/EPraz/keelwatch/issues/18)
and [#19](https://github.com/EPraz/keelwatch/issues/19).
The Access case implements [#20](https://github.com/EPraz/keelwatch/issues/20).
The separate audit/reconciliation cases implement
[#21](https://github.com/EPraz/keelwatch/issues/21).
[Evolution/package verification #22](https://github.com/EPraz/keelwatch/issues/22)
integrates those deliverables. Phase 6's public technical package is published at
`d68a679` with a passing [quality run](https://github.com/EPraz/keelwatch/actions/runs/38671977666);
the owner accepted the package and #16–#22 are closed. The
[delivery record](./EVIDENCE_VERIFICATION.md#subsequent-authorized-publication)
separates that publication/acceptance from the original local checks.
Private interview practice is not required to accept this package.

For hands-on inspection, use the [root setup and demo guide](../../README.md),
[synthetic dataset](./DEMO_DATASET.md), [journey evidence](./DEMO_JOURNEY_QA.md),
and [bounded read measurement](./DEMO_PERFORMANCE.md). The measurement preserves
its small dataset, client timing and concurrency-1 sampling limits; it is not
evidence of 10×/100× capacity.

## Product sources and history

| Source                                                                                          | Purpose                                                                       |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Portfolio strategy](../portfolio-strategy.md) and [roadmap](../maritime-operations-roadmap.md) | Accepted product scope and phase outcomes.                                    |
| [Clean-room boundary](./CLEAN_ROOM.md)                                                          | Original work/public sources/synthetic data; no employer or client materials. |
| [Product brief](./PRODUCT_BRIEF.md)                                                             | Original user problem, roles and non-goals; read alongside current scope.     |
| [Information architecture](./INFORMATION_ARCHITECTURE.md)                                       | Navigation and user flows, with implementation history.                       |
| [First vertical slice](./FIRST_VERTICAL_SLICE.md)                                               | Initial Fleet/Access/Compliance contract, not the entire current product.     |
| [Identity and repository](./IDENTITY_AND_REPOSITORY.md)                                         | Original product identity and independent repository decision.                |
| [Retired upload threat model](./DOCUMENT_UPLOAD_THREAT_MODEL.md)                                | Historical attachment experiment superseded by ADR-0007.                      |
| [Phase 6 scope record](./PHASE_6_PLANNING.md)                                                   | Owner-confirmed documentation boundaries and ticket graph.                    |
| [Phase 7 scope record](./PHASE_7_PLANNING.md)                                                   | Approved presentation scope and verification decisions.                       |
| [Phase 7 specification](./PHASE_7_SPEC.md)                                                      | Public presentation outcomes, stories and acceptance criteria in #23.         |
| [Phase 7 ticket graph](./PHASE_7_TICKETS.md)                                                    | Approved #24–#28 increments, native blockers and content approval gate.       |
| [Deployment runbook](../deployment.md) and [durable progress](../progress.md)                   | Current deployment evidence and explicitly qualified historical gates.        |

The public product name is Keelwatch; its descriptor is “Maritime compliance and
operations workspace.” Product identity remains independent of the portfolio
presentation site. Runtime, schema, identity guarantees and infrastructure are
unchanged by this documentation slice. Private interview practice is outside this
public evidence package.
