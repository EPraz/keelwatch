# Keelwatch: keeping concurrent maintenance edits deliberate

Keelwatch is an independent maritime operations portfolio project built with
original code and synthetic data. Its central Maintenance workflow makes a
concurrency problem visible: two editors change one order, one saves, and the
other must review the newer record without losing their draft. I built the
workflow across React, NestJS and PostgreSQL, connecting deliberate recovery with
server-enforced permissions and transactional audit history.

[Explore the demo](https://keelwatch-chi.vercel.app/sign-in) ·
[Inspect the code](https://github.com/EPraz/keelwatch) ·
[Follow the engineering evidence](./README.md)

## The problem and my scope

An operations workspace needs more than editable records. People act on shared
information, roles permit different actions, and later readers need to understand
what changed. An old form silently replacing a newer decision would undermine
that trust even if both editors were authorized.

My role spans domain modelling, interface workflows, REST APIs, persistence,
authorization, tests and deployment. The product covers Fleet, Compliance, Crew
and Maintenance in a [modular monolith](./ARCHITECTURE.md). This case focuses on
one complete workflow rather than treating the technology list as the result.
It represents personal engineering work, not a client engagement or maritime
approval system.

## A conflict the user can resolve

Two Manager editors open the same order. One saves a changed title; the second
submits a draft based on the previous revision. The server rejects that stale
save. The interface retains the draft and reads the current order, showing
previous values, current values and the draft for fields changed since review.

The editor can adopt current field values or retain their own, then explicitly
continue with reviewed values and save. Continuing alone sends no write. A later
change can cause another conflict; there is no automatic merge. Activity shows
confirmed changes, and an Auditor can inspect the same records read-only.
Draft retention applies within the current workspace, not across reload or role changes.

[Follow the six contextual captures](./MAINTENANCE_JOURNEY.md) from the real local
app, API and isolated PostgreSQL scenario, including reproduction and limits.

Two tabs can use one shared Demo Manager account. Activity identifies that
DemoAccount, not individual visitors. The responsible maintenance user is an
access-account user; a CrewMember is a separate synthetic crew profile.

## Decision 1: preserve reviewed intent, then serialize the write

Each edit carries the revision the editor reviewed. Within a PostgreSQL
transaction, the API locks the order row scoped to its vessel, checks the current
revision and applies an actual change with a revision increment.

The two mechanisms answer different questions. The revision detects outdated
intent; the row lock orders competing application writes while they inspect and
change the record. Locking ends with the transaction, not when a browser form
closes. Compared with last-write-wins, this preserves an explicit opportunity to
review. A lock without a revision check would still allow an outdated draft to
overwrite a newer decision.

The cost is waiting on a contended row and potentially repeating manual review.
It establishes no waiting-time or throughput guarantee. The
[Maintenance case and retrospective decision record](./MAINTENANCE_CASE.md)
explain the protocol, alternatives and existing race/recovery tests.

## Decision 2: commit the change and its history together

A successful critical write and its AuditEvent use the same database transaction.
If audit persistence throws before commit, the order change and revision roll
back too. Writing the business record and appending history independently would
create a failure window where one exists without the other.

This deliberately couples command success to audit persistence and keeps the
transaction open through the append. The [audit rollback case](./AUDIT_ROLLBACK_CASE.md)
traces that boundary to existing tests. Activity records successful facts, not
every rejected attempt. A lost network response is also different from a known
rollback: the client must inspect current state before retrying an uncertain write.

## Evidence and boundaries

Existing HTTP/PostgreSQL tests check a single competing edit winner and rollback
when audit fails. Rendered React tests check retained drafts and explicit recovery;
their simulated responses do not establish database locking. The
[verification record](./EVIDENCE_VERIFICATION.md) separates those evidence types.

[Crew reservation and cancellation](./CREW_CASE.md) provides a second consistency
case without repeating this story. The public demo uses shared synthetic data;
these tests do not establish customer impact, production capacity or provider
availability. The result is an inspectable workflow with explicit recovery,
permissions and history, with its guarantees bounded by the implemented protocol.
