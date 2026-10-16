# Phase 7 — approved and published ticket breakdown

Local refinement confirmed on 2026-10-15 adds a product overview and reframes the
entry/case before portfolio work. See the follow-up scope below and the updated
[local specification](./PHASE_7_SPEC.md). The published graph and original ticket
bodies are preserved. The refinement specification is published as
[#29](https://github.com/EPraz/keelwatch/issues/29). Its
[approved refinement breakdown](./PHASE_7_OVERVIEW_TICKETS.md) is published as
[#30](https://github.com/EPraz/keelwatch/issues/30): one delivery blocked by #26,
and an additional native blocker of #27, approved through `$to-tickets`.

Status: owner-approved and published under
[specification #23](https://github.com/EPraz/keelwatch/issues/23); #24 is published
at `344a107` and closed with owner authorization. #25's
[real local capture journey](./MAINTENANCE_JOURNEY.md) is published at `958fa2d`
and closed with owner authorization. #26's
[silent video and transcript](./MAINTENANCE_VIDEO.md) are published at `37aded4`
and the issue is closed with owner authorization. #30's
[connected walkthrough](./PRODUCT_WALKTHROUGH.md) was published at `5cb155f`,
accepted by the owner and closed. Content approval was recorded after `8b88f46`;
native README players were subsequently published and accepted at `ef6ee3e`.
#27 is integrated/verified locally in `3DPortafolio`. Its publication and public
verification are deferred to the portfolio project by the owner's instruction;
#27's public criterion, #28 and final Phase 7 acceptance remain pending. See the
[closure reconciliation](../closure-reconciliation.md) for current states.
All six original issues have ready-for-agent; #29 and #30 carry it too.
Source: [Phase 7 specification](./PHASE_7_SPEC.md) and
[scope decisions](./PHASE_7_PLANNING.md).

T1–T5 identify the original approved drafts below. Their original graph was
#24 → #25 → #26 → #27 → #28. Only immediate blockers are listed; earlier dependencies
are transitive. The current graph adds #26 → #30 → #27 while preserving #26 → #27.
No prefactoring is required by the current evidence.

Each ticket delivers an observable increment using the existing product, rather
than introducing schema/API/UI layers solely for presentation. Publishing this
breakdown was authorized by the owner's “acepto”, covering granularity, blocking
edges and the specification's observable-journey verification approach. Native
sub-issue relationships and all four blocking edges were read back and verified.

| Draft | Published issue                                     | Immediate blocker                            |
| ----- | --------------------------------------------------- | -------------------------------------------- |
| T1    | [#24](https://github.com/EPraz/keelwatch/issues/24) | None                                         |
| T2    | [#25](https://github.com/EPraz/keelwatch/issues/25) | #24                                          |
| T3    | [#26](https://github.com/EPraz/keelwatch/issues/26) | #25                                          |
| T4    | [#27](https://github.com/EPraz/keelwatch/issues/27) | #26, #30 and explicit owner content approval |
| T5    | [#28](https://github.com/EPraz/keelwatch/issues/28) | #27                                          |

The content approval is a human gate in #27's criteria, not a native issue edge.
#26 and #30 are closed and the owner has approved the delivered content.
#27's local integration is complete; its public criterion remains open and will
be addressed from the portfolio project. #28 retains its dependency on #27.

Published #24 delivery: concise root entry and [editorial case](./CASE_STUDY.md).
Published #25 delivery adds six contextual captures, a reproducible isolated
scenario and qualified verification evidence. Published #26 delivery adds the real
recording, English captions, transcript and media checks; #30 adds the connected
overview. #29 is now closed after its completed #30 child. This does not close
#23 or replace the external feedback still required by #28.

## Published follow-up #30 — present the connected product before portfolio work

The owner approved two presentation levels through `$grill-with-docs`: a general
overview first, then the existing Maintenance deep dive. Add one coherent delivery
of the general recording and aligned README/case before T4/#27. Preserve T1–T3
as their actual historical deliveries rather than relabeling #26 as a whole-product
recording or reopening closed work merely to alter its original acceptance scope.

The follow-up delivers:

- A real isolated app/API/PostgreSQL recording targeting 4–5 minutes, following
  one vessel through Manager access, vessel registration/lookup, certificate
  evidence/state/risks/notifications, crew profile/qualifications/assignment,
  maintenance creation/state changes, Activity and Auditor read-only access.
  Prepared synthetic data can support the story; show main actions and results
  across every area without requiring each form variant or adding business behavior.
- No voice; explanatory English captions, accessible transcript and chapters.
  Keep the existing 2:44 Maintenance video and six captures as technical depth.
  Record source/date/preparation separately; reuse the existing isolation and
  capture tools where appropriate, with no additional service or cost.
- README and editorial case led by the complete product's scope and journey,
  presenting the general recording first and Maintenance's decisions afterwards.
  Preserve useful setup, evidence, limitations and deeper Maintenance/Crew links.
- Verified real action/results, legibility, transcript/chapter agreement, playback,
  size, links and useful alternatives without autoplay. Update durable progress
  and present the combined revised package for owner content review before #27.

Dependency intent: finish the Maintenance delivery (#26), deliver this follow-up,
obtain approval of the revised content, then integrate #27 and continue #28.
The additional delivery is published as #30, a native sub-issue of #29 blocked
by #26 and an additional native blocker of #27. The owner approved the single
ticket's granularity and genuine dependencies. Read-back verified body, label,
state and relations; the original issue bodies/states remain unchanged. #26 is
OPEN at publication. The owner subsequently authorized publishing `37aded4` and
closing #26; that blocker is now satisfied and local implementation of #30 starts.

## T1 — Present Keelwatch through a concise README and editorial case

### What to build

Give a recruiter or hiring manager a complete English entry to Keelwatch's problem,
the owner's contribution and demonstrated behavior, with a direct path for
engineers to inspect deeper evidence. Deliver readable editorial content before
producing the media or changing the separate portfolio.

### Acceptance criteria

- [ ] Present the operational problem, intended audience, independent personal
      scope, contribution and demonstrated workflow in a concise README entry.
      Preserve useful clean-start, permissions, security and limitation guidance.
- [ ] Deliver an English case with a short summary, role/scope, Maintenance journey,
      two central decisions, alternatives, consequences, evidence and limits.
      Explain reviewed revision plus row lock, and atomic mutation plus AuditEvent.
- [ ] Link the deeper Maintenance and Crew evidence rather than duplicating their
      full technical cases. Keep Crew secondary; distinguish DemoAccount attribution,
      maintenance responsibility and synthetic CrewMember profiles correctly.
- [ ] Treat 800–1,200 words as an estimate, not a minimum or acceptance gate. A
      shorter complete case is valid. Do not invent impact, scale or availability.
- [ ] All published links work; the text is useful before media exists. Do not add
      broken media links or claim that recording or portfolio work is complete.
- [ ] Check claims against existing implementation/evidence and run applicable
      formatting/reference checks. Do not introduce tests asserting exact prose,
      new runtime behavior, paid services or non-synthetic material.
- [ ] Update durable progress and present the delivered case/entry for owner review.
      Record approval when obtained; if pending, preserve that explicit status.
      Completing this draft-content ticket does not authorize portfolio integration.

### Blocked by

None (can start immediately).

## T2 — Follow a reproducible Maintenance journey with real contextual captures

### What to build

Let an evaluator follow the editorial story through 4–6 contextual captures from
the real local app, API and PostgreSQL. Deliver a reproducible, isolated Maintenance
scenario that demonstrates conflict, deliberate recovery, Activity and Auditor
read-only access, and link the captures from the existing presentation.

### Acceptance criteria

- [ ] Follow the T1 story and document a bounded synthetic scenario, its source
      version, date and preparation. Verify app/API/PostgreSQL connectivity and
      isolation before migration, seed or operational writes. Preserve public
      data and existing retained local data; do not reset or truncate them.
- [ ] Use two Manager editors of the same order revision. Show one confirmed change,
      stale-write rejection, retained draft, explicit comparison/review and deliberate
      save, followed by confirmed Activity and an Auditor view of the same data.
- [ ] Explain shared DemoAccount attribution as account identity, not visitor
      identity. Use only synthetic records and accounts; expose no credentials,
      personal data or employer/client material in assets or supporting output.
- [ ] Publish 4–6 legible captures with English context and meaningful alt text,
      linked from the case/entry so the story is understandable without video.
      Identify their actual local source; historical mocked-response screenshots
      are reference material, not fresh end-to-end evidence.
- [ ] Keep preparation and capture reproducible with the smallest necessary tools
      and guidance. Add no business behavior, test API, upload feature, paid service
      or speculative capture infrastructure.
- [ ] Check the real scenario and asset/reference integrity. Reuse existing tests
      for conflict recovery, one concurrent winner, rollback and permissions;
      record relevant results without relabeling this capture as a public smoke test.
- [ ] Record durable progress, preparation boundaries and any content changes that
      require renewed owner review before later portfolio integration.

### Blocked by

T1 — Present Keelwatch through a concise README and editorial case.

## T3 — Watch the Maintenance story as an accessible short video

### What to build

Add a 2–3-minute product video to the already readable case/capture presentation,
using the verified real local scenario. Let evaluators understand the same story
silently, through captions, a transcript or the existing contextual captures.

### Acceptance criteria

- [ ] Record the real local scenario established in T2, retaining source version,
      date and preparation evidence. If the source changes, recheck the affected
      scenario before claiming the new recording represents it.
- [ ] Deliver a 2–3-minute first video without voice, showing the two-editor conflict,
      retained draft, explicit recovery/save, Activity and Auditor read-only view.
      Keep Crew as linked secondary evidence; do not imply unsupported guarantees.
- [ ] Provide explanatory English captions and an accessible transcript that agree
      with the visible action. Keep the 4–6 contextual captures useful as an
      alternative, with working links and meaningful alt text.
- [ ] Integrate working video/transcript links into the README/case presentation.
      Verify legibility, supported-browser playback, asset size and useful text or
      links when media is unavailable. Do not force autoplay.
- [ ] Select capture, encoding and asset delivery with no additional cost, new video
      service or application upload feature. Keep credentials/private material out
      of video, captures, transcripts and supporting outputs.
- [ ] Run applicable content/media/reference checks and record compatibility, size
      and durable progress. Do not add tests that mirror editorial copy.
- [ ] Present the combined delivered case/entry/media for owner review and record
      its approval status. T4 must wait for explicit approval of the content it
      will use, including later material changes; spec/ticket approval is insufficient.

### Blocked by

T2 — Follow a reproducible Maintenance journey with real contextual captures.

## T4 — Feature the approved Keelwatch presentation in portfolio Work

### What to build

Make Keelwatch the featured project in the existing portfolio Work surface,
connecting a short problem/contribution/evidence summary to its approved case,
demo and code. Keep the site's current design and anchor navigation usable across
devices and input methods.

### Acceptance criteria

- [ ] Before editing the separate portfolio, verify its instructions, working tree
      and closest rendered patterns. Preserve unrelated uncommitted work; do not
      reset it or include it in this feature's commits.
- [ ] Record explicit owner approval of the delivered case/entry/media used by the
      integration. If approval is pending or material changes invalidate it, wait;
      T1–T3 completion and planning approval do not substitute for this gate.
- [ ] Show a featured Keelwatch card in Work with role, short operational problem,
      contribution, concrete evidence and working case/demo/repository links.
      Reuse existing components/tokens/responsive patterns and anchor navigation.
- [ ] Summarize and link the Keelwatch source evidence rather than duplicating its
      technical package. Do not add a dedicated case route or redesign the whole site.
- [ ] Verify 320–375 px, 768 px, 1024 px and 1440 px presentation, keyboard access,
      visible focus, reduced motion, readable contrast and the site's applicable
      media loading/unavailable states. Text and links remain useful without video.
- [ ] Verify every call to action reaches the intended approved destination and
      avoids forced autoplay. Record responsive/accessibility/media findings and
      fix relevant issues before declaring this integration ready.
- [ ] Run the separate repository's applicable format/lint/type/test/convention/build
      checks, adding tests only for meaningful changed behavior. Verify its actual
      publication through the existing authorized no-cost route and record the URL,
      source version, results and durable progress in the appropriate repositories.
      Report any unavailable external configuration without claiming publication.

### Blocked by

T3 — Watch the Maintenance story as an accessible short video.

The owner-content-approval gate is an additional explicit prerequisite, not an
assumed consequence of T3 completion.

## T5 — Resolve external presentation feedback and verify the public package

### What to build

Evaluate the published end-to-end presentation with a real recruiter and engineer,
resolve relevant findings and record the evidence needed for owner acceptance of
Phase 7. The agent prepares evaluation briefs; the owner coordinates participation.

### Acceptance criteria

- [ ] Prepare a short English recruiter brief focused on finding the problem,
      contribution, evidence and useful next links, and an engineer brief focused
      on inspecting the workflow, two decisions, evidence and limits.
- [ ] Give the owner the briefs and working public entry points. Do not contact
      reviewers through agent tools or substitute simulated/agent feedback for
      their participation. Initial publication may precede their responses.
- [ ] Record actual responses from at least one recruiter and one engineer without
      exposing private identity or correspondence. Track findings, their relevance,
      corrections and rationale for any explicitly deferred item.
- [ ] Resolve relevant findings before declaring the public phase ready for owner
      acceptance. If responses are unavailable, retain a pending status rather than
      fabricating completion or blocking already authorized independent corrections.
- [ ] Recheck final entry/case/media/demo/code/deeper-evidence navigation, claims,
      clean-start guidance, accessibility/media behavior and affected repository
      quality gates. Revalidate only where changes or unresolved findings justify it.
- [ ] Preserve clean-room/no-additional-cost boundaries and distinguish historical
      CI, local capture, actual deployment checks and unverified runtime assumptions.
      Do not add public load/fault drills, data resets or new infrastructure.
- [ ] Update durable progress with real feedback, fixes, checks, remaining limits
      and owner acceptance status. Personal interview preparation is separate and
      does not gate the public package. Do not close or edit the parent specification
      as part of ticket breakdown or infer owner acceptance from agent verification.

### Blocked by

T4 — Feature the approved Keelwatch presentation in portfolio Work.

## Coverage and publication verification

| Specification outcome                          | Tickets    |
| ---------------------------------------------- | ---------- |
| Concise entry, editorial case, truthful claims | T1, T2, T3 |
| Real isolated scenario and contextual captures | T2         |
| Silent captioned video and transcript          | T3         |
| Explicit content approval before integration   | T1, T3, T4 |
| Featured Work entry and accessible navigation  | T4         |
| Real external feedback and verified closure    | T5         |
| Relevant checks and durable evidence           | T1–T5      |

The approved specification and five tickets were published in dependency order
with ready-for-agent. Read-back verified their bodies, labels, open states, five
native sub-issue relationships and four native blocking edges. Body comparison
normalizes GitHub's Windows line endings; editorial content matches the approved
sources. The parent body and open state were preserved after creation. No existing
parent issue was closed or rewritten, and no implementation began.
