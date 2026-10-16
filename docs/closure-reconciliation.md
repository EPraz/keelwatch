# Keelwatch closure reconciliation

Inspected 2026-10-16 at `d72c896`. The owner requests reconciliation of delivered
work, the roadmap and GitHub. This is a documentary/tracker correction: application
code, data, migrations and media remain unchanged. The portfolio's publication
and public verification will be performed from its own project, as the owner
explicitly requested; this workspace does not publish it.

## Evidence and authority

- The [durable progress record](./progress.md) preserves dated implementation,
  verification and owner acceptance. Historical pending statements describe their
  original point in time; the reconciliation below records later evidence.
- The published runtime `ef6ee3e` has a successful
  [complete Quality gate](https://github.com/EPraz/keelwatch/actions/runs/38947586121):
  unit/component/CLI, HTTP and PostgreSQL suites, clean migrations/seed, types,
  lint, conventions, Prisma, environment checks, builds and dependency audit.
  Its application/scripts/manifests/workflow match the inspected source. This is
  historical CI evidence, not a new cloud smoke or availability claim.
- Delivery commits `5296522`, `677b2af`, `ca97306`, `29437a8`, `3d5244e`,
  `8eb5fca`, `f320630`, `2f8bca8` and `5cb155f` are verified ancestors of that
  published runtime. Their previously local-only delivery gates are superseded
  by their subsequent publication, without changing the original log entries.
- [Machine-readable evidence](./closure-reconciliation.json) records initial
  states, native children, historical visual-artifact hashes and the read-back
  result. Only the evidence-backed cases below are candidates for closure.

## Criteria-to-evidence matrix

Criterion numbers follow the original checklist order. Parent specifications
without checklists are evaluated through their delivered children and recorded
scope, rather than adding invented acceptance criteria.

| Issue                                               | Criteria covered and source evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Reconciliation                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [#2](https://github.com/EPraz/keelwatch/issues/2)   | 1–8: selection, dates, authorization, fleet-wide reservation and paginated history in [Crew case](./flagship/CREW_CASE.md), [assignment PostgreSQL tests](../apps/api/test/assignment.postgres.integration.spec.ts) and [atomicity tests](../apps/api/test/assignment-atomicity.postgres.integration.spec.ts). 9–10: retained inputs, confirmed-write recovery, role-specific UI and rendered QA in [workspace tests](../apps/web/src/features/fleet/vessel-assignment-workspace.test.tsx), [assignment tests](../apps/web/src/features/crew/vessel-assignments.test.tsx) and progress “Asignaciones — implementación y verificación local”. 11–12: isolated fixtures, additive migrations, recorded local gates and published CI above. | Delivered; local-only publication note is obsolete.                                                 |
| [#3](https://github.com/EPraz/keelwatch/issues/3)   | 1–9: permanent cancellation, closed reasons, original metadata, retry/race behavior, rollback, period reuse and denied writes in [cancellation tests](../apps/api/test/assignment-cancellation.postgres.integration.spec.ts) and Crew case. 10–12: readable history, confirmed-write/read recovery, rendered interactions, fixture preservation and gates in the same workspace/assignment tests and dated progress.                                                                                                                                                                                                                                                                                                                     | Delivered with #2; close the child before parent #1.                                                |
| [#1](https://github.com/EPraz/keelwatch/issues/1)   | Children #2/#3 deliver its planning and cancellation scope. Progress records real local Manager/Auditor QA at five widths, keyboard/validation/focus, concurrency, rollback and preserved records. Public CI includes those deliveries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Complete within its original scope; it did not itself include composition.                          |
| [#6](https://github.com/EPraz/keelwatch/issues/6)   | 1–9: scoped inclusive-date reads, full-plan evaluation, evidence refresh and no read mutations in [composition PostgreSQL tests](../apps/api/test/composition.postgres.integration.spec.ts). 10–17: workspace placement, URL isolation, stale-response handling, both roles and read-only post-write recovery in [composition React tests](../apps/web/src/features/crew/vessel-composition.test.tsx) and workspace tests. 18–21: later [#14 QA](./flagship/DEMO_JOURNEY_QA.md), [visual review](../.design/public-demo-quality/DESIGN_REVIEW.md), historical render/keyboard artifacts and published CI resolve the earlier rendered-check gap.                                                                                         | Complete; the 2026-10-08 visual limitation is superseded by subsequent evidence.                    |
| [#4](https://github.com/EPraz/keelwatch/issues/4)   | Child #5 was already closed. Its continuous qualification coverage is reused by #6; the Crew case and both delivered children cover the two remaining Phase 3 outcomes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Close after #6; no fitness or historical-approval guarantee is added.                               |
| [#7](https://github.com/EPraz/keelwatch/issues/7)   | Children #8/#9/#10 are already closed. [Maintenance acceptance](./maintenance-acceptance.md) and progress “Cierre local de Fase 4 confirmado” record owner acceptance on 2026-10-09, tests, review and preserved data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Reconcile the parent spec's still-open state; preserve the original local/public distinction.       |
| [#12](https://github.com/EPraz/keelwatch/issues/12) | 1–7: provisioning, one-hour sessions, invalid/expired identities, disabled access, denial and issuance budgets in [demo PostgreSQL tests](../apps/api/test/demo-access.postgres.integration.spec.ts) and [Access case](./flagship/ACCESS_CASE.md). 8–11: pending/retry/role cleanup, keyboard and routing in [demo access React tests](../apps/web/src/auth/demo-access.test.tsx), #14 QA, published CI and owner acceptance below.                                                                                                                                                                                                                                                                                                      | Delivered and published; no password sharing or new identity model.                                 |
| [#13](https://github.com/EPraz/keelwatch/issues/13) | 1–9: real Manager/Auditor sessions, shared write limits, atomic history, role switching and OIDC coexistence in demo PostgreSQL tests, [Manager React tests](../apps/web/src/auth/demo-manager.test.tsx), operational suites and Access case. 10–11: dated public HTTP smoke, owner acceptance and published gates in #14 QA/progress.                                                                                                                                                                                                                                                                                                                                                                                                   | Delivered and accepted publicly on 2026-10-11.                                                      |
| [#14](https://github.com/EPraz/keelwatch/issues/14) | 1–4: the owner's reported acceptance of all four public journeys is recorded in #14 QA. 5–8: local rendering, keyboard, contrast, Toast/retry regression tests and visual review retain their own scope. 9–10: operators, synthetic references, limits and gates remain explicit.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Complete without relabeling local fixtures as public browser automation or full WCAG certification. |
| [#15](https://github.com/EPraz/keelwatch/issues/15) | 1–6: [method/results](./flagship/DEMO_PERFORMANCE.md) and [sanitized run](./measurements/2026-10-12-public-read.json) preserve the preselected 30-attempt/180-second budget, concurrency 1, dataset, all timings, errors and limits. 7: [CLI tests](../scripts/demo-performance.test.mjs), published CI and owner “listo” acceptance recorded in progress.                                                                                                                                                                                                                                                                                                                                                                               | Complete; do not rerun the public measurement or infer a capacity guarantee.                        |
| [#11](https://github.com/EPraz/keelwatch/issues/11) | Delivered #12–#15 plus progress “Fase 5 aceptada por el propietario” and “Publicación autorizada de Fase 5” establish scoped acceptance and subsequent publication.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Close after its children.                                                                           |
| [#29](https://github.com/EPraz/keelwatch/issues/29) | Child #30 is closed. [Product walkthrough](./flagship/PRODUCT_WALKTHROUGH.md), [case](./flagship/CASE_STUDY.md), media evidence and progress record the real isolated recording, captions/chapters, two-level presentation, published artifacts and owner acceptance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Close this delivered refinement; parent #23 remains open.                                           |

## The historical Crew visual gap

The original #6 record explicitly lacked rendered keyboard/responsive checks.
The later #14 artifacts retain 180 base rendered views with Manager/Auditor,
light/dark themes and 320/375/768/1024/1440 widths, including ready, empty,
loading, read-error and denied workspace states. They report no overflow,
axe violations or runtime errors. An additional 40 workspace/Crew and eight
Fleet-form views cover the later tablet corrections. These are separate sets;
228 is their total, not 228 new runs today or 228 composition-only views.

The keyboard artifact includes composition date/function, Apply, Refresh and
profile navigation for both roles, with visible solid 2–3 px outlines. The owner
subsequently accepted the public CrewAssignment journey described in #14 QA.
This combination resolves the old rendered-check blocker. It does not establish
physical-device coverage, a new public browser run or blanket WCAG compliance.

## Remaining work and project boundary

- [#27](https://github.com/EPraz/keelwatch/issues/27): featured Work integration
  is delivered and verified locally in `3DPortafolio`, preserving prior work.
  Its six independent local criteria are complete; the final combined
  publication/public-verification criterion remains open. The owner will perform
  that work from the portfolio project. No portfolio push or deployment occurs here.
- [#28](https://github.com/EPraz/keelwatch/issues/28): evaluation briefs, real
  recruiter/engineer responses, relevant corrections and final acceptance remain
  pending. No external participation is fabricated or initiated by agent messages.
- [#23](https://github.com/EPraz/keelwatch/issues/23): retain the Phase 7 parent
  until its portfolio and external-review requirements are satisfied.
- Phase 8 is a later gap/secondary-project decision. Private interview practice
  remains independent and is not a public acceptance requirement.

## Execution status

Criteria and existing evidence are reconciled locally. Tracker edits/closures
and their read-back are pending the final review of this package. Runtime gates
above retain their historical date; this reconciliation introduces no behavior
requiring a new TDD seam or database migration.
