# Phase 7: public Keelwatch presentation

## Problem Statement

Keelwatch has published engineering evidence, but a recruiter or hiring manager
needs a short entry explaining its operational problem, the owner's contribution
and observable behavior. Engineers need an immediate path from that entry to
decisions, implementation evidence, tests and limitations. The separate portfolio
currently uses a uniform project grid and does not feature Keelwatch.

The presentation must make this independent synthetic project easy to evaluate
without requiring a local installation or overstating customer impact, maritime
approval, scale or deployment guarantees.

## Solution

Deliver an English presentation for the US market: a concise README entry, an
editorial case study, a short accessible product video with companion captures,
and a featured Keelwatch card in the portfolio's existing Work section.

Prioritize a brief recruiter/hiring-manager entry with immediately accessible
engineering depth. Maintenance is the main story: two editors, a saved change,
stale-revision conflict, retained draft, explicit recovery, Activity and an Auditor
view. Link Crew as secondary evidence rather than duplicating its technical case.

Produce and obtain owner approval of the case/entry content before integrating
the portfolio. Initial publication may precede external review, but relevant
findings must be resolved before Phase 7 is accepted.

### Acceptance Criteria

- [ ] The README explains the problem, independent personal scope, contribution,
      observable behavior and reading/demo/code paths. Preserve useful setup,
      permissions, security, evidence and limitation guidance.
- [ ] The editorial case includes a short summary, role/scope, product journey,
      two central decisions, trade-offs, evidence and limits, with links to deeper
      sources. Its length serves the story; there is no minimum word count.
- [ ] Record owner approval of the delivered case/entry before portfolio work.
      Approval of this specification does not pre-approve unwritten content.
- [ ] Prepare a reproducible synthetic scenario in an isolated local environment
      using the real app, API and PostgreSQL. Verify isolation before writes and
      record source version, capture date, preparation and evidence boundaries.
- [ ] Demonstrate the Maintenance conflict/review/save sequence, Activity and
      Auditor read-only access. Explain that shared DemoAccount attribution
      identifies the account, not individual visitors.
- [ ] Deliver a 2–3-minute first video without voice, explanatory English captions,
      an accessible transcript and 4–6 contextual captures with meaningful alt text.
      Identify the local synthetic source; exclude secrets and private material.
- [ ] Verify media compatibility, legibility, size and links. Keep the presentation
      usable without playing the video and without forced autoplay.
- [ ] Feature Keelwatch in Work with role, summary, concrete evidence and working
      links to the approved case, demo and code. Reuse current design and anchor
      navigation, preserving unrelated work in the separate portfolio repository.
- [ ] Verify responsive presentation, keyboard operation, visible focus, reduced
      motion, readable contrast and useful media loading/unavailable fallbacks.
- [ ] Prepare a short evaluation brief for a recruiter and another for an engineer.
      The owner coordinates actual participation; record real findings and resolve
      relevant issues before final acceptance. Agent review does not replace them.
- [ ] Verify final public navigation, source agreement, clean-start guidance and
      applicable quality gates. Update durable progress and distinguish historical,
      newly verified and unverified runtime/deployment evidence.

## User Stories

1. As a recruiter, I want a short explanation of Keelwatch's operational problem,
   so that I can understand why the project exists.
2. As a recruiter, I want the owner's role and independent contribution to be clear,
   so that I can evaluate the work without confusing it with an employer product.
3. As a hiring manager, I want concrete behavior and evidence near the summary,
   so that I can assess delivery beyond a list of technologies.
4. As a recruiter, I want working case, demo and code links,
   so that I can choose how deeply to evaluate the project.
5. As an engineer, I want immediate links to deeper Maintenance and Crew evidence,
   so that I can inspect implementation details without an oversized introduction.
6. As a case-study reader, I want a concise summary and clearly organized story,
   so that I can scan before committing to a longer read.
7. As a hiring manager, I want the owner's scope, trade-offs and limits explained,
   so that I can judge engineering decisions in context.
8. As an engineer, I want the reviewed revision and row-lock decision explained,
   so that I can understand stale-intent rejection and transactional serialization.
9. As an engineer, I want the atomic mutation and AuditEvent decision explained,
   so that I can understand why successful state and recorded history agree.
10. As an evaluator, I want claims linked to their evidence and environment,
    so that I can distinguish demonstrated guarantees from untested assumptions.
11. As an evaluator, I want a real product recording with a reproducible synthetic
    scenario, so that I can inspect the workflow without installing the app.
12. As a viewer, I want to see two editors create a revision conflict,
    so that I can understand the consequence of concurrent work.
13. As a viewer, I want to see the retained draft, comparison and deliberate save,
    so that I can understand how a user recovers without silently losing intent.
14. As a viewer, I want to see Activity after the confirmed change,
    so that I can connect the product action with its recorded history.
15. As a viewer, I want to see an Auditor inspect the same data read-only,
    so that I can understand the role boundary.
16. As an evaluator, I want shared DemoAccount attribution explained,
    so that I do not infer individual visitor identity from Activity.
17. As a viewer watching silently, I want explanatory English captions,
    so that I can follow the first video without narration.
18. As a reader who cannot or prefers not to play video, I want a transcript and
    contextual captures with meaningful alternatives, so that I can follow the story.
19. As a mobile or keyboard user, I want readable content, usable links and visible
    focus, so that I can evaluate the project across devices and input methods.
20. As a motion-sensitive visitor, I want reduced-motion behavior respected,
    so that the featured presentation remains usable.
21. As a portfolio visitor, I want Keelwatch to stand out in the existing Work
    section, so that I can locate the flagship without learning new navigation.
22. As a visitor with slow or unavailable media, I want useful text and working
    fallback links, so that I can continue evaluating the project.
23. As the owner, I want to approve delivered content before portfolio integration,
    so that visual work presents an agreed story.
24. As the owner, I want unrelated portfolio changes preserved,
    so that this integration does not absorb or replace existing work.
25. As the owner, I want concise external evaluation briefs and real feedback,
    so that the final package addresses gaps that internal review may miss.
26. As a contributor, I want reproducible local guidance and recorded checks,
    so that the presentation remains aligned with the inspectable application.

## Implementation Decisions

- Public communication is English, aimed at Mid-Level / Software Engineer II
  roles with a full-stack/backend emphasis. Preserve the clean-room boundary,
  synthetic data, server-enforced permissions and no-additional-cost constraint.
- Keep editorial/source evidence and approved media with Keelwatch. The separate
  portfolio summarizes and links that evidence rather than duplicating the package.
- The original 800–1,200-word case estimate is guidance, not an acceptance gate.
  A shorter complete case is valid; do not add prose to meet a count. Lead with a
  short summary, then explain the problem, contribution, journey, decisions and limits.
- Center two existing decisions: reviewed revision plus a row lock protects
  concurrent edits; mutation and AuditEvent share a transaction. Explain alternatives
  and consequences using existing evidence, without adding product behavior.
- Use Maintenance as the main visible workflow and Crew as linked secondary
  evidence. Preserve the distinction between shared DemoAccounts, operational
  users responsible for maintenance, and synthetic CrewMember profiles.
- Capture the real app/API/PostgreSQL locally in an isolated synthetic scenario.
  Verify connection, isolation and necessary permissions before migrations, seed
  or writes. Existing PostgreSQL services do not alone prove environment readiness.
  Preserve existing public and retained local data.
- Historical component screenshots with simulated HTTP responses are visual
  references, not fresh end-to-end capture evidence. Record the new assets' source
  version, date and local environment; do not present them as public-runtime checks.
- The first video is 2–3 minutes, without voice, with English explanatory captions,
  a transcript and 4–6 contextual captures. Later narration is optional. Choose
  capture, encoding and asset-delivery details during implementation, verifying
  compatibility and size without adding a paid/new video service or API uploads.
- Owner approval of delivered case/entry content gates the portfolio integration.
  The first integration is a featured card in the existing Work surface with role,
  summary, concrete evidence and case/demo/code links. Reuse design and anchor
  navigation; inspect the separate repository's instructions, rendered patterns and
  working tree before editing, and preserve unrelated uncommitted changes.
- Keep text and links useful when media is loading or unavailable. Support
  responsive layouts, keyboard/focus, reduced motion and readable contrast;
  avoid forced autoplay. A dedicated in-site case route is a possible later change.
- Prepare recruiter and engineer evaluation briefs; the owner coordinates actual
  participation. Initial publication can precede feedback, but relevant findings
  must be resolved and recorded before accepting the public phase.
- No new business module, schema, API contract or authorization rule is required.
  Personal interview preparation remains separate and does not gate this package.

## Testing Decisions

- Use the observable evaluator journey as the highest verification boundary:
  README or featured card → approved case/video/captures → demo/code/deeper evidence.
  Check clarity, truthful claims, usable media and working destinations rather than
  exact prose, internal component structure or arbitrary word counts.
- For the recording, verify the real local app/API/PostgreSQL scenario: two editors
  read one revision, one write succeeds, the stale attempt is rejected, the draft is
  retained, explicit review/save succeeds, Activity reflects confirmed changes and
  Auditor reads the same data without write controls. These capture checks do not
  substitute for server-authorization regression tests.
- Reuse existing rendered Maintenance form tests for retained drafts, failed
  recovery reads, repeated conflicts and deliberate saving. Existing PostgreSQL
  integration tests cover one concurrent winner, stale/no-op writes, rollback on
  audit failure, safe history and role boundaries. Link this prior art rather than
  duplicating it merely to support presentation copy.
- Test changed behavior at existing boundaries only when implementation introduces
  a meaningful risk. Content-only changes need source/link/media checks rather than
  new assertions that mirror text. Do not add a new test API or production seam.
- Verify the portfolio at 320–375 px, 768 px, 1024 px and 1440 px, with keyboard,
  visible focus, reduced motion, contrast, media unavailable/loading behavior and
  all calls to action. Reuse its existing checks and patterns; record manual results
  and any justified automation added for changed behavior.
- Verify captions/transcript agree with the captured action, captures remain
  legible, alt text conveys context, media plays in supported browsers, and asset
  size does not make the entry unusable. Record compatibility and size evidence.
- Run applicable formatting, lint, typecheck, tests, convention audit and production
  builds for changed repositories. Retain existing Prisma/migration/HTTP/PostgreSQL
  gates where applicable, and explicitly record any non-applicable checks.
- Final acceptance includes actual recruiter/engineer feedback coordinated by the
  owner, issue resolution and durable progress. Agent checks do not fabricate or
  replace external participation. Keep historical CI, capture and deployment
  evidence qualified by version and environment.

## Out of Scope

- New business behavior, APIs, database guarantees, identity/tenancy or attachments.
- A whole-site redesign, new case routes or replacement of unrelated portfolio work.
- Paid services, permanent monitoring, public load/fault drills or retained-data resets.
- Personal interview rehearsal material, fabricated external responses, invented
  professional/customer impact or unmeasured availability/capacity claims.
- Reviewer outreach through agent tools; the owner coordinates participation.
- Phase 8 projects or implementation automatically triggered by spec publication.

## Further Notes

The owner selected this scope through the Phase 7 interview and requested
$to-spec. Content approval remains a later, concrete checkpoint before portfolio
integration; accepting this plan does not accept the unwritten case study.

The [Phase 6 specification](https://github.com/EPraz/keelwatch/issues/16) and its
implementation tickets are closed after owner acceptance. Its published package
has [passing CI](https://github.com/EPraz/keelwatch/actions/runs/38671977666).
That result is not a new smoke check or proof of the current public deployment.

This specification is intended for subsequent ticket breakdown. Its publication
does not mark Phase 7 deliverables complete or authorize contacting reviewers.
