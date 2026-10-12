# Runbook de despliegue — Fase 1

Estado actual: SPA en Vercel y API existente en Render sin coste adicional.
El 2026-10-11 el propietario comunica que Neon ya funciona como PostgreSQL de la
API en la nube, acepta #14 localmente y autoriza desplegar #12/#13/#14.
El propietario confirma #12/#13/#14 en la nube y autoriza #15 el 2026-10-11.

Última verificación documental: 2026-10-11.

## Despliegue existente con Neon Free

El propietario inicializa Neon mediante migraciones y seed; no se transfieren
los registros desechables de QA de Supabase. `DATABASE_URL` permanece solo en
configuración de la API. No ejecutar otra inicialización/reset ni importar el
Blueprint histórico para crear servicios o una base Render.

El health check automático del servicio Render debe ser `/api/v1/health/live`.
Esta ruta no consulta PostgreSQL; permite el reposo de Neon cuando no hay consultas.
En servicios configurados manualmente, actualizar **Settings → Health Checks →
Health Check Path** y comprobar que el valor efectivo coincide con el archivo.
Cambiar `render.yaml` por sí solo no modifica un servicio que no usa ese Blueprint.

`/api/v1/health/ready` conserva su comprobación real de PostgreSQL. Ejecutarla una
vez después del despliegue y al diagnosticar una conexión; no monitorizarla con
consultas periódicas que despierten Neon. Un resultado `200` de liveness confirma
el proceso API, no disponibilidad de la base. Una caída de PostgreSQL ya no hace
fallar el chequeo automático de Render; los endpoints que usan la base siguen
dependiendo de ella y deben recuperarse al despertar. Este es el trade-off aceptado
para una demo con visitas esporádicas, sin nuevos jobs, caché ni servicios.

Publicar los commits revisados, verificar CI y el despliegue de los servicios
existentes; comprobar HTTPS, rutas SPA, ambos health checks y disponibilidad de
los dos roles demo. El propietario confirma después los cuatro recorridos de
#12/#13/#14, aceptados por el propietario el 2026-10-11. #15 mide lecturas acotadas
según [su guía](./flagship/DEMO_PERFORMANCE.md). No declarar reposo real de Neon solo
por obtener un `200`: comprobarlo en su consola después de un período sin consultas
y verificar la siguiente lectura. Mantener cerradas las pantallas que consultan
la API mientras se observa ese reposo.

## Preparación histórica de Fase 1

Las secciones siguientes describen el Blueprint pago original, conservado como
referencia. No representan el entorno gratuito actual ni su autorización de costes.

`render.yaml` fue validado localmente contra el JSON Schema oficial de Render el
2026-10-02. La validación consciente del workspace y el plan de cambios ocurren al
conectar el repositorio en la cuenta del propietario.

## Decisión y límite de autorización

La preparación usa un único Blueprint de Render para reducir coordinación entre
la SPA, la API y PostgreSQL. Importar [`render.yaml`](../render.yaml) crea recursos
pagos: Static Site sin coste de compute, API `0.5c-512mb` y PostgreSQL
`0.1c-256mb`. A precios consultados el 2026-10-02, el mínimo de compute es
aproximadamente USD 13/mes antes de storage o tráfico adicional. Se debe volver a
confirmar el precio en el dashboard antes de aprobar la creación.

Este archivo no autoriza crear Blueprint, base, dominio, nuevas aplicaciones o
facturación, ni modificar o eliminar el tenant Auth0 fuera de los pasos aquí
descritos. El despliegue público continúa bloqueado hasta que el propietario
realice o autorice esas acciones.

## Qué deja preparado el repositorio

- Static Site global con fallback SPA, headers defensivos y variables OIDC
  públicas inyectadas durante el build.
- Servicio Node siempre activo con health check de liveness y apagado ordenado.
- PostgreSQL 17 administrado, con 1 GB explícito, sin acceso público y en la misma
  región de la API.
- `prisma migrate deploy` antes de cada release; nunca `reset`, `db push` ni
  migraciones de desarrollo en producción.
- Seed inicial que exige los `sub` de dos cuentas Auth0 sintéticas cuando
  `NODE_ENV=production`; no crea identidades locales en producción.
- Auto-deploy únicamente después de que pasen los checks del repositorio.

## Política Auth0 verificada localmente

La API y la SPA existentes usan únicamente identidades sintéticas. En Auth0, la
política **Application Access** de la API está en **Per-app authorization** tanto
para acceso delegado por usuario como para acceso de cliente. La SPA Keelwatch
tiene un grant explícito de acceso de usuario y las aplicaciones de terceros quedan
sin autorización por defecto. Esta configuración evita abrir la API a clientes no
aprobados y resolvió el rechazo `Client is not authorized to access resource
server` observado antes del grant.

La prueba local usó callback `http://localhost:5173/auth/callback`, logout
`http://localhost:5173/sign-in` y origin `http://localhost:5173`. Manager y Auditor
se resolvieron por `sub` contra roles propios de Keelwatch; Auth0 no es la fuente de
permisos de negocio. La SPA no usa client secret.

## Valores que debe aportar el propietario

Todos se configuran en Render o Auth0; ninguno se guarda en Git.

| Destino    | Valor                                                                                  |
| ---------- | -------------------------------------------------------------------------------------- |
| Auth0 API  | Audience de la API Keelwatch.                                                          |
| Auth0 SPA  | Client ID público; no existe client secret para la SPA PKCE.                           |
| Auth0 SPA  | Callback `https://<web>/auth/callback`.                                                |
| Auth0 SPA  | Logout URL `https://<web>/sign-in`.                                                    |
| Auth0 SPA  | Web origin `https://<web>`.                                                            |
| Render API | `WEB_ORIGIN`, `OIDC_ISSUER` y `OIDC_AUDIENCE`.                                         |
| Render API | `SEED_OPERATIONS_MANAGER_SUBJECT` y `SEED_AUDITOR_SUBJECT` de cuentas demo sintéticas. |
| Render web | `VITE_API_URL=https://<api>/api/v1` y los tres valores `VITE_OIDC_*`.                  |

Los hosts `<web>` y `<api>` deben sustituirse por los dominios HTTPS finales. Si
los nombres propuestos en el Blueprint no están disponibles, se actualizan antes
de importarlo y se usan los nombres resultantes de forma consistente.

## Procedimiento autorizado

1. Publicar un commit revisado en un repositorio propiedad del usuario y observar
   que el workflow `Quality gate` queda verde.
2. Mantener la API, SPA y dos cuentas sintéticas existentes según ADR-0004; añadir
   los URLs HTTPS finales, confirmar el grant explícito de la SPA y copiar
   únicamente valores públicos y los dos `sub` al gestor de configuración de
   Render.
3. Revisar en Render el coste de cada recurso, región `virginia`, retención de
   backups y método de pago. Detenerse si difiere de la decisión aceptada.
4. Importar el Blueprint y completar todos los valores `sync: false`. Esta acción
   es el punto que crea recursos y requiere confirmación del propietario.
5. Verificar que `preDeployCommand` aplica las migraciones y que
   `initialDeployHook` carga solo los dos usuarios sintéticos autorizados.
6. Configurar los URLs finales en Auth0 y Render, desplegar nuevamente web y API,
   y conservar HTTPS administrado en ambas superficies.

## Verificación posterior

- `GET https://<api>/api/v1/health/live` devuelve `200`.
- `GET https://<api>/api/v1/health/ready` devuelve `200` y `postgresql`.
- Una recarga directa de `/app/vessels/<uuid>` sirve la SPA, no un `404` del host.
- Operations Manager puede registrar, listar, consultar y editar; cada escritura
  añade exactamente un evento de negocio.
- Auditor puede listar/consultar, no ve controles de edición y recibe `403` al
  intentar escribir sin cambios ni eventos.
- Un error visible incluye el mismo correlation ID buscable en logs de API.
- La base muestra PITR habilitado y se registra una prueba de restauración antes
  de considerar la demo durable.

## Rollback y teardown

Una migración fallida detiene el release antes de arrancar la nueva API. No se
revierte con `migrate reset`; se corrige con una nueva migración compatible.

Eliminar líneas del Blueprint no elimina recursos automáticamente. Para cerrar
la demo: exportar datos si se necesitan, quitar los recursos del Blueprint y
sincronizar, comprobar que ya no están administrados, y después eliminarlos
manualmente en Render y Auth0. Confirmar que no quedan dominios, bases ni compute
facturables.

## Adjuntos fuera del alcance de la demo

[ADR-0007](./flagship/architecture/decisions/0007-disable-file-attachments-in-portfolio-demo.md)
retira cargas, descargas y limpieza documental. El Blueprint y la API no requieren
Supabase Storage, ClamAV, buckets, claves de enlaces ni scheduler documental.
No aprovisionar esos servicios. Verificar que las antiguas rutas de documentos,
descarga y reconciliación devuelvan 404, también para usuarios autenticados.

Las migraciones y datos históricos se conservan; no borrar tablas ni archivos al
desplegar. No hay retención automática de adjuntos. Los registros de certificados,
su archivado lógico y las notificaciones de vencimiento siguen activos.

## Fuentes oficiales

- [Auth0 API access policies](https://auth0.com/blog/developers-guide-api-access-policies-auth0/)
- [Auth0 third-party application security controls](https://auth0.com/docs/get-started/applications/third-party-applications/security-controls)
- [Render Blueprint YAML](https://render.com/docs/blueprint-spec)
- [Render health checks](https://render.com/docs/health-checks)
- [Render variables and secrets](https://render.com/docs/configure-environment-variables)
- [Render static rewrites](https://render.com/docs/redirects-rewrites)
- [Render Prisma deployment](https://render.com/docs/deploy-prisma-orm)
- [Render backups and recovery](https://render.com/docs/postgresql-backups)
- [Render pricing](https://render.com/pricing)
