# Phase 5 published tickets

Source: [spec #11](https://github.com/EPraz/keelwatch/issues/11).
Status: breakdown approved and published on 2026-10-11 with `ready-for-agent`.
All four are native sub-issues of #11; blockers are native GitHub relationships.

1. [**#12: Public Demo Auditor access with bounded sessions**](https://github.com/EPraz/keelwatch/issues/12) — no blockers. Delivers
   one-click read-only access, real one-hour sessions, reload/logout, issuance
   limiting, disabled mode and normal Auth0 coexistence.
2. [**#13: Public Demo Manager writes with shared audit and usage limits**](https://github.com/EPraz/keelwatch/issues/13) — blocked by
   #12. Delivers shared operational writes, persistent audit attribution,
   non-resettable-by-login write limits and deliberate Manager/Auditor switching.
3. [**#14: Complete accessible public demo journeys**](https://github.com/EPraz/keelwatch/issues/14) — blocked by #13. Delivers
   verified Fleet, certificate/Compliance, CrewAssignment and MaintenanceOrder
   journeys with focused accessibility/responsive corrections and usable recovery.
4. [**#15: Measure bounded public demo read performance**](https://github.com/EPraz/keelwatch/issues/15) — blocked by #13. Delivers
   a reproducible small public read measurement with context and limitations;
   it can proceed independently of #14.

No standalone prefactoring or horizontal API/UI/testing tickets are needed. Each
access ticket includes its required provisioning, API, UI and behavioral tests;
the quality slices reuse the existing data model and actual workflows.

Published bodies match the local per-ticket files, and labels, sub-issue links and
blocking edges have been verified. The parent's content and open state were preserved.
The initial implementation frontier is #12; no implementation has started here.
Completion of all four, applicable gates and durable evidence is required before
declaring Phase 5 complete; publication alone does not authorize that declaration.
