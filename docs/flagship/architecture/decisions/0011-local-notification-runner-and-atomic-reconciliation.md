# ADR-0011: Local notification runner with atomic reconciliation

- Status: accepted implementation, documented retrospectively; no new runtime decision.
- Recorded: 2026-10-14 at repository `e24d316`, for #21.

Compliance retains its existing in-process notification runner, PostgreSQL run
records and atomic condition-reconciliation/run-completion transaction. A local
promise chain serializes scheduled executions; partial unique indexes bound
active run records and active conditions. This is not a durable scheduler or a
distributed ownership protocol. Original reasons beyond the accepted roadmap and
observed implementation were not separately recorded; the analysis below does
not invent them.

## Context and implemented boundary

The accepted [Phase 2 outcome](../../../maritime-operations-roadmap.md#fase-2--cumplimiento-documental)
calls for idempotent synthetic expiry notifications and observable failures.
The [service](../../../../apps/api/src/compliance/application/notification-job.service.ts)
schedules both newly created and reused active runs in one process chain.
The [repository](../../../../apps/api/src/compliance/infrastructure/prisma-notification.repository.ts)
reconciles keys and marks SUCCEEDED in one transaction. Failure recording is
separate. The [migration](../../../../apps/api/prisma/migrations/20261004010000_compliance_notification_jobs/migration.sql)
enforces one active row per job code and one unresolved row per condition key.

Preserve this boundary for the existing demo, with its limitations stated rather
than reinterpreting persisted runs as durable scheduling. markRunning accepts
RUNNING as well as QUEUED and is not an exclusive claim. No startup recovery,
lease, heartbeat, owner check, retry/backoff or timeout is implemented. An explicit
permitted trigger can reschedule a persisted active run; a restart by itself cannot.
The [technical case](../../RECONCILIATION_CASE.md) traces those consequences and
separates inspected mechanisms from actual test coverage.

This warrants a record because a future reader might infer recovery and exclusive
ownership from persisted runs and active uniqueness. Adding either guarantee
changes failure semantics and requires deliberate ownership/recovery design;
moving scheduling to another service also changes deployment and publication
boundaries. It is more consequential than renaming an internal helper.

## Present-day alternatives and consequences

These comparisons are current analysis, not a claim that the original implementer
proposed/rejected every option or chose the mechanism for unrecorded reasons.

| Alternative                                                                      | Trade-off against the implemented boundary                                                                                                                                                         |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reconcile synchronously in the trigger request                                   | Removes the local scheduling handoff but lengthens request/connection lifetime and changes the 202/polling contract. HTTP timeout still cannot prove commit outcome.                               |
| Durable database worker with exclusive claim, lease/fencing and startup recovery | Can address abandoned work and concurrent ownership if designed together with retries and idempotency. Active uniqueness alone is insufficient; this would be new runtime/schema/operational work. |
| External durable queue/worker                                                    | Separates execution lifecycle, but adds a delivery/publication boundary, retry policy, duplicate handling, operation and potentially cost. None is adopted or authorized here.                     |
| Commit notifications, then mark success independently                            | Can publish a changed watch with a nonterminal/failed run when the second write fails. The current completion transaction avoids that split.                                                       |
| Treat all conditions as new on every run                                         | Duplicates stable active risk facts and loses retained identity; current key reconciliation/partial uniqueness preserves that identity.                                                            |

The benefit is inspectable derived state and persisted safe outcomes using the
existing modular API/database, without another service. The cost is dependence on
one process for scheduling, no automatic recovery/terminal deadline, shared API
resources and no distributed-worker safety. Reads feeding derivation precede the
completion transaction, so the job is not a snapshot of every concurrent source
change. Conditions are demo watch records, not external delivery guarantees.

The separate [audit rollback case](../../AUDIT_ROLLBACK_CASE.md) and ADR-0002 retain
critical operational mutation + AuditEvent atomicity; this runner does not append
those events or replace them with job records. Existing hosting, shared-demo and
attachment decisions remain intact. Any stronger recovery/scale design needs its
own evidence and authorization; this record introduces no infrastructure, fault
drill, paid service, migration, monitoring or personal practice material.
