# QA de los recorridos demo — #14

Fecha: 2026-10-11. Ticket: [Complete accessible public demo journeys](https://github.com/EPraz/keelwatch/issues/14).
Base de revisión aprobada: `c5f689c`, después de #13. Puntos de prueba aprobados:
HTTP real y comportamiento renderizado de React.

## Alcance y estado

El propietario autoriza continuar la implementación local sobre #12 y #13 y comunica
que su QA local de esos tickets pasó. Ese resultado es una aceptación manual
reportada por el propietario; no es una ejecución pública realizada por Codex.
#13 continúa abierto en GitHub. La continuación local no elimina ese bloqueo ni
cierra #14 o Fase 5. No se publica, despliega ni activa una configuración pública.

Las correcciones conservan la interfaz existente: Crew composition y Assignment
plans mantienen el contraste de las secciones sin marco, con sus extremos alineados
con los paneles vecinos. Las etiquetas de sección conservan los 8 px del token
compartido antes del título; los valores de Fleet identity usan 14 px, salvo la
insignia de estado, que conserva su estilo. El identificador mantiene su fuente
monoespaciada. Se corrigen contrastes en ambos temas y el skeleton de Compliance a
320 px. Los segmentos nativos de fecha conservan el contorno compartido al recibir
foco de teclado. La validación de asignaciones y cancelación permanece junto al campo al
cerrar el Toast. Cerrar un error de lectura mantiene la explicación y la recuperación
en la sección; los resultados de operaciones siguen usando el Toast compartido.

El seguimiento de las cuatro capturas del propietario alinea también Crew profiles
sin añadir marco. Compliance, Fleet identity y formularios compartidos se apilan
por debajo de 1280 px; las acciones de filtros Maintenance pasan debajo de sus
campos para evitar comprimir las selecciones. La composición de escritorio se
conserva a partir de 1280 px. Ver la [revisión visual](../../.design/public-demo-quality/DESIGN_REVIEW.md).
Las capturas aportadas son evidencia visual, sin aceptación funcional/pública implícita.

## Evidencia automatizada local

- Las suites existentes ejercitan la API por HTTP real, con autorización y errores
  negativos. PostgreSQL verifica los recorridos de las dos cuentas demo, límites
  compartidos, cambios operativos, overlap, revisiones concurrentes e historial.
  No se sustituye la frontera de autorización del servidor.
- React ejercita los componentes y las interacciones existentes con la API externa
  como frontera. Las regresiones de #14 verifican descripciones de campo tras cerrar
  el Toast y reintento de lectura en Compliance, Crew y Maintenance, conservando
  el resultado de escrituras ya confirmadas sin repetirlas.
- Chrome local renderiza componentes reales con respuestas externas sintéticas.
  Esta evidencia comprueba presentación e interacción, no la persistencia real,
  el proveedor de identidad ni el sitio público. Los artefactos temporales están
  ignorados en `.scratch/phase-5-journeys/` y `.scratch/phase-5-access/`.
- Referencias del fixture visual: vessel `KW-900014`, `MV Synthetic Journey`,
  profile `KW-C-000001`, `Jordan Vale`, certificado `QA-CERT-14` de `Synthetic Registry`,
  order `Synthetic pump inspection`. Los identificadores de las suites HTTP son
  sintéticos y aislados por ejecución; no son referencias del entorno público.
- Operador automatizado: Codex. Los comandos y resultados finales quedan en
  [docs/progress.md](../progress.md). No se declara conformidad WCAG completa.

## Repetir QA manual

Con el entorno local existente configurado según el README, ejecutar `npm run dev`
y abrir `http://localhost:5173/sign-in`. Usar las cuentas demo ya provisionadas.
La API debe ofrecer ambos roles para poder completar ambos recorridos.

Para aceptación pública, repetir en la URL y revisión desplegadas, y registrar
operador, fecha/hora UTC, navegador, rol, referencias sintéticas y resultado. No
copiar tokens, credenciales ni datos personales a capturas o al registro.

| Recorrido                 | Pasos y resultado esperado                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access / Fleet            | Entrar con Manager mediante teclado; crear o editar un vessel sintético; comprobar resultado y Activity; recargar. Cerrar sesión, entrar como Auditor, leer el mismo registro y comprobar ausencia de controles de escritura. Las suites HTTP verifican además el rechazo de escrituras del Auditor. Cerrar sesión y recargar para comprobar que no permanece la sesión anterior. |
| Certificados / Compliance | Manager registra evidencia sintética con fechas válidas, comprueba el estado, edita y archiva mediante las acciones existentes. Verificar historial y estado después de cada cambio; Auditor los consulta sin edición. Probar fechas inválidas y error/reintento conservando el borrador. Los archivos permanecen deshabilitados en la demo.                                      |
| CrewAssignment            | Elegir un profile sintético, función y fechas; guardar y revisar plan/composición. Intentar un período solapado, verificar rechazo, conservar fechas y corregirlas. Enviar campos vacíos, cerrar el Toast y comprobar indicaciones junto a cada campo. Cancelar con motivo y revisar historial; Auditor consulta el resultado.                                                    |
| MaintenanceOrder          | Crear una orden sintética y recorrer las transiciones permitidas hasta un estado final, comprobando revisión e historial. Abrir la misma orden en dos pestañas Manager: guardar en una, intentar guardar la revisión anterior en la otra, revisar el registro actual y recuperar conservando el borrador. Auditor consulta orden/historial sin acciones de edición.               |

En cada recorrido comprobar 320/375/768/1024/1440 px, ambos temas, Tab/Shift+Tab,
Enter y foco visible; etiquetas y controles comprensibles, sin scroll horizontal.
Agregar 1025/1080/1100/1180 y 1280 px para comprobar la transición al sidebar:
selecciones de Maintenance legibles y paneles sin comprimirse. En Crew profiles,
la etiqueta, título y lista deben alinearse con la cabecera y el extremo del formulario,
conservando la sección sin marco.
Comprobar preferencia de movimiento reducido. Verificar carga, vacío, acceso denegado,
pendiente, validación, fallo de red/servidor, reintento y resultado confirmado donde
apliquen. Las herramientas de red del navegador permiten simular fallos sin alterar
las reglas ni permisos. Cerrar un Toast de lectura debe dejar disponible su reintento;
los anuncios de operaciones no deben desplazar la página.

## Registro de aceptación pública pendiente

| Recorrido                   | Operador / UTC | URL / revisión / navegador | Referencias sintéticas | Resultado / limitaciones     |
| --------------------------- | -------------- | -------------------------- | ---------------------- | ---------------------------- |
| Access / Fleet, ambos roles | Pendiente      | Pendiente                  | Pendiente              | Sin ejecución pública de #14 |
| Certificados / Compliance   | Pendiente      | Pendiente                  | Pendiente              | Sin ejecución pública de #14 |
| CrewAssignment              | Pendiente      | Pendiente                  | Pendiente              | Sin ejecución pública de #14 |
| MaintenanceOrder            | Pendiente      | Pendiente                  | Pendiente              | Sin ejecución pública de #14 |

La aceptación pública y la revisión manual del propietario sobre estos cambios
siguen pendientes. #15 continúa como siguiente incremento separado.
