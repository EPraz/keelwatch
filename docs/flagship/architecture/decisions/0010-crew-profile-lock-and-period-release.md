# ADR-0010: Crew profile lock for reservation and period release

- Status: accepted implementation, recorded retrospectively; no new runtime decision.
- Recorded: 2026-10-14 at repository `9a83171`, for #19.
- Original requirements: [CrewAssignment spec #1](https://github.com/EPraz/keelwatch/issues/1).

Crew serializes creation and cancellation on the same CrewMember row in explicit
ReadCommitted transactions. Creation checks inclusive overlaps across vessels
before inserting with audit; cancellation releases the whole reserved period
only when its metadata and audit commit. This records the implemented protocol,
including its absence of an exclusion constraint, without inventing original
unrecorded reasons for choosing that mechanism.

## Context and implemented decision

The accepted spec requires a fleet-wide reservation per member, safe concurrent
creation/cancellation, retained final cancellation, same-reason retry without
another event and transactional audit. It leaves the mechanism an implementation
detail. The current
[repository](../../../../apps/api/src/crew/infrastructure/prisma-assignment.repository.ts)
locks a stable profile row even when no assignment exists. Cancellation resolves
the vessel-scoped assignment, takes the same profile lock and rereads its state.
Both paths use ReadCommitted and share each critical write with AuditEvent.

Preserve this protocol in all current assignment write paths. The stable key
serializes competing reservation/release decisions across vessels and functions,
including the first reservation. Locks end with the transaction, not the browser
form. Cancelling is irreversible whole-plan invalidation rather than shortening
dates; same-reason retries preserve the first facts and different reasons conflict.
The [Crew case](../../CREW_CASE.md) traces these decisions to code and tests.

## Retrospective alternatives and consequences

The following are present-day comparisons, not claimed historical deliberations.

| Alternative                                             | Consequence against the accepted requirements                                                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Check overlaps without serialization                    | Two transactions can both see an empty period before either insert; a successful read alone does not reserve it.                                                                                                                |
| Lock only the target vessel or existing assignments     | A vessel key misses competing vessels; locking existing plan rows provides no common row for the first reservation. The implemented profile key covers those cases.                                                             |
| Database range exclusion for non-cancelled periods      | Could enforce overlap absence beyond cooperating application writes, but would require a justified schema/operator design and migration. It is not applied today and would not alone define cancellation retry/audit semantics. |
| Serializable transactions with an explicit retry policy | Another possible design, with serialization-error handling and uncertain-request recovery to assess. No such redesign, retry loop or performance claim is adopted.                                                              |
| Truncate dates or delete cancelled plans                | Changes whole-period invalidation and retained history; conflicts with the current meaning of cancellation.                                                                                                                     |

The benefit is one ordered application protocol for reservation and release,
with rollback preserving the prior reservation if cancellation audit fails.
The costs are profile-level waiting (including disjoint periods for the same
member), transaction/connection usage, explicit conflict recovery and dependence
on every future write path cooperating. There is no wait-time/fairness/load guarantee.

SQL preserves dates, references and cancellation metadata shape, but there is
**no exclusion constraint** for non-overlap and no SQL protection of finality or
mandatory audit. External SQL bypassing the protocol is outside the invariant's
guarantee. Fleet status and account authorization are checked at their implemented
lookup points, not serialized by this profile lock. Coverage is advisory and reads
current evidence; no boarding/fitness approval or visitor identity is added.
Existing decisions remain intact; no extension, distributed lock, worker, schema
change, paid service, public fault drill or new infrastructure is authorized.
