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

1. Read the [current architecture](./ARCHITECTURE.md): context, Vercel/Render/Neon
   deployment, identity/trust boundaries, six modules and actual web contracts.
2. Inspect the [data and invariants](./DOMAIN_MODEL.md): foreign keys, ownership,
   SQL checks/indexes, application write protocols and bounded query examples.
3. Follow the [eight-decision index](./architecture/decisions/README.md) for current,
   superseded and historical decisions, with original ADR history preserved.
4. Inspect the two central mechanisms in existing code and evidence:
   [Maintenance revision/locking](../../apps/api/src/maintenance/infrastructure/prisma-maintenance-editor.ts)
   and [concurrency/rollback tests](../../apps/api/test/maintenance.postgres.integration.spec.ts);
   [Crew reservation/cancellation](../../apps/api/src/crew/infrastructure/prisma-assignment.repository.ts)
   and [cancellation tests](../../apps/api/test/assignment-cancellation.postgres.integration.spec.ts).

The standalone explanations of Maintenance
[#18](https://github.com/EPraz/keelwatch/issues/18), Crew
[#19](https://github.com/EPraz/keelwatch/issues/19), sessions/permissions
[#20](https://github.com/EPraz/keelwatch/issues/20), and audit/reconciliation
[#21](https://github.com/EPraz/keelwatch/issues/21) are subsequent deliverables.
[Evolution/package verification #22](https://github.com/EPraz/keelwatch/issues/22)
depends on all five maps/cases; completing #17 does not complete Phase 6.

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
| [Deployment runbook](../deployment.md) and [durable progress](../progress.md)                   | Current deployment evidence and explicitly qualified historical gates.        |

The public product name is Keelwatch; its descriptor is “Maritime compliance and
operations workspace.” Product identity remains independent of the portfolio
presentation site. Runtime, schema, identity guarantees and infrastructure are
unchanged by this documentation slice. Private interview practice is outside this
public evidence package.
