# Fase 6 — registro de la entrevista de alcance

Estado: alcance confirmado por el propietario; entrevista `$grill-with-docs` completada.
Fecha: 2026-10-11 local / 2026-10-12 UTC.

Fuente: [Fase 6 de la hoja de ruta](../maritime-operations-roadmap.md).
La documentación pública seguirá el inglés acordado en la estrategia del portfolio;
este registro de trabajo conserva la entrevista en español.

## Decisiones confirmadas

1. El propietario acepta los cinco bloques: mapa del sistema actual, datos e
   invariantes, consolidación de ADRs, evolución 10×/100× y escenarios de entrevista.
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
8. Cinco casos de entrevista: edición concurrente Maintenance; solapamiento y
   cancelación Crew; rollback de auditoría; idempotencia y reinicio de jobs;
   permisos y sesiones. Cada uno contiene pregunta, respuesta razonada,
   repreguntas, trade-offs y evidencia. Caída de proveedores y degradación son
   repreguntas, distinguiendo comportamiento probado e hipótesis.

## Entregables propuestos para la ejecución posterior

| Bloque                   | Documentos                                                                                                                                                                                            | Verificación                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Entrada y mapa           | Actualizar `docs/flagship/README.md` y `ARCHITECTURE.md`: contexto, contenedores/despliegue, seis módulos, límites de confianza y secuencias Maintenance/Crew.                                        | Mermaid renderiza; dependencias, rutas y secuencias corresponden al código actual.                                       |
| Datos e invariantes      | Actualizar `DOMAIN_MODEL.md`: ownership/ERD completos, constraints e índices aplicados, UTC/intervalos inclusivos, locks, revisión y auditoría atómica; ejemplos de consultas sobre el modelo actual. | Contrastar Prisma y SQL de migraciones; enlazar pruebas de concurrencia, reglas y rollback.                              |
| Decisiones y vocabulario | Consolidar índice/estado de ADRs conservando los ocho históricos; actualizar vigencia y añadir decisiones reales justificadas. Revisar el glosario cuando se resuelvan términos de dominio.           | Separar decisiones vigentes, sustituidas y contexto histórico; no presentar hipótesis futuras como decisiones adoptadas. |
| Evolución                | Crear `EVOLUTION.md`: datos y solicitudes simultáneas por separado, baseline y límites de #15, riesgos/medidas/condiciones y orden razonado de cambios.                                               | Explicitar magnitudes, supuestos y evidencia que falta; no extrapolar capacidad o latencia desde las 30 solicitudes.     |
| Entrevista               | Crear `INTERVIEW_GUIDE.md` con los cinco casos acordados y repreguntas de fallos/degradación.                                                                                                         | Respuestas coherentes con implementación y evidencia; limitaciones identificadas y enlazadas.                            |

La ejecución documental reutiliza componentes, pruebas, contratos y despliegue
existentes. Los hallazgos que requieran cambiar comportamiento se registran como
trabajo separado. No se añaden servicios, gastos, métricas permanentes ni ensayos
destructivos para completar estos entregables.

## Hechos que sustentan el trabajo

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

## Preparación de entrevista incluida

La guía de Fase 6 explica las decisiones de Keelwatch con el contexto, alternativas,
consecuencias, limitaciones y conceptos necesarios para razonar sobre los cinco
casos. Sus fuentes son los ADRs y decisiones aceptadas, el código, las migraciones,
las pruebas y la evidencia medida. Cuando haga falta ampliar un concepto, incorpora
referencias a documentación oficial.

Cada caso proporciona una ruta de lectura dirigida: explicación, evidencia,
fragmentos de código/pruebas relevantes y repreguntas. El propietario practica
explicarlo y contrastarlo con esa evidencia; no se le delega reconstruir todo el
razonamiento leyendo el repositorio por su cuenta. Las justificaciones históricas
no documentadas se identifican como tales, sin inventar motivos o alternativas
supuestamente considerados.

La preparación general de DSA y entrevistas conductuales sigue siendo una línea
paralela. Fase 7 convierte la evidencia en narrativas breves, recorrido y caso de
estudio del portfolio. No son nuevos entregables añadidos a Fase 6.

## Cierre de la entrevista

Las ocho decisiones y la comprensión conjunta están confirmadas. El propietario
responde «sí» a la pregunta final de alcance y pide aclarar la preparación de
entrevista, recogida arriba. El plan queda listo para especificación y tickets.
