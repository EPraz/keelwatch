# Fase 7 — registro de la entrevista de alcance

Estado: alcance, verificación y desglose aprobados; especificación
[#23](https://github.com/EPraz/keelwatch/issues/23) y tickets #24–#28 publicados.
No se ha iniciado la implementación ni aprobado el contenido todavía no escrito.
Fecha: 2026-10-14 local / 2026-10-15 UTC.

Fuentes: [estrategia del portfolio](../portfolio-strategy.md),
[Fase 7 del roadmap](../maritime-operations-roadmap.md#fase-7--presentación-y-preparación-laboral)
y [paquete técnico de Fase 6](./README.md).

## Decisiones confirmadas

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

## Hechos comprobados para el plan

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
