## Parent

Part of #11 — Phase 5: Public DemoAccount access and focused demo quality.

## What to build

A visitor can select Demo Manager, manage the existing shared synthetic operational
records and inspect their attributed history. After logout, the visitor can choose
Demo Auditor and inspect the persisted results without inheriting edit permissions.
The public Manager path adds bounded writes to the completed Auditor access flow.

## Acceptance criteria

- [ ] Demo Manager opens a real one-hour session for the second fixed DemoAccount,
      distinct from the Auditor and the owner's Auth0 accounts. The same expiry,
      reload, issuance limits, disabled-mode and invalid-token behavior applies.
- [ ] Manager can perform existing permitted create/edit/archive/cancel operations
      across Fleet, certificate/Compliance, Crew and Maintenance workflows. Existing
      lifecycle rules, overlap prevention and concurrent-change recovery remain enforced.
- [ ] Both DemoAccounts are denied access-user and role administration; the public
      selector never creates arbitrary accounts or requests elevated permissions.
- [ ] Demo writes have an enforced configurable budget. Signing in again or changing
      session credentials does not reset that effective budget. Record quota, scope,
      reset conditions and restart limitations actually implemented, without new
      paid infrastructure or an unsupported global/distributed limiting guarantee.
- [ ] A refused write changes no operational record and creates no successful-write
      audit event. Validation remains by the field; limit/error feedback gives clear
      recovery through shared Toast without scrolling or layout changes.
- [ ] Critical writes and their audit events stay atomic. Activity identifies Demo
      Manager, and records remain visible to subsequent sessions and Demo Auditor
      after logout. No individual visitor attribution or isolated dataset is implied.
- [ ] Changing roles requires logout and deliberate selection of the other button.
      Previously rendered records, permissions and client credentials are cleared;
      Auditor has no editing controls and direct Auditor writes are denied.
- [ ] Normal Auth0 users retain their existing login and authorization behavior;
      demo-write limiting does not accidentally classify their operations as demo writes.
- [ ] Tests use real issued Manager/Auditor sessions at the HTTP boundary and
      PostgreSQL for persisted sharing and attribution, plus rendered interaction
      tests for role switching and retry. Reuse operational regression suites;
      do not replace policy guards with injected privileged actors.
- [ ] Verify access/Fleet with both roles publicly: login, logout, reading, Manager
      editing, Auditor denial and internal-route reload. Attribute manual results
      to their operator; public enablement follows successful controls and gates.
- [ ] Applicable gates pass and the durable record captures outcomes and limitations;
      no backups, resets, visitor tenancy or added monetary costs are introduced.
