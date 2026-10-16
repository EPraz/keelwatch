# Phase 7 refinement — approved and published ticket breakdown

Source: [specification #29](https://github.com/EPraz/keelwatch/issues/29) and its
[local specification](./PHASE_7_OVERVIEW_SPEC.md).

Status: owner approved one complete delivery, its size and dependencies, with no
split/merge. Published as [#30](https://github.com/EPraz/keelwatch/issues/30),
`ready-for-agent`; native relations and the issue body/state were read back.

## Approved breakdown

1. **R1 — [Explore Keelwatch through a connected product walkthrough](https://github.com/EPraz/keelwatch/issues/30).**
   Blocked by #26. Delivers the general recording, captions/transcript/chapters,
   real-scenario/media verification and aligned README/case as one usable package.
   It is a native sub-issue of #29 and an additional native blocker of #27.

Ordering: #26 → #30 → #27 → #28. The existing #26 → #27 relationship is preserved;
owner approval of the revised content remains a separate prerequisite for #27.
The work reuses the delivered recording/isolation/playback approach and
the existing app; no standalone prefactoring or new business implementation is
needed. Keep media, explanation and entry links in one slice so it is demonstrable
without a later wiring-only ticket. Its bounded outcome can be worked in one
fresh implementation context.

Delivery criteria follow. The published body omits the textual blocker below
because its native edge was verified. #29 lists #30 as a sub-issue; #30 is blocked
only by #26; #27 is blocked by #26 and #30; #28 remains blocked by #27. Bodies and
states of #23/#26/#27/#28/#29 were compared with pre-publication snapshots and
remain identical at publication. #26 was OPEN then; subsequently the owner
authorized publishing `37aded4` and closing #26. Its blocker is now satisfied and
#30 is delivered locally with the [general recording and verification](./PRODUCT_WALKTHROUGH.md).
Publication/issue closure and content approval before #27 remain pending.

## Parent

Part of [specification #29](https://github.com/EPraz/keelwatch/issues/29).

## What to build

Let a recruiter understand Keelwatch's implemented product without interacting
with the demo. Deliver a connected, silent 4–5-minute overview using one synthetic
vessel to connect Access, Fleet, Compliance, Crew, Maintenance and Audit. Reframe
the introduction and editorial case to present that complete product first,
followed by the existing Maintenance conflict/recovery recording for depth.

Deliver the recording, explanatory captions, accessible transcript, chapters,
working entry links and real-scenario/playback evidence together. Preserve the
existing Maintenance media and useful technical/setup guidance, then present the
combined revised package for owner review before portfolio integration.

## Acceptance criteria

- [ ] Prepare and record the real local app/API/PostgreSQL scenario using one
      synthetic vessel as the story's thread. Verify effective connection,
      isolation and permissions before migration, seed or writes. Preserve public
      and retained local data; never reset, truncate or capture operational writes
      against the public deployment. Record source, date and preparation evidence.
- [ ] Show Manager access, vessel registration, finding the new record and opening
      its workspace. Explain the product's operational purpose and the owner's
      independent clean-room contribution without invented customer impact.
- [ ] Record certificate evidence, explain its resulting state and show compliance
      risks and notifications. Describe existing visible behavior without implying
      attachment support, external notification delivery or an all-module dashboard.
- [ ] Create a CrewMember profile, record demo qualifications and plan a
      CrewAssignment for the vessel. Keep access Users and MaintenanceAssignee
      distinct from crew profiles; do not imply actual boarding or fitness approval.
- [ ] Create a MaintenanceOrder and show follow-up through state changes. Connect
      operational changes to Activity and show Auditor inspection read-only.
      Explain shared DemoAccount attribution as account identity, not visitor identity.
- [ ] Target 4–5 minutes in the confirmed sequence: problem/Manager → Fleet →
      Compliance/notifications → Crew → Maintenance lifecycle → Activity/Auditor.
      Treat the approximate 4:45 outline as pacing guidance; preserve legibility.
      Prepared synthetic data may support the story but must be distinguishable
      from actions performed on camera. Cover principal actions/results across
      every area without requiring each form variant or special case.
- [ ] Deliver without voice, with explanatory English captions communicating
      purpose and result, an accessible transcript and navigable chapters. Verify
      transcript/chapter times against the actual encoded recording.
- [ ] Reframe the README introduction and editorial case around the whole product
      and connected journey. Offer the general overview first, then the existing
      2:44 Maintenance deep dive. Keep the six contextual captures, their text
      alternatives/provenance, the two central technical decisions and links to
      deeper Maintenance/Crew evidence. Preserve useful setup/security/limits.
- [ ] Reuse existing capture/isolation/encoding/playback boundaries where suitable.
      Add no business behavior, schema/API/authorization changes, test API,
      speculative capture framework, new product player route, paid/new video
      service or media upload feature. Exclude secrets, private materials and real
      personal/operational data from every delivered artifact and supporting output.
- [ ] Verify the observable evaluator journey from entry/case to the general
      recording, transcript/chapters, Maintenance depth, demo, code and deeper
      evidence. Contrast recorded actions and resulting state with the real
      app/API/PostgreSQL, including role boundaries and Activity; reuse existing
      domain tests instead of introducing assertions of literal editorial prose.
- [ ] Inspect the final encoded file and representative frames; verify readability,
      actual supported-browser playback, seek/captions, asset size, working links,
      keyboard access and useful text/link alternatives when media is unavailable.
      Avoid forced autoplay. Record tested browsers and unverified limits.
- [ ] Keep the new recording's source/date/records and checks separate from the
      Maintenance recording's provenance. Do not present local capture/playback as
      a public smoke test, capacity measurement or availability guarantee. Recheck
      affected evidence if delivered source/content materially changes.
- [ ] Run applicable formatting, references, media and repository gates; add or
      rerun targeted tests for changed behavior or meaningful risk. Record skipped
      or inapplicable checks truthfully. Update durable progress with results and
      present the revised combined package for explicit owner content review.
      Spec/ticket approval does not authorize portfolio integration or imply that
      the delivered content is approved; #27 still waits for that separate gate.

## Blocked by

- [#26 — Watch the Maintenance story as an accessible short video](https://github.com/EPraz/keelwatch/issues/26).
