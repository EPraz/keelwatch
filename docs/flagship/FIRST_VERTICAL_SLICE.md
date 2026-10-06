# Contrato de la primera entrega vertical

Estado: implementado y verificado localmente; evidencia pública pendiente

Nombre del slice: Establish vessel compliance

Fuente: [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)

## Resultado observable

Un Operations Manager autenticado registra una embarcación, observa que falta
un certificado obligatorio, añade un certificado y recibe un nuevo estado de
cumplimiento derivado. Un Auditor puede revisar el resultado, pero no modificarlo.

Este slice es la primera demostración de extremo a extremo. No se divide en “hacer
frontend”, “hacer API” y “hacer base de datos” como entregas independientes.

## Actores

- **Operations Manager:** puede crear y editar embarcaciones y registrar certificados.
- **Auditor:** puede leer Vessel Workspace y Activity.
- **Unauthenticated visitor:** no puede acceder a rutas ni datos protegidos.

## Preconditions

- Existe un usuario demo por rol.
- Existe un tipo de certificado sintético obligatorio: `SAFETY_EQUIPMENT`.
- Todos los datos y documentos son sintéticos.
- La fecha de evaluación proviene del servidor en UTC y se muestra al usuario.

## Happy path

1. Operations Manager inicia sesión.
2. Registra `MV Northwind` con registry number `KW-000001`.
3. La API persiste la embarcación y un evento `VESSEL_CREATED`.
4. Vessel Workspace muestra estado `MISSING` y explica qué tipo falta.
5. El usuario añade un certificado con referencia, issuer y fechas válidas.
6. La API persiste el certificado y `CERTIFICATE_CREATED` en una transacción.
7. El workspace vuelve a consultar y muestra el estado derivado.
8. Activity identifica actor, recurso, acción y timestamp de ambos cambios.
9. Un Auditor abre el mismo workspace, ve los datos y no puede modificarlos.

## Reglas del slice

### Registry number

- Obligatorio.
- Se recorta y normaliza a mayúsculas antes de persistir.
- Patrón demo: `KW-` seguido por seis dígitos.
- Único en el sistema.
- El valor normalizado se devuelve en la respuesta.

### Certificate dates

- `issuedOn` y `expiresOn` son fechas de calendario.
- `issuedOn <= expiresOn`.
- Un certificado con `issuedOn > asOf` permanece en el historial, pero todavía no
  satisface el requisito actual.
- Para una fecha de evaluación `asOf`:
  - Sin certificado vigente para un tipo obligatorio: `MISSING`.
  - `expiresOn < asOf`: `EXPIRED`.
  - `0 <= expiresOn - asOf <= 30 días`: `EXPIRING_SOON`.
  - `expiresOn - asOf > 30 días`: `VALID`.
- El estado no se persiste; respuesta y UI incluyen `asOf` y razón.

## Contrato HTTP inicial

Los nombres exactos podrán ajustarse antes de implementar, pero el comportamiento
es parte del contrato.

| Método | Ruta                                                            | Resultado                                      |
| ------ | --------------------------------------------------------------- | ---------------------------------------------- |
| `POST` | `/api/v1/vessels`                                               | Crea una embarcación autorizada.               |
| `GET`  | `/api/v1/vessels`                                               | Lista paginada.                                |
| `GET`  | `/api/v1/vessels/:vesselId`                                     | Devuelve detalle y actividad permitida.        |
| `PUT`  | `/api/v1/vessels/:vesselId`                                     | Edita una embarcación autorizada.              |
| `GET`  | `/api/v1/vessels/:vesselId/compliance`                          | Devuelve estado derivado e historial completo. |
| `POST` | `/api/v1/vessels/:vesselId/certificates`                        | Añade evidencia y recalcula estado.            |
| `PUT`  | `/api/v1/vessels/:vesselId/certificates/:certificateId`         | Edita evidencia y audita campos cambiados.     |
| `POST` | `/api/v1/vessels/:vesselId/certificates/:certificateId/archive` | Archiva sin eliminar y recalcula estado.       |

Los errores siguen una forma consistente:

```json
{
  "code": "VESSEL_REGISTRY_NUMBER_CONFLICT",
  "message": "A vessel with this registry number already exists.",
  "fieldErrors": {
    "registryNumber": ["Use a unique registry number."]
  },
  "correlationId": "demo-correlation-id"
}
```

El mensaje no incluye stack traces, tokens, consultas ni detalles internos.

## Escenarios de aceptación

### Autenticación

- [x] Dado un visitante sin sesión, cuando abre `/app/vessels`, entonces inicia
      el flujo de autenticación y el destino se conserva.
- [x] Dado un token inválido o expirado, cuando llama la API, entonces recibe una
      respuesta no autenticada consistente y ningún dato operacional.

### Autorización

- [x] Dado un Operations Manager, cuando crea una embarcación válida, entonces
      recibe `201` y puede abrir su workspace.
- [x] Dado un Auditor, cuando intenta crear una embarcación o certificado,
      entonces recibe `403` y no se produce ningún cambio ni evento de negocio.
- [x] Dado un Auditor, cuando consulta una embarcación existente, entonces puede
      ver estado y actividad sanitizada.

### Vessel

- [x] Dado `kw-000001`, cuando se crea la embarcación, entonces se persiste y
      devuelve `KW-000001`.
- [x] Dado un registry number existente, cuando se repite el alta, entonces la
      API devuelve conflicto, la UI conserva los valores y señala el campo.
- [x] Dado un registry number con formato inválido, cuando se envía, entonces la
      API no escribe en base de datos y devuelve error por campo.
- [x] Dado un ID inexistente, cuando se consulta, entonces se muestra not-found
      sin revelar información adicional.

### Compliance

- [x] Dada una embarcación sin el certificado requerido, cuando se abre el
      workspace, entonces muestra `MISSING` y el tipo ausente.
- [x] Dadas fechas donde emisión es posterior a expiración, cuando se envían,
      entonces se rechazan sin crear certificado ni audit event.
- [x] Dado un certificado vencido, cuando se consulta el workspace, entonces el
      estado es `EXPIRED` y muestra la fecha evaluada.
- [x] Dado un certificado que vence exactamente en 30 días, entonces el estado
      es `EXPIRING_SOON`.
- [x] Dado un certificado que vence en 31 días, entonces el estado es `VALID`.

### Atomicidad y auditoría

- [x] Dado un fallo al escribir `CERTIFICATE_CREATED`, cuando la operación no
      puede completarse de forma atómica, entonces el certificado tampoco queda
      persistido.
- [x] Dada una creación exitosa, Activity muestra actor, acción, recurso y tiempo
      sin almacenar token ni payload sensible.

### Estados de interfaz

- [x] Fleet tiene skeleton/loading inicial sin layout shift severo.
- [x] Una lista vacía explica que todavía no hay embarcaciones y ofrece la acción
      correcta solo al rol autorizado.
- [x] Un fallo temporal muestra correlation ID y `Try again` sin desmontar la
      navegación.
- [x] Un submit pendiente impide envíos duplicados y mantiene feedback accesible.
- [x] Éxito y errores se anuncian a tecnologías de asistencia y el foco se mueve
      a un destino útil.

## Pruebas mínimas

- Unit tests para normalización, validación de fechas y cálculo de estado.
- Integration tests con PostgreSQL para unicidad, transacción y consultas del
  workspace.
- Authorization tests por endpoint para Operations Manager, Auditor y usuario no
  autenticado.
- API contract tests para éxito, validation, conflict, forbidden y not-found.
- E2E para el happy path y el intento de escritura del Auditor.
- Accessibility check del formulario, tabla/lista, error y cambio de estado.

## Evidencia para cerrar el slice

- Demo pública o grabación del happy path y del rechazo del Auditor.
- Enlace desde el README a reglas, tests y ADRs relacionados.
- Diagrama actualizado si la implementación cambia límites.
- Quality gates verdes en un checkout limpio.
- Ningún dato, screenshot o fixture fuera de la política clean-room.

## Fuera de alcance

- Upload de archivos.
- Alertas por email o background jobs.
- Crew, maintenance, fuel o telemetría.
- Reglas reglamentarias reales.
- Importación masiva y edición concurrente avanzada.
- Dashboard visual más allá de un resumen enlazable y explicable.
