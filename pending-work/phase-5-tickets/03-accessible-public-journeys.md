## Parent

Part of #11 — Phase 5: Public DemoAccount access and focused demo quality.

## What to build

Visitors can complete the four agreed existing journeys through the public demo
with usable keyboard access, readable contrast, mobile layouts and understandable
operation feedback. Correct concrete barriers within those workflows and preserve
the existing API invariants, permission boundaries and visual language.

## Acceptance criteria

- [ ] Verify public access/Fleet with both roles, including login/logout, reload,
      Manager editing and the Auditor's read-only interface and API behavior.
- [ ] Verify certificate lifecycle and resulting Compliance status with synthetic
      evidence; Manager actions and Auditor review preserve existing permissions.
- [ ] Verify CrewAssignment planning and overlap rejection, with understandable
      validation/recovery and readable review of the result.
- [ ] Verify MaintenanceOrder lifecycle, concurrent conflict recovery and retained
      history; both roles can inspect their permitted views and Manager can perform
      the existing transitions.
- [ ] Check login and these journeys at mobile (320–375 px), tablet (768 px), small
      desktop (1024 px) and desktop (1440 px), comparing existing screens and reusing
      components, CSS and responsive behavior rather than introducing a new style.
- [ ] Verify keyboard navigation, visible focus, meaningful labels, readable contrast,
      forms, tables and feedback. Correct identified access barriers and include
      reduced-motion behavior where motion is involved; do not claim full WCAG conformance.
- [ ] Exercise applicable loading, empty, denied, pending, field-validation, backend
      error, retry and post-success states. Success and failure feedback uses the
      shared Toast; recovery does not require scrolling to an operation announcement.
- [ ] Add regression coverage for behavior actually corrected at the confirmed HTTP
      or rendered-interaction boundaries. Reuse existing suites instead of rebuilding
      all module tests as browser E2E; add no speculative schema or infrastructure.
- [ ] Record the public scenario, synthetic record references, operator, result and
      limitations. Keep automated evidence distinct from owner/manual acceptance.
      Do not expose secrets or real personal/operational data in captured evidence.
- [ ] Applicable gates pass and the durable record lists completed corrections and
      remaining blockers. This slice does not require backup/restoration drills or
      a permanent monitoring service.
