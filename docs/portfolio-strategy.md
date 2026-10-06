# Estrategia del portfolio de ingeniería

Estado: estrategia canónica aprobada para iniciar planificación detallada

Propietario: Edwin Pile

Última revisión: 2026-10-06

Ejecución: [`docs/maritime-operations-roadmap.md`](./maritime-operations-roadmap.md)
Definición del flagship: [`docs/flagship/`](./flagship/README.md)

## 1. Propósito de este documento

Este documento fija la dirección estable del portfolio. Debe responder qué
queremos demostrar, a quién, con qué proyectos y bajo qué límites. No es una
lista de tareas ni un registro diario.

Solo debería cambiar si cambia alguno de estos elementos:

- El mercado o los roles objetivo.
- La decisión sobre el proyecto principal.
- La evidencia profesional que necesitamos cubrir.
- Una restricción legal, de confidencialidad o de tiempo.
- Un hallazgo que invalide una decisión estratégica.

El avance, los bloqueos y los próximos pasos viven en la hoja de ruta. Las
decisiones técnicas concretas del proyecto principal vivirán en ADRs dentro de
su propio repositorio cuando exista una decisión real que documentar.

## 2. Decisión ejecutiva

El portfolio tendrá una pieza principal profunda y, como máximo, dos proyectos
secundarios con una función diferenciada. No intentará demostrar experiencia
mediante volumen, etiquetas de seniority ni complejidad artificial.

La estructura acordada es:

1. **Flagship:** una plataforma personal de operaciones marítimas construida
   clean-room, con identidad, modelo, reglas, datos y código propios.
2. **Secundario potencial:** un servicio de telemetría y alertas en C#/.NET,
   únicamente si el flagship deja una brecha visible en backend, concurrencia o
   rendimiento.
3. **Secundario opcional:** una experiencia móvil de inspección offline,
   únicamente si necesitamos demostrar React Native y sincronización offline.

El sitio web independiente del portfolio será la capa de presentación de esa evidencia. No sustituye
los repositorios, las demostraciones, las pruebas ni la documentación técnica de
los proyectos.

## 3. Portfolio thesis

### Criterio de alcance: demo primero

Antes de implementar cada incremento, explicar qué señal aporta al evaluador,
la versión mínima útil y su coste en tiempo, seguridad y operación. Los servicios
externos o la infraestructura adicional requieren aprobación previa, incluso si
se empieza con adapters simulados. No construir capacidades comerciales por
anticipación ni convertir una lista de tecnologías en un objetivo.

El 2026-10-06 se retiraron cargas y descargas de archivos: la demo demuestra
certificados mediante sus registros, fechas, permisos e historial, sin buckets
ni antivirus. Véase [ADR-0007](./flagship/architecture/decisions/0007-disable-file-attachments-in-portfolio-demo.md).
La simplificación no elimina los controles de seguridad de las funciones activas.

Tesis pública de trabajo:

> I build reliable operational software—from clear interfaces and APIs to data
> models, authorization, and production delivery.

La impresión buscada no es “conoce muchas tecnologías”, sino:

> Puede entender un dominio operativo, convertirlo en un sistema mantenible,
> justificar sus decisiones y llevar una funcionalidad completa hasta
> producción.

La comunicación pública será en inglés y estará orientada al mercado laboral de
Estados Unidos. La documentación interna puede permanecer en español mientras
facilite decisiones más precisas.

## 4. Perfil profesional que comunicaremos

- Software Engineer con aproximadamente 5.5 años de experiencia profesional.
- Nivel objetivo: Mid-Level / Software Engineer II.
- Posiciones principales: Full-Stack Engineer con inclinación backend, Backend
  Engineer en TypeScript/NestJS o C#/.NET y Software Engineer generalista.
- Fortalezas: React, TypeScript, NestJS, C#, APIs REST, SQL, NoSQL y entrega
  full-stack.
- Diferenciador: experiencia construyendo software operacional y capacidad de
  explicar arquitectura, datos, autorización, calidad y operación.

No utilizaremos “Senior”, “Architect” ni cifras salariales como afirmaciones de
nivel. La profundidad del trabajo debe permitir que el evaluador llegue a sus
propias conclusiones.

## 5. Audiencias y señal esperada

| Audiencia                      | Qué debe comprobar rápidamente                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Recruiter técnico              | Rol objetivo, experiencia, stack relevante, ubicación/permiso de trabajo cuando corresponda y enlaces funcionales.                  |
| Hiring manager                 | Ownership, capacidad de entrega, decisiones proporcionadas al problema y comunicación clara.                                        |
| Senior/Staff Engineer          | Límites de módulos, invariantes, modelo de datos, pruebas, fallos, seguridad y trade-offs.                                          |
| Entrevistador de System Design | Capacidad de evolucionar el sistema con carga, disponibilidad y consistencia crecientes sin saltar prematuramente a microservicios. |

Una revisión de diez minutos debe permitir entender el problema, ejecutar o ver
la demostración, inspeccionar una funcionalidad completa y encontrar las
decisiones arquitectónicas más importantes.

## 6. Flagship: Keelwatch

### Decisión

La plataforma de operaciones marítimas es el mejor flagship porque combina un
dominio creíble con problemas reales de interfaz, autorización, modelado
relacional, workflows, auditoría, procesamiento asíncrono y operación. Es más
representativa que un producto genérico y permite demostrar profundidad sin
inventar escala.

Keelwatch es el nombre aprobado para el proyecto personal. No reutiliza nombres
profesionales previos ni la identidad de un empleador o cliente.

### Historia del producto

Un equipo de operaciones necesita mantener una visión confiable de su flota,
documentación reglamentaria, tripulación y mantenimiento. Diferentes roles
deben actuar sobre los mismos datos con permisos distintos, conservar trazas de
cambio y detectar riesgos antes de que interrumpan una operación.

### Alcance funcional inicial

- Autenticación y autorización por roles aplicadas en el servidor.
- Registro y consulta de embarcaciones.
- Certificados, fechas de expiración, documentos y estados de cumplimiento.
- Perfiles y cualificaciones de tripulación, si aportan una regla de negocio
  verificable.
- Órdenes de mantenimiento con estados y transiciones explícitas.
- Historial de auditoría para acciones críticas.
- Dashboard derivado de datos reales del sistema, no de métricas decorativas.

Combustible, tracking en tiempo real, facturación, integraciones externas y una
aplicación móvil quedan fuera de la primera entrega. Solo se incorporarán si
crean una señal técnica que no podamos demostrar de una forma más simple.

## 7. Límite clean-room y confidencialidad

El flagship estará inspirado en la clase de problemas del dominio, no en una
implementación privada. Antes de crear código público se documentará la frontera
clean-room.

Está permitido:

- Usar conocimiento general del dominio marítimo y fuentes públicas.
- Diseñar desde cero nombres, workflows, reglas, esquemas y arquitectura.
- Crear datos completamente sintéticos.
- Describir aprendizajes profesionales de forma general y no confidencial.

Está prohibido:

- Copiar código, esquemas, migraciones, consultas, pruebas o configuración.
- Reproducir interfaces, textos, nombres internos o flujos propietarios.
- Utilizar datos, capturas, documentos o métricas de clientes o empleadores.
- Presentar el proyecto personal como el producto o resultado de un cliente.
- Publicar detalles que permitan reconstruir lógica operativa confidencial.

Ante una duda, la regla será rediseñar el elemento desde principios públicos o
excluirlo. El README declarará que es un proyecto personal clean-room y que sus
datos son sintéticos.

## 8. Arquitectura propuesta

La primera arquitectura será un monolito modular desplegable, no una colección
de microservicios.

### Frontend

- React y TypeScript.
- Componentes compuestos y límites por funcionalidad.
- Separación explícita entre estado remoto, estado de formulario y estado local
  de interfaz.
- Formularios complejos, tablas, filtros y estados de loading, error, vacío y
  acceso denegado.
- Diseño responsive, navegación por teclado y accesibilidad verificable.
- Manejo de errores en los límites apropiados y telemetría de fallos útil.

### Backend

- NestJS organizado por módulos de negocio, no por capas técnicas globales.
- API REST documentada mediante OpenAPI.
- Autenticación basada en estándares y RBAC verificado en el servidor.
- Validación en los límites, errores consistentes, logging estructurado e
  idempotencia donde una operación pueda repetirse.
- Módulos iniciales: Identity/Access, Fleet, Compliance, Crew, Maintenance y
  Audit.

### Datos

- PostgreSQL y Prisma.
- Constraints e invariantes protegidas por la base de datos cuando corresponda.
- Índices derivados de consultas medidas, no añadidos por intuición.
- Migraciones reproducibles, seeds sintéticos y estrategia documentada de
  backup/restauración.
- Transacciones explícitas para cambios que deban ser atómicos.

### Entrega y operación

- Entorno local reproducible con contenedores.
- CI con lint, typecheck, pruebas, validación de migraciones y build.
- Despliegue público con ambientes y secretos separados.
- Logs estructurados, métricas operativas y trazas cuando aporten diagnóstico.
- Alertas y runbooks para escenarios de fallo seleccionados.

### Complejidad condicionada por evidencia

| Tecnología o patrón   | Se añade únicamente cuando                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Background jobs/queue | Exista un trabajo reintentable o lento, como notificaciones de expiración o reportes.                        |
| Redis/cache           | Una medición muestre una consulta costosa y exista una estrategia correcta de invalidación.                  |
| WebSockets            | Haya una necesidad de actualización en tiempo real que polling razonable no resuelva.                        |
| Object storage        | Los documentos adjuntos sean parte aprobada del flujo y sus permisos estén definidos.                        |
| Microservicios        | Límites de despliegue, ownership o escala independientes lo justifiquen con evidencia.                       |
| Kubernetes            | La complejidad operativa y de despliegue supere de forma demostrable una plataforma administrada más simple. |

No implementaremos tecnologías solo para poder nombrarlas.

## 9. Proyectos secundarios y puertas de decisión

No se inicia un secundario hasta que el flagship esté desplegado, probado,
documentado y presentado como caso de estudio.

### Servicio de telemetría y alertas en C#/.NET

Función: cubrir una posible brecha de backend y rendimiento sin repetir una
aplicación full-stack completa.

Señales previstas:

- ASP.NET Core y procesamiento concurrente.
- Ingesta idempotente y control de backpressure.
- Modelado temporal y consultas agregadas.
- Reglas de alerta, reintentos y manejo de fallos.
- Load testing con metodología reproducible.

### Aplicación móvil de inspecciones offline

Función: demostrar React Native/Expo, almacenamiento local, resolución de
conflictos y sincronización. Solo se construirá si los roles objetivo valoran
esa señal o si constituye una extensión natural del flagship.

Si una revisión objetiva no detecta una brecha, no se construirá otro proyecto.
Un flagship excelente y un secundario específico son preferibles a tres
proyectos parcialmente terminados.

## 10. Qué aprender durante la construcción

- Diseñar invariantes y límites de módulos antes de seleccionar infraestructura.
- Profundizar en PostgreSQL: planes de consulta, índices, locks y transacciones.
- Aplicar autorización consistente y probar intentos de acceso indebido.
- Diseñar contratos de error y operaciones idempotentes.
- Medir rendimiento y explicar qué cambió después de optimizar.
- Practicar observabilidad, recuperación y respuesta ante fallos.
- Comunicar decisiones mediante ADRs, diagramas y demostraciones concisas.

DSA seguirá como una línea paralela de preparación. No introduciremos
algoritmos artificiales en el producto. System Design sí se apoyará en casos
reales del flagship: expiraciones, concurrencia de órdenes, auditoría,
notificaciones, archivos, lectura intensiva y evolución de escala.

## 11. Evidencia pública

### En GitHub

El repositorio del flagship debe incluir:

- README con problema, audiencia, alcance y enlace a demo.
- Capturas o video corto de los workflows principales.
- Inicio local reproducible y datos demo sintéticos.
- Diagrama de contexto/contenedores y mapa de módulos.
- Modelo de datos e invariantes importantes.
- Estrategia de autenticación, autorización y threat model acotado.
- Estrategia y resultados de pruebas.
- Metodología y resultados de load testing.
- Observabilidad, escenarios de fallo y runbooks.
- ADRs de decisiones reales y alternativas rechazadas.
- Limitaciones conocidas y evolución futura.

### En el portfolio web

El flagship tendrá una presentación editorial, no una lista de tecnologías:

1. Problema operacional.
2. Rol y alcance personal.
3. Workflow demostrable.
4. Arquitectura y una o dos decisiones difíciles.
5. Evidencia de calidad, rendimiento y operación.
6. Demo, repositorio y recorrido técnico.

El rediseño visual definitivo del sitio se hará a partir de esta evidencia, no
antes. Los artefactos del rediseño previo permanecen como historial, pero ya no
definen la estrategia del portfolio.

## 12. Métricas válidas

No inventaremos impacto comercial. Se reportarán métricas reproducibles con
contexto:

- Latencia p50/p95/p99 y throughput bajo una carga documentada.
- Tasa de errores y comportamiento durante fallos inducidos.
- Tamaño del dataset, entorno, hardware y versión del escenario medido.
- Consultas críticas antes y después de optimizaciones.
- Tiempo de recuperación en ejercicios concretos.
- Cobertura como dato auxiliar, acompañada por tipos y criticidad de pruebas.
- Accesibilidad, rendimiento web y tamaño de bundle cuando sean relevantes.
- Tiempo y resultado de los quality gates en CI.

Cada cifra pública debe enlazar a su método de reproducción o indicar claramente
su entorno. “Escala empresarial” y “production-grade” no se usarán como
sustitutos de evidencia.

## 13. Señales de profundidad y señales de tutorial

### Señales profesionales

- Reglas de negocio e invariantes explícitas.
- Autorización negativa probada, no solo login funcional.
- Datos y migraciones realistas.
- Estados de error y recuperación visibles.
- Pruebas elegidas por riesgo.
- Decisiones y trade-offs explicados con alternativas.
- Despliegue, observabilidad, runbooks y límites conocidos.
- Historial de commits comprensible y entregas verticales.

### Señales de tutorial que evitaremos

- CRUD sin restricciones ni estados de negocio.
- Arquitectura copiada sin explicación.
- Muchas dependencias para resolver problemas inexistentes.
- Microservicios, colas o caché sin medición o necesidad.
- Dashboards con números ficticios.
- README que enumera stack pero no explica el sistema.
- Solo happy paths, datos perfectos y ausencia de pruebas de permisos.
- Diez proyectos similares e incompletos.

## 14. Criterios de éxito

La estrategia funciona cuando:

- El flagship puede demostrarse de extremo a extremo en pocos minutos.
- Un reviewer puede localizar un workflow completo desde UI hasta persistencia y
  pruebas.
- Las decisiones técnicas tienen una razón y una alternativa explícita.
- Los límites clean-room son verificables.
- La aplicación desplegada maneja autorización, fallos y datos no ideales.
- Las métricas publicadas son reproducibles.
- La documentación permite discutir evolución, consistencia, concurrencia,
  seguridad, rendimiento y recuperación en una entrevista.
- El portfolio web dirige a evidencia real sin exagerar experiencia o impacto.
- Todo proyecto secundario cubre una brecha que el flagship no cubre.

## 15. Qué no construiremos

- Proyectos de tutorial, clones o CRUDs sin dominio.
- Una colección de demos pequeñas para llenar una cuadrícula.
- Un ecosistema de microservicios desde el primer día.
- Infraestructura cuyo costo de operación supere su valor demostrativo.
- Funcionalidades sin un usuario, regla o escenario verificable.
- Métricas, clientes, resultados o escalas inventadas.
- Copias de propiedad intelectual o información confidencial.
- Un nuevo rediseño completo del portfolio antes de producir la evidencia que
  debe presentar.

## 16. Jerarquía documental

1. Este archivo define la dirección y los límites.
2. [`docs/maritime-operations-roadmap.md`](./maritime-operations-roadmap.md)
   define el orden, estado y criterios de salida.
3. Este repositorio independiente de Keelwatch es la fuente de verdad técnica
   mediante README, ADRs, diagramas, pruebas y runbooks.
4. El portfolio web resumirá y enlazará esa evidencia.

Si dos documentos se contradicen, se corrige primero esta estrategia y después
se deriva nuevamente la hoja de ruta. No se duplicarán decisiones técnicas en
múltiples lugares.
