# Modelo conceptual inicial — Keelwatch

Estado: certificados sin adjuntos, perfiles, cualificaciones y planes Crew; ADR-0007 vigente

El esquema Prisma y las migraciones revisadas son la fuente ejecutable; este
documento conserva las reglas y límites de ownership que explican ese esquema.

## Módulos propietarios de datos

| Módulo     | Propiedad                                                              |
| ---------- | ---------------------------------------------------------------------- |
| Access     | `User`, `Role`, `UserRoleAssignment`.                                  |
| Fleet      | `Vessel`.                                                              |
| Compliance | `CertificateType`, `Certificate`, estado y notificaciones.             |
| Audit      | `AuditEvent`; recibe hechos sanitizados de otros módulos.              |
| Crew       | `CrewMember`, `CrewQualification`, `CrewAssignment`; datos sintéticos. |

Un módulo puede leer datos de otro mediante una interfaz de aplicación, pero no
escribe directamente sus tablas. La base de datos puede ser compartida sin
convertir límites de ownership en convenciones opcionales.

## Diagrama

```mermaid
erDiagram
  USER ||--o{ USER_ROLE_ASSIGNMENT : has
  ROLE ||--o{ USER_ROLE_ASSIGNMENT : grants
  USER ||--o{ AUDIT_EVENT : acts_in
  VESSEL ||--o{ CERTIFICATE : carries
  CERTIFICATE_TYPE ||--o{ CERTIFICATE : classifies
  USER ||--o{ COMPLIANCE_NOTIFICATION_RUN : triggers
  COMPLIANCE_NOTIFICATION_RUN ||--o{ COMPLIANCE_NOTIFICATION : creates
  VESSEL ||--o{ COMPLIANCE_NOTIFICATION : receives
  CERTIFICATE_TYPE ||--o{ COMPLIANCE_NOTIFICATION : concerns
  VESSEL ||--o{ AUDIT_EVENT : referenced_by

  USER {
    uuid id PK
    string external_subject UK
    string display_name
    string email
    string status
    timestamptz created_at
  }

  ROLE {
    uuid id PK
    string code UK
    string name
  }

  USER_ROLE_ASSIGNMENT {
    uuid user_id FK
    uuid role_id FK
    timestamptz assigned_at
    uuid assigned_by_id FK nullable
    string source
  }

  VESSEL {
    uuid id PK
    string name
    string registry_number UK
    string status
    timestamptz created_at
    timestamptz updated_at
    uuid created_by FK
  }

  CERTIFICATE_TYPE {
    uuid id PK
    string code UK
    string name
    boolean is_required
  }

  CERTIFICATE {
    uuid id PK
    uuid vessel_id FK
    uuid certificate_type_id FK
    string reference_number
    string issuer
    date issued_on
    date expires_on
    timestamptz created_at
    timestamptz updated_at
    timestamptz archived_at nullable
    uuid created_by FK
  }

  COMPLIANCE_NOTIFICATION_RUN {
    uuid id PK
    string job_code
    string status
    timestamptz queued_at
    timestamptz started_at nullable
    timestamptz completed_at nullable
    int created_count
    int skipped_count
    int resolved_count
    string failure_code nullable
    uuid triggered_by FK
  }

  COMPLIANCE_NOTIFICATION {
    uuid id PK
    uuid vessel_id FK
    uuid certificate_type_id FK
    string condition_key
    string status
    string reason
    date as_of
    timestamptz created_at
    timestamptz resolved_at nullable
    uuid source_run_id FK
  }

  AUDIT_EVENT {
    uuid id PK
    uuid actor_user_id FK
    string action
    string entity_type
    uuid entity_id
    jsonb metadata
    timestamptz occurred_at
    string correlation_id
  }
```

La relación gráfica entre Vessel y AuditEvent es conceptual: `AuditEvent`
utiliza `entityType/entityId` para registrar distintos recursos y no una foreign
key exclusiva a Vessel.

## Entidades e invariantes

### User

- `externalSubject` es el identificador estable entregado por el proveedor OIDC.
- Email y display name son atributos de presentación; no autorizan operaciones.
- Un usuario inactivo no obtiene acceso aunque su token externo sea válido.
- Los roles locales se resuelven en la aplicación y pueden cambiar sin modificar
  el proveedor de identidad.

### UserRoleAssignment

- La pareja `(userId, roleId)` es única.
- Una asignación `ADMIN` exige `assignedById` de un administrador autorizado.
- Una asignación `SYSTEM_SEED` exige `assignedById = null`; solo el seed sintético
  puede usar ese origen.
- Retirar una asignación no elimina los eventos históricos del usuario.

### Vessel

- `name` tiene entre 2 y 120 caracteres después de trim.
- `registryNumber` se normaliza a mayúsculas y cumple `^KW-[0-9]{6}$`.
- `registryNumber` tiene constraint única.
- Estado inicial: `ACTIVE`; `ARCHIVED` impide nuevos certificados.
- No hay eliminación física en la primera release.

### CertificateType

- `code` es estable, legible y único.
- `isRequired` expresa una regla propia del demo, no una regulación real.
- El seed inicial contiene `SAFETY_EQUIPMENT`.
- Cambiar obligatoriedad requiere una decisión porque altera estados históricos
  al volver a calcularlos.

### Certificate

- Pertenece exactamente a Vessel y CertificateType.
- `issuedOn <= expiresOn` se protege en dominio y mediante constraint.
- `referenceNumber` se recorta; su unicidad se evalúa por
  `(vesselId, certificateTypeId, referenceNumber)`.
- Las renovaciones crean nuevos registros para conservar historial.
- Editar conserva la identidad del registro y produce `CERTIFICATE_UPDATED` con
  los campos cambiados; archivar es lógico, conserva el historial y produce
  `CERTIFICATE_ARCHIVED`.
- La demo gestiona registros, no binarios. Cargas y descargas están deshabilitadas.

### CertificateDocument — histórico retirado

- Modelo y migración aplicada conservados para no destruir datos existentes.
- No hay consultas, escrituras, descarga, scanner ni limpieza de adjuntos desde
  la aplicación. Los campos y estados previos son historia, no capacidades actuales.
- Archivar certificados ya no cambia fechas de retención de esos registros.
- Los eventos anteriores siguen visibles en Activity. Cualquier borrado físico
  requiere una decisión separada; véase ADR-0007.

### CrewMember

- Perfil global a la flota, independiente de User y de cualquier embarcación.
- `displayName` recortado, entre 2 y 120 caracteres; `crewNumber` normalizado a
  mayúsculas con formato sintético `KW-C-######` y constraint única.
- Alta y `CREW_MEMBER_CREATED` se guardan en una transacción. Auditoría solo
  contiene la referencia, actor y correlation ID, no el nombre completo.
- Manager tiene `crew:read`/`crew:write`; Auditor solo `crew:read`. Los demás roles
  no heredan acceso Crew desde Fleet ni desde administración de identidades.
- No almacena datos reales, salud, contacto o documentos personales. Un perfil no
  declara aptitud ni asignación. Las cualificaciones son registros separados.
- Lectura paginada de 20 registros, ordenada por creación e ID descendente.

### CrewQualification

- Pertenece a un único CrewMember. Tipos cerrados `DEMO_SAFETY` y `DEMO_DECK`;
  no representan titulaciones oficiales ni requisitos normativos o médicos.
- `referenceNumber` normalizado cumple `KW-Q-######` y es único por perfil.
- `validFrom` y `expiresOn` son fechas de calendario sin hora, años 0001–9999; inicio no posterior
  al vencimiento, validado en dominio y mediante constraint PostgreSQL.
- Estado calculado al consultar, con fecha `asOf` UTC y motivo: inicio futuro
  `NOT_YET_VALID`, vencimiento anterior a hoy `EXPIRED`, de 0 a 30 días inclusive
  `EXPIRING_SOON`, y el resto `VALID`. El día de vencimiento aún está incluido.
- Manager registra; Auditor consulta usando los permisos Crew existentes.
  Alta y `CREW_QUALIFICATION_RECORDED` comparten una transacción; el evento contiene
  ID de perfil, tipo y referencia, nunca documentos ni datos personales.
- Historial paginado de 20 registros, creación e ID descendentes. Renovar crea
  otro registro con referencia nueva; no hay edición, borrado ni adjuntos.
- No se deriva aptitud real. La evaluación opcional de un borrador consulta estas
  vigencias para todo el periodo planificado, sin impedir su creación.

### CrewAssignment

- Plan de un CrewMember en un Vessel y una función demo, no embarque ni aptitud.
  Funciones cerradas `DEMO_DECK`/`DEMO_SUPPORT`, separadas de los roles de Access.
- Inicio y fin obligatorios, inclusivos, fechas de calendario 0001–9999;
  inicio no posterior al fin. Se permiten un día y periodos pasados o futuros.
- Sin solapamientos entre planes no cancelados del mismo perfil en toda la flota,
  cualquiera que sea la función. Otro perfil puede compartir periodo; el siguiente
  día al fin queda libre. Creación y cancelación toman el mismo lock del perfil
  en una transacción `ReadCommitted` antes de comprobar o liberar periodos.
  La garantía de solapamiento pertenece a estas escrituras transaccionales de la
  aplicación, no a una exclusion constraint; SQL externo que omita el lock podría
  violarla y no forma parte de la API del demo.
- Estado derivado por día UTC: `SCHEDULED`, `CURRENT`, `ENDED`; `CANCELLED`
  prevalece y conserva todas las fechas originales. Cada lectura incluye `asOf`.
- Crear exige Vessel activo, perfil existente y `crew:write` + `fleet:read`.
  Leer exige `crew:read` + `fleet:read`; Auditor consulta. El historial de Vessel
  archivado sigue disponible y sus planes también pueden cancelarse.
- Cancelar invalida todo el plan y libera su periodo; no equivale a salida anticipada.
  Motivo cerrado obligatorio `INCORRECT_RECORD` o `PLAN_CHANGED`, sin texto libre.
  Fecha, actor y motivo se guardan juntos; una constraint impide metadatos parciales.
- Repetir el mismo motivo conserva el primer resultado sin evento adicional;
  otro motivo produce conflicto. No hay edición, borrado ni reactivación.
- Alta/primera cancelación y `CREW_ASSIGNMENT_CREATED`/`CREW_ASSIGNMENT_CANCELLED`
  comparten transacción. Auditoría con contexto Vessel, IDs y referencias, sin nombres.
- Historial de 20 planes, creación e ID descendentes; UI en Vessel Workspace y
  selector paginado del registro Crew, sin descargar toda la colección.

### CrewRequirementEvaluation

- Consulta informativa de un borrador en contexto Vessel: `crew:read` y
  `fleet:read` obligatorios. Manager y Auditor consultan; la entrada UI es el
  formulario de planificación existente de Manager.
- Cubierta demo requiere Seguridad y Cubierta; Apoyo demo requiere Seguridad.
  Son requisitos originales de la demo, distintos de permisos y aptitud real.
- Unión de intervalos del mismo perfil/tipo solapados o consecutivos por día;
  se considera todo el periodo inclusivo y registros fuera de la primera página.
- Resultados derivados `INCOMPLETE`, `WARNING`, `COVERED`: primero prevalece
  cobertura incompleta, después aviso. Cada tipo explica ausencia de registros o
  primer hueco máximo, o el fin de cobertura continua cuando está cubierto.
- Aviso si la cobertura continua termina 0–30 días después del fin del plan;
  una renovación consecutiva puede ampliar ese margen. El estado de hoy de una
  cualificación no sustituye esta evaluación del periodo.
- Se recalcula al consultar y devuelve periodo, perfil, función, Vessel y momento
  de consulta. No persiste snapshots, planes, aprobaciones ni auditoría de lectura.
- El formulario invalida el resultado al cambiar entradas/contexto, guardar o
  salir. Un fallo o una lectura pendiente no bloquean guardar un plan válido.

### AuditEvent

- Es append-only desde la aplicación.
- `action` utiliza un vocabulario versionado, por ejemplo `VESSEL_CREATED`.
- `metadata` contiene un resumen permitido, nunca tokens, secretos o el payload
  completo de una petición.
- `correlationId` permite cruzar evento y log operacional.
- La auditoría no es un event store ni la fuente de verdad del dominio.

### ComplianceNotificationRun

- Un run registra cola, inicio, terminación, conteos y un código de fallo estable;
  nunca persiste stack trace o mensaje interno.
- Solo puede existir un run `QUEUED` o `RUNNING` para `EXPIRY_NOTIFICATIONS`; una
  constraint parcial de PostgreSQL mantiene la regla incluso con triggers repetidos.
- El runner actual es deliberadamente acotado a una instancia. No promete entrega
  distribuida ni sustituye una cola durable multi-worker.

### ComplianceNotification

- Representa una condición activa derivada, no el envío de email o SMS.
- `conditionKey` combina embarcación, tipo, estado y evidencia seleccionada para
  que una condición idéntica se conserve y una transición produzca una nueva fila.
- Solo puede existir una fila no resuelta por `conditionKey`; PostgreSQL lo impone
  mediante índice único parcial.
- Una reconciliación resuelve condiciones ausentes, actualiza razón/fecha de las
  vigentes y crea únicamente las nuevas.

## Estado derivado de cumplimiento

El estado se calcula para una embarcación y fecha `asOf`:

1. Para cada CertificateType obligatorio, buscar entre los certificados no
   archivados con `issuedOn <= asOf` el que tenga mayor `expiresOn`.
2. Si no existe, producir `MISSING` con el código del tipo.
3. Si `expiresOn < asOf`, producir `EXPIRED`.
4. Si la diferencia está entre 0 y 30 días inclusive, producir
   `EXPIRING_SOON`.
5. En otro caso, producir `VALID`.
6. El estado agregado de la embarcación utiliza el peor estado según:
   `MISSING > EXPIRED > EXPIRING_SOON > VALID` para priorización visual.

La prioridad es una convención de producto del demo. `asOf` y las razones se
devuelven junto al resultado para evitar un número opaco.

## Consistencia y transacciones

- Crear Vessel y su AuditEvent ocurre en una transacción.
- Crear Certificate y su AuditEvent ocurre en una transacción.
- Editar o archivar Certificate y su AuditEvent ocurre en una transacción.
- Reconciliar notificaciones y completar su run ocurre en una transacción.
- Crear o cancelar por primera vez CrewAssignment y su AuditEvent ocurre en una
  transacción; un fallo de auditoría revierte tanto la reserva como la liberación.
- El estado derivado se consulta después del commit; no se publica un evento de
  cambio de estado en el primer slice.
- Los endpoints de escritura no reintentan automáticamente una transacción no
  idempotente.
- Maintenance diseñará su propio control de edición simultánea cuando exista
  el escenario; no reutiliza implícitamente el lock de planificación Crew.

## Índices iniciales

Constraints e índices requeridos por integridad:

- Unique en `user.external_subject`.
- Unique en `role.code`.
- Unique en `(user_id, role_id)`.
- Unique en `vessel.registry_number` normalizado.
- Unique en `certificate_type.code`.
- Unique en `(vessel_id, certificate_type_id, reference_number)`.
- Unique parcial en `compliance_notification.condition_key` cuando `resolved_at`
  es null.
- Unique parcial en `compliance_notification_run.job_code` cuando el estado es
  `QUEUED` o `RUNNING`.

Índices candidatos que deben validarse con consultas y `EXPLAIN`:

- `certificate(vessel_id, certificate_type_id, expires_on desc)`.
- `certificate(expires_on)` para la futura cola transversal.
- `audit_event(entity_type, entity_id, occurred_at desc)`.

No se añaden índices genéricos a cada foreign key sin observar su plan de uso.

## Datos demo iniciales

- Tres usuarios locales sintéticos: Operations Manager, Auditor y un usuario
  inactivo para verificar la frontera de acceso. Desarrollo añade las dos
  identidades Auth0 configuradas cuando ambas están presentes.
- El seed base de acceso y catálogo no crea ni sustituye registros operacionales.
  El comando explícito `prisma:seed:demo` añade escenarios originales sintéticos
  de Fleet, Compliance, Crew y Maintenance con auditoría atómica; sus repeticiones
  conservan registros y cambios de visitantes. Fechas ancladas en la primera carga,
  sin resets automáticos; véase [DEMO_DATASET.md](./DEMO_DATASET.md).
- Un único tipo de certificado obligatorio: `SAFETY_EQUIPMENT`.
- Nombres, referencias y fechas creados específicamente para la demo.
- Ningún número pretende corresponder a una embarcación o documento real.

## Decisiones abiertas

- Rotación y ciclo de vida de las cuentas demo para la URL pública definitiva.
- Política de retención de AuditEvent para una versión pública de larga duración.
- Cuándo una corrección debe editar Certificate o crear una nueva versión.
- Estrategia de archivado de Vessel cuando existan módulos dependientes.
- Multi-tenancy: explícitamente diferido hasta demostrar una necesidad.
