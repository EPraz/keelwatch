# Phase 7 refinement: connected product overview and two-level presentation

## Problem Statement

A recruiter watching Keelwatch's Maintenance conflict recording can inspect one
engineering problem but cannot see the breadth of the product already built.
Fleet registration, certificate evidence and compliance risks, crew qualifications
and planning, ordinary maintenance work and their shared history remain largely
outside that recording. Requiring the evaluator to explore the application to
discover that scope weakens the presentation.

The owner wants the implemented product to be understandable without interacting
with the demo, while keeping the existing conflict/recovery recording as evidence
of technical depth. The introduction and case must communicate the same scope.

## Solution

Present Keelwatch at two levels. Lead with a silent English product overview
targeting 4–5 minutes, following one synthetic vessel through the main actions and
results across Access, Fleet, Compliance, Crew, Maintenance and Audit. Follow with
the existing 2:44 Maintenance conflict/recovery recording for technical depth.

Provide explanatory captions, a transcript and navigable chapters for the general
overview. Prepared synthetic data may support the story; distinguish preparation
from actions performed during the recording. Show each area's principal capability
and resulting state without requiring every variant of every form.

Reframe the README introduction and editorial case around the complete product
and connected journey first. Explain the Maintenance concurrency and atomic-audit
decisions after that context, preserving deeper engineering evidence and limits.
The combined revised content must receive owner approval before portfolio work.

## User Stories

1. As a recruiter, I want the introduction to explain the complete operational
   product, so that I understand what the owner built beyond one conflict scenario.
2. As a recruiter, I want a short general recording, so that I can understand the
   application without installing it or entering data myself.
3. As a hiring manager, I want the owner's independent contribution and synthetic
   project scope stated clearly, so that I can evaluate the work in context.
4. As a viewer, I want one vessel to connect the journey, so that the modules feel
   like parts of the same operational workspace.
5. As a viewer, I want to see Manager access, so that I understand who performs
   the operational actions.
6. As a viewer, I want to see a vessel registered, so that I can understand how
   the fleet record enters the system.
7. As a viewer, I want to find that vessel and open its workspace, so that I can
   connect registration to later operational work.
8. As a viewer, I want to see certificate evidence recorded, so that I understand
   how compliance information is maintained.
9. As a viewer, I want the resulting certificate state explained, so that I can
   understand what the dates and recorded evidence mean in this demo.
10. As a viewer, I want to inspect the compliance risk queue, so that I can see
    how vessel evidence informs fleet-level attention.
11. As a viewer, I want notifications and their visible state explained, so that
    I understand the existing compliance watch without assuming external delivery.
12. As a viewer, I want to see a CrewMember profile created, so that I understand
    the crew registry's role in the product.
13. As a viewer, I want to see demo qualifications recorded, so that I understand
    the evidence available when planning crew work.
14. As a viewer, I want to see a CrewAssignment planned for the vessel, so that
    I understand how crew information connects to the fleet workspace.
15. As a viewer, I want planning and qualifications described with their limits,
    so that I do not infer actual boarding or maritime fitness approval.
16. As a viewer, I want to see a MaintenanceOrder created, so that I understand
    the ordinary maintenance workflow before its concurrency case.
17. As a viewer, I want to see maintenance follow-up and state changes, so that
    I can connect the order's creation with its lifecycle.
18. As a viewer, I want Activity after operational changes, so that I can connect
    visible actions with the recorded history.
19. As a viewer, I want to see an Auditor inspect the data read-only, so that
    I understand the distinction between the two demo roles.
20. As an evaluator, I want shared DemoAccount attribution explained, so that I
    do not mistake an account identity for an individual visitor's identity.
21. As a viewer, I want CrewMember and MaintenanceAssignee kept distinct, so that
    I do not confuse crew profiles with access-account responsibility.
22. As a viewer watching silently, I want English captions explaining purpose and
    result as well as action, so that the workflow makes sense without narration.
23. As a reader who cannot or prefers not to play media, I want an accessible
    transcript, so that I can understand the same connected product story.
24. As a viewer, I want chapters for the general recording, so that I can locate
    an area without replaying the complete video.
25. As a viewer, I want readable captions and interface details, so that pace and
    compression do not prevent me from following the demonstration.
26. As an evaluator, I want the product overview offered before the conflict
    recording, so that I can choose depth with the general context established.
27. As an engineer, I want the existing Maintenance recording and contextual
    captures retained, so that the broader presentation preserves its depth.
28. As an engineer, I want the case to retain the revision/row-lock and atomic
    audit decisions, so that I can inspect the reasoning behind visible behavior.
29. As an evaluator, I want working demo, code and deeper-case links, so that I
    can continue beyond the recorded introduction when useful.
30. As a visitor with unavailable media, I want useful text and links without
    autoplay, so that I can continue evaluating the project.
31. As an evaluator, I want source, date, preparation and environment recorded for
    each video, so that I can distinguish local evidence from public-runtime claims.
32. As an evaluator, I want prepared records distinguished from recorded actions,
    so that the demonstration does not imply an operation occurred on camera.
33. As the owner, I want existing public and retained local data preserved, so that
    recording does not reset or alter unrelated environments.
34. As the owner, I want the revised combined content presented for approval before
    portfolio integration, so that the site features an agreed delivered story.
35. As a contributor, I want reproducible capture and playback verification using
    existing boundaries, so that the presentation stays aligned with the real app.
36. As the owner, I want the added work tracked separately from the delivered
    Maintenance ticket, so that the original evidence and dependency history remain clear.

## Implementation Decisions

- This is a Phase 7 presentation refinement. It adds a general recording and
  reframes the existing introduction/case; no new business behavior, schema,
  authorization rule, identity model or API contract is required.
- Public communication remains English for a recruiter/hiring-manager entry with
  immediate engineering depth. Preserve the personal clean-room scope, synthetic
  data and no-additional-cost constraint.
- Minimum visible coverage is Manager access; vessel registration, lookup and
  workspace; certificate evidence, resulting state, risks and notifications;
  crew profile, qualifications and assignment planning; maintenance creation and
  lifecycle; Activity; and the Auditor read-only role boundary.
- The overview's confirmed sequence and approximate timing are:

  | Approximate time | Content                                                 |
  | ---------------- | ------------------------------------------------------- |
  | 0:00–0:25        | Operational problem and Manager access.                 |
  | 0:25–1:05        | Register and inspect a vessel.                          |
  | 1:05–2:05        | Certificate, compliance state, risks and notifications. |
  | 2:05–3:15        | Crew profile, qualifications and assignment planning.   |
  | 3:15–4:05        | Maintenance creation and follow-up.                     |
  | 4:05–4:45        | Activity, Auditor inspection and conflict-video link.   |

- Target 4–5 minutes for the overview, adjusting segment times for legibility.
  Keep the existing 2:44 Maintenance recording as the second piece; their expected
  combined viewing time is approximately seven to eight minutes.
- Use one vessel as the thread, with prepared synthetic data where useful. Show
  principal actions and results across all areas, rather than requiring every
  field, form variant, special case or failure to appear in this recording.
- Capture the real app, API and PostgreSQL in an isolated local synthetic scenario.
  Verify effective connection, isolation and necessary permissions before migration,
  seed or operational writes. Preserve public and retained local data.
- Reuse the existing capture, encoding and playback approach where appropriate.
  Keep costs at zero, intermediate private material ignored and secrets absent
  from video, captions, transcripts, screenshots, logs and evidence outputs.
- The general recording has no voice and uses explanatory English captions, an
  accessible transcript and navigable chapters. Explain the purpose and result of
  each action. Chapter access may use existing media/document facilities; it does
  not require a new product player route or a video service.
- Retain the existing Maintenance media, transcript, six contextual captures and
  their provenance. New recording evidence has its own source, date and records.
  Recheck affected evidence if source or delivered content materially changes.
- Reframe the README introduction and editorial case to lead with the complete
  product and connected journey. Offer the overview first, then Maintenance depth.
  Keep useful local setup, security, permissions, evidence, limitations and links.
  Retain the two central technical decisions and linked Maintenance/Crew cases.
- Preserve accepted demo boundaries: shared DemoAccounts do not identify individual
  visitors; CrewMember is separate from an access User and MaintenanceAssignee;
  crew plans do not establish boarding or fitness approval. Overview currently
  summarizes Compliance and identity/permissions rather than all business modules.
  Certificates use records and dates; file attachments remain disabled.
- Content and media stay with Keelwatch. The separate portfolio summarizes and
  links the approved package through its existing Work integration scope. The
  revised combined content needs explicit owner approval before that integration;
  approval of this specification does not approve media or prose yet to be delivered.

## Testing Decisions

- Use one primary verification boundary: the evaluator's observable journey from
  introduction/case to the general overview, its transcript/chapters, Maintenance
  depth, demo, code and deeper evidence. Verify coverage, truthful claims, readable
  media and working destinations rather than exact editorial wording or internals.
- Within that journey, check the recording against real app/API/PostgreSQL actions
  and resulting records: vessel, certificate/state/risks/notifications, crew profile
  and plan, maintenance lifecycle and Activity. Verify the Auditor boundary and
  account attribution. Identify prepared data and actions performed on camera.
- Reuse existing browser-driven capture assertions and the isolation verifier,
  plus the delivered-file playback/hash, seek, caption and unavailable-media checks.
  Extend those boundaries only where the new recording requires it; do not add
  a test API, production seam or speculative general capture framework.
- Existing Fleet, Compliance, Crew and Maintenance HTTP/PostgreSQL tests and
  rendered React workflow tests provide prior art for permissions, lifecycle,
  derived states, planning and recovery. Keep their guarantees distinct from
  what a recording proves. Add or rerun targeted checks only for changed behavior
  or a meaningful uncovered risk; do not duplicate domain suites to assert prose.
- Inspect the final encoded recording, captions and representative frames. Verify
  transcript/chapter times against that exact file, explain both media roles,
  record size and actual supported-browser playback, and test text/link alternatives
  when media is unavailable. Avoid forced autoplay and retain usable keyboard access.
- Record source/date/preparation, verified local isolation and retained-data checks
  for the new scenario. Keep old recording evidence separate and do not relabel
  local playback/capture as a new public smoke test or capacity measurement.
- Run applicable formatting, link/reference, media and repository checks for the
  changed scope. New runtime behavior, if actually introduced, needs proportionate
  tests and required gates. Record unavailable or inapplicable checks explicitly.
- Present the delivered revised package for owner content review. Existing Phase 7
  external recruiter/engineer feedback and portfolio verification remain later
  requirements; agent checks do not fabricate or replace real external evaluation.

## Out of Scope

- New Client/Customer entities, user administration, business features, schema/API
  changes or modified authorization merely to make the recording easier.
- Recording every form variant or replacing the existing Maintenance deep dive
  with an exhaustive product tutorial.
- Reopening completed work just to relabel its original scope, or treating #26
  as though it had already delivered the general overview.
- A whole-site redesign, new product playback route, paid/new video service,
  application media uploads or reintroduction of certificate attachments.
- Public operational capture writes, public load/fault drills, resets, truncation,
  deletion of retained data or new infrastructure and spending.
- Voice narration in this delivery, private professional materials, real personal
  or operational data, invented impact, availability or capacity claims.
- Portfolio implementation, owner content approval or real external participation
  inferred from publication of this specification; automatic implementation or
  ticket publication before the corresponding workflow's checkpoint.

## Further Notes

This refines the presentation scope of
[Phase 7 specification #23](https://github.com/EPraz/keelwatch/issues/23).
The owner confirmed two presentation levels, coverage, format, approximate timing
and README/case alignment through the refinement interview on 2026-10-15, then
requested `$to-spec`. The earlier Maintenance delivery remains
[#26](https://github.com/EPraz/keelwatch/issues/26); the added work precedes the
[portfolio integration #27](https://github.com/EPraz/keelwatch/issues/27).

The owner also confirmed the proposed observable-journey verification boundary:
real app/API/PostgreSQL actions and results, permissions and media alternatives,
reusing existing checks without a new test API or assertions of literal prose.

Publish this as a separate refinement specification, preserving the original
parent and historical ticket bodies. Subsequent ticket breakdown should represent
the added delivery and its genuine dependencies before portfolio integration.
Do not close #26, integrate the portfolio or interpret planning acceptance as
approval of the revised delivered content as part of this publication.
