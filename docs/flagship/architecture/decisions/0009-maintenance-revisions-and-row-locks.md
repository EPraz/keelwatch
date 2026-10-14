# ADR-0009: Maintenance revisions with scoped row locks

- Status: accepted implementation, documented retrospectively; no new runtime decision.
- Recorded: 2026-10-14, at repository `63fe9a8`, for #18.
- Original requirement: [Phase 4 spec #7](https://github.com/EPraz/keelwatch/issues/7).

Maintenance edits and transitions retain the expected-revision contract, combine
it with a vessel-scoped order row lock, and conditionally increment revision in
the same PostgreSQL transaction as AuditEvent. This documents the implemented
protocol and its consequences; it does not retroactively claim the original
spec selected the lock or recorded every rationale below.

## Recorded context and current decision

The accepted spec requires rejection of stale edits/transitions, no new revision
or event for unchanged edits, rejection of stale no-ops, final-state protection,
and rollback if audit cannot persist. The current
[editor](../../../../apps/api/src/maintenance/infrastructure/prisma-maintenance-editor.ts)
and [lifecycle collaborator](../../../../apps/api/src/maintenance/infrastructure/prisma-maintenance-lifecycle.ts)
take the same `FOR UPDATE` lock by order/vessel before reading revision and rules.
Actual writes condition on ID/expected revision and increment with audit. The
[Maintenance case](../../MAINTENANCE_CASE.md) traces UI review through that protocol
and links the existing races, no-op and rollback evidence.

Preserve that combination for the current implementation. It makes a stale
no-op and a changed write consult the same serialized order state; the revision
still expresses which version the editor consciously reviewed. A lock-only write
would not detect intent based on an older browser draft. The public revision
contract and UI review behavior have callers/tests, so changing them is meaningful;
the lock is a narrower internal mechanism, not a new external API.

## Retrospective alternatives and consequences

These are present-day comparisons of mechanisms, **not** a claim that all were
historically proposed/rejected or that unrecorded motives are known.

| Alternative                                                | Trade-off against the implemented requirements                                                                                                                                                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Last-write-wins                                            | Simpler submission, but silently replaces another reviewed change and fails the accepted stale-write requirement.                                                                                                                               |
| Conditional revision update without the explicit read lock | Can protect actual writes if affected-row/conflict handling is designed; pre-write lifecycle/no-op decisions need equally sound atomic handling. It is a plausible redesign, not evidence the current lock is redundant in this implementation. |
| Lock and overwrite without expectedRevision                | Orders database access but cannot recognize a draft based on old data; serialization alone does not preserve user intent.                                                                                                                       |
| Stronger isolation with retry strategy                     | Requires handling serialization failures and stale human intent; repeating a database transaction cannot automatically authorize overwriting a newer reviewed version. No such redesign/retry policy is adopted.                                |

The implemented benefit is one order mutation plus one event for a successful
competing actual change, with the loser able to review. The costs are transaction
lock waits, shared connection consumption, current-value reads and possible repeat
conflicts. Locks end with the transaction, not the form. These methods inherit
database isolation rather than explicitly choosing it; the tested interleaving
does not establish live provider settings, bounded waiting or load capacity.

Application SQL bypassing this protocol can bypass revision increments, finality,
eligibility and audit completeness. Row serialization does not freeze User grants
or make history a visitor identity record. Existing module, identity and shared
demo decisions (0002/0003/0008) remain intact; no extra queue, distributed lock,
automatic merge, migration, infrastructure or spending is authorized.
