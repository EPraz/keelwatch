# Keelwatch — definición de producto y arquitectura

Estado: Fase 0 completa; Fase 1 preparada hasta el gate externo; Fase 2 local sin adjuntos; perfiles Crew implementados

Última revisión: 2026-10-06

Estrategia fuente: [`../portfolio-strategy.md`](../portfolio-strategy.md)

Hoja de ruta: [`../maritime-operations-roadmap.md`](../maritime-operations-roadmap.md)

## Propósito

Este directorio conserva la definición previa a implementación y las decisiones
aceptadas del flagship. El repositorio independiente Keelwatch, ubicado
canónicamente en `C:\Users\epile\Documents\Projects\GIT\Keelwatch`, ya existe y
es la única fuente editable de verdad del producto. La incubación temporal en el
repositorio del portfolio terminó al completar Fase 0.

## Identidad aprobada

- **Nombre:** Keelwatch.
- **Descriptor:** Maritime compliance and operations workspace.
- **Tagline de trabajo:** Keep every vessel ready.
- **Slug:** `keelwatch`.
- **Estado:** aprobado por Edwin como identidad del proyecto de portfolio. Una
  comprobación formal de marca/nombre seguirá siendo necesaria antes de un uso
  comercial.

La evaluación y la separación de repositorios están documentadas en
[`IDENTITY_AND_REPOSITORY.md`](./IDENTITY_AND_REPOSITORY.md).

## Documentos

| Documento                                                                                                                                | Decisión que fija                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`CLEAN_ROOM.md`](./CLEAN_ROOM.md)                                                                                                       | Qué fuentes y materiales se pueden usar y qué debe quedar fuera.   |
| [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)                                                                                                 | Usuario, problema, alcance, roles, reglas y no-objetivos.          |
| [`INFORMATION_ARCHITECTURE.md`](./INFORMATION_ARCHITECTURE.md)                                                                           | Navegación, rutas, jerarquía de contenido y flujos principales.    |
| [`FIRST_VERTICAL_SLICE.md`](./FIRST_VERTICAL_SLICE.md)                                                                                   | Contrato verificable de la primera entrega de extremo a extremo.   |
| [`DOMAIN_MODEL.md`](./DOMAIN_MODEL.md)                                                                                                   | Entidades, ownership, invariantes y estados derivados iniciales.   |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)                                                                                                   | Contexto, contenedores, módulos, repositorio y quality gates.      |
| [`DOCUMENT_UPLOAD_THREAT_MODEL.md`](./DOCUMENT_UPLOAD_THREAT_MODEL.md)                                                                   | Histórico del ensayo retirado por ADR-0007.                        |
| [`architecture/decisions/0001-single-product-repository.md`](./architecture/decisions/0001-single-product-repository.md)                 | Repositorio independiente y workspace sencillo.                    |
| [`architecture/decisions/0002-modular-monolith.md`](./architecture/decisions/0002-modular-monolith.md)                                   | Monolito modular como arquitectura inicial.                        |
| [`architecture/decisions/0003-oidc-and-application-rbac.md`](./architecture/decisions/0003-oidc-and-application-rbac.md)                 | Identidad externa estándar y autorización propia.                  |
| [`architecture/decisions/0004-auth0-as-hosted-oidc-provider.md`](./architecture/decisions/0004-auth0-as-hosted-oidc-provider.md)         | Auth0 seleccionado; flujo real local verificado después del ADR.   |
| [`architecture/decisions/0005-hosting-options-and-decision-gate.md`](./architecture/decisions/0005-hosting-options-and-decision-gate.md) | Render seleccionado para preparación; aprovisionamiento pendiente. |
| [`architecture/decisions/0006-document-storage-and-retention.md`](./architecture/decisions/0006-document-storage-and-retention.md)       | Histórico de storage, sustituido por ADR-0007.                     |

Decisión vigente: [ADR-0007 — demo sin adjuntos](./architecture/decisions/0007-disable-file-attachments-in-portfolio-demo.md).

## Decisiones confirmadas

- El proyecto es personal, clean-room y utiliza datos sintéticos.
- Vivirá en un repositorio independiente del portfolio.
- La primera arquitectura será un monolito modular.
- React/TypeScript, NestJS, PostgreSQL y Prisma forman el stack inicial.
- La primera entrega probará un flujo completo, no proyectos frontend/backend
  aislados.
- Auth0 fue seleccionado como proveedor OIDC hospedado y el propietario configuró
  un tenant, API, SPA y dos cuentas sintéticas para verificar el flujo local real;
  consulta ADR-0004 y el registro durable de progreso.
- Render fue seleccionado para la preparación reproducible de web, API y
  PostgreSQL; ningún recurso externo fue aprovisionado. Consulta ADR-0005 y el
  [`runbook`](../deployment.md).
- Adjuntos retirados por ADR-0007: no hay uploads, downloads, storage ni scanner.
  Evaluar valor, esfuerzo, riesgo y coste antes de implementar cada incremento;
  servicios adicionales necesitan aprobación previa. No se crearon recursos externos.

## Gate activo

La definición de producto y la transición de repositorio están completas. La
autenticación local y Auth0 real, el shell protegido, RBAC y Fleet
create/list/detail/edit están verificados contra PostgreSQL. El gate activo es el
checkout limpio/CI y el despliegue público HTTPS con PostgreSQL administrado,
backups y aprobación de coste.

No se diseñarán pantallas definitivas antes de tener contratos y estados
implementables. La estética del portfolio tampoco se trasladará automáticamente
al producto.
