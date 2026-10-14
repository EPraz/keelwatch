# Architecture decision index

Current interpretation inspected 2026-10-14 at repository `748310a` for
[#17](https://github.com/EPraz/keelwatch/issues/17). Original ADR texts retain their
dates, alternatives and historical status wording. This index distinguishes
current applicability from what was known when each decision was written.

| Decision                                                                                       | Current applicability and history                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001 — Independent repository and npm workspaces](./0001-single-product-repository.md)        | Accepted/current. One product repository with apps/web and apps/api; no Nx/Turborepo or shared DTO package.                                                                                                                     |
| [0002 — Modular monolith](./0002-modular-monolith.md)                                          | Accepted/current. One NestJS application, six business modules and one PostgreSQL database; transactions remain local.                                                                                                          |
| [0003 — OIDC and application RBAC](./0003-oidc-and-application-rbac.md)                        | Accepted/current for normal login and server-owned grants. Provider deferral was resolved by 0004; 0008 explicitly adds shared-demo identity without replacing RBAC.                                                            |
| [0004 — Auth0](./0004-auth0-as-hosted-oidc-provider.md)                                        | Accepted/current. Its original provisioning deferral is historical: real synthetic Auth0 access was subsequently verified. 0008 adds demo sessions; production still rejects local development authentication.                  |
| [0005 — Hosting preparation and decision gate](./0005-hosting-options-and-decision-gate.md)    | Historical accepted preparation for an all-Render paid Blueprint. It does not describe or authorize today's hosting/spending. Owner-confirmed current topology is Vercel + existing Render API + Neon Free; no additional cost. |
| [0006 — Document storage/retention](./0006-document-storage-and-retention.md)                  | Explicitly superseded by 0007 on 2026-10-06. Storage/scanner protocols and retention deadlines describe the retired experiment, not deployment requirements.                                                                    |
| [0007 — No file attachments in the demo](./0007-disable-file-attachments-in-portfolio-demo.md) | Accepted/current. Routes, services, SDK and scanner removed; applied schema/history retained without application attachment access or cleanup. Reintroduction needs a new decision.                                             |
| [0008 — Shared public DemoAccounts](./0008-public-demo-access.md)                              | Accepted/current; both roles published and owner-accepted 2026-10-11. One-hour sessions, server permissions, shared attribution and process-local quotas coexist with Auth0.                                                    |

The [progress record](../../../progress.md) preserves subsequent implementation,
public acceptance and CI evidence. The [current architecture](../../ARCHITECTURE.md)
and [deployment runbook](../../../deployment.md) explain the effective topology
and unverified provider settings. The existing Render Blueprint is historical;
its paid plans and earlier backup expectations are not current guarantees.

No new ADR is adopted by this map. Crew's write protocol, Maintenance revisions
and the in-process notification runner are described from actual source/tests in
the [data guide](../../DOMAIN_MODEL.md); the detailed consequential alternatives
belong to the later technical cases (#18–#21). The index does not invent original
motives or imply alternatives were historically considered when no record exists.
Future evolution and its adoption conditions belong to #22.
