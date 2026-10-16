# Fase 7 — registro de la entrevista de alcance

Estado: refinamiento confirmado y publicado como
[#29](https://github.com/EPraz/keelwatch/issues/29) (2026-10-15);
especificación y desglose originales publicados como
[#23](https://github.com/EPraz/keelwatch/issues/23) y tickets #24–#28 publicados.
Paquete de presentación revisado y aceptado por el propietario el 2026-10-16
en `8b88f46`; publicado en `5cb155f` con CI verde y #30 cerrada. #27 es el
siguiente corte y su integración sigue pendiente.
Fecha: 2026-10-14 local / 2026-10-15 UTC.

Fuentes: [estrategia del portfolio](../portfolio-strategy.md),
[Fase 7 del roadmap](../maritime-operations-roadmap.md#fase-7--presentación-y-preparación-laboral)
y [paquete técnico de Fase 6](./README.md).

## Refinamiento de presentación — 2026-10-15

El propietario revisa la entrega local de #26 y señala que mostrar únicamente
el conflicto de Maintenance no comunica la amplitud del producto construido.
Mediante `$grill-with-docs` confirma estos acuerdos:

1. La presentación tendrá dos niveles: un recorrido general de Keelwatch como
   primera pieza y el video de Maintenance como demostración de profundidad.
2. El recorrido general debe permitir a un recruiter entender el producto y sus
   funciones construidas sin tener que interactuar con la aplicación. El video
   de conflictos conserva su función específica dentro del conjunto.
3. La referencia a «crear cliente» fue un ejemplo impreciso, aclarado por el
   propietario. Se presenta lo ya implementado; no se solicita una entidad Client,
   administración nueva de cuentas ni otro comportamiento de negocio.
4. El propietario confirma la cobertura mínima siguiente: acciones y resultados
   principales de todas las áreas, sin exigir cada variante de cada formulario.
   Una embarcación será el hilo conductor; se usarán datos preparados donde ayuden.
   Los casos especiales y pruebas conservarán su evidencia técnica enlazada.
5. El recorrido general será sin voz, con explicaciones en inglés, transcripción
   accesible y capítulos para localizar cada área. Las explicaciones comunicarán
   propósito y resultado además de la acción visible.
6. El recorrido general apunta a 4–5 minutos, con la secuencia orientativa de la
   tabla siguiente. Los tiempos se ajustan para mantener legibilidad y lectura
   cómoda. Junto con los 2:44 de Maintenance, ambas piezas suman aproximadamente
   siete u ocho minutos.
7. La introducción del README y el caso de estudio presentarán primero Keelwatch
   como producto completo y después Maintenance como ejemplo de profundidad.
   El caso conserva sus decisiones técnicas, fuentes y límites tras explicar
   alcance y recorrido. El propietario confirma ambos puntos con «sí a todos»;
   queda cerrado el entendimiento compartido de este refinamiento.

| Área        | Cobertura mínima confirmada                                                               |
| ----------- | ----------------------------------------------------------------------------------------- |
| Access      | Entrada Manager y diferencia con Auditor.                                                 |
| Fleet       | Registrar una embarcación, encontrarla y abrir su espacio de trabajo.                     |
| Compliance  | Registrar un certificado, entender su estado y consultar riesgos y notificaciones.        |
| Crew        | Crear un perfil, registrar cualificaciones y planificar su asignación a una embarcación.  |
| Maintenance | Crear una orden, mostrar seguimiento y cambios de estado; enlazar la pieza de conflictos. |
| Audit       | Consultar Activity para conectar las operaciones con su historial.                        |

| Tramo orientativo | Contenido                                                        |
| ----------------- | ---------------------------------------------------------------- |
| 0:00–0:25         | Problema operativo y entrada como Manager.                       |
| 0:25–1:05         | Registrar y consultar una embarcación.                           |
| 1:05–2:05         | Certificado, estado de cumplimiento, riesgos y notificaciones.   |
| 2:05–3:15         | Perfil de tripulante, cualificaciones y planificación a bordo.   |
| 3:15–4:05         | Crear y dar seguimiento a una orden de mantenimiento.            |
| 4:05–4:45         | Activity, consulta como Auditor y enlace al video de conflictos. |

La entrevista de refinamiento está cerrada. La especificación local incorpora
estos acuerdos y el desglose local identifica la entrega adicional previa al
portfolio. La síntesis posterior con `$to-spec` publica el refinamiento como #29,
preservando la especificación y los tickets originales. Los acuerdos de esta sección
sustituyen el foco editorial inicial de los puntos 5 y 7 siguientes; el resto del
registro conserva su contexto histórico. La aprobación del plan no constituye
aprobación del contenido entregado ni publicación/cierre de #26 o integración #27.

Hechos contrastados con las rutas y componentes actuales: Fleet permite registrar
embarcaciones; Compliance registra certificados, deriva estados y ofrece cola y
notificaciones; Crew registra perfiles, cualificaciones y planes por embarcación;
Maintenance gestiona órdenes y conflictos; Access y Audit aportan permisos e
historial. Overview muestra identidad/permisos y resumen Compliance, no un resumen
global de todos los módulos. No existe una entidad comercial Client/Customer.

### Síntesis del refinamiento mediante `$to-spec`

El propietario solicita `$to-spec`. Se prepara una
[especificación separada del refinamiento](./PHASE_7_OVERVIEW_SPEC.md), con
36 historias, decisiones de implementación, verificación y límites. La frontera
principal propuesta es el recorrido observable del evaluador: entrada/caso →
video general/capítulos/transcripción → profundidad Maintenance → demo/código.
Las acciones y resultados se contrastarán con app/API/PostgreSQL reales y se
reutilizarán captura, reproducción y pruebas existentes, sin API de pruebas nueva
ni assertions sobre texto literal. El propietario confirma explícitamente esta
frontera en el checkpoint de la skill y autoriza continuar con el flujo solicitado.

GitHub leído durante esta síntesis: #23, #26 y #27 siguen OPEN; no hay una issue
abierta equivalente al refinamiento. Se publica
[#29](https://github.com/EPraz/keelwatch/issues/29) con `ready-for-agent` y se
relee: OPEN, etiqueta correcta y cuerpo coincidente con el documento preparado
tras normalizar saltos de línea. Cuerpos y estados de #23/#26/#27/#28 se contrastan
con sus lecturas previas y permanecen idénticos. No se crean tickets de
implementación, relaciones nativas ni cierres; el desglose sigue en `$to-tickets`.

### Desglose aprobado y publicado del refinamiento

El desglose adicional de #29 se prepara con `$to-tickets`: una entrega completa
de recorrido general y texto alineado, bloqueada por #26 y previa a #27. Véase el
[ticket y sus criterios](./PHASE_7_OVERVIEW_TICKETS.md). El propietario aprueba
el tamaño, las dependencias y mantener la entrega unida. Se publica
[#30](https://github.com/EPraz/keelwatch/issues/30) con `ready-for-agent`, como
subissue nativa de #29, bloqueada por #26 y bloqueo adicional de #27. La relectura
confirma esas relaciones, #27 bloqueada por #26/#30 y #28 por #27; cuerpos/estados
de #23/#26/#27/#28/#29 permanecen idénticos. #26 sigue OPEN. El gate humano de
contenido para #27 permanece separado; no se cierra ni implementa ninguna issue.

## Decisiones confirmadas en la entrevista original

1. El objetivo de esta entrevista es la Fase 7 pública: presentar Keelwatch en el
   portfolio con README, recorrido y caso de estudio. La práctica personal de
   entrevistas permanece privada, separada y no bloquea la aceptación pública.
2. Se planifica toda la fase, comenzando por README, caso de estudio y recorrido
   en Keelwatch. La integración visual del repositorio independiente del portfolio
   viene después de aprobar ese contenido; no se modifica ese repositorio durante
   esta entrevista ni se infiere autorización de implementación.
3. La entrada prioriza recruiter/hiring manager: problema, contribución y evidencia
   demostrable en una lectura breve. Un camino técnico inmediato permite al
   engineer profundizar en mecanismos, decisiones y límites.
4. El propietario acepta la Fase 6 publicada con CI verde y autoriza cerrar
   #16–#22. Se verifica ese cierre; la nueva entrevista no reabre su arquitectura.
5. El recorrido será un video de 2–3 minutos con subtítulos en inglés y 4–6
   capturas con contexto y texto alternativo, para entenderlo sin ejecutar la demo.
6. La revisión externa ocurre al cierre: Codex prepara una pauta para recruiter y
   otra para engineer; el propietario coordina la participación. El contenido
   inicial puede publicarse antes y se atienden hallazgos antes de cerrar la fase.
7. Maintenance será la historia principal: dos editores, conflicto por revisión,
   comparación del borrador, recuperación explícita y Activity. Auditor muestra
   los mismos datos en lectura. Crew queda como segundo caso enlazado.
8. La captura ejecutará app/API/PostgreSQL reales en un entorno local aislado con
   escenario sintético preparado/reproducible. Se verifica disponibilidad antes.
   Las capturas históricas de componentes con respuestas simuladas son referencia
   visual, no evidencia de ese recorrido completo.
9. La primera versión del video será sin voz, con subtítulos explicativos en
   inglés y transcripción accesible. Una narración posterior sería una mejora
   condicionada a su valor, no requisito de la entrega inicial.
10. El caso de estudio será editorial, con resumen breve. Las 800–1.200 palabras
    son una estimación orientativa, no un mínimo ni un criterio de aceptación;
    una versión más corta es válida si cuenta la historia con claridad y evidencia.
    Dos decisiones principales: revisión/lock para conservar la
    intención y transacción con Audit para conservar la historia. Explica alcance,
    recorrido, evidencia y límites; enlaza la profundidad técnica existente.
11. La primera integración será una ficha destacada de Keelwatch en Work con rol,
    resumen, evidencia y enlaces a caso aprobado, demo y código, reutilizando diseño
    y navegación por anclas. Es una decisión de primera entrega: el salto a GitHub
    para el caso largo es su coste; una página propia puede evaluarse después por
    continuidad visual y control editorial. No se implementa una ruta nueva aquí.

## Entrega y verificación propuestas

La [especificación pública preparada](./PHASE_7_SPEC.md) convierte los acuerdos
en resultados verificables, historias de usuario y decisiones de implementación
y pruebas. La solicitud `$to-spec` cierra la entrevista de alcance.

| Bloque    | Resultado                                                                                                      | Dependencia y verificación                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contenido | Caso editorial en inglés y entrada README que presenta problema/rol/evidencia y conserva instrucciones útiles. | Claims con fuentes; aprobación del propietario del contenido antes de integrar portfolio.                                                        |
| Captura   | Escenario local aislado, ejecución app/API/PostgreSQL real y registro de versión/fecha/preparación.            | Verificar conexión/aislamiento y permisos, sin tocar base pública o datos retenidos ajenos.                                                      |
| Media     | Video sin voz de 2–3 min, subtítulos/transcripción y 4–6 capturas con contexto/alt.                            | Flujo Maintenance real, conflicto/recuperación/Activity y Auditor; fuente local indicada, sin secretos ni material simulado presentado como E2E. |
| Portfolio | Ficha destacada en Work con rol, historia breve y CTAs útiles.                                                 | Contenido aprobado; preservar trabajo previo y diseño existente. Validación responsive, teclado, foco, media y enlaces.                          |
| Cierre    | Pautas externas, respuestas reales coordinadas por el propietario y registro de hallazgos/correcciones.        | Publicación inicial puede preceder al feedback; cerrar hallazgos antes de aceptar Fase 7.                                                        |

El codec/compresión, herramientas de captura y transporte de assets se resuelven
como detalles de implementación bajo compatibilidad/peso verificados y coste cero.
No se añade un servicio de video ni uploads a la API de Keelwatch. El material
público describe el producto; narrativas personales de 60 s/5 min/30 min, preguntas,
respuestas y ensayos se mantienen en la línea privada, sin bloquear el cierre del
paquete público. No se contacta a reviewers desde las herramientas del agente.

## Hechos comprobados para el plan original

- Maintenance ya implementa conflicto por revisión y revisión explícita de
  Previous/Current/Your draft; Crew ya conserva inputs ante solapamiento. Los
  [casos Maintenance](./MAINTENANCE_CASE.md) y [Crew](./CREW_CASE.md) enlazan pruebas
  de ambas recuperaciones; no se añade comportamiento para producir el relato.
- Existen seis PNG históricos versionados de Maintenance con componentes reales
  y respuestas simuladas. No hay video versionado ni flujo de captura terminado.
- Los servicios locales PostgreSQL 17/18 están en ejecución y los navegadores
  están instalados; esa lectura no verifica una conexión, credenciales ni schema.
  La preparación debe comprobar el entorno aislado antes de cualquier escritura.
- El portfolio identificado es `3DPortafolio`: React/TypeScript/Vite, página única
  por anclas y grid uniforme de proyectos. Los campos de datos `caseStudyUrl` y
  `layout` existen, pero las tarjetas todavía no los utilizan. Keelwatch no aparece.
  Tiene cambios previos sin commit que la futura integración debe preservar.

## Acuerdos vigentes que no se reabren

- Comunicación pública en inglés para el mercado de EE. UU.; perfil Mid-Level /
  Software Engineer II, full-stack con inclinación backend.
- Proyecto personal clean-room, datos sintéticos y ninguna cifra de impacto,
  ownership, capacidad o disponibilidad sin respaldo.
- Ningún coste adicional ni tecnología añadida por presentación. La web del
  portfolio resume y enlaza la evidencia; no sustituye ni duplica todos los docs.
- Maintenance y Crew son los casos técnicos centrales; Access, Audit y Compliance
  aportan evidencia de apoyo. El recorrido público de producto y las narrativas
  breves se distinguen de preguntas/respuestas personales de ensayo.

## Cierre de la entrevista y verificación

- Tras recomendar cerrar la entrevista, el propietario solicita `$to-spec`:
  confirma la transición a síntesis y publicación de la especificación.
- El checkpoint de `to-spec` pide confirmar la verificación del recorrido visible,
  reutilizando pruebas existentes de conflicto/permisos/Audit, sin APIs nuevas ni
  pruebas del texto literal. La publicación espera esa respuesta; no es una nueva
  ronda de decisiones de alcance. El «acepto» posterior aprueba este enfoque
  junto con el desglose y autoriza su publicación.
- Este paso no aprueba anticipadamente el caso todavía no escrito ni inicia la
  integración del portfolio.
- El propietario solicita `$to-tickets`. Se prepara un
  [desglose completo de cinco tickets](./PHASE_7_TICKETS.md) con dependencias
  inmediatas T1 → T2 → T3 → T4 → T5: entrada/caso, recorrido real con capturas,
  video accesible, ficha en Work y feedback externo/cierre. T2 y T3 entregan
  incrementos públicos útiles, no infraestructura de captura aislada del relato.
- El propietario responde «acepto» al tamaño, dependencias y verificación. Se
  publican #23 y sus cinco subissues #24–#28 con `ready-for-agent`; se verifican
  cuerpos, etiquetas, estados OPEN y relaciones nativas. Cadena #24 → #25 → #26
  → #27 → #28. No se modifica el cuerpo del padre ni se cierra ninguna issue.
- La aprobación concreta del contenido entregado sigue siendo un gate adicional
  para T4/#27. El siguiente ticket sin bloqueadores es #24; no se inicia con esta
  publicación.

Los acuerdos se incorporan a este registro durante la entrevista. No se crea un
ADR por decisiones editoriales reversibles ni se añaden términos generales de
presentación al glosario operacional. Publicar la especificación no inicia su
implementación ni sustituye la aprobación posterior del contenido entregado.

## Entrega editorial — #24

El propietario solicita `$implement`, tomando #24 como primer ticket sin
bloqueadores. Se prepara una entrada breve del README y un
[caso editorial en inglés](./CASE_STUDY.md), enlazado desde esa entrada y el
recorrido técnico. Conserva problema, rol/alcance, Maintenance principal, dos
decisiones, alternativas, costes, fuentes y límites; Crew queda enlazado.

Estado al entregar #24: entregado para revisión; aprobación del propietario pendiente.
Esta entrega no inicia #25–#28 ni integra el portfolio. Los medios reales se
producirán en #25/#26; no se añaden enlaces a assets inexistentes. Antes de #27
deberá registrarse aprobación del contenido que realmente se vaya a integrar,
incluidas modificaciones materiales posteriores.

## Aceptación del contenido entregado — 2026-10-16

El propietario responde «aceptado y revisado» al paquete concreto `8b88f46`,
tras revisar el recorrido general y la nueva toma Maintenance, y corregir los
detalles de contraste, perfiles Crew y comparación de Maintenance. La aceptación
comprende README/caso, ambos videos con sus transcripciones y las seis capturas.
Queda satisfecha la aprobación editorial requerida para usar ese contenido en #27.
Cada video conserva su fuente y fecha; los hashes aceptados constan en
[progreso](../progress.md#aceptación-del-paquete-de-presentación-2026-10-16).

Al registrar esta aceptación, #30 y #27 seguían abiertos. Ese paso no publicaba
commits, cerraba tickets ni iniciaba el portfolio. No acredita feedback externo
de recruiter/engineer ni aceptación
completa de Fase 7. Cualquier cambio material posterior requiere nueva revisión.

## Publicación y cierre — 2026-10-16

La siguiente invocación `$implement` publica la entrega aceptada en `5cb155f`.
Su [Quality gate](https://github.com/EPraz/keelwatch/actions/runs/38943530054)
pasa completo y #30 queda CLOSED/completed, confirmado mediante lectura posterior.
Los dos MP4 publicados conservan exactamente los hashes aprobados. #27 mantiene
sus dos bloqueos nativos #26/#30, ambos cerrados, y la aprobación editorial está
satisfecha. Este cierre no inicia el portfolio, no cierra la especificación #29
ni sustituye la revisión externa posterior.
