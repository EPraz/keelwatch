## Parent

Part of #11 — Phase 5: Public DemoAccount access and focused demo quality.

## What to build

A visitor can select Demo Auditor on the public sign-in page, explore existing
operational records read-only, reload the current tab and log out without receiving
a password. Normal Auth0 login remains available. This is the first complete path
through public session issuance, fixed account provisioning, server authorization,
protected routing and user-facing recovery.

Apply ADR-0008. Adapt the existing authentication composition only where this
slice requires it; do not create a separate refactor, authorization model or module
for a hypothetical future consumer. Demo Manager is delivered by the next slice.

## Acceptance criteria

- [ ] Demo Auditor starts a real server-issued session for a fixed synthetic
      DemoAccount distinct from the owner's Auth0 identities. Provisioning is
      repeatable, preserves operational records and does not accept arbitrary
      subjects, accounts, roles or permissions from the public request.
- [ ] The session lasts one hour without silent renewal, survives reload in the
      current tab, opens protected internal routes and expires in both UI and API.
      Expiration offers a clear return to the demo selector and another sign-in.
- [ ] Logout removes the client credential and role-dependent cached/displayed
      state. Auth0 and demo sessions do not silently replace each other; a new
      session starts only after the former session has been cleared.
- [ ] API authorization resolves active account status and application-owned roles.
      Auditor can read Fleet, Compliance, Crew, Maintenance and Activity through
      their existing permissions; operational writes and access administration
      remain denied even when requested directly.
- [ ] Invalid, tampered, expired, unprovisioned or inactive identities are refused
      consistently. Production never accepts the local static development tokens.
      Demo credentials cannot be mistaken for OIDC credentials.
- [ ] Server configuration defaults demo access to disabled. Disabling it stops
      session issuance and acceptance without affecting valid OIDC access or the
      normal Auth0 sign-in option; configuration follows the existing restart process.
- [ ] Session issuance has a configurable enforced limit and safe retry guidance.
      Record the actual quota, scope and tested behavior without adding paid
      services. The public entry is not enabled without this control.
- [ ] Sign-in shows usable pending, failure, retry, unavailable and limited states,
      prevents duplicate attempts and uses the shared Toast feedback. Its English
      copy explains synthetic shared data and account-level attribution.
- [ ] Existing visual patterns, responsive behavior, keyboard access and focus are
      preserved. The Vercel internal-route reload fix remains intact.
- [ ] Tests exercise real issuance and protected requests through the HTTP pipeline,
      with PostgreSQL where status/provisioning matters, plus rendered sign-in and
      session behavior. Cover role denial, expiry, limits, disabling and OIDC
      coexistence without replacing authentication guards or using real credentials.
- [ ] Applicable gates pass; record evidence, secret/log handling and any remaining
      public verification. Do not claim a completed Manager flow or completed Phase 5.

## Blocked by

None (can start immediately).
