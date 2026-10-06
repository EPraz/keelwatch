# ADR-0005: Opciones y gate para hosting de la demo

- Estado: accepted para preparación; aprovisionamiento externo pendiente
- Fecha: 2026-09-30
- Revisión de decisión: 2026-10-02

## Contexto

La primera demo necesitará servir una SPA, una API NestJS y PostgreSQL con HTTPS,
secretos administrados, logs y borrado sencillo. Web, API y base tienen perfiles
distintos y no necesitan compartir proveedor. Esta evaluación no autoriza crear
cuentas, servicios, bases de datos ni facturación.

## Criterios por superficie

### Web

- Hosting estático con CDN, TLS y custom domain opcional.
- Soporte correcto para fallback de rutas SPA.
- Preview reproducible sin acoplar el contrato REST.
- Coste y eliminación simples.

### API

- Proceso Node compatible con NestJS y graceful shutdown.
- Primera visita predecible o cold start explícitamente aceptado.
- Health/readiness, variables secretas y logs buscables por correlation ID.
- Región cercana a PostgreSQL y soporte de npm workspaces.

### PostgreSQL

- Servicio administrado, persistente y con backups/restauración verificables.
- Conexiones y pooling compatibles con Prisma.
- Migraciones reproducibles y eliminación sin recursos residuales facturables.

## Opciones evaluadas

| Opción       | Buen ajuste                                                                                                 | Límite relevante                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GitHub Pages | Web estática pública sin coste y cerca del repositorio.                                                     | No ejecuta NestJS ni PostgreSQL; el routing SPA requiere configuración.                          |
| Vercel       | Web React con CDN, previews y configuración sencilla.                                                       | No decide por sí sola dónde vive el proceso NestJS persistente ni PostgreSQL.                    |
| Render       | Static Site, servicio Node siempre activo desde plan pago y PostgreSQL administrado en la misma plataforma. | API gratuita duerme tras 15 minutos; Free Postgres expira a los 30 días.                         |
| Railway      | Despliegue simple de Node, private network, logs y coste de entrada bajo.                                   | Su plantilla PostgreSQL se documenta como unmanaged; Serverless puede devolver 502 al despertar. |
| Fly.io       | Compute regional flexible y Managed Postgres con HA/backups/pooling.                                        | Más decisiones operativas y coste de base administrada alto para esta demo.                      |

## Decisión inicial

No seleccionar todavía un único proveedor ni forzar co-location. Inmediatamente
antes del despliegue autorizado se repetirá precio/disponibilidad y se elegirá:

1. Web entre GitHub Pages, Vercel o Static Site de Render.
2. API entre Render u otra plataforma Node que cumpla el gate de cold start y
   logs.
3. PostgreSQL entre un servicio administrado compatible con Prisma; una plantilla
   explícitamente unmanaged no satisface este criterio.

La opción inicial más simple para comparar será web estática gratuita + API
siempre activa mínima + PostgreSQL administrado, incluso si pertenecen a
proveedores diferentes. El coste, regiones, límites y procedimiento de teardown
se registrarán antes de crear recursos.

## Decisión de preparación

Después de completar builds locales, las primeras operaciones reales con
PostgreSQL y la revisión de fuentes oficiales vigente, se selecciona Render para
las tres superficies de la demo:

- Static Site global para React, con rewrite a `index.html` y TLS administrado.
- Web Service Node `0.5c-512mb` en `virginia`, siempre activo y con readiness HTTP.
- Render Postgres 17 `0.1c-256mb` con 1 GB en la misma región, sin ingreso público
  y con backups/PITR del plan pago.

La configuración vive en [`render.yaml`](../../../../render.yaml) y el
procedimiento en [`docs/deployment.md`](../../../deployment.md). El coste de
compute observado el 2026-10-02 es aproximadamente USD 7/mes para API y USD
6/mes para PostgreSQL; Static Sites no tiene coste de compute. Precio, storage,
tráfico y facturación se revalidan justo antes de importar el Blueprint.

Se prefiere una sola plataforma porque satisface el gate con menos coordinación:
conexión privada entre API/base, migraciones pre-deploy, health checks, logs,
secretos y teardown documentado. Separar la SPA en GitHub Pages o Vercel no añade
una señal relevante en esta fase y multiplica configuración externa.

Esta aceptación autoriza configuración versionada, no el aprovisionamiento. No se
creó cuenta, servicio, base, dominio ni gasto.

## Consecuencias

- La aplicación local y el contrato HTTP no incorporan SDKs de hosting.
- `apps/web`, `apps/api` y la base pueden evolucionar o eliminarse por separado.
- La configuración de despliegue solo se añadió después de verificar builds
  locales y recibir autorización explícita para prepararla.
- El gate de Fase 1 sigue abierto hasta existir evidencia real de Auth0, CI y
  despliegue público.

## Fuentes oficiales consultadas

Consultadas nuevamente el 2026-10-02:

- [Render pricing](https://render.com/pricing)
- [Render free-tier limitations](https://render.com/docs/free)
- [Render Postgres](https://render.com/docs/postgresql)
- [Render logs](https://render.com/docs/logging)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
- [Render health checks](https://render.com/docs/health-checks)
- [Render environment variables](https://render.com/docs/configure-environment-variables)
- [Render static rewrites](https://render.com/docs/redirects-rewrites)
- [Render Prisma deployment](https://render.com/docs/deploy-prisma-orm)
- [Render PostgreSQL backups](https://render.com/docs/postgresql-backups)
- [Railway pricing](https://railway.com/pricing)
- [Railway Serverless behavior](https://docs.railway.com/deployments/serverless)
- [Railway PostgreSQL](https://docs.railway.com/databases/postgresql)
- [Railway logs](https://docs.railway.com/observability/logs)
- [Fly.io resource pricing](https://fly.io/docs/about/pricing/)

También se revisaron las fuentes oficiales vigentes de GitHub Pages y Vercel para
routing SPA y configuración. Permanecen como alternativas si Render cambia su
oferta antes del aprovisionamiento.
