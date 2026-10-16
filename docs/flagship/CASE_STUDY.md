# Keelwatch: connected maritime operations with traceable changes

Keelwatch is an independent maritime operations portfolio project built with
original code and synthetic data. A vessel workspace connects certificate
evidence, compliance risks, crew plans and maintenance work, with different
capabilities for Managers and Auditors. I built the product across React, NestJS
and PostgreSQL, from interface workflows and relational rules to server-enforced
permissions, transactional history and deployment.

The general journey shows the product's breadth. A separate Maintenance story
then makes one engineering problem visible: two editors change one order, one
saves, and the other reviews the newer record without losing their draft.

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
and Maintenance in a [modular monolith](./ARCHITECTURE.md). The product journey
connects those areas; Maintenance then provides a closer look at concurrent edits
and atomic history.
It represents personal engineering work, not a client engagement or maritime
approval system.

## One vessel, connected operational work

1. **Establish the fleet record.** A Manager registers a synthetic vessel, finds it
   in Fleet and opens its workspace. That record connects the following work.
2. **Maintain certificate evidence.** The Manager records certificate dates and
   references. The server derives the state and its reason in UTC; the compliance
   watch locates risks across vessels. A bounded background check reconciles the
   demo notification log. It does not send external email, and attachments are disabled.
3. **Plan crew work.** A CrewMember profile has dated demo qualifications. The
   Manager plans a vessel assignment and can inspect advisory requirement gaps
   across the whole period. Plans do not confirm boarding or certify fitness.
4. **Follow maintenance progress.** The Manager creates an order with an eligible
   access-account user responsible and a target date, then plans, starts and closes
   the work. That responsible User is distinct from a CrewMember.
5. **Inspect the recorded facts.** Activity connects vessel, certificate, assignment
   and maintenance changes. An Auditor reads the same data without operational
   write controls; the API independently enforces that role boundary.

Each area contributes to a usable operational journey. The overview is a
demonstration of principal actions and results, with deeper cases and tests
available for the rules and failure paths beyond that recording.

[Watch the general product walkthrough](./media/product/product-story.mp4),
or follow its [transcript and chapters](./PRODUCT_WALKTHROUGH.md).
The recording uses the real local app/API/PostgreSQL with synthetic data;
it is distinct from the earlier Maintenance conflict scenario below.

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
[Watch the silent 2:24 recording](./media/maintenance/maintenance-story.mp4) with
English captions, or [read the transcript](./MAINTENANCE_VIDEO.md) without media.

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
