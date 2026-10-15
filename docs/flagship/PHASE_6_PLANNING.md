# Fase 6 — registro de la entrevista de alcance

Estado: alcance confirmado por el propietario; entrevista `$grill-with-docs` completada.
Fecha: 2026-10-11 local / 2026-10-12 UTC.

Fuente: [Fase 6 de la hoja de ruta](../maritime-operations-roadmap.md).
Especificación publicada: [#16 — Architecture and System Design evidence](https://github.com/EPraz/keelwatch/issues/16),
con etiqueta `ready-for-agent`.
Cortes aprobados y publicados como sub-issues de #16:
[#17](https://github.com/EPraz/keelwatch/issues/17), mapa del sistema y datos;
[#18](https://github.com/EPraz/keelwatch/issues/18), Maintenance;
[#19](https://github.com/EPraz/keelwatch/issues/19), Crew;
[#20](https://github.com/EPraz/keelwatch/issues/20), Access;
[#21](https://github.com/EPraz/keelwatch/issues/21), auditoría/reconciliación;
[#22](https://github.com/EPraz/keelwatch/issues/22), evolución y verificación conjunta.
#17–#21 no tienen bloqueadores; #22 depende de los cinco mediante relaciones
nativas. La publicación conservó `ready-for-agent`; este registro de entrevista no
inició implementación. El propietario autoriza `$implement #17` el 2026-10-14;
su evidencia se registra en `docs/progress.md`. A continuación autoriza #18 en la
misma fecha; su caso Maintenance y ADR retrospectivo siguen la frontera documental.
Después autoriza #19 en la misma fecha; su caso Crew y ADR retrospectivo conservan
el alcance documental. Después autoriza #20 en la misma fecha; el caso Access
conserva las decisiones existentes y explica sus límites. La siguiente invocación
`$implement` continúa con #21, recomendado al cerrar #20: casos separados de
rollback/reconciliación y ADR retrospectivo del runner. La siguiente invocación
continúa con #22, recomendado al cerrar #21: evolución condicionada y verificación
conjunta. El propietario autoriza después publicar, confirma la aceptación del
paquete con CI verde y cerrar #16–#22; se verifica el cierre. La siguiente
[entrevista de Fase 7](./PHASE_7_PLANNING.md) conserva preparación privada separada.
La documentación pública seguirá el inglés acordado en la estrategia del portfolio;
este registro de trabajo conserva la entrevista en español.

## Decisiones confirmadas

1. El propietario acepta los cinco bloques: mapa del sistema actual, datos e
   invariantes, consolidación de ADRs, evolución 10×/100× y casos técnicos.
   Se construyen sobre el código y las pruebas existentes; la evolución futura se
   documenta como hipótesis con condiciones para adoptarla.
2. Maintenance y Crew son los casos centrales: edición concurrente y prevención
   de solapamientos. Access y la reconciliación de Compliance sirven de apoyo.
3. Diagramas Mermaid versionados en el repositorio para contexto, despliegue,
   módulos y secuencias de concurrencia de Maintenance/Crew, con enlaces al código.
4. Evolución 10×/100× separa volumen de datos y concurrencia de usuarios. Los
   supuestos se explicitan y cada cambio se condiciona a mediciones futuras;
   #15 aporta una referencia limitada, no prueba de capacidad multiplicada.
5. Los ADRs conservan su historia y explican su vigencia. Se añaden decisiones
   únicamente cuando alternativas y consecuencias reales merecen quedar registradas;
   se evalúan concurrencia, jobs y reposo de la demo con ese criterio.
6. El eje de concurrencia se expresa como 1, 10 y 100 solicitudes API simultáneas
   de visitantes de la demo compartida, manteniendo ambas DemoAccounts. Visitantes,
   solicitudes simultáneas y cuentas User son cantidades distintas. No se ejecuta
   esa carga pública como parte de esta fase.
7. Criterios de terminado: diagramas renderizados, afirmaciones importantes
   enlazadas al código/pruebas, historia y vigencia explícitas en decisiones,
   supuestos/señales/condiciones concretos en evolución y una entrada breve para
   guiar al reviewer a los dos casos centrales.
8. Cinco casos: edición concurrente Maintenance; solapamiento y
   cancelación Crew; rollback de auditoría; idempotencia y reinicio de jobs;
   permisos y sesiones. La documentación pública explica problema, mecanismo,
   consecuencias, trade-offs, límites y evidencia. La guía de práctica privada
   añade preguntas, respuestas razonadas y repreguntas. Caída de proveedores y
   degradación distinguen comportamiento probado e hipótesis.
9. El propietario confirma separar visibilidad: arquitectura, datos, ADRs,
   evolución y casos técnicos se publican; preguntas de práctica, respuestas
   modelo, guiones y notas personales permanecen locales fuera del Git publicado.
   Autoriza ajustar #16 con este criterio antes de publicar los tickets hijos.

## Entregables propuestos para la ejecución posterior

| Bloque                   | Documentos                                                                                                                                                                                            | Verificación                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Entrada y mapa           | Actualizar `docs/flagship/README.md` y `ARCHITECTURE.md`: contexto, contenedores/despliegue, seis módulos, límites de confianza y secuencias Maintenance/Crew.                                        | Mermaid renderiza; dependencias, rutas y secuencias corresponden al código actual.                                       |
| Datos e invariantes      | Actualizar `DOMAIN_MODEL.md`: ownership/ERD completos, constraints e índices aplicados, UTC/intervalos inclusivos, locks, revisión y auditoría atómica; ejemplos de consultas sobre el modelo actual. | Contrastar Prisma y SQL de migraciones; enlazar pruebas de concurrencia, reglas y rollback.                              |
| Decisiones y vocabulario | Consolidar índice/estado de ADRs conservando los ocho históricos; actualizar vigencia y añadir decisiones reales justificadas. Revisar el glosario cuando se resuelvan términos de dominio.           | Separar decisiones vigentes, sustituidas y contexto histórico; no presentar hipótesis futuras como decisiones adoptadas. |
| Evolución                | Crear `EVOLUTION.md`: datos y solicitudes simultáneas por separado, baseline y límites de #15, riesgos/medidas/condiciones y orden razonado de cambios.                                               | Explicitar magnitudes, supuestos y evidencia que falta; no extrapolar capacidad o latencia desde las 30 solicitudes.     |
| Casos públicos           | Explicaciones técnicas de los cinco casos acordados, con mecanismos, decisiones, consecuencias y evidencia.                                                                                           | Coherencia con implementación y pruebas; limitaciones identificadas y enlazadas.                                         |
| Práctica privada         | Guía personal y tarea local en `.scratch/phase-6-interview/`, excluidas de Git y de GitHub Issues.                                                                                                    | Preguntas, respuestas y lecturas dirigidas sobre la evidencia pública; no condiciona la aceptación del paquete público.  |

La ejecución documental reutiliza componentes, pruebas, contratos y despliegue
existentes. Los hallazgos que requieran cambiar comportamiento se registran como
trabajo separado. No se añaden servicios, gastos, métricas permanentes ni ensayos
destructivos para completar estos entregables.

## Hechos al cerrar la entrevista

Estos hallazgos describen la documentación inspeccionada durante la entrevista,
antes de #17–#22. El estado posterior está en los mapas actuales, la
[verificación conjunta](./EVIDENCE_VERIFICATION.md) y el registro de progreso.

- La composición actual incluye Access, Fleet, Compliance, Audit, Crew y
  Maintenance. `ARCHITECTURE.md` omite los dos últimos en su mapa y conserva
  afirmaciones antiguas de acceso demo/publicación. Necesita contrastarse con el
  código actual y con la aceptación de Fase 5.
- `DOMAIN_MODEL.md` tiene reglas Crew, pero su ownership/ERD no incluyen Maintenance
  y describen como futura una concurrencia ya implementada. Las migraciones SQL
  contienen constraints e índices que también deben considerarse.
- Crew toma un lock por perfil y comprueba solapamientos inclusivos entre planes
  no cancelados en toda la flota. No hay exclusion constraint para esa reserva.
- Maintenance combina `expectedRevision`, actualización condicionada por revisión
  y bloqueo de orden. Sus escrituras y auditoría son atómicas; describirlo como
  exclusivamente optimista o sin locks sería incorrecto.
- La reconciliación de Compliance usa un runner acotado al proceso y constraints
  de PostgreSQL. No acredita scheduling distribuido ni recuperación automática
  de runs tras un reinicio.
- El despliegue vigente usa Vercel, Render gratuito y Neon Free. Los ADRs de hosting
  y adjuntos contienen historia que debe distinguirse de las capacidades actuales.
- #15 conserva 30 intentos públicos y sus límites. Son tiempos cliente sobre una
  demo pequeña, sin evidencia que atribuya un cuello SQL o pruebe capacidad 10×/100×.
- Evaluation, Composition y tipos Maintenance se generan/verifican desde Swagger
  en pruebas PostgreSQL. Otros tipos y el transporte HTTP se mantienen por feature.
  La documentación debe distinguir tipos generados, transporte manual y validación
  runtime; no existe el cliente central generado que sugiere el árbol antiguo.

## Preparación de entrevista privada

La evidencia pública de Fase 6 explica las decisiones de Keelwatch con el contexto, alternativas,
consecuencias, limitaciones y conceptos necesarios para razonar sobre los cinco
casos. Sus fuentes son los ADRs y decisiones aceptadas, el código, las migraciones,
las pruebas y la evidencia medida. Cuando haga falta ampliar un concepto, incorpora
referencias a documentación oficial.

Cada caso público proporciona una ruta de lectura dirigida: explicación, evidencia
y fragmentos de código/pruebas relevantes. La guía privada añade preguntas,
respuestas razonadas, repreguntas y apoyo para ensayar. El propietario practica
explicarlo y contrastarlo con esa evidencia; no se le delega reconstruir todo el
razonamiento leyendo el repositorio por su cuenta. Las justificaciones históricas
no documentadas se identifican como tales, sin inventar motivos o alternativas
supuestamente considerados.

La guía y su seguimiento se mantienen únicamente en la carpeta local ignorada
`.scratch/phase-6-interview/`; no se crean issues públicos para esa tarea ni se
incluyen respuestas personales en documentos publicados. Se prepara después de
completar el paquete técnico público y no bloquea su aceptación.

La preparación general de DSA y entrevistas conductuales sigue siendo una línea
paralela. Fase 7 convierte la evidencia en narrativas breves, recorrido y caso de
estudio del portfolio. No son nuevos entregables añadidos a Fase 6.

## Cierre de la entrevista

Las ocho decisiones y la comprensión conjunta están confirmadas. El propietario
responde «sí» a la pregunta final de alcance y pide aclarar la preparación de
entrevista, recogida arriba. Posteriormente confirma la separación de visibilidad
y autoriza corregir #16. Después aprueba el desglose revisado de seis tickets
públicos y una tarea privada. Los seis se publican y verifican; la guía y su
seguimiento permanecen locales. Tras publicar/aceptar el paquete de #22, esa
preparación puede abordarse por separado; todavía no se ha realizado aquí.
