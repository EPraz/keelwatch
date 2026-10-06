# Modelo conceptual inicial — Keelwatch

Estado: certificados sin adjuntos y registro de perfiles Crew; ADR-0007 vigente

El esquema Prisma y las migraciones revisadas son la fuente ejecutable; este
documento conserva las reglas y límites de ownership que explican ese esquema.

## Módulos propietarios de datos

| Módulo     | Propiedad                                                  |
| ---------- | ---------------------------------------------------------- |
| Access     | `User`, `Role`, `UserRoleAssignment`.                      |
| Fleet      | `Vessel`.                                                  |
| Compliance | `CertificateType`, `Certificate`, estado y notificaciones. |
| Audit      | `AuditEvent`; recibe hechos sanitizados de otros módulos.  |
| Crew       | `CrewMember`; identidad sintética, no cuenta de acceso.    |

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
  declara cualificación, aptitud o asignación; esas relaciones aún no existen.
- Lectura paginada de 20 registros, ordenada por creación e ID descendente.

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
- El estado derivado se consulta después del commit; no se publica un evento de
  cambio de estado en el primer slice.
- Los endpoints de escritura no reintentan automáticamente una transacción no
  idempotente.
- El control avanzado de concurrencia se diseñará con Maintenance, cuando exista
  un escenario demostrable de edición simultánea.

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
- El seed no crea ni sustituye registros operacionales; embarcaciones y
  certificados se crean mediante los flujos o fixtures aislados de prueba.
- Un único tipo de certificado obligatorio: `SAFETY_EQUIPMENT`.
- Nombres, referencias y fechas creados específicamente para la demo.
- Ningún número pretende corresponder a una embarcación o documento real.

## Decisiones abiertas

- Rotación y ciclo de vida de las cuentas demo para la URL pública definitiva.
- Política de retención de AuditEvent para una versión pública de larga duración.
- Cuándo una corrección debe editar Certificate o crear una nueva versión.
- Estrategia de archivado de Vessel cuando existan módulos dependientes.
- Multi-tenancy: explícitamente diferido hasta demostrar una necesidad.
