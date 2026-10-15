# Evidence-conditioned evolution — Keelwatch

This analysis implements [#22](https://github.com/EPraz/keelwatch/issues/22), using
the locally completed maps/cases at repository `df0f2c9`, inspected 2026-10-14.
It compares hypothetical data growth and request concurrency; it is not a load
result, performance target or plan to provision infrastructure. Investigation
comes before a change, and retaining the current design is a valid outcome.
The [package verification](./EVIDENCE_VERIFICATION.md) records the integrated checks.

## Actual baseline and constraints

The [architecture](./ARCHITECTURE.md) is one NestJS modular API, PostgreSQL/Prisma,
and a React SPA. Access, Fleet, Compliance, Crew, Maintenance and Audit have explicit
boundaries. The owner-reported current deployment is Vercel, the existing Render
API and Neon Free; provider regions, hardware, effective idle/probe settings and
current connection capacity have not been independently established. Historical
paid hosting preparation is not the current design or spending authority.

Normal identity remains Auth0 OIDC; the public demo has two fixed shared Users,
Demo Manager and Demo Auditor. Server checks active User/roles/permissions on each
protected request. Visitors, tokens and API requests are not extra Users or tenants.
[Access](./ACCESS_CASE.md) explains the one-hour demo lifetime, account attribution,
stateless logout limits and process-local budgets. No per-visitor isolation or
changed identity model is contemplated by these scenarios.

The [data guide](./DOMAIN_MODEL.md) inventories actual PKs/FKs, SQL checks and
indexes, including partial notification uniqueness. A proposed Audit or query
index is a candidate until a separate change adopts it. Dates are UTC calendar
values; Crew periods include both ends, and coverage considers the whole plan.
Attachments remain retired under ADR-0007, with historical rows/events retained.
No analysis below restores them, deletes history or adopts a retention policy.

## Define the units before multiplying them

Let **D** denote a synthetic operational-row multiplier relative to the original
[33-record seed](./DEMO_DATASET.md). It is a fixture scenario, not an inventory of
the public database. Uniform replication keeps this mix only as a first assumption:

| Operational table/unit    | D=1 seed rows | D=10 hypothetical rows | D=100 hypothetical rows |
| ------------------------- | ------------: | ---------------------: | ----------------------: |
| Vessels                   |             5 |                     50 |                     500 |
| Certificates              |             4 |                     40 |                     400 |
| CrewMember profiles       |             5 |                     50 |                     500 |
| Qualifications            |             7 |                     70 |                     700 |
| Assignment plans          |             6 |                     60 |                     600 |
| Maintenance orders        |             6 |                     60 |                     600 |
| Total of these six tables |            33 |                    330 |                   3,300 |

This omits Users, roles, catalog, AuditEvent, notifications, runs and inactive
attachment history. Their total sizes were not measured and must not be invented
from the sum. Index bytes, row widths and working-set size also are not multiples
of this count by definition. These small nominal row totals do not themselves
justify partitioning, caching or another service.

Distribution is an independent assumption. A history-heavy variant can hold vessel
and profile counts constant while growing certificates, qualifications, plans,
orders and events per resource. It must state its own per-table counts rather than
call the uniform table a prediction. Cancelled/archived rows and date/status
distribution affect selectivity. More independent profiles spread reservation
locks; more plans for one profile increase work behind the same serialization key.

Let **C** denote simultaneous **in-flight API requests**: C=1, C=10 or C=100, while
retaining the two DemoAccounts. It is not requests per second, completed operations,
browser sessions or unique visitors. Arrival pattern and duration are needed to
relate concurrency to throughput; 100 overlapping requests do not prove 100/s.
One browser can initiate several reads; several visitors can reuse the same account.

| Separate scenario axis                    | What changes                              | What must be held explicit                                                                                                           |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| D=10 or D=100, C held at 1                | Rows/distribution under sequential demand | Date, filters, page depth, archive/cancellation mix, history per resource, existing permissions and rule outcomes.                   |
| C=10 or C=100, D held at a stated fixture | Overlapping demand for the same data      | Read/write/trigger mix, credential reuse versus new issuance, hot resource IDs, arrival shape, attempted/successful/failed requests. |
| Combined D and C                          | Both pressures                            | Results of either isolated axis cannot establish this combination; it needs its own separately authorized evidence.                  |

For concurrency, distinguish read fan-out, critical writes to independent resources,
same-order/profile writes and repeated job triggers. Those workloads consume
different resources. Higher C can produce legitimate conflicts or 429 refusals;
their latency is not successful-write throughput. No C=10/C=100 workload is run
against the public demo or introduced into CI here.

## What #15 measured, and what it did not

The authoritative [measurement](./DEMO_PERFORMANCE.md) and
[sanitized artifact](../measurements/2026-10-12-public-read.json) retain the method.
On 2026-10-12T02:02:05.010Z, a Windows x64 workstation in Colombia using Node
v24.13.0 made **30/30 attempts**, sequential concurrency **1**, in **78,513.73 ms**,
with **0 errors**, no retries and correlation echo on all responses. The budget was
180 seconds overall/60 seconds per request. Six bootstrap requests preceded 24
scenario reads (six passes across four workflows), with 250 ms between scenario
requests. One of the 30 requests issued a session; the other 29 were reads.

The seed's five vessels were not the observed Fleet total: the run saw **6 vessels**,
5 Crew profiles, 2 Aurora certificate records, 2 current composition entries and
3 Aurora orders. Those are selected API observations, not a global certificate,
qualification, plan, order, audit or storage inventory. Provider regions/hardware
and network throughput were not measured. No operational write was part of #15.

| Observed phase/workflow                   | Historical client time, ms | Interpretation boundary                                                                                   |
| ----------------------------------------- | -------------------------: | --------------------------------------------------------------------------------------------------------- |
| Initial process-only liveness             |                  52,422.32 | Dominant observed wait; no SQL in that handler, no confirmed provider suspension event.                   |
| Next explicit readiness                   |                   1,060.90 | Successful SELECT 1 boundary for the PostgreSQL Access store in that run, not every workflow's readiness. |
| Fleet first pass; later p50 / p95         |    631.16; 506.29 / 582.82 | First n=1; subsequent n=5.                                                                                |
| Aurora Compliance first; later p50 / p95  |    839.66; 618.14 / 636.21 | Same small sequential sampling.                                                                           |
| Aurora composition first; later p50 / p95 |  930.04; 730.02 / 1,349.50 | Not a measured qualification-query bottleneck.                                                            |
| Aurora Maintenance first; later p50 / p95 |  838.49; 655.73 / 1,096.22 | Not competing edits or lock-wait measurement.                                                             |

Times cover fetch through full body receipt, including client/network/service
time, excluding later JSON parsing. They are not server-only SQL time, page render
time or throughput. With five subsequent samples, nearest-rank p95 is the maximum;
it is not a stable tail estimate. The whole-run p50/p95 mixes bootstrap and scenario
work, so it cannot replace the phase/workflow distinction. The artifact/method
retains failed attempts too; this run's zero errors is not a future reliability rate.

A free-host start is plausible for the initial wait, but unconfirmed. Readiness
and issuance may already have touched PostgreSQL before the first scenario pass.
Nothing here establishes a database bottleneck, Neon wake-up, cold-start cause,
availability guarantee or D/C capacity. #22 does not rerun #15 or multiply its
latency into a prediction.

## Pressures visible in source, not measured bottlenecks

| Boundary and reading                                                                                                                                                           | D pressure                                                                                                                                             | C pressure / invariant to retain                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Fleet list/active lookup](../../apps/api/src/fleet/infrastructure/prisma-vessel.repository.ts)                                                                                | Offset page/count and full active-vessel reads can do more work as their relevant sets grow; no extra ordinary Vessel index is currently applied.      | Independent reads still share API/DB resources; a small response page is not proof of small query work.                                                                                                        |
| [Compliance queue](../../apps/api/src/compliance/application/compliance-queue.service.ts) and [source reads](../../apps/api/src/compliance/infrastructure/compliance-query.ts) | Load active vessels and their certificate data before deriving/filtering/paging; broad fetch and in-memory derivation can grow despite bounded output. | Concurrent requests repeat that work; notification derivation also consumes these sources in the API process.                                                                                                  |
| [Composition](../../apps/api/src/crew/application/composition.service.ts)                                                                                                      | Assignment page/count precedes qualification interval reads for selected members; long evidence histories matter independently of page size.           | Preserve whole-period union/coverage and current-evidence meaning; page/count and qualification reads are not one global snapshot.                                                                             |
| [Crew reservation/cancellation](./CREW_CASE.md)                                                                                                                                | Per-profile inclusive-overlap lookup can encounter more history.                                                                                       | Same profile serializes even disjoint periods; independent profiles still share connections. Removing the lock/check would change the invariant.                                                               |
| [Maintenance edits/lifecycle](./MAINTENANCE_CASE.md)                                                                                                                           | Five-row indexed lists still filter/count history; audit history can grow separately.                                                                  | Same-order lock and expectedRevision protect reviewed intent. More connections do not eliminate serialization or legitimate stale conflicts.                                                                   |
| [Audit rollback/history](./AUDIT_ROLLBACK_CASE.md) and [reader](../../apps/api/src/audit/infrastructure/prisma-audit-event.reader.ts)                                          | Resource/correlation history is not sized by the 33-row seed; metadata-associated Vessel queries differ from direct entity lookups.                    | Append extends the critical transaction. Preserve mutation + event atomicity; direct SQL cannot be assumed to follow that protocol.                                                                            |
| [Access](./ACCESS_CASE.md)                                                                                                                                                     | User/role lookup is required per protected request; two demo accounts do not mean two lookups total.                                                   | Issuance defaults to 30 attempts/60 s and Manager writes 60 attempts/3600 s per process. Reads and ordinary OIDC writes skip that write counter; refused writes have already passed account/permission lookup. |
| [Reconciliation](./RECONCILIATION_CASE.md)                                                                                                                                     | Whole derived-set reconciliation, retained conditions and run history can grow; no fixed runtime/memory bound follows from one active run row.         | Local scheduling is serial, but RUNNING can be claimed again and active uniqueness is not worker ownership. Replicating the API would expose this limitation.                                                  |

The current [PrismaService](../../apps/api/src/database/prisma.service.ts) is a shared
client and disconnects at shutdown; source does not establish live pool size,
pool-wait distribution or provider connection headroom. Do not turn a library
default or historical paid plan into an observed setting. Locks/transactions can
hold connections while waiting; diagnosis must distinguish pool waiting, SQL
execution, lock waiting, API derivation and provider/network delay.

## Conditional changes and their adoption evidence

Every row below is a **hypothesis to investigate**, not an adopted ADR, migration
or mandatory optimization. Future investigations require a separately scoped,
authorized synthetic environment/workload. Preserve failures and conflict outcomes,
not only successful samples. Temporary diagnostic evidence is not a new permanent
monitoring platform, and nothing here authorizes public load or fault drills.

| Contemplated change                                                         | Pressure and evidence to gather                                                                                                                                                                                                | Adoption condition                                                                                                                                                                                | Alternatives and consequences                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Narrow expensive reads/derivation, then consider a matching query index     | Per-table counts/distribution, emitted SQL and actual rows scanned/returned, sort/buffer work, transferred data and API derivation time at representative D. Compare actual predicates/order with the applied index inventory. | A repeatable costly path materially explains workflow delay/resource use; a comparison preserves rules/results and improves the measured path within acceptable write/storage cost.               | Keep the existing scan on tiny sets; reduce projection/redundant fetch before an index; consider an Audit direct-entity candidate only for that actual path. Metadata/OR Vessel history may need a different design. No universal index is prescribed.                                                                 |
| Revisit deep paging/count or broad source-set work                          | Page depth/count cost and full Compliance/qualification-set size, measured separately from response size.                                                                                                                      | Current access pattern is demonstrably wasteful and an alternative preserves stable ordering, complete global predicates and required counts/coverage.                                            | A cursor or narrower SQL read can change navigation/contracts; truncating evidence, paging before overlap checks or losing full-period renewals is not an optimization. Each needs a separate reviewed slice.                                                                                                          |
| Shorten measured transaction work and investigate hot-key contention        | Same versus different order/profile requests, lock-wait and transaction/connection hold time, conflicts, audit-append cost and timeouts.                                                                                       | Avoidable work, rather than the required invariant itself, causes repeated contention; a redesign preserves revision review, global overlap/release and atomic audit with a defined error policy. | Keep necessary serialization; query improvements may suffice. Changing isolation or adding retries requires deliberate conflict/uncertain-commit handling, not automatic overwrites or silent repeats.                                                                                                                 |
| Adjust connection/use-of-concurrency policy within verified resource limits | Effective pool configuration, active/waiting connections, acquisition time, provider headroom, SQL/lock duration and errors under a stated workload.                                                                           | Pool acquisition is established as pressure and more/changed usage fits known no-cost provider limits without increasing DB contention.                                                           | First reduce held work or request fan-out. Increasing pools/API replicas blindly can multiply connections and worsen lock queues; no pool number or capacity upgrade is selected.                                                                                                                                      |
| Revisit shared budgets and job ownership before multiple API processes      | Real demand/429s separated from business failures, issuance frequency versus credential reuse, reset behavior, interrupted-run observations and concurrent-executor requirements.                                              | There is an accepted need beyond one process or for reliable unattended recovery, with an explicit shared policy/ownership/retry design and separate negative/failure evidence.                   | Retain one process and explicit retriggering; a durable database protocol is a possible redesign. Replicas split the current counters and lose a single promise chain. Another queue does not by itself solve publication, ownership or duplicate effects.                                                             |
| Cache or precompute an expensive read model only after simpler query work   | Repeated equivalent reads, derivation cost, acceptable freshness, mutation/date dependencies and invalidation races.                                                                                                           | Reuse materially improves a measured problem and scoped keys/invalidation meet the accepted freshness and permission boundary.                                                                    | Remain uncached or deduplicate redundant reads. UTC rollover, certificate edits/archive, renewals and plan cancellation can change results; all relevant writers matter. Never bypass per-request active-user/permission checks or turn shared data into permission leakage. No Redis or projection service is chosen. |

[PostgreSQL 17 EXPLAIN guidance](https://www.postgresql.org/docs/17/using-explain.html)
helps distinguish plan estimates from actual execution; planner cost is not
milliseconds, and EXPLAIN ANALYZE executes the statement. Any future execution
belongs in the authorized synthetic diagnostic environment. PostgreSQL's
[activity/wait-event documentation](https://www.postgresql.org/docs/17/monitoring-stats.html)
provides vocabulary for wait observations, not a claim that this project has
collected them or enabled an extension/exporter.

No partitioning, automatic history deletion, read replica, managed worker,
microservice or Kubernetes step is implied by D=100/C=100. A module boundary alone
does not justify another deployable system. If future resource requirements
cannot fit the no-cost constraint, bound/defer the workload or revisit product
scope with the owner rather than silently buying capacity. A consequential new
choice would require its own accepted decision; ADRs 0001–0011 remain unchanged.

## A reasoned order that evidence can change

1. **Locate the pressure.** Separate initial liveness, connection/readiness,
   authentication, query/lock/pool work, API derivation and subsequent reads. State
   D/C units and distributions before comparing. If evidence is inconclusive,
   improve the investigation rather than infrastructure.
2. **Remove demonstrated query waste.** Compare projections, predicates, paging,
   derivation and actual indexes against the same rule-preserving data. Retaining
   existing queries is appropriate when they are already cheap.
3. **Address the observed resource bottleneck.** Pool pressure, a slow scan and a
   hot-key lock need different responses. Preserve atomicity/revision/overlap
   protocols; check concurrency/failure outcomes before accepting a redesign.
4. **Resolve cross-process correctness before distributing work.** Current budgets
   and runner ownership are a prerequisite concern if another process is actually
   justified, not an excuse to add one. Recovery can be valuable without scaling.
5. **Consider caching/precomputation or a larger boundary only if earlier evidence
   still warrants it.** Account for freshness, invalidation, operational cost and
   new failure/publication semantics. A no-change conclusion remains legitimate.

This is not a fixed shopping list. If most delay is initial service availability
with short subsequent operations, query tuning may be irrelevant: clarify entry
feedback and the existing free-host limitations using confirmed evidence, without
keep-alives or an uptime promise. If historical job interruption causes unacceptable
manual work, accepted recovery needs could move the ownership investigation ahead
of read optimization. If same-profile lock waiting dominates while independent
requests are cheap, adding connections/caching does not remove required ordering.
If a measured scan dominates at D growth with C=1, query work can come first.

Provider/network uncertainty remains separate from demonstrated application
behavior. Liveness does not prove PostgreSQL/Auth0 readiness; successful SELECT 1
does not prove notification progress or every transaction. DB loss can prevent
failure recording, and connection loss near commit does not prove rollback.
Cached JWKS may permit some existing tokens, not a guaranteed browser outage path.
The [Access](./ACCESS_CASE.md), [audit](./AUDIT_ROLLBACK_CASE.md) and
[runner](./RECONCILIATION_CASE.md) cases retain those qualifications. Neither
continuous readiness polling nor a permanent metrics/tracing service is adopted.

Read the [Maintenance](./MAINTENANCE_CASE.md) and [Crew](./CREW_CASE.md) mechanisms
before changing their hotspots, then consult the [decision index](./architecture/decisions/README.md).
The integrated [verification record](./EVIDENCE_VERIFICATION.md) and
[progress](../progress.md) distinguish today's documentation checks from historical
runtime/public evidence. Private practice material is a separate local task and
is not required for acceptance of this public engineering package.
