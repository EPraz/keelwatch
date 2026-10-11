# Registro durable de progreso — Keelwatch

Última verificación: 2026-10-10

## Activación de CI y verificación pública por roles (2026-10-10)

- El propietario autoriza corregir CI y verificar el despliegue antes de definir
  el alcance de Fase 5. GitHub confirma `master` como rama por defecto; el workflow
  escuchaba pushes a `main` y no tenía ejecuciones registradas. Además, `.github/`
  estaba excluido por `.gitignore`: el workflow solo existía localmente y GitHub
  confirma cero workflows. Se permite versionar únicamente `quality.yml` y se
  cambia el filtro a `master`, conservando los checks y PostgreSQL efímero.
- La verificación del arreglo exige una ejecución real del quality gate en el
  commit publicado. Su resultado se registrará tras completarse.
- CUA devuelve inventario vacío y el navegador integrado no está disponible.
  Se solicita al propietario comprobar login/logout, lectura y recarga con ambos
  roles, edición Manager y ausencia de edición Auditor en el dominio público.
  Esta aceptación sigue pendiente; las respuestas HTTP 200 de la SPA no la
  sustituyen. El cierre de Fase 5 todavía no se declara.

## Rutas directas de la SPA en Vercel (2026-10-10)

- El propietario reporta que la portada desplegada abre, pero recargar una ruta
  interna o regresar del login produce el 404 del proveedor. React usa
  BrowserRouter y la configuración original solo incluía el fallback de Render.
- Se añade apps/web/vercel.json, para un proyecto con Root Directory apps/web, con
  el rewrite oficial de Vercel para servir index.html en rutas de la SPA. Esto
  permite que React resuelva /app, /sign-in y /auth/callback también en navegación
  directa. La API conserva su URL absoluta de Render en VITE_API_URL.
- La entrega pública de rutas internas queda verificada tras el despliegue de
  `45eb167`. Referencia: https://vercel.com/docs/frameworks/frontend/vite.
- Investigación HTTP del dominio aportado por el propietario, repetible con
  `curl.exe -i https://keelwatch-chi.vercel.app/sign-in`: `/` e `/index.html`
  responden 200 con el contenedor de React; `/sign-in`, `/app` y `/auth/callback`
  responden 404, `Content-Type: text/plain` y `x-vercel-error: NOT_FOUND`.
  Los assets JS y CSS referenciados por la portada responden 200 con sus tipos
  correctos. El fallo observado ocurre en el routing del host, antes de React.
- GitHub registra un despliegue Production exitoso del commit `f98f3fe` el
  2026-10-10 a las 16:19:44 UTC. Ese commit no contiene `vercel.json` en la raíz
  ni en `apps/web`; antes de publicar, la configuración estaba sin versionar.
  Prettier aprueba `apps/web/vercel.json`, cuyo rewrite coincide con la guía
  oficial para Vite SPA. El commit nuevo incluye el archivo; redesplegar el
  commit anterior no incorporaba cambios locales.
- No se inspeccionó el dashboard de Vercel. El resultado del despliegue demuestra
  que el proyecto consumió el fallback de `apps/web/vercel.json`. La comprobación
  del callback solo prueba entrega del HTML; no verifica una sesión OIDC completa.
- El propietario autoriza publicar la corrección y verificar el despliegue.
  Antes de publicar, el build de producción web, Prettier de ambos archivos y
  `git diff --check` pasan. Permanece el aviso conocido de tamaño del bundle;
  este cambio solo añade configuración de routing del host y evidencia.
- Publicación autorizada en `origin/master`: `45eb167`, con despliegue Production
  exitoso confirmado por GitHub/Vercel el 2026-10-11 a las 04:46:54 UTC
  (2026-10-10 en America/Bogota). En `https://keelwatch-chi.vercel.app`, `/`,
  `/sign-in`, `/app`, `/auth/callback` y `/app/vessels` responden 200,
  `Content-Type: text/html`, sin `x-vercel-error`, y entregan exactamente el mismo
  HTML de la SPA. JS y CSS siguen respondiendo 200 con sus tipos correctos.
  El repro inicial pasa tras el despliegue; queda resuelto el 404 del host.

## Preparación del commit de cierre y despliegue (2026-10-10)

- El propietario solicita consolidar los cambios pendientes de Fase 4 para
  publicar la versión actual: feedback compartido, filtros, paginación de cinco
  registros, actividad de mantenimiento autorizada y ajustes responsive.
- Verificación repetida: formato, lint, typecheck, 87 pruebas API, 125 React,
  57 integración, convenciones, Prisma validate, comparación de esquema de
  migraciones, check:env y builds API/web aprobados. npm audit informa cero
  vulnerabilidades con el lockfile actual. Se conserva el aviso de bundle web
  de 762.42 kB minificado / 203.93 kB gzip.
- El propietario cambia la conexión a PostgreSQL local antes de la suite:
  test:postgres repite los 192 casos HTTP/PostgreSQL correctamente. Los conteos
  y fingerprints SHA-256 de las 14 tablas coinciden antes y después; se conservan
  los registros existentes. No se ejecutan migraciones ni seeds contra la base
  remota durante este cierre.
- Se revisan las capturas sintéticas existentes y se incluye el informe de
  Maintenance antes excluido por design_review*. La aceptación funcional y el
  QA responsive conservan su atribución y fecha anteriores; no se declara una
  nueva ejecución manual ni conformidad WCAG completa.
- El primer build de Render falló en b8e30d3 porque ese commit referencia
  apps/api/scripts/prisma-cli.mjs sin incluirlo. El archivo está versionado desde
  27b2091 y su sintaxis es válida; GitHub master todavía apuntaba a b8e30d3 al
  diagnosticar el fallo. Publicar el historial local y este cierre es el siguiente
  paso para volver a construir. La verificación del despliegue público sigue
  pendiente y no forma parte de la aceptación local de Fase 4.

## Cierre local de Fase 4 confirmado (2026-10-09)

- El propietario confirmó el cierre tras aceptar el QA funcional y resolver las
  observaciones de diseño, feedback y espaciado responsive. Las menciones anteriores
  de QA pendiente son registros históricos, reemplazados por esta aceptación.
- Los tres incrementos #8, #9 y #10 cubren órdenes, edición concurrente, ciclo de
  vida e historial completo. Se actualiza el roadmap con sus cuatro resultados
  completados. GitHub confirma #8, #9 y #10 como CLOSED/completed; la especificación
  #7 conserva su estado abierto y recibe un comentario con la evidencia de cierre
  y la decisión de paginación. No se modifican issues de fases anteriores.
- Evidencia consolidada: 87 pruebas API, 125 React, 57 integración y 192
  HTTP/PostgreSQL; formato, lint, typecheck, convenciones, Prisma validate y
  migration check, builds API/web aprobados en las verificaciones registradas.
  Sin cambios posteriores de API/esquema; el último ajuste CSS pasa formato y build.
- Revisión visual final: 48 vistas en dos temas y seis anchos
  (320/375/768/1024/1280/1440 px), sin overflow ni errores de ejecución.
  Se comprueba padding base, navegación con Enter, foco y movimiento reducido.
  El ciclo manual autenticado se atribuye al propietario, no al harness sintético.
- Se conservan los límites conocidos de contraste de botones naranjas y el aviso
  de bundle web >500 kB. No se acredita WCAG completo ni despliegue público.
  El cierre no modifica el estado de fases anteriores ni inicia Fase 5.

## Espaciado responsive de Maintenance (2026-10-09)

- Se comparó Crew composition y Assignment plans con Maintenance: Crew usa el
  padding base de `.vessel-activity`; Maintenance lo reducía a 16 px hasta 768 px.
  La diferencia de ancho interior era real, además del efecto visual del borde.
- Se elimina la excepción exterior de Maintenance e historial. Ambas secciones
  usan el clamp compartido (24 px en móvil pequeño), conservando padding compacto
  solo en formularios anidados. Se mantienen los bordes existentes de Crew.
- La revisión a 768 px detectó nombres fragmentados en la tabla de cinco columnas;
  Maintenance usa las tarjetas existentes hasta 1024 px para mantener legibilidad.
- [Revisión y capturas](../.design/maintenance/DESIGN_REVIEW.md) documentan la
  referencia visual, comprobación responsive y límites. Cambio únicamente CSS:
  formato y builds pasan; las pruebas funcionales previas permanecen aplicables.

## Feedback compartido y aceptación del propietario (2026-10-09)

- El propietario confirmó que todos los puntos restantes del procedimiento de
  Maintenance funcionan, incluidos ciclo, cancelación, Auditor y navegación.
  Esta evidencia manual se atribuye al propietario y reemplaza la brecha funcional
  de aceptación anotada en los intentos iniciales del agente.
- Sus tres observaciones nuevas se implementan: Toast/ToastProvider compartidos
  para éxitos y fallos en Access, Fleet, Compliance, Crew y Maintenance; contraste
  del texto inicial resuelto con tokens del tema; Reset en Maintenance al seleccionar
  filtros distintos de All, incluso antes de aplicar. Reset conserva parámetros de
  otras secciones y vuelve a la primera página. Refresh permanece con All.
- Los toasts se apilan arriba a la derecha fuera del flujo de la página, conservan
  acciones de recuperación, referencias seguras y validación junto a los campos.
  Éxitos duran 8 segundos y pausan con hover/foco; errores requieren cierre manual.
  No se enfoca automáticamente una confirmación. Timers se limpian al desmontar;
  nuevas revisiones de Maintenance y guardados de Crew renuevan la confirmación.
- Gates finales: 125 pruebas React aprobadas; formato, lint sin warnings, typecheck,
  convenciones y builds API/web aprobados. Texto introductorio, nota clean-room y
  toasts sin avisos de contraste en las vistas verificadas. Sigue el límite heredado
  de contraste de botones naranjas y el aviso de bundle >500 kB (762.42 kB).
- Pruebas React cubren portal, apilado, cierre, reintento, temporización, pausa,
  limpieza de timers, Reset/URL y fallo de inicio de sesión con acción recuperable.
  Capturas de componentes reales con lecturas sintéticas: 40 vistas de listado,
  detalle, inicio y feedback, en ambos temas y 320/375/768/1024/1440 px; sin overflow
  ni errores de ejecución, navegación de páginas con Enter y foco en encabezados.
- Estos ajustes no cambian API, esquema, migraciones ni permisos. Siguen vigentes
  los 192 HTTP/PostgreSQL y los fingerprints verificados en la sección anterior.
  La aceptación funcional local está confirmada; los nuevos ajustes de feedback
  pueden revisarse en la aplicación recargada. No se publica ni despliega.

## Correcciones de QA de Maintenance (2026-10-09)

- Reportes del propietario: separación visual respecto a la base existente,
  filtros dispersos, filas demasiado altas, paginación extensa, cursor de espera
  en botones deshabilitados y ausencia de Maintenance en Vessel Activity.
  El propietario confirmó que el escenario de conflicto en dos pestañas funciona.
- Se reutilizan el panel de filtros de Compliance, tabla/tarjetas de Fleet,
  formularios y paginación existentes, tipografías y tokens compartidos. Se ajustan
  detalle, contraste de tarjetas móviles, responsables con nombres repetidos y
  distribución responsive. AGENTS.md exige consultar los patrones implementados
  antes de nuevas UI y compararlos en escritorio y móvil.
- Listado e historial ahora muestran **5 registros por página**, cambio solicitado
  durante QA que reemplaza el tamaño anterior de 20. La fecha sigue siendo opcional
  en Open y obligatoria para Plan, junto con responsable elegible. Títulos iguales
  siguen permitidos: el identificador de orden distingue los registros.
- Vessel Activity incluye creación, edición y transición de Maintenance de esa
  embarcación únicamente con permisos maintenance:read y activity:read comprobados
  en servidor. El historial completo sigue en el detalle de cada orden.
- Verificación: 192 HTTP/PostgreSQL, 87 pruebas API, 122 React y 57 integración;
  typecheck, formato del código modificado, convenciones, Prisma validate y
  migration check, builds API/web. Las 14 tablas conservan sus fingerprints
  tras la suite PostgreSQL; no se borraron registros del propietario.
- Capturas de componentes reales con datos sintéticos y lecturas simuladas en
  Chrome aislado: oscuro/claro, 320/375/768/1024/1440 px, sin overflow ni errores
  de ejecución. Enter pagina listado/historial y enfoca sus encabezados; movimiento
  reducido emulado. Lint excluye artefactos temporales .scratch, incluido el perfil
  Chrome aislado, y conserva la comprobación de todo el código del producto.
  Este harness no utiliza la sesión Auth0 ni acredita el ciclo manual
  completo en la aplicación. Permanece el aviso conocido de bundle >500 kB.
  Axe detecta contraste insuficiente heredado de la base en botones naranjas y
  algunos textos secundarios del tema claro; esta revisión no acredita WCAG completo.
- Fase 4 sigue abierta hasta registrar QA manual de ciclo completo, cancelación
  y lectura Auditor. La guía de aceptación requiere ahora solo 5 ediciones para
  probar la paginación del historial.

## Tercer incremento de Fase 4 — ticket #10 (2026-10-09)

- Implementación local de [#10](https://github.com/EPraz/keelwatch/issues/10),
  historial completo desde el detalle de MaintenanceOrder para Manager y Auditor.
  Endpoint propio requiere `maintenance:read`, `fleet:read` y `activity:read`;
  comprobación de orden/embarcación antes de consultar Audit.
- Se reutilizan eventos persistidos de creación, edición y transición, con actor,
  fecha, valores old/new allowlisted y motivos conocidos. Decoder acotado valida
  enums, fechas y IDs, descarta metadata desconocido/malformado y nunca devuelve
  payloads, email o externalSubject. Responsables históricos se resuelven por
  display name aunque después estén inactivos; no se reconstruye estado por eventos.
- Cursor por ID de evento scoped a la orden; fecha/ID descendentes y 20 eventos
  por página. Prueba con 23 eventos de timestamp idéntico alcanza páginas 20/3
  sin duplicados; una escritura entre páginas no desplaza los eventos antiguos.
  Cursor ajeno/inexistente/malformado rechazado. Órdenes finales y vessels
  archivados conservan historial. Lecturas no escriben ni auditan.
- UI presenta creación, cambios de campos, estados y motivo en el ledger existente,
  con Older/Newer history, loading/vacío/pending/403/404/401/503 y retry de lectura.
  Paginación mueve foco al encabezado. Cambio de orden reinicia la página; requests
  abortados y guards ignoran respuestas tardías de otras órdenes/páginas.
- Una escritura confirmada actualiza el historial desde la página más reciente.
  Si la lectura falla, la confirmación y los borradores permanecen visibles;
  Retry history read no reenvía la mutación. CSS reutiliza tokens existentes y
  permite envolver controles y contenido largo en viewports pequeños.
- Gates automáticos: formato, lint sin warnings, typecheck, convenciones, entorno,
  Prisma validate/migration check y builds API/web. 87 pruebas API, 122 React,
  57 integración y 191 HTTP/PostgreSQL. Casos de historial: 13 HTTP/PostgreSQL
  y 8 React, más recuperación integrada en detalle. Contrato generado OpenAPI.
  Axe sin violaciones estructurales en historial vacío/con eventos; contraste
  excluido en JSDOM. Persiste aviso del bundle web mayor de 500 kB (757.59 kB).
- Sin nueva migración: 12 migraciones aplicadas, ninguna pendiente. Fingerprints
  de las 14 tablas previas sin cambios; fixtures eliminan solo datos propios.
- Revisión Standards/Spec contra base aprobada `10509ff` y commit `74a8092`:
  Standards sin hallazgos materiales ni smells relevantes; Spec sin defectos de
  implementación ni scope creep. Permanece una brecha conocida de aceptación
  manual, detallada a continuación.
- **Aceptación manual pendiente:** CUA volvió a devolver browsers/apps vacíos.
  Computer Use detectó una ventana Chrome de Keelwatch, pero caducó la primera
  aprobación de lectura. En el único reintento detuvo el acceso al no poder
  determinar la URL actual con suficiente confianza para aplicar su política.
  No se realizaron acciones de interfaz.
  Tras recibir la URL local, se pudo leer la sesión Manager y navegar a Fleet;
  carga seguida de token inválido/expirado, repetido con Try again. API health
  live `ok`, sin escrituras. Se pidió renovar la sesión manualmente porque
  Computer Use prohíbe automatizar autenticación; QA Maintenance sigue pendiente.
  [Guía reproducible](./maintenance-acceptance.md) separa pruebas ejecutadas de
  demo manual pendiente: lifecycle/cancelación como Auditor, conflicto en dos
  pestañas y más de una página, 320/375/768/1024/1440 px, teclado/foco, consola
  y movimiento reducido. La automatización no sustituye esa evidencia renderizada.
- #8/#9/#10 permanecen abiertos; no se publica ni se afirma readiness de despliegue.
  Los tres incrementos de código de Fase 4 están implementados localmente, pero
  la fase continúa abierta hasta completar el QA manual y registrar sus resultados.

## Segundo incremento de Fase 4 — ticket #9 (2026-10-09)

- Implementación local de [#9](https://github.com/EPraz/keelwatch/issues/9):
  acciones explícitas Plan, Start, Block, Resume, Close y Cancel desde el detalle.
  Grafo exacto impuesto en servidor; Closed/Cancelled son finales. Cancelación
  desde cualquier estado no final, con motivos fijos distintos de bloqueo.
- Plan requiere fecha objetivo y responsable elegible; Plan/Start/Resume revisan
  elegibilidad actual. Close/Cancel conservan responsables que después pierden
  elegibilidad. Las órdenes existentes siguen gestionables en vessels archivados.
- Transiciones comparten revisión y bloqueo de fila con edición. Carreras entre
  edición/transición y transición/transición tienen un ganador; el perdedor recibe
  `MAINTENANCE_STALE_WRITE`. Cambio de estado, motivo, revisión y auditoría con
  old/new state, acción y correlation ID se confirman en una sola transacción.
  Fallos forzados de auditoría revierten estado/revisión.
- Migración aditiva `20261009010000_maintenance_lifecycle_reason`: motivo actual
  nullable y constraint de compatibilidad con Blocked/Cancelled. 12 migraciones
  locales aplicadas, sin reset/truncate/reseed. Huellas y conteos de las 14 tablas
  previas permanecen iguales. Prisma regenerado y API local health live `ok`.
- UI conserva acción/motivo durante conflictos repetidos, muestra cambios de
  estado y campos, exige revisión y envío explícitos, y retira acciones invalidadas.
  Resultado incierto exige consultar el estado antes de otro intento; la recuperación
  solo reintenta lecturas. Éxito confirmado permanece visible si falla el refresh.
- Ambos formularios permanecen montados durante refresh/fallo de lectura: editar
  campos no borra la intención de transición, y una transición no borra el borrador
  de campos. Mientras se recarga o tras un estado final quedan bloqueados; un
  borrador final permanece visible sin controles para guardarlo. Una nueva revisión
  recibida por refresh exige revisión explícita antes de actuar sobre ella.
- Gates automáticos: formato, lint sin warnings, typecheck, auditoría de convenciones,
  ejemplos de entorno, Prisma validate/migration check y builds API/web. API unitarias
  87, React 113, integración 57, HTTP/PostgreSQL 178; 31 casos específicos del ciclo
  de vida y 47 del registro/edición. Contratos de respuesta y transición generados
  desde OpenAPI. Axe sin violaciones estructurales en validación del formulario.
  Persiste el aviso del bundle web mayor de 500 kB.
- Revisión Standards/Spec contra la base aprobada `4154a85`: corregidos pérdida
  de drafts/intención entre formularios y acciones mostradas contra una revisión
  antigua. Revisión de correcciones sin nuevos defectos materiales.
- **Aceptación visual pendiente:** CUA devuelve inventario de browsers/apps vacío.
  Falta demo responsive/teclado de crear, planificar, iniciar, bloquear, reanudar,
  cerrar y cancelar otra orden, además de conflictos en dos pestañas, consola,
  foco y movimiento reducido en 320–375/768/1024/1440 px.
- #8 sigue abierto por su QA; #9 está implementado localmente pero no cerrado.
  Fase 4 permanece abierta. Siguiente incremento:
  [#10](https://github.com/EPraz/keelwatch/issues/10), historial completo paginado.

## Primer incremento de Fase 4 — ticket #8 (2026-10-09)

- Implementación local de [#8](https://github.com/EPraz/keelwatch/issues/8),
  bajo la especificación [#7](https://github.com/EPraz/keelwatch/issues/7).
  Crear órdenes Open, listar y filtrar por estado/prioridad con páginas de 20,
  inspeccionar detalle con identidad de embarcación y editar cinco campos.
- Manager escribe y Auditor consulta mediante permisos Maintenance/Fleet
  impuestos por el servidor. El selector paginado solo expone ID y nombre de
  usuarios activos elegibles; revisa elegibilidad al asignar y conserva responsables
  posteriormente inelegibles al editar otros campos.
- Revisión esperada, bloqueo de fila y auditoría atómica: una edición concurrente
  gana y otra devuelve `MAINTENANCE_STALE_WRITE`; no-ops no incrementan ni auditan,
  pero las revisiones obsoletas siguen rechazadas. Un fallo de auditoría revierte
  la escritura. La creación bloquea la embarcación y comprueba su estado activo
  dentro de la transacción, incluyendo un archivado concurrente.
- React conserva el borrador, muestra cambios y permite elegir valores antes de
  guardar explícitamente; recupera conflictos repetidos y nunca reintenta writes
  automáticamente. Un resultado de creación incierto exige consultar órdenes
  existentes antes de habilitar otro intento; una lectura fallida bloquea ese paso.
  Requests obsoletos se abortan y respuestas tardías se ignoran, también al cambiar
  la sesión. El éxito confirmado se conserva si falla una lectura posterior.
- Migración aditiva `20261009000000_maintenance_orders` aplicada localmente:
  11 migraciones y ninguna pendiente. Sin reset, truncate ni reseed.
  Comparación de conteos y huellas: datos previos idénticos en 13 tablas.
- Gates automáticos: formato, lint sin warnings, typecheck, auditoría de
  convenciones, ejemplos de entorno, validación Prisma, generación de SQL de
  migración y builds API/web. Unitarias API: 87; React: 105; integración: 57;
  HTTP/PostgreSQL: 145, incluidas 45 de mantenimiento. Contrato web verificado
  contra OpenAPI y axe sin violaciones estructurales en el formulario.
  El build web mantiene el aviso de bundle mayor de 500 kB.
- Revisión paralela Standards/Spec contra `29437a8`: corregidos recuperación con
  lectura fallida, selección al paginar, cambio de sesión, archivado concurrente,
  errores junto a campos e identidad legible de embarcación.
- **Pendiente para cerrar #8:** demo renderizada responsive, teclado, consola y
  conflicto en dos pestañas. CUA no tiene navegadores conectados; IAB y Chrome
  devuelven `Browser is not available`. No se sustituye ese gate con pruebas DOM.
  Verificar creación/edición y conflicto repetido en 320–375, 768, 1024 y 1440 px,
  foco visible, movimiento reducido y vistas Manager/Auditor/archivada.
- La API local volvió a estar disponible tras regenerar Prisma; health live
  devuelve `status: ok`. Fase 4 sigue abierta: después del QA de #8 quedan
  [#9](https://github.com/EPraz/keelwatch/issues/9) (ciclo de vida) y
  [#10](https://github.com/EPraz/keelwatch/issues/10) (historial completo).

## Preparación de Fase 4 — mantenimiento y concurrencia (2026-10-08)

- Entrevista `grill-with-docs` en curso para preparar el alcance completo de la
  siguiente fase. No se inicia implementación con decisiones aún pendientes.
- Primera ronda confirmada: órdenes vinculadas directamente a una embarcación,
  con categoría, prioridad, responsable y fecha objetivo; sin inventario, repuestos,
  costes ni mantenimiento recurrente.
- Responsable entre usuarios activos de Keelwatch con permiso de mantenimiento,
  distinto de CrewMember. Operations Manager gestiona y Auditor consulta; no se
  incorpora un nuevo rol. Se registran MaintenanceOrder y MaintenanceAssignee
  en el glosario.
- El propietario excluye los avisos y recordatorios de mantenimiento. Se retira
  ese resultado del alcance de Fase 4 en el roadmap; no afecta las notificaciones
  de Compliance existentes.
- Segunda ronda confirmada: Abierta → Planificada → En progreso → Cerrada;
  En progreso → Bloqueada → En progreso, con motivo al bloquear. Cancelación desde
  cualquier estado no final con motivo; Cerrada y Cancelada son finales y conservan
  historial.
- Alta con título, categoría y prioridad; responsable y fecha objetivo pueden
  completarse antes de planificar y son obligatorios para esa transición.
  Cualquier Operations Manager puede gestionar una orden aunque tenga otro
  responsable; Auditor consulta.
- Una escritura desactualizada se rechaza, conserva el borrador y permite revisar
  los cambios actuales antes de confirmar un nuevo guardado. La protección también
  cubre transiciones de estado.
- Entrada desde Vessel Workspace, lista con filtros y paginación y detalle propio
  para edición, transiciones e historial completo de la orden.
- El propietario recuerda que el objetivo es una demo de portfolio. Se reduce la
  entrevista: las decisiones rutinarias se presentarán como valores predeterminados
  en una propuesta breve, en lugar de abrir rondas por cada caso límite. El alcance
  acordado se conserva; la propuesta final y sus criterios de aceptación aún deben
  consolidarse. No se inicia implementación en esta preparación.
- El propietario invoca `to-spec` y `to-tickets`. Preparados una especificación
  completa y tres borradores verticales: gestión de órdenes y recuperación de
  ediciones concurrentes; ciclo de vida; historial completo por orden. Dependencias
  propuestas lineales 1 → 2 → 3, sin ticket de infraestructura o refactor previo.
- Fronteras de prueba propuestas: HTTP con PostgreSQL real y React para interacción
  y recuperación, siguiendo #5/#6. Las skills requieren confirmar esas fronteras
  y aprobar la división antes de publicar. Los borradores siguen locales, sin nuevos
  issues ni modificaciones a los anteriores.
- La especificación reúne los detalles rutinarios como valores predeterminados
  propuestos: listas demo pequeñas, fecha de calendario, revisión para escrituras,
  motivos cerrados e historial paginado. No añade avisos ni servicios externos.
- El propietario acepta las fronteras de prueba y la división completa. Publicada
  la [especificación #7](https://github.com/EPraz/keelwatch/issues/7),
  `[Spec] Phase 4: MaintenanceOrder workflow, concurrency and audit`, con
  `ready-for-agent`. Incluye 36 historias, decisiones, pruebas y exclusiones.
- Publicados y verificados los tres cortes con `ready-for-agent`:
  [#8](https://github.com/EPraz/keelwatch/issues/8), gestionar órdenes y recuperar
  ediciones concurrentes; [#9](https://github.com/EPraz/keelwatch/issues/9), controlar
  el ciclo de vida con transiciones versionadas; y
  [#10](https://github.com/EPraz/keelwatch/issues/10), consultar historial completo
  y verificar Fase 4. Son sub-issues nativos de #7, con bloqueos nativos
  #8 → #9 → #10; #8 no tiene bloqueadores.
- Verificación: comparación de los cuatro cuerpos completos con los borradores,
  estado abierto, etiquetas, sub-issues y bloqueos mediante GitHub API. Ningún
  issue anterior fue modificado ni cerrado. No se implementa código ni se ejecutan
  pruebas o migraciones de aplicación durante esta publicación documental.

## QA móvil de composición — ajustes y diagnóstico (2026-10-08)

- Las capturas del propietario muestran filtros desalineados: la ayuda de fecha
  afectaba la alineación inferior del flex y Refresh quedaba en otra fila.
  Fecha/función ahora usan columnas alineadas arriba; Apply/Refresh comparten
  una fila de acciones y ambos ocupan el mismo ancho en móvil.
- Pasan 95 pruebas web, formato, lint, tipos, convenciones y builds.
  Se conservan los parámetros URL, los aborts y los reintentos de lectura.
  Un caso nuevo verifica que paginar no borre filtros aún no aplicados; las
  respuestas conservan la clave de consulta para ocultar resultados de otra página.
- El propietario confirma que el scroll móvil se detiene antes del último evento.
  La inspección de shell y Activity no muestra altura fija, overflow de recorte
  ni interceptores de scroll. No hay navegador conectado para reproducir.
  El diagnóstico aportado desde Vessel Workspace llega al límite del documento:
  scrollY/máximo 4693 px, viewport 1024 px, ocho eventos, último evento terminado
  en 946 px. El propietario confirmó que al ajustar el Zoom del modo responsive
  a 50% / Fit to window Activity aparece completo. El recorte era de la vista
  emulada, no del documento; no se cambia el scroll de la aplicación.
  Esta comprobación resuelve el síntoma concreto; no completa por sí sola toda
  la aceptación manual del nuevo flujo ni cierra #6.

## Composición por fecha — ticket #6 (2026-10-08)

- Implementada dentro de Vessel Workspace, separada del historial de planes:
  fecha efectiva UTC del servidor, función demo opcional y páginas de 20 planes.
  Los filtros se aplican antes de paginar, con límites inclusivos, cancelados
  excluidos, orden estable y consulta de embarcaciones archivadas.
- API protegida por `crew:read` y `fleet:read`; Manager y Auditor consultan.
  La respuesta OpenAPI genera el tipo web y explica la evaluación de todo el plan
  con las reglas de #5. La evidencia se consulta por los miembros/tipos de la página,
  incluyendo renovaciones fuera de la primera página del historial.
- Fecha, función y página usan `compositionDate`, `compositionRole` y
  `compositionPage`, sin reemplazar los parámetros del historial o selector.
  Los cambios de filtro reinician solo composición; atrás/adelante conservan estado.
  Las lecturas obsoletas se abortan y no sustituyen resultados vigentes.
- Vacío, filtro sin resultados, página fuera de rango, validación, acceso denegado,
  embarcación ausente e indisponibilidad tienen mensajes diferenciados.
  Hay refresh/reintento de lectura explícitos, sin polling ni nuevas dependencias.
- Crear/cancelar confirma la escritura y actualiza composición, historial y Activity.
  Si falla una lectura posterior, se conserva la confirmación y el reintento no
  repite la escritura. Auditor no recibe controles de alta/cancelación.
- Revisión contra `47a7696`: Standards sin hallazgos. Spec identificó pérdida de
  confirmación cuando Activity devolvía 401/403/404; corregida con confirmación
  genérica fuera del contenido protegido y tres casos de regresión nuevos.
- Evidencia automatizada: 20 casos React nuevos y 26 HTTP/PostgreSQL nuevos.
  Suites finales: 87 API, 94 web, 57 HTTP y 100 PostgreSQL; lint, tipos,
  convenciones, Prisma validate/diff/status, configuración y builds pasan.
  Diez migraciones al día; las 14 tablas conservan cantidades y SHA-256.
  Sin cambios de esquema. Persiste el aviso conocido de bundle web: 708 kB.
- #5 cuenta con aceptación manual del propietario y está cerrado. #6 tiene
  implementación y pruebas automatizadas; faltan los checks renderizados propios
  de este nuevo flujo a 320/375/768/1024/1440 px, teclado y consola, porque esta
  sesión no tiene navegador conectado. No se declara Fase 3 completa todavía.
  Los gates públicos de CI, OIDC/HTTPS y despliegue siguen independientes.

## Cierre de #5 y aclaración de QA (2026-10-08)

- El propietario confirmó que realizó la QA manual solicitada y que la
  implementación #5 funcionó. Esa confirmación completa la aceptación manual;
  no quedan pruebas adicionales de #5 solicitadas al propietario.
- #5 está cerrado con autorización del propietario. Las notas anteriores de
  QA pendiente y ticket abierto describen el estado previo a esa confirmación.
- La sesión del agente no dispone de navegador para repetir de forma independiente
  la verificación renderizada. Esta limitación de corroboración del agente no
  invalida la QA del propietario ni constituye un bloqueo para iniciar #6.

## Desplazamiento suave global (2026-10-08)

- El documento usa `scroll-behavior: smooth` para desplazamientos internos y
  revelado por foco, incluidos los mensajes de confirmación/validación existentes.
  Se conserva la gestión de foco accesible de los formularios.
- `scroll-padding-top` deja espacio para el encabezado fijo de escritorio;
  en tablet/móvil usa el margen de la escala existente, sin sumar un header fijo.
- La preferencia `prefers-reduced-motion: reduce` mantiene `scroll-behavior: auto`.
  No se añaden timers, dependencias ni animaciones de navegación entre rutas.
- Verificación visual del movimiento pendiente: no hay navegador conectado.
  El scroll suave no anima ajustes de posición causados por cambios de altura del DOM.
- Formato, lint, typecheck, 87 pruebas API y 71 web, diff check y builds pasan.
  Persiste el aviso conocido de bundle; no hay cambios de API o base de datos.

## Transiciones de carga del contenido central (2026-10-08)

- El propietario confirma que el parpadeo afecta al contenido central. Reproducción
  determinista en Fleet: la lista desaparecía al paginar mientras la respuesta
  quedaba pendiente. La prueba falló antes del cambio y pasa después.
- Fleet y la paginación de Compliance conservan los resultados visibles con
  `Updating…`, `aria-busy` y botones de página bloqueados. Son resultados anteriores
  identificados por su página, hasta que termina la consulta. Compliance reemplaza
  la carga al cambiar filtros para no etiquetar resultados previos con filtros nuevos.
- Un cambio de sesión no conserva resultados en esas cargas. Los errores siguen
  reemplazando el contenido, incluidos 401/403; respuestas abortadas se descartan
  después de obtener el token o la respuesta. No se añade caché ni dependencia.
- La carga inicial de Vessel conserva la estructura del encabezado. Compliance
  reserva columnas para entrada e historial, con placeholders según acceso de escritura.
  Primera entrada y cambios de filtros siguen consultando la API. No se afirma que
  desaparezcan todos los saltos; falta comprobar las transiciones renderizadas.
- Formato, lint, tipos, 87 pruebas API y 71 web, convenciones y builds pasan.
  Persiste el aviso conocido de bundle. Sin cambios de API, autorización o esquema;
  no se repiten suites de base de datos para estos cambios exclusivamente frontend.

## Legibilidad de planes y encabezados (2026-10-08)

- Capturas aportadas por el propietario muestran Support con Safety cubierta,
  Deck con aviso de cobertura próxima a terminar y rechazo independiente por
  solapamiento. También muestran un plan Support creado. Son evidencia parcial
  de QA manual; no completan el resto de la checklist de #5.
- Se da a la evaluación un resumen con símbolo, borde y fondo según estado,
  etiquetas por requisito y separación entre contexto, explicaciones y enlace.
  Los tokens de éxito, advertencia y error tienen variantes legibles en modo oscuro.
- Los planes separan función, fechas, estado y acciones; la introducción y el
  formulario tienen espacio propio sin heredar el margen cero de Activity.
- Los encabezados aprovechan el ancho disponible junto a sus acciones, sin
  límites por caracteres que provoquen saltos de línea prematuros; nombres largos
  pueden partirse y el apilado móvil existente se conserva.
- Sin cambios en evaluación, autorización ni validación de solapamientos.
  Formato, lint, typecheck, 87 pruebas API y 70 web, diff check y builds pasan;
  continúa el aviso conocido de tamaño de bundle. Sin cambios de esquema o API.
  Verificación visual posterior al cambio y teclado aún pendientes: la sesión
  no tiene navegador disponible. #5 sigue abierto.

## Ajuste de ancho y QA pendiente de #5 (2026-10-08)

- La shell usa todo el ancho de la columna principal: se retira el límite de
  `90rem`, que dejaba espacio vacío a la derecha en pantallas grandes, y se permite
  encoger el contenido de la cuadrícula. Los límites de lectura internos se conservan.
- Inventario de navegador de esta sesión: sin superficies disponibles. El ajuste
  requiere verificación renderizada; no se cierra #5 ni se inicia #6 todavía.
- Verificación del ajuste: formato, lint, typecheck, 87 pruebas API y 70 web,
  y builds API/web pasan. Persiste el aviso conocido de bundle mayor de 500 kB.
  No hay cambios de API, esquema ni migraciones; las suites HTTP/PostgreSQL
  y gates de base de datos de #5 conservan la evidencia registrada abajo.
- Prueba manual desde Fleet → Vessel Workspace → formulario de planes, como Manager:
  - Evaluar Deck (Safety + Deck) y Support (Safety), con cobertura completa,
    sin evidencia y con un hueco dentro del periodo. Revisar explicaciones y enlace al perfil.
  - Probar una renovación consecutiva y un hueco de un día; márgenes de aviso
    de 0/30/31 días después del fin del plan y un plan de un solo día.
  - Cambiar perfil, función o fechas después de evaluar y durante una respuesta
    lenta: el resultado anterior debe desaparecer y no reaparecer como actual.
  - Guardar planes válidos sin evaluar, con faltantes, durante la consulta y tras
    un fallo de evaluación; usar periodos sin solapamientos. Confirmar un solo plan
    y evento de creación. Evaluar por sí solo no crea registros ni Activity.
  - Bloquear solo la lectura `requirement-evaluation` desde DevTools: conservar
    el borrador, mostrar indisponibilidad y recuperar con `Retry evaluation`.
  - Confirmar que Auditor consulta perfiles/historial sin controles de escritura;
    la evaluación está autorizada por API, pero el formulario es exclusivo del Manager.
  - Revisar Overview y Vessel Workspace a 320/375/768/1024/1440/1920 px, teclado,
    foco visible, movimiento reducido, ausencia de desbordamiento y errores de consola.

## Evaluación de borradores — ticket #5 (2026-10-08)

- Implementada la consulta informativa dentro del formulario de planes existente:
  acción explícita, resultado por requisito, primer hueco, fin de cobertura continua,
  enlace al perfil y contexto de consulta. No certifica aptitud ni impide guardar.
- Crew evalúa intervalos completos con años 0001–9999, sin recorrer cada día:
  unión de vigencias del mismo perfil/tipo solapadas, anidadas o consecutivas;
  requisitos fijos demo y avisos entre 0 y 30 días después del fin del plan.
  Se consideran renovaciones fuera de la primera página de historial.
- API versionada y documentada en OpenAPI; Manager/Auditor leen con `crew:read`
  más `fleet:read`. Se verifican ausencia de autenticación, usuario inactivo,
  cada permiso ausente y roles ajenos. No hay nuevas tablas, migraciones,
  dependencias, servicios ni escrituras o eventos de auditoría por evaluación.
- La UI invalida el resultado al cambiar perfil, función, fechas o Vessel,
  guardar/resetear y salir. Aborta lecturas obsoletas; conserva borradores ante
  fallos y referencias de error, ofrece reintento solo de lectura y permite guardar
  sin evaluar, durante la consulta, con faltantes o después de un fallo.
- TDD en las fronteras acordadas: HTTP con PostgreSQL real, interacción React y
  casos temporales suplementarios. Gates: 87 API y 70 web unitarias/componentes,
  57 HTTP y 74 PostgreSQL; formato, lint, typecheck, convenciones, Prisma
  validate/diff, configuración redactada y builds pasan. Diez migraciones al día;
  no se aplica DDL. `npm audit --audit-level=high`: cero vulnerabilidades.
- Las 14 tablas, incluido el registro de migraciones, conservan cantidades y
  SHA-256 después de las suites. Fixtures sintéticos aislados por IDs y correlation
  IDs propios; se limpian también las cualificaciones creadas por este fixture.
- El build mantiene el aviso de bundle mayor de 500 kB: aproximadamente 694 kB
  minificado y 190 kB gzip. No se amplía el alcance con optimización general.
- Revisión `code-review` contra `677b2affc6bcfdba05046c4ee460722440c983d8`
  confirmada por el propietario, con ejes Standards y Spec independientes.
  Standards detectó el contrato web escrito a mano sin validación OpenAPI. Se
  demostró el fallo de su comprobación, se generó el tipo desde el esquema real y
  se verifica su sincronización en cada suite PostgreSQL sin regenerarlo. No hay
  imports de DTOs del backend en web ni nuevas dependencias. Segunda revisión:
  Standards y Spec con cero hallazgos pendientes.
- QA visual, teclado y anchos 320–375/768/1024/1440 px pendiente: la sesión
  no expone navegadores y el navegador integrado no está disponible. El propietario
  indica que habilitará uno; las comprobaciones finales de inventario y apertura
  de Chrome/integrado siguen sin exponer acceso. Axe y estados/races tienen cobertura automatizada;
  no se atribuye esa evidencia como verificación visual renderizada.
- Implementación y evidencia conservadas en commit local; sin push, PR ni cambios a issues.
  #5 permanece abierto hasta completar la verificación; #6 depende de su cierre.
  Fase 3 continúa abierta y composición no se implementa en este incremento.

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
- Fase 3 tiene perfiles, cualificaciones y planes sintéticos con cancelación:
  UI, API, permisos Crew/Fleet, PostgreSQL y auditoría atómica. La evaluación demo
  del borrador está aceptada (#5); la composición está implementada y probada (#6),
  pendiente de los checks renderizados propios del nuevo flujo.
  No representa aptitud real ni embarque.

## Cierre de Fase 3 — especificación y tickets publicados (2026-10-08)

- Entrevista `grill-with-docs` para los dos resultados pendientes: evaluación demo
  de requisitos y composición planificada por embarcación. Alcance completo
  confirmado por el propietario. Especificación y tickets publicados; no hay
  implementación nueva para este incremento y Fase 3 permanece abierta.
- Primera ronda aprobada por el propietario: requisitos fijos y originales de la
  demo. Cubierta (`DEMO_DECK`) requiere las cualificaciones Seguridad y Cubierta;
  Apoyo (`DEMO_SUPPORT`) requiere Seguridad. Sin catálogo configurable ni reglas
  reglamentarias reales.
- La evaluación abarca todo el periodo planificado, incluidos inicio y fin, y es
  informativa: no impide crear planes ni introduce aprobaciones u overrides.
  Permanecen las validaciones existentes de fechas y solapamientos.
- La composición se consultará dentro de Vessel Workspace, por Operations Manager
  y Auditor, sin dashboard global ni nueva navegación primaria.
- Se incorpora `CrewRequirementEvaluation` al glosario para distinguir esta
  evaluación de una declaración de aptitud real.
- Segunda ronda aprobada: varios registros del mismo tipo pueden cubrir juntos el
  periodo, siempre que sus vigencias se solapen o sean consecutivas sin huecos.
  Un registro hasta el día 15 y otro desde el 16 mantienen cobertura; comenzar
  el 17 deja el día 16 sin cubrir. Tipos distintos no se sustituyen entre sí.
- La evaluación se recalcula al consultar con las cualificaciones registradas en
  ese momento. Una renovación puede cambiar el resultado de una consulta posterior,
  sin modificar el plan ni guardar una supuesta aprobación histórica.
- Composición para una fecha de calendario seleccionada, inicialmente hoy en UTC:
  incluye planes cuyo periodo contiene ese día y excluye cancelados. Admite fechas
  pasadas y futuras; se incorpora `CrewComposition` al glosario sin afirmar presencia
  real a bordo.
- Antes de guardar, acción explícita para evaluar requisitos cuando perfil, función
  y fechas estén completos y válidos. Es una consulta sin escrituras; cambiar esos
  datos invalida el resultado anterior. Si falla, permite reintentar y no impide
  guardar el plan bajo sus validaciones existentes.
- Tercera ronda aprobada: tres resultados informativos, cobertura incompleta,
  cobertura con aviso y cobertura sin aviso. El aviso corresponde a una cobertura
  continua que termina entre 0 y 30 días después del fin del plan, ambos incluidos.
  Se consideran las renovaciones consecutivas; el vencimiento de un registro no
  genera aviso si otro mantiene la cobertura más allá de ese margen.
- Explicación por requisito, con el primer intervalo de fechas sin cubrir cuando
  exista. Se distingue ausencia de registros del tipo requerido de registros con
  cobertura incompleta. Enlace al perfil para consultar o registrar cualificaciones,
  respetando los permisos existentes.
- En composición, la fecha seleccionada determina qué planes aparecen, pero los
  requisitos de cada persona se evalúan para todo el periodo de su plan, no solo
  para ese día. Un requisito cubierto hoy puede dejar un faltante al final del plan.
- Consulta mínima con filtros de fecha y función, conservados en la URL, y páginas
  de 20 registros. Historial existente separado; sin buscador, gráficos ni contadores
  adicionales.
- Un fallo de consulta se muestra como evaluación no disponible con reintento,
  nunca como ausencia de problemas. Los resultados de datos anteriores no se
  presentan como válidos para entradas nuevas. Actualización al consultar y después
  de cambios realizados en esa vista, sin actualización automática periódica.
- Si falla una consulta posterior a guardar o cancelar, se conserva la confirmación
  del cambio y se reintenta únicamente la lectura, no la escritura.
- Las tres rondas de decisiones están resueltas y el resumen completo está
  confirmado. El propietario invoca `to-spec` y `to-tickets`; aún no se implementa
  el cierre.
- Pruebas confirmadas para este incremento: API HTTP con PostgreSQL real como
  frontera principal, complementada por interacción React y casos temporales de
  cobertura. Se reutilizan las pruebas existentes sin acoplarse a métodos privados.
- Especificación canónica publicada con `to-spec` y verificada contra el texto
  completo: [issue #4](https://github.com/EPraz/keelwatch/issues/4),
  `[Spec] Phase 3 closure: CrewRequirementEvaluation and CrewComposition`, abierta
  con `ready-for-agent`. Contiene 50 historias, decisiones, pruebas y exclusiones.
  No se modifica ni cierra ninguno de los issues previos #1, #2 o #3.
- División y dependencia aprobadas por el propietario para `to-tickets`. Publicados
  y verificados dos cortes verticales con `ready-for-agent`:
  [#5](https://github.com/EPraz/keelwatch/issues/5), evaluar requisitos de un borrador
  desde el formulario existente, y [#6](https://github.com/EPraz/keelwatch/issues/6),
  consultar composición por fecha/función con la misma evaluación.
- Ambos son sub-issues nativos de #4. #6 tiene dependencia nativa de #5, aún abierto;
  #5 no tiene bloqueadores y parte de la base local de asignaciones ya verificada.
  El cuerpo y estado abierto de la especificación padre permanecen intactos.
- Próximo resultado vertical: implementar #5 y verificar sus criterios antes de
  desbloquear #6. No se inicia implementación, se asignan tickets ni se cierran
  issues en este paso de planificación.
- Verificación de esta planificación: formato de los Markdown modificados y cuerpos
  de publicación, `git diff --check`, y lectura de #4 para comprobar contenido y
  etiqueta; lectura de #5/#6 para comprobar cuerpos completos, etiquetas, sub-issues
  y dependencia. No se ejecutan pruebas de aplicación ni migraciones porque este
  trabajo solo modifica documentación y publica la especificación y sus tickets.

## Asignaciones — implementación y verificación local (2026-10-08)

- Primera ronda aprobada por el propietario: una asignación representa
  planificación, no un embarque real. Se recoge el término `CrewAssignment` en
  [`GLOSSARY.md`](../GLOSSARY.md), separado de las cuentas y sus roles de acceso.
- Incremento implementado: creación y consulta de asignaciones, prevención de
  solapamientos y auditoría. La evaluación de cualificaciones permanece en el
  siguiente incremento de Fase 3; no se elimina de la hoja de ruta.
- Fechas de calendario sin horas ni turnos; los estados temporales se evalúan por
  día UTC. Un tripulante no puede tener asignaciones simultáneas en toda la flota,
  aunque cambien la función o la embarcación.
- Segunda ronda aprobada: inicio y fin obligatorios e inclusivos, periodos de un
  día y registro de periodos pasados, presentes y futuros. Si una asignación acaba
  el 15, la siguiente puede empezar el 16. Funciones cerradas: Cubierta — demo y
  Apoyo — demo, distintas de los roles de acceso.
- El alcance se amplía explícitamente con cancelación auditada para corregir
  errores, sin edición ni borrado. Creación y consulta desde Vessel Workspace,
  seleccionando un perfil Crew existente, sin nueva navegación primaria.
- Operations Manager escribe y Auditor consulta; autorización en servidor y sin
  roles adicionales. Las reglas existentes de Fleet/Crew siguen siendo la base.
- Tercera ronda aprobada: cancelar anula toda la planificación y libera su periodo,
  conservando registro y fechas originales. No equivale a finalizar un embarque.
  Motivo obligatorio de catálogo cerrado: Registro incorrecto o Cambio de
  planificación; sin texto libre.
- Consulta mínima: historial paginado por embarcación con perfil, función, fechas
  y estado, incluidas canceladas. Sin dashboard de composición ni evaluación de
  riesgos en este incremento.
- Cuarta ronda aprobada: se pueden cancelar asignaciones futuras, vigentes y
  finalizadas. No hay reactivación: recuperar la planificación requiere un nuevo
  registro y nuevas validaciones de solapamiento.
- Repetir una cancelación con el mismo motivo devuelve el resultado existente,
  sin cambiar actor, fecha o motivo ni duplicar auditoría. Un motivo distinto para
  una asignación ya cancelada se rechaza.
- Selector de perfiles paginado, con nombre y referencia; reutiliza el listado
  Crew existente. Sin descargar todo el registro, búsqueda ni autocompletado.
- Las cuatro rondas están resueltas; el propietario confirma el alcance resumido
  al invocar `to-spec` y después confirma las pruebas: HTTP con PostgreSQL real,
  complementado por interacción de la interfaz. Se reutilizan patrones existentes
  de Fleet/Crew, sin infraestructura adicional ni acoplamiento a métodos privados.
- Especificación canónica publicada y verificada: [issue #1](https://github.com/EPraz/keelwatch/issues/1),
  `[Spec] Phase 3: CrewAssignment planning and audited cancellation`, abierta con
  `ready-for-agent`. Contiene 38 historias, decisiones, pruebas y exclusiones.
- Tickets aprobados, publicados y verificados: [#2](https://github.com/EPraz/keelwatch/issues/2)
  crear/consultar planes y [#3](https://github.com/EPraz/keelwatch/issues/3)
  cancelar/reutilizar periodos. Ambos son sub-issues de #1; #3 tiene dependencia
  nativa de #2. La especificación padre permanece abierta y sin modificaciones.
- `implement` iniciado con TDD en HTTP/PostgreSQL e interacción React. Referencia
  de revisión aprobada: `b0c892ee03f4952c98ff68801698d3907ab6d65d`, en `master`.
- Migración aditiva de asignaciones aplicada sin reset. Las cantidades y huellas
  SHA-256 de las 12 tablas previas permanecen idénticas después de la migración y
  del primer ensayo HTTP. Los fixtures de prueba se eliminan por IDs propios.
- Implementados alta, historial de 20 planes y cancelación desde Vessel Workspace,
  sin nueva navegación. Reutiliza Crew y sus permisos; requisitos no evaluados se
  explican junto al flujo. Los periodos se serializan por perfil, entre toda la flota.
- Segunda migración aditiva de cancelación aplicada: diez migraciones al día,
  sin reset ni borrado de registros existentes. Constraints de fechas y metadatos
  completos; los 12 conjuntos de datos previos conservan cantidades y SHA-256.
  Para comparar auditoría se excluyen únicamente los dos nuevos tipos de evento.
- QA viva Manager: alta de Jordan Vale en MV Meridian del 2040-02-01 al 15,
  cancelación por cambio de planificación y Activity actualizado. Se conserva ese
  único plan sintético cancelado y sus dos eventos; no se modifica el perfil ni Vessel.
  Auditor ve historial/motivo sin controles de escritura. Verificación a 320, 375,
  768, 1024 y 1440 px sin overflow global; se corrige el mínimo del documento que
  ignoraba el ancho consumido por la scrollbar a 320 px.
- Teclado: fechas, selección, validación enfocada y retorno al trigger al conservar
  un plan; foco visible y política global de reduced-motion reutilizados.
  No se afirma emulación del sistema operativo. Sin errores nuevos de consola.
- TDD: conflictos conservan campos, pending evita duplicados, errores incluyen
  referencia, éxito confirmado permanece si falla el refresco de historial o Activity.
  Pruebas reales de concurrencia, retries de cancelación y rollback de auditoría.
- Gates locales: 130 unitarias/componentes (69 API, 61 web), 57 HTTP y 51
  PostgreSQL (28 nuevas). Formato, lint, typecheck, audit de convenciones, Prisma
  validate/diff y builds pasan. Vite mantiene el aviso de chunk mayor de 500 kB;
  no se oculta ni se amplía este incremento con optimización general.
- Exclusión de `.agents/skills/` del formato aprobada por el propietario para
  conservar intactas las skills del proveedor. No se cambian dependencias ni `.env`.
- Revisión independiente `code-review` contra la referencia aprobada: Spec sin
  hallazgos; Standards detectó una colisión aleatoria posible en fixtures. Se
  reprodujo un `409` con una referencia propia ocupada y se corrigió mediante
  selección comprobada y acotada (20 intentos), sin reemplazar registros previos.
  La prueba de regresión pasa para referencias de Vessel y CrewMember.
- Commit de implementación local `5296522` en `master`; sin push ni PR. Las issues
  #2/#3 quedan abiertas hasta publicar la entrega; #1 permanece intacta. Configuración
  redactada consistente y `npm audit --audit-level=high` sin vulnerabilidades.
- Próximo resultado: definir la evaluación demo de requisitos antes de implementar;
  composición/riesgos de tripulación siguen posteriores. Fase 3 no está completa.

## Configuración local de skills de ingeniería (2026-10-08)

- Configuración aprobada: GitHub Issues en `EPraz/keelwatch`, las cinco etiquetas
  predeterminadas de triage y un único contexto de dominio. `AGENTS.md` remite a
  los archivos de `docs/agents/`; los ADRs conservan su ubicación canónica.
- No se crea un glosario vacío ni se modifica la aplicación. Los cambios previos
  de asignaciones permanecen como borrador sin verificar; Fase 3 sigue abierta.
- CLI `gh` 2.102.0 instalada, sesión autenticada y acceso al repositorio verificados.
  Se crearon `needs-triage`, `needs-info`, `ready-for-agent` y `ready-for-human`;
  `wontfix` ya existía y se conserva sin cambios. Una segunda consulta confirma las
  cinco etiquetas. El setup no creó issues ni PRs remotos.
- La comprobación inicial dentro del aislamiento no pudo conectar con GitHub;
  con acceso de red autorizado la sesión y las operaciones se verificaron.
- La regla existente `agents*` de `.gitignore` excluye `AGENTS.md` y `docs/agents/`;
  se conserva y esta configuración queda local, sin incorporarse al repositorio.
- Formato verificado explícitamente para los cinco documentos, incluidos los
  ignorados por Git. No se ejecutan gates de aplicación por este cambio documental.

## Segundo incremento de Fase 3 — cualificaciones demo (2026-10-06)

- Desde el nombre del perfil se abre `/app/crew/:crewMemberId`. Manager registra
  un tipo demo, referencia `KW-Q-######` y fechas; Auditor consulta. El servidor
  aplica los permisos Crew existentes, valida calendario y orden de fechas,
  rechaza campos ajenos y mantiene referencias únicas por perfil.
- Vigencia derivada por día UTC: futura, vencida, próxima a vencer (0–30 días
  inclusive) o vigente. Cada resultado incluye fecha de evaluación y motivo.
  Los dos tipos son sintéticos y no acreditan aptitud legal, médica u operacional.
- La migración aditiva `20261006010000_crew_qualifications` está aplicada; ocho
  migraciones al día, sin reset, drop ni truncate. Registro y evento
  `CREW_QUALIFICATION_RECORDED` comparten una transacción. Renovaciones crean otra
  referencia; edición, borrado, archivos y servicios externos quedan fuera.
- Antes de la QA visual, las nueve tablas previas conservaron sus filas completas
  y hashes SHA-256. La QA añadió solamente `KW-Q-000001` al perfil Jordan Vale
  (2026-01-01 a 2027-01-01) y su evento; no cambió datos existentes.
- QA viva: entrada desde Crew, vacío Auditor, validación con foco, fechas con
  teclado, guardado Manager, aviso de éxito, formulario reiniciado y lectura
  posterior Auditor sin controles de escritura. Verificación a 375, 768, 1024
  y 1440 px sin overflow horizontal; estilos reutilizan tokens y foco existentes.
  Sin errores nuevos de consola. Reduced-motion reutiliza la política global;
  no se afirma emulación del sistema operativo.
- Cobertura automatizada de loading, vacío, paginación, recuperación de red,
  403/404, duplicados, pending, axe, fechas límite y permisos negativos. PostgreSQL
  comprueba concurrencia, constraints y rollback si falla auditoría. La limpieza
  está limitada a fixtures propios, también si falla su preparación.
- Gates: 114 pruebas unitarias/de componente (63 API, 51 web), 57 HTTP y 23
  PostgreSQL; formato, lint, typecheck, convenciones, Prisma/DDL, estado de
  migraciones, entorno de ejemplo, preflight OIDC y builds. La revisión corrigió
  la inferencia de refs del formulario y añadió rechazo explícito del año cero.
- Siguiente resultado vertical: asignaciones por periodo y rol con prevención
  de solapamientos. Antes de implementarlo, mantener reglas mínimas y explícitas
  de demo; sin nuevas cuentas, servicios, costes ni cargas de archivos.

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
- Gates al cierre del recorte: 93 pruebas unitarias/de componente (50 API, 43 web), 43 HTTP y
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

- El bundle web principal es de aproximadamente 672 kB minificado (185 kB gzip) y
  activa el warning de 500 kB de Vite. No bloquea esta demo pequeña, pero conviene
  medir y dividir por rutas antes de ampliar módulos.
- El Blueprint coincide con el JSON Schema oficial de Render, pero la validación
  consciente del workspace y la importación final dependen del dashboard, el
  repositorio publicado y valores reales propiedad del usuario.
