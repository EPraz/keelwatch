# Information Architecture — Keelwatch

Estado: baseline estructural previo a diseño visual

Fuente: [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)

## Decisiones estructurales

- **Acción más frecuente:** abrir una embarcación y resolver evidencia faltante
  o próxima a vencer.
- **Profundidad máxima:** dos niveles de navegación; el detalle se expresa en el
  contexto del recurso, no mediante árboles de menús.
- **Contenido que crecerá:** embarcaciones, certificados, eventos de auditoría,
  tripulantes y órdenes de mantenimiento.
- **Contenido estable:** catálogo de roles, tipos de certificado y configuración
  mínima.
- **Punto central:** Vessel Workspace.
- **Entrada por rol:** todos llegan a una misma shell, pero acciones y colas se
  filtran por autorización. No se construyen aplicaciones separadas por rol.

## Site map y rutas

Las rutas futuras aparecen para definir consistencia, pero la navegación solo
mostrará módulos ya implementados.

- Authentication
  - Sign in `/sign-in`
  - Authentication callback `/auth/callback`
- Application `/app`
  - Operational overview `/app/overview`
  - Fleet `/app/vessels`
    - Register vessel `/app/vessels/new`
    - Vessel Workspace `/app/vessels/:vesselId`
    - Edit vessel `/app/vessels/:vesselId/edit`
    - Add certificate `/app/vessels/:vesselId/certificates/new`
  - Compliance `/app/compliance`
  - Crew registry `/app/crew` — registro global accesible desde Vessel Workspace;
    sin entrada primaria adicional ni asignación implícita a la embarcación.
  - Activity `/app/activity`
  - Access administration `/app/access`
  - Account `/app/account`
- System states
  - Access denied `/forbidden`
  - Not found `/not-found`

Una ruta protegida conserva el destino solicitado durante el login. Después de
autenticarse, el usuario vuelve al destino si todavía tiene permiso; de lo
contrario llega a una explicación de acceso denegado.

## Modelo de navegación

### Navegación primaria

- Overview
- Fleet
- Compliance
- Activity

Se limita a cuatro entradas. Maintenance sustituirá o ampliará este conjunto
solo cuando exista; nunca aparecerá como control inerte.

### Navegación secundaria

Dentro de Vessel Workspace:

- Summary
- Certificates
- Activity

Crew y Maintenance se incorporarán como tabs únicamente después de sus fases.
Las acciones de creación pertenecen a la sección relacionada, no al menú global.

### Navegación utilitaria

- Identidad y rol actual.
- Access administration, solo para Platform Administrator.
- Account y sign out.
- Ayuda contextual enlazada a documentación pública cuando exista.

### Navegación móvil

Un botón etiquetado abre un panel que contiene la navegación primaria y
utilitaria. Los tabs del Vessel Workspace permiten scroll horizontal controlado
o se convierten en selector; el contenido nunca se reduce a una tabla de
escritorio comprimida.

## Jerarquía de contenido

### Operational overview

1. Riesgos que requieren acción, porque constituyen el siguiente trabajo.
2. Conteos enlazados a listas filtradas, para que cada número sea explicable.
3. Actividad reciente relevante para el rol.
4. Resumen general de flota como contexto secundario.

### Fleet list

1. Búsqueda, filtros activos y resultado total.
2. Tabla/lista con nombre, registry number, estado y próxima expiración.
3. Acción de registrar embarcación si el rol lo permite.
4. Paginación y estado vacío con siguiente acción clara.

Los filtros se representan en query parameters para que la vista sea enlazable.

### Vessel Workspace

1. Identidad y estado explicable de la embarcación.
2. Próxima acción y evidencia problemática.
3. Certificados con sus fechas y estado derivado.
4. Actividad reciente.
5. Metadatos de baja frecuencia y acciones administrativas.

### Certificate form

1. Tipo y referencia.
2. Emisión, expiración e issuer.
3. Explicación previa del efecto esperado sobre el estado.
4. Errores por campo y error general recuperable.
5. Cancelar y guardar sin perder contexto de la embarcación.

### Activity

1. Actor, acción, recurso y fecha.
2. Filtros por actor, acción, recurso y periodo.
3. Detalle sanitizado del cambio.
4. Paginación; nunca cargar el historial completo en el navegador.

## Flujos críticos

### Registrar una embarcación y establecer cumplimiento

1. Operations Manager inicia sesión.
2. Abre Fleet y selecciona `Register vessel`.
3. Introduce nombre y registry number.
   - Si el registry number ya existe, el formulario conserva datos y explica el
     conflicto.
   - Si pierde autorización, la API rechaza y la interfaz informa sin simular
     éxito.
4. Llega al Vessel Workspace con estado `MISSING` para evidencia obligatoria.
5. Selecciona `Add certificate` y registra fechas válidas.
6. Regresa al workspace y ve `VALID`, `EXPIRING_SOON` o `EXPIRED` con su razón.
7. Activity muestra ambos eventos con el actor correcto.

### Auditoría de solo lectura

1. Auditor inicia sesión y abre una URL compartida del Vessel Workspace.
2. Puede revisar estado, evidencia y actividad permitida.
3. No ve acciones de edición.
4. Si intenta llamar la API de escritura, recibe `403`; el intento puede quedar
   registrado como evento de seguridad, no como cambio de negocio.

### Recuperación ante fallo temporal

1. Usuario abre Fleet y la API no responde.
2. La shell y navegación permanecen utilizables.
3. El área de contenido muestra error con correlation ID y acción `Try again`.
4. Reintentar sustituye el error sin recargar toda la aplicación.
5. Si la sesión expiró, se inicia el flujo de autenticación conservando destino.

## Convenciones de nombres

| Concepto             | Etiqueta de interfaz | Uso                                                   |
| -------------------- | -------------------- | ----------------------------------------------------- |
| Embarcación          | Vessel               | Término principal; no alternar con ship/boat.         |
| Identificador propio | Registry number      | Identificador sintético del demo.                     |
| Espacio central      | Vessel Workspace     | Vista de detalle y trabajo.                           |
| Evidencia documental | Certificate          | Registro con fechas y tipo.                           |
| Riesgo próximo       | Expiring soon        | De 0 a 30 días inclusive.                             |
| Evidencia ausente    | Missing              | Tipo obligatorio sin certificado vigente.             |
| Historial            | Activity             | Etiqueta de UI; `Audit` se reserva para arquitectura. |
| Usuario de edición   | Operations Manager   | Rol primario del demo.                                |
| Usuario lector       | Auditor              | Rol de solo lectura.                                  |

## Mapa de componentes estructurales

| Componente conceptual | Uso                         | Variaciones permitidas                                               |
| --------------------- | --------------------------- | -------------------------------------------------------------------- |
| AppShell              | Todas las rutas `/app`      | Navegación filtrada por permiso; contenido independiente.            |
| PageHeader            | Listas y detalles           | Título, breadcrumbs cortos, acción principal opcional.               |
| ResourceTable         | Fleet, Compliance, Activity | Columnas, filtros y empty state específicos.                         |
| StatusExplanation     | Overview y Vessel Workspace | Estado, razón, fecha evaluada y enlace a evidencia.                  |
| FormLayout            | Vessel y Certificate forms  | Secciones y acciones consistentes; campos pertenecen a cada feature. |
| AsyncBoundary         | Superficies remotas         | Loading, empty, error, forbidden y retry.                            |
| ActivityList          | Vessel Workspace y Activity | Vista compacta o completa; mismo contrato de datos.                  |

Este mapa define responsabilidades, no obliga a crear una librería prematura.
Un componente solo se extrae cuando existe reutilización real.

## Crecimiento de contenido

- Fleet utiliza paginación server-side, búsqueda y filtros enlazables.
- Compliance crece como cola transversal, no como duplicado de Vessel Workspace.
- Activity utiliza cursor y filtros para conservar orden estable.
- Los catálogos se administran solo cuando sus cambios sean una necesidad real;
  al inicio pueden provenir de seeds versionados.
- Crew y Maintenance extienden el workspace antes de crear nuevas jerarquías.
- Una búsqueda global se añade únicamente si buscar dentro de Fleet y colas deja
  de ser suficiente.

## Estrategia de URL

- Sustantivos plurales en minúsculas: `/vessels`, `/certificates`.
- IDs opacos en segmentos dinámicos; nombres nunca forman parte de la identidad.
- Query parameters para estado compartible de lista:
  `?status=expiring-soon&sort=expiresOn&page=2`.
- Acciones de creación/edición usan rutas; transiciones de dominio ocurren por
  operaciones explícitas de API, no mediante verbos arbitrarios en la URL web.
- URLs no autorizadas responden con una experiencia `forbidden`; recursos
  inexistentes responden `not found` sin filtrar información sensible.
