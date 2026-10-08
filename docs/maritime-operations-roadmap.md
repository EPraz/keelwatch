# Hoja de ruta — Keelwatch

Estrategia fuente: [`docs/portfolio-strategy.md`](./portfolio-strategy.md)

Estado: Fase 0 completa; Fase 1 preparada hasta el gate externo; Fase 2 local sin adjuntos; perfiles, cualificaciones y planes Crew implementados

Última revisión: 2026-10-08

## Estado actual

- **Fase:** Fase 2 local con alcance reducido; Fase 3 tiene perfiles, cualificaciones y planes.
  El gate externo de Fase 1 sigue abierto.
- **Workspace canónico:** `C:\Users\epile\Documents\Projects\GIT\Keelwatch`.
- **Objetivo activo:** planes sintéticos por periodo y cancelación auditada,
  conservando el alcance sin archivos de ADR-0007.
- **Próximos resultados:** evaluación demo de requisitos y vista de composición
  por embarcación; confirmar el alcance mínimo y valor de cada uno antes de
  implementarlo. No introducir servicios o infraestructura sin aprobación previa.
- **Bloqueos externos:** GitHub y Render requieren remote, cuentas y aprobación
  de coste. Storage y antivirus no son dependencias ni gates pendientes.
  PostgreSQL local se conserva sin reset, drop ni truncate.
- **Implementación iniciada:** sí; la transición del repositorio está completa.
- **Paquete de definición:** [`docs/flagship/`](./flagship/README.md).
- **Registro durable:** [`docs/progress.md`](./progress.md).

## Cómo mantener esta hoja de ruta

- Cada tarea debe producir un resultado demostrable dentro de una sesión
  razonable.
- Una tarea funcional incluye el corte vertical necesario: interfaz, contrato,
  autorización, persistencia, estados y pruebas aplicables.
- No se marca una tarea como terminada por crear archivos o instalar
  dependencias. Debe cumplirse su criterio de verificación.
- Cada entrega enlazará su PR, commit, documento, captura o reporte cuando
  exista.
- Si cambia el propósito del portfolio, primero se actualiza la estrategia.
- Si aparece trabajo no previsto, debe entrar en la fase donde aporta una señal;
  no se convierte automáticamente en alcance.

## Definición común de terminado

Salvo que la tarea sea exclusivamente documental, “terminado” significa:

- El flujo funciona de extremo a extremo en el entorno definido.
- Loading, vacío, error, acceso denegado y recuperación están cubiertos cuando
  aplican.
- La autorización se verifica en el backend.
- Las invariantes relevantes están protegidas y probadas.
- No hay secretos ni datos reales en código, fixtures o logs.
- Lint, typecheck, pruebas, migraciones y build aplicables pasan.
- La evidencia y las decisiones nuevas están documentadas.

## Fase 0 — Producto propio y frontera clean-room

Objetivo: poder explicar qué construiremos, para quién y por qué es una obra
independiente antes de abrir el repositorio público.

- [x] **Definir la frontera clean-room:** documentar fuentes permitidas,
      elementos prohibidos, procedimiento ante dudas y checklist de publicación.
      La revisión debe permitir detectar una posible filtración antes de un commit.
      _Crea: [`CLEAN_ROOM.md`](./flagship/CLEAN_ROOM.md). Reutiliza: límites de la estrategia._
- [x] **Escribir el brief del producto:** definir usuario principal, problema,
      vocabulario propio, workflows, reglas iniciales, no-objetivos y naturaleza de
      los datos sintéticos. _Crea: [`PRODUCT_BRIEF.md`](./flagship/PRODUCT_BRIEF.md). Depende de: frontera
      clean-room._
- [x] **Contratar la primera entrega vertical:** especificar el recorrido en el
      que un Operations Manager autenticado registra una embarcación, añade su
      primer certificado y observa un estado de cumplimiento derivado, incluyendo
      errores y permisos. _Crea: [`FIRST_VERTICAL_SLICE.md`](./flagship/FIRST_VERTICAL_SLICE.md). Depende de: brief._
- [x] **Diseñar el modelo conceptual mínimo:** representar identidad, rol,
      embarcación, tipo de certificado, certificado y evento de auditoría con sus
      invariantes, sin convertir todavía el diagrama en migraciones. _Crea: modelo
      conceptual en [`DOMAIN_MODEL.md`](./flagship/DOMAIN_MODEL.md). Depende de: primera entrega._
- [x] **Aprobar identidad y separación de repositorios:** elegir un nombre
      público original y confirmar que el flagship vivirá en su propio repositorio,
      mientras este repositorio solo lo presenta. _Aprueba: `Keelwatch` en
      [`IDENTITY_AND_REPOSITORY.md`](./flagship/IDENTITY_AND_REPOSITORY.md). Reutiliza: estrategia del portfolio._
- [x] **Registrar la arquitectura inicial:** justificar monolito modular,
      React/TypeScript, NestJS, PostgreSQL/Prisma, autenticación basada en estándares
      y despliegue simple; incluir alternativas que todavía no necesitamos. _Crea:
      [`ARCHITECTURE.md`](./flagship/ARCHITECTURE.md) y ADRs iniciales. Depende de: modelo conceptual._

### Salida de la fase

- El producto tiene nombre, audiencia, vocabulario y primera entrega definidos.
- Un reviewer puede distinguir el proyecto personal de cualquier trabajo
  profesional previo.
- No existe una decisión técnica sin problema asociado.
- Los escenarios de aceptación son suficientes para iniciar un walking skeleton.

## Fase 1 — Walking skeleton desplegado

Objetivo: obtener temprano una línea completa, pequeña y pública, en vez de
construir frontend y backend por separado durante semanas.

- [x] **Acceder a una aplicación protegida:** un usuario demo puede autenticarse,
      ver su identidad y cerrar sesión; usuarios no autenticados o inactivos reciben
      una respuesta coherente. _Crea: shell web, integración de identidad y módulo
      Access. Depende de: arquitectura inicial. Evidencia local verificada el
      2026-09-30 en [`progress.md`](./progress.md); Auth0 hospedado permanece
      deliberadamente sin aprovisionar._
- [x] **Registrar y listar una embarcación:** un Operations Manager puede crearla
      con datos válidos y verla en una lista; duplicados, datos inválidos y roles sin
      permiso tienen resultados explícitos. _Crea: primer slice React → API →
      PostgreSQL. Reutiliza: shell y contrato de errores. Evidencia local, pruebas
      PostgreSQL y revisión renderizada registradas el 2026-10-02 en
      [`progress.md`](./progress.md)._
- [x] **Consultar y editar el detalle:** la vista de embarcación expone sus datos,
      historial básico y edición permitida; estados loading, vacío, not-found,
      conflicto y acceso denegado son verificables. _Modifica: slice Fleet. Depende
      de: registro de embarcación. Verificado localmente con ambos roles, actividad
      sanitizada y recuperación de fallos el 2026-10-02._
- [ ] **Desplegar el walking skeleton:** publicar web, API y base de datos con
      datos demo sintéticos, HTTPS, secretos fuera del repositorio y migraciones
      reproducibles. _Modifica: aplicación completa. Crea: primer entorno público.
      Blueprint y runbook preparados; no existen recursos públicos._
- [ ] **Cerrar el quality gate inicial:** CI ejecuta lint, typecheck, pruebas del
      slice, validación de migraciones y build; el README permite levantar el sistema
      desde cero. _Modifica: pipeline y documentación. Reutiliza: flujo desplegado.
      Workflow y README preparados; falta la primera ejecución hospedada desde un
      checkout limpio._

### Salida de la fase

- Existe una URL pública y un camino local reproducible.
- La autorización negativa se prueba, no se supone.
- La primera funcionalidad atraviesa interfaz, API y base de datos.
- Un fallo produce un mensaje útil y un log correlacionable.

## Fase 2 — Cumplimiento documental

Objetivo: convertir el registro de embarcaciones en un sistema con reglas,
estados derivados y trabajo asíncrono justificable.

- [x] **Gestionar certificados:** crear, consultar, editar y archivar registros
      con tipo, emisor, vigencia y restricciones; fechas imposibles y duplicados
      relevantes quedan protegidos. _Crea: módulo Compliance. Reutiliza: Fleet,
      autorización y formularios base. Alta, consulta, edición, archivado lógico,
      validación, autorización y auditoría atómica verificadas localmente el
      2026-10-04._
- [x] **Mostrar estado de cumplimiento:** derivar vigente, próximo a vencer,
      vencido o incompleto desde reglas documentadas; permitir filtros y explicar
      estados vacíos. _Modifica: Fleet y Compliance. Depende de: certificados. El
      estado por embarcación, razón, fecha UTC, historial, cola transversal,
      conteos, búsqueda, filtros enlazables y estados vacíos fueron verificados
      localmente con ambos roles el 2026-10-04._
- **Fuera del alcance aprobado — adjuntos:** cargas, descargas, storage, scanner
  y limpieza retirados por [ADR-0007](./flagship/architecture/decisions/0007-disable-file-attachments-in-portfolio-demo.md).
  Se conservan datos históricos sin servirlos ni eliminarlos. No se sustituyen
  por un uploader de archivos predeterminados ni se aprovisionan servicios.
- [x] **Notificar expiraciones de forma idempotente:** un job reintentable genera
      notificaciones demo sin duplicarlas y expone fallos observables. _Crea:
      procesamiento asíncrono acotado. Depende de: estados de cumplimiento. El
      runner en proceso conserva ejecuciones y resultados en PostgreSQL, reutiliza
      un run activo, reconcilia condiciones sin duplicados y expone éxito/fallo
      sanitizado; Manager ejecuta y Auditor consulta en modo read-only. Verificado
      localmente el 2026-10-04._
- [x] **Resumir riesgos operativos:** el dashboard muestra conteos y próximas
      acciones calculados desde datos reales y enlaza cada cifra a su lista filtrada.
      _Modifica: experiencia web. Reutiliza: consultas de Compliance. Conteos
      enlazados, tres próximas acciones, carga, fallo/reintento, estado claro y
      ambos roles verificados localmente el 2026-10-04._

### Salida de la fase

- El sistema demuestra más que CRUD: reglas temporales, filtros,
  permisos y reintentos.
- Los estados del dashboard se pueden rastrear hasta datos concretos.
- El trabajo asíncrono tiene una razón, política de retry e idempotencia.

## Fase 3 — Tripulación y asignaciones

Objetivo: añadir relaciones y restricciones que permitan discutir consistencia y
decisiones de modelado.

- [x] **Gestionar perfiles y cualificaciones:** crear tripulantes y registrar
      cualificaciones con vigencia, validación y permisos específicos. _Crea: módulo
      Crew. Reutiliza: patrones de Compliance y auditoría. Alta y consulta paginada
      de perfiles, permisos Crew y auditoría atómica verificadas localmente el
      2026-10-06. Cualificaciones demo con vigencia UTC, referencias únicas por
      perfil y auditoría atómica verificadas localmente; sin adjuntos ni aptitud real._
- [x] **Asignar tripulación a una embarcación:** definir periodos y rol a bordo,
      evitando solapamientos o asignaciones incompatibles mediante invariantes
      explícitas. _Modifica: Crew y Fleet. Depende de: perfiles. Alta, historial,
      solapamientos globales y cancelación irreversible auditada verificados localmente
      el 2026-10-08, incluyendo carreras y rollback. No declara embarque ni aptitud._
- [ ] **Evaluar aptitud para asignación:** explicar qué requisito falta o está por
      vencer antes de confirmar una asignación; un override, si existe, requiere rol
      y motivo auditado. _Modifica: flujo de asignación. Reutiliza: cualificaciones y
      RBAC._
- [ ] **Exponer una vista operacional:** mostrar composición actual y riesgos de
      la tripulación por embarcación con filtros accesibles y estados completos.
      _Modifica: interfaz Crew/Fleet. Depende de: asignaciones._

### Salida de la fase

- Las relaciones many-to-many y temporales están justificadas.
- Las reglas críticas tienen pruebas unitarias, integración y casos negativos.
- El sistema puede explicar por qué una operación fue rechazada.

## Fase 4 — Mantenimiento y concurrencia

Objetivo: demostrar un workflow con transiciones, ownership, conflictos y
auditoría útiles para conversaciones de System Design.

- [ ] **Crear y priorizar órdenes de mantenimiento:** registrar una orden con
      embarcación, categoría, prioridad, responsable y fecha objetivo; validar datos
      y permisos. _Crea: módulo Maintenance. Reutiliza: Fleet y Access._
- [ ] **Controlar el ciclo de vida:** implementar transiciones válidas entre
      abierta, planificada, en progreso, bloqueada y cerrada, con motivos cuando una
      transición lo requiera. _Modifica: Maintenance. Depende de: creación de
      órdenes._
- [ ] **Resolver actualizaciones concurrentes:** impedir que dos ediciones
      silenciosamente se sobrescriban y presentar una recuperación comprensible al
      usuario. _Modifica: contrato API y formulario. Depende de: ciclo de vida._
- [ ] **Auditar acciones críticas:** consultar quién cambió qué, cuándo y por qué
      sin almacenar secretos ni información innecesaria. _Modifica: Audit y
      Maintenance. Reutiliza: identidad y trazabilidad._
- [ ] **Recordar trabajo próximo o vencido:** ejecutar un proceso reintentable e
      idempotente y documentar qué ocurre si el worker o proveedor falla. _Modifica:
      infraestructura asíncrona. Reutiliza: patrón de expiraciones._

### Salida de la fase

- El workflow tiene una máquina de estados defendible.
- Existe una demostración reproducible de conflicto concurrente y recuperación.
- El audit trail aporta trazabilidad sin convertirse en un event store
  accidental.

## Fase 5 — Comportamiento de producción

Objetivo: demostrar que el software se puede operar, observar, proteger y
recuperar, no solo ejecutar en una laptop.

- [ ] **Completar la estrategia de pruebas:** cubrir dominio con unit tests,
      módulos y persistencia con integration tests, contratos críticos y recorridos
      principales con E2E; justificar qué no se prueba. _Modifica: todos los módulos.
      Reutiliza: escenarios de aceptación._
- [ ] **Ejecutar el threat model:** revisar identidad, RBAC, archivos, validación,
      rate limits, secretos, logs y dependencias; corregir riesgos priorizados y
      conservar riesgos aceptados. _Modifica: límites de seguridad. Reutiliza:
      arquitectura desplegada._
- [ ] **Instrumentar el sistema:** añadir IDs de correlación, logs estructurados,
      métricas RED y trazas en flujos seleccionados; crear alertas que conduzcan a
      una acción. _Modifica: web/API/jobs. Crea: panel operativo mínimo._
- [ ] **Medir consultas y API:** definir dataset, escenario y entorno; capturar
      p50/p95/p99, throughput, errores y planes de consultas críticas antes de
      optimizar. _Modifica: harness de performance. Reutiliza: flujos reales._
- [ ] **Optimizar un cuello de botella probado:** aplicar índice, consulta,
      paginación o caché solo después de la medición y publicar comparación
      reproducible. _Modifica: punto medido. Depende de: baseline de rendimiento._
- [ ] **Probar recuperación:** documentar y ejecutar restauración de backup,
      rollback/roll-forward de migración y respuesta a un job fallido. _Crea:
      runbooks y evidencia. Reutiliza: entorno desplegado._
- [ ] **Cerrar accesibilidad y responsive:** verificar teclado, focus, formularios,
      tablas, mensajes, contraste y reorganización móvil en los workflows
      principales. _Modifica: frontend existente. Reutiliza: sistema de UI._

### Salida de la fase

- Las métricas son reproducibles y están acompañadas por contexto.
- Al menos un fallo se detecta, diagnostica y recupera siguiendo un runbook.
- Seguridad y autorización tienen casos negativos automatizados.
- Las optimizaciones responden a evidencia, no a una lista de tecnologías.

## Fase 6 — Evidencia de arquitectura y System Design

Objetivo: hacer inspeccionable el razonamiento sin obligar al reviewer a inferir
todo desde el código.

- [ ] **Publicar el mapa del sistema:** diagramar contexto, contenedores, módulos,
      dependencias y límites de confianza, manteniendo los diagramas junto al código.
      _Crea: documentación de arquitectura. Reutiliza: implementación final._
- [ ] **Explicar datos e invariantes:** documentar relaciones, índices, ownership
      de escritura, transacciones y decisiones temporales con ejemplos de consultas.
      _Crea: guía de datos. Reutiliza: esquema y mediciones._
- [ ] **Consolidar ADRs reales:** registrar contexto, alternativas, decisión y
      consecuencias de autenticación, modularidad, archivos, jobs, concurrencia y
      observabilidad. _Modifica: decision log. Reutiliza: decisiones implementadas._
- [ ] **Diseñar la evolución 10×/100×:** explicar qué mediríamos y en qué orden
      cambiarían base de datos, caché, jobs, archivos y límites de servicio; separar
      hipótesis de cambios necesarios hoy. _Crea: escenario de evolución. Reutiliza:
      benchmarks y arquitectura._
- [ ] **Preparar escenarios de entrevista:** practicar consistencia, duplicados,
      expiraciones, permisos, pérdida de proveedor, partición de datos y degradación
      usando ejemplos del sistema. _Crea: guía de conversación. Reutiliza: ADRs y
      runbooks._

### Salida de la fase

- Cada diagrama coincide con el sistema ejecutable.
- Los ADRs explican consecuencias, no repiten documentación de frameworks.
- La evolución de escala es incremental y basada en cuellos de botella.
- El proyecto sirve como material concreto para una entrevista de System Design.

## Fase 7 — Presentación y preparación laboral

Objetivo: convertir el trabajo técnico terminado en evidencia fácil de evaluar.

- [ ] **Cerrar el README público:** presentar problema, alcance, demo, credenciales
      demo seguras, arquitectura, inicio local, pruebas, seguridad, métricas,
      limitaciones y roadmap. _Modifica: README del flagship. Reutiliza: toda la
      evidencia._
- [ ] **Grabar el recorrido principal:** producir una demo breve sin datos reales
      que muestre permisos, workflow, fallo y recuperación; añadir capturas con texto
      alternativo. _Crea: material visual. Reutiliza: entorno demo._
- [ ] **Escribir el caso de estudio:** explicar problema, rol, decisiones,
      trade-offs y resultados técnicos verificables en formato breve y profundo.
      _Crea: contenido del portfolio. Reutiliza: README, ADRs y métricas._
- [ ] **Integrar el flagship en el sitio del portfolio:** rediseñar únicamente
      las superficies necesarias para que el proyecto sea la evidencia principal,
      conservando accesibilidad, rendimiento y fallbacks. _Modifica el repositorio
      independiente del portfolio solo durante Fase 7 y con autorización explícita.
      Depende de: caso de estudio aprobado._
- [ ] **Preparar tres narrativas de entrevista:** versión de 60 segundos, recorrido
      de 5 minutos y discusión técnica de 30 minutos, todas sin exagerar ownership o
      impacto. _Crea: interview pack. Reutiliza: evidencia pública._
- [ ] **Realizar revisión externa:** pedir a un recruiter y a un engineer que
      encuentren la tesis, ejecuten el demo y formulen preguntas; convertir hallazgos
      repetidos en cambios concretos. _Modifica: presentación o documentación según
      evidencia. Reutiliza: experiencia completa._

### Salida de la fase

- Un reviewer entiende la propuesta en menos de diez minutos.
- Todos los enlaces, demos y pasos de ejecución funcionan desde un entorno limpio.
- La página resume evidencia y conduce al repositorio, no duplica toda su
  documentación.
- La narrativa pública diferencia experiencia profesional y proyecto personal.

## Fase 8 — Puerta para proyectos secundarios

Objetivo: decidir con evidencia si otro proyecto mejora la candidatura.

- [ ] **Auditar brechas del portfolio:** comparar roles objetivo y feedback real
      contra las señales ya demostradas; no aprobar un secundario por preferencia
      tecnológica. _Crea: análisis de brechas. Reutiliza: feedback y estrategia._
- [ ] **Decidir sobre telemetría en .NET:** construir el servicio solo si falta
      evidencia de C#, concurrencia, ingesta o performance; definir antes su métrica
      y alcance máximo. _Crea o descarta: secundario backend. Depende de: auditoría._
- [ ] **Decidir sobre móvil offline:** construirlo solo si React Native y
      sincronización aportan valor a los roles objetivo; evitar convertirlo en otro
      frontend del mismo CRUD. _Crea o descarta: secundario móvil. Depende de:
      auditoría._

### Salida de la fase

- Cada secundario aprobado cubre una brecha nombrada y medible.
- Si no existe una brecha importante, el portfolio se declara completo sin
  añadir otro proyecto.

## Preparación paralela

Estas líneas no bloquean la construcción, pero deben avanzar durante el mismo
periodo:

- **DSA:** práctica constante por patrones, registro de errores y simulaciones
  con tiempo. No insertar ejercicios artificiales en el flagship.
- **System Design:** una sesión periódica usando un problema real del proyecto y
  otra usando un sistema externo para evitar dependencia de un solo dominio.
- **Comunicación:** explicar una decisión semanalmente en inglés, primero en
  formato escrito y después verbal.
- **Mercado:** revisar descripciones reales de puestos para validar qué señales
  faltan antes de aprobar proyectos secundarios.

## Riesgos que controlaremos

| Riesgo                              | Control                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Scope creep                         | Primera entrega contractual, fases con salida y puerta explícita para nuevas funciones. |
| Filtración de propiedad intelectual | `CLEAN_ROOM.md`, datos sintéticos y revisión previa a publicación.                      |
| Sobreingeniería                     | Cada tecnología requiere problema, métrica o escenario de fallo.                        |
| Diseño visual antes de evidencia    | El sitio se integra en Fase 7, después del caso de estudio.                             |
| Métricas engañosas                  | Método, dataset, entorno y limitaciones junto a cada cifra.                             |
| Proyecto eternamente incompleto     | Entregas verticales desplegables y demo funcional desde Fase 1.                         |
| Documentación divergente            | Estrategia estable, roadmap operativo y ADRs junto al código.                           |

## Cierre del programa

El portfolio estará listo para evaluación cuando las salidas de las fases 0–7
estén cumplidas, la revisión externa no encuentre bloqueos repetidos y cualquier
proyecto secundario haya sido aprobado o descartado explícitamente. Terminar no
depende de usar todas las tecnologías consideradas; depende de que la evidencia
sea coherente, verificable y fácil de inspeccionar.
