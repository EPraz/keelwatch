# Registro durable de progreso — Keelwatch

Última verificación: 2026-10-06

## Estado verificable

- Fase 0 está completa y este directorio es el workspace canónico.
- El trabajo local de Fleet para Fase 1 está completo: acceso protegido, registro,
  listado, detalle, edición, actividad sanitizada, autorización negativa y
  recuperación de errores funcionan contra PostgreSQL real.
- Auth0 está seleccionado por ADR-0004 y el flujo real local fue verificado con
  API, SPA y dos cuentas sintéticas configuradas por el propietario. No se guardó
  ningún secreto ni credencial en el repositorio.
- Render está seleccionado por ADR-0005 y su Blueprint está preparado, pero no se
  creó servicio, base, dominio ni despliegue. El workflow de GitHub Actions tampoco
  se ha ejecutado en infraestructura hospedada.
- Fase 1 permanece abierta hasta verificar CI desde un checkout limpio y el flujo
  público con OIDC, HTTPS y PostgreSQL administrado.
- Fase 2 está verificada localmente con el alcance reducido de ADR-0007:
  certificados, estados, cola, dashboard y notificaciones. Los adjuntos se retiraron
  el 2026-10-06; no hay uploads, downloads, storage, scanner ni limpieza documental.
- Fase 3 comenzó con el registro y consulta paginada de perfiles sintéticos:
  UI, API, permisos Crew, PostgreSQL y auditoría atómica. Cualificaciones y
  asignaciones permanecen pendientes; un perfil no representa aptitud ni embarque.

## Recorte aprobado — demo sin adjuntos (2026-10-06)

- [ADR-0007](./flagship/architecture/decisions/0007-disable-file-attachments-in-portfolio-demo.md)
  sustituye ADR-0006. Se retiran UI, rutas, puertos/adapters, jobs y configuración
  de adjuntos, SDK Supabase y scanner real/simulado. No hay toggle de reactivación.
- El aviso de UI explica el límite. Crear, editar, archivar y consultar registros
  de certificados, notificaciones, Fleet, Crew y RBAC siguen activos.
- No se borraron tablas, registros, migraciones aplicadas ni archivos históricos.
  La comparación SHA-256 de filas completas antes/después de las pruebas confirmó
  igualdad en usuarios (5), roles (2), barcos (3), certificados (2), adjuntos
  históricos (1), eventos (13), notificaciones (4), runs (3) y perfiles Crew (1).
- Gates vigentes: 93 pruebas unitarias/de componente (50 API, 43 web), 43 HTTP y
  19 PostgreSQL. Las rutas antiguas devuelven 404 para visitante, Manager, Auditor
  e inactivo; OpenAPI no anuncia adjuntos ni multipart. Producción valida sin
  configuración de storage/scanner, conservando OIDC, Prisma y HTTPS obligatorios.
- Formato, lint, typecheck, convenciones, 15 variables de ejemplo, preflight OIDC,
  Prisma, revisión de DDL y builds pasan. Las siete migraciones siguen aplicadas;
  este recorte no necesita DDL. No hubo reset, drop ni despliegue externo.
- La primera ejecución aislada de pruebas falló por temporales y localhost
  restringidos; fuera del aislamiento pasan. La prueba multipart usa el fixture
  en memoria para evitar la carrera entre respuesta 404 inmediata y stream de
  archivo del cliente. El servidor de desarrollo se reinició tras quitar tipos
  de una dependencia que el watcher conservaba en memoria.
- Revisión viva: aviso legible, historial sin enlaces y cero selectores de archivos
  para ambos roles; Auditor a 375/768/1024/1440 px sin overflow, Manager a 1024 px
  con navegación por teclado y foco visible. Compliance conserva expiry check,
  sin file check; Crew conserva su perfil. Loading/error/retry se observaron al
  reiniciar API; validación, vacío, forbidden, pending y CRUD tienen regresión
  automatizada. Reduced-motion mantiene la política global, sin emulación de SO.
  La consola final no presenta warnings ni errores; el viewport temporal se restauró.
- La auditoría detectó después una vulnerabilidad de desarrollo en shell-quote
  1.9.0. Override acotado de concurrently a shell-quote 1.11.0, sin cambio mayor:
  [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).
  Se verificó el runner; `npm audit --audit-level=high` reporta 0 vulnerabilidades.
- Regla previa a futuros incrementos: demostrar valor para portafolio, versión
  mínima, esfuerzo, coste y riesgo antes de construir. Consultar servicios o
  infraestructura adicionales, incluso si comienzan simulados. La siguiente
  capacidad no se inicia automáticamente como parte de este recorte.

## Evidencia del incremento

| Área         | Evidencia                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web          | React protegido con lista adaptable, alta, detalle, edición, actividad, estados loading/empty/error/not-found/conflict/forbidden y recuperación.                                     |
| API          | NestJS versionado con RBAC deny-by-default, DTOs, errores estables, correlation ID y endpoints Fleet de lectura/escritura.                                                           |
| Persistencia | Migraciones Prisma para identidad, `Vessel` y `AuditEvent`; altas y ediciones son transacciones atómicas y la unicidad está protegida por PostgreSQL.                                |
| Autorización | Operations Manager escribe; Auditor solo lee. Un POST con el token OIDC real del Auditor devolvió `403` sin cambiar embarcaciones ni auditoría.                                      |
| Actividad    | `VESSEL_CREATED` y `VESSEL_UPDATED` exponen actor, acción, recurso, tiempo y campos cambiados sin token, email ni payload sensible.                                                  |
| Interfaz     | Revisión renderizada a 1440×900, 768×1024 y 375×812 sin overflow horizontal; lista, alta, detalle, edición y sus estados adversos fueron recorridos.                                 |
| Operación    | Liveness/readiness, logs estructurados, migración reproducible, seed sintético, Blueprint de Render y runbook de despliegue.                                                         |
| OIDC local   | Auth0 Authorization Code con PKCE resolvió ambos `sub` contra PostgreSQL; login, callback limpio, permisos por rol, logout y errores `401/403` funcionan.                            |
| Compliance   | Manager registra, corrige y archiva evidencia; ambos roles consultan cola, dashboard y alertas; estado, razón, `asOf`, conteos, historial y Activity se recalculan desde PostgreSQL. |
| Jobs         | Un runner acotado persiste runs, serializa ejecuciones, reconcilia condiciones y expone fallo estable; constraints parciales impiden run/alerta activos duplicados.                  |

## Evidencia Auth0 local

El 2026-10-03 se verificó el tenant sintético sin imprimir tokens, cookies,
códigos, subjects ni secretos:

- `/api/v1/access/me` resolvió a Morgan Reed como `OPERATIONS_MANAGER` con
  `fleet:read`, `fleet:write` y `activity:read`;
- el manager listó, abrió, registró y editó `KW-991003`; cada escritura produjo
  exactamente un evento (`VESSEL_CREATED` y `VESSEL_UPDATED`) y correlation IDs
  distintos;
- `/api/v1/access/me` resolvió a Avery Chen como `AUDITOR` con solo `fleet:read`
  y `activity:read`; Fleet y Activity fueron legibles y los controles de escritura
  no aparecieron;
- una petición de alta enviada por el transporte autenticado normal del frontend
  con esa sesión Auditor devolvió `403`; la base permaneció en tres embarcaciones y
  cinco eventos, sin crear `KW-991004`;
- un bearer opaco inválido devolvió `401 INVALID_ACCESS_TOKEN` con mensaje seguro
  y correlation ID, y una prueba RS256 con JWKS efímero confirmó el mismo contrato
  para un token expirado;
- los logs observados contienen método, path, status, duración, correlation ID y,
  cuando aplica, ID interno del actor; no contienen authorization headers, tokens,
  emails, subjects ni payloads.

La API Auth0 usa **Per-app authorization** para acceso delegado por usuario y por
cliente. La SPA Keelwatch tiene un grant explícito de acceso de usuario; las apps
de terceros quedan sin autorización por defecto. Los roles de negocio permanecen
en Keelwatch, no en Auth0.

## PostgreSQL local

Las migraciones `20261002211320_register_vessel`,
`20261003000000_certificate_compliance` y
`20261004000000_certificate_lifecycle`, más
`20261004010000_compliance_notification_jobs`, fueron revisadas y aplicadas sobre
la base local existente sin reset, drop ni truncate. El seed idempotente conserva
datos y añade por upsert únicamente identidades y el catálogo sintético requerido.
La sexta migración, `20261005000000_certificate_document_evidence`, está aplicada.
La QA de documentos conservó cinco usuarios, dos roles y tres embarcaciones, y
añadió un certificado demo archivado, su documento aceptado y cuatro eventos.
La evidencia histórica `DEMO-DOC-QA-20261005` y su fixture se conservan sin
servirse ni eliminarse. El antiguo plazo de retención dejó de ser operativo con
ADR-0007; no existe borrado automático.

Se detectó que la antigua prueba PostgreSQL del job reconciliaba la watch global:
había actualizado fechas y resuelto una condición retenida. Ahora ejecuta las dos
reconciliaciones en una transacción revertida y compara todas las filas antes y
después. Las demás pruebas limpian solo sus propios fixtures. Una ejecución normal
del job local el 2026-10-06 restauró la watch al estado actual: una condición nueva,
dos sin cambios, cero resueltas. Se conserva ese run; no se reescribió el historial.
Docker sigue siendo opcional.

## Gates históricos del ensayo de adjuntos (antes del recorte)

Estos resultados pertenecen al incremento anterior; no son el conteo vigente:

- formato, lint y typecheck;
- 104 pruebas unitarias/de componente (63 API y 41 web), incluyendo validación,
  firmas y expiración de enlaces, scanner, adapters y estados accesibles;
- 37 pruebas HTTP, con autorización negativa, límites de archivo, cuarentena,
  descarga y reintento inmediato de limpieza rechazada;
- 20 pruebas PostgreSQL, con constraints, auditoría atómica, rollback y prueba de
  que la reconciliación idempotente no altera las notificaciones retenidas;
- ejemplo de entorno con 24 variables, preflight OIDC redactado y convenciones;
- Prisma validado, DDL revisado y seis migraciones aplicadas;
- builds de producción de API y web;
- `npm audit --audit-level=high`: 0 vulnerabilidades tras actualizar únicamente
  source-map-js 1.2.1 a 1.2.2 por GHSA-68fv-2mgg-jv7q.

El workflow equivalente está definido en `.github/workflows/quality.yml`, pero no
se atribuye un resultado remoto hasta que exista un repositorio publicado.

## Revisión de experiencia

La revisión viva cubrió manager y auditor, navegación por teclado, foco de errores,
anuncios accesibles, singular/plural, lista vacía, carga, caída temporal de API,
reintento, conflicto conservando valores, not-found y detalle adaptable. El flujo de
Compliance se recorrió a 1440×900, 768×1024 y 375×812 sin overflow horizontal: alta,
recalculo a `EXPIRING_SOON`, edición, confirmación y archivado lógico, historial y
Activity para Manager, además del estado read-only para Auditor. La consola terminó
sin warnings ni errores.

La cola transversal se recorrió como Auditor con Auth0 real y como Manager con el
adapter local de desarrollo. Se verificaron conteos trazables, búsqueda y estado
combinados en query parameters, resultado vacío explicado, drill-down y consola
limpia. Un overflow de 15 px causado por la tercera entrada de navegación fue
corregido; la revisión final a 1280 px, 768×1024 y 375×812 no presenta overflow.

Overview se verificó con Manager y Auditor sobre los datos PostgreSQL retenidos:
los tres riesgos enlazan a sus filtros, las próximas acciones abren el Vessel
Workspace y el estado de fallo conserva reintento. La versión móvil mantiene la
jerarquía sin overflow y la consola permanece limpia.

La watch se verificó con ambos roles. Manager ejecutó un primer check que creó tres
alertas y un segundo que informó `0 new`, `3 unchanged`, `0 resolved`; Auditor vio
las mismas tres condiciones sin botón de ejecución. El layout móvil mantuvo
`scrollWidth == clientWidth` a 375×812 y la consola terminó limpia.

Histórico del ensayo retirado: Documentos se verificó con Manager y Auditor a 375, 768, 1024 y 1440 px sin
overflow horizontal, foco de teclado visible y política CSS de reduced-motion
inspeccionada (sin emulación específica). Se corrigió el contraste del documento
dentro de certificados archivados. Upload multipart y descarga real se probaron
por terminal con identidades locales; el navegador comprobó estado, historial,
retención y ausencia de acciones de escritura para Auditor. Pendiente, rechazado
y retry están cubiertos por pruebas de componente/HTTP, no todos por QA visual viva.
Después de reiniciar los servidores no se observaron nuevos errores de consola.
El check local de archivos informó 0 pendientes, 0 eliminados y 0 huérfanos.

ADR-0006 y threat model fueron aceptados para ese ensayo y están sustituidos por
ADR-0007. Esta evidencia histórica no representa funciones activas. El adapter
Supabase y el protocolo ClamAV tienen pruebas simuladas; no equivalen a probar
un bucket real o un antivirus operativo. No se creó cuenta, bucket, servicio,
suscripción ni gasto.

## Primer incremento de Fase 3 — perfiles Crew

- Manager registra un nombre sintético y una referencia única `KW-C-######`;
  Auditor consulta. Los permisos `crew:read` y `crew:write` se resuelven en servidor;
  Fleet write no concede Crew write, y Compliance Officer/Platform Administrator
  no reciben acceso Crew por defecto.
- El registro es global a la flota, accesible desde Vessel Workspace en `/app/crew`.
  No se añadió una entrada primaria, una asignación implícita ni controles inertes.
- La migración aditiva `20261006000000_crew_profiles` está aplicada sin reset y
  protege unicidad, normalización y longitud. Alta y `CREW_MEMBER_CREATED` son
  atómicos; el evento contiene referencia, no nombre ni datos personales.
- El registro no almacena contacto, documentos de identidad, salud, credenciales
  de acceso ni datos reales. CrewMember no es una cuenta User.
- La QA viva creó únicamente Jordan Vale / `KW-C-000001` y su evento. El segundo
  intento devolvió 409 y conservó valores; validación enfocó el resumen y el alta
  anunció éxito. Auditor no muestra formulario. Ambos roles fueron recorridos;
  Manager se revisó a 375/768/1024/1440 px sin overflow y con foco visible.
- Fallo de red/reintento, pending/doble envío, vacío, paginación, forbidden y axe
  tienen cobertura automatizada. Reduced-motion reutiliza la política CSS global;
  no se afirma emulación del sistema operativo.
- Gates del incremento: 110 pruebas unitarias/de componente (64 API, 46 web),
  46 HTTP y 24 PostgreSQL; formato, lint, typecheck, convenciones, Prisma y builds.
  Siete migraciones aplicadas. PostgreSQL prueba concurrencia, rollback de auditoría
  y constraints; las pruebas eliminan solo sus propios fixtures.
- Siguiente resultado vertical: registrar cualificaciones con fechas y consultar
  su vigencia por perfil. Después, asignaciones por periodo/rol con reglas temporales
  explícitas. No existe override ni evaluación normativa o médica.

## Gate externo pendiente

1. Publicar el repositorio/commit y obtener una ejecución verde de GitHub Actions
   desde un checkout limpio.
2. Añadir a la SPA Auth0 existente los callback/logout/origin HTTPS finales,
   conservar el grant explícito de acceso a la API y cargar en Render los dos
   subjects sintéticos ya verificados.
3. Aprobar el coste, importar `render.yaml` y cargar los valores secretos/públicos
   descritos en [`deployment.md`](./deployment.md).
4. Verificar en URLs públicas HTTPS, readiness, deep links, ambos roles, rechazo de
   escritura, correlation IDs y política de backups.

No se debe marcar Fase 1 como completa antes de esa evidencia. Esas puertas externas
no se atribuyen como resultados locales ni impiden continuar los incrementos
independientes de Fase 3 autorizados por el propietario.

## Riesgos residuales conocidos

- El bundle web principal es de aproximadamente 659 kB minificado (183 kB gzip) y
  activa el warning de 500 kB de Vite. No bloquea esta demo pequeña, pero conviene
  medir y dividir por rutas antes de ampliar módulos.
- El Blueprint coincide con el JSON Schema oficial de Render, pero la validación
  consciente del workspace y la importación final dependen del dashboard, el
  repositorio publicado y valores reales propiedad del usuario.
