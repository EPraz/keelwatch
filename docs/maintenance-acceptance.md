# Aceptación local de Maintenance — Fase 4

Ticket: [#10](https://github.com/EPraz/keelwatch/issues/10), sobre las implementaciones
locales de #8 y #9. Solo datos sintéticos. Fase 4 aceptada y cierre local confirmado
por el propietario el 2026-10-09; no acredita un despliegue.

## Evidencia automatizada

Desde la raíz, con PostgreSQL local configurado y las migraciones aplicadas:

```text
npm run test:postgres -- maintenance-history.postgres.integration.spec.ts
npm test --workspace @keelwatch/web -- maintenance-history.test.tsx maintenance-detail-page.test.tsx
```

El primer comando ejecuta HTTP real contra NestJS/PostgreSQL con fixtures aislados.
Verifica creación, edición, Plan → Start → Block → Resume → Close y cancelación de
otra orden, leídos como Auditor. Conserva identidad tras inactivar un responsable
sintético y archivar su embarcación. Otra prueba produce 8 eventos, fija timestamps
iguales y recorre páginas de 5 y 3; una nueva escritura entre lecturas no desplaza
los eventos antiguos. La carrera de dos editores confirma un solo cambio, rechaza
el perdedor y comprueba que un fallo de Audit revierte la siguiente escritura.
Las lecturas no modifican la orden ni crean eventos.

React verifica páginas anteriores/siguientes, estados vacío/403/404/401, recuperación
de 503, controles pendientes, foco del encabezado, descarte de respuestas tardías
al cambiar de orden o página y refresh tras escritura confirmada. Axe verifica
estructura en historial vacío y con eventos; no verifica contraste en JSDOM.

Los fixtures eliminan exclusivamente sus propios registros sintéticos. Nunca se
utilizan reset, truncate, reseed ni cuentas personales. El contrato web del historial
se genera desde OpenAPI y se comprueba en la suite Maintenance/PostgreSQL.

## Aceptación manual y registro histórico

**Actualización final del propietario:** confirmó que todos los demás puntos del
procedimiento fueron probados y funcionan. Queda registrada su aceptación funcional
local, incluida cancelación (captura con estado Cancelled). Las observaciones nuevas
de feedback se resolvieron mediante toasts compartidos, contraste del inicio y Reset
de filtros; se verifican adicionalmente con pruebas React y 40 vistas sintéticas
en Chrome aislado. Los párrafos siguientes conservan el historial de intentos.

Actualización tras QA del propietario: sus capturas acreditan creación, listado,
detalle, cambios e historial; confirmó que el paso 4 de conflicto funciona.
Los defectos reportados se corrigieron siguiendo Fleet, Crew y Compliance:
tabla compacta, filtros agrupados, formularios responsive, paginación de 5,
cursor deshabilitado sin estado de espera y eventos en Vessel Activity.
Crear sin fecha sigue permitido mientras Open; Plan exige fecha y responsable.
Los títulos repetidos están permitidos.

La validación visual adicional usa componentes reales con lecturas sintéticas
en Chrome aislado: 20 vistas (dos temas por cinco anchos, listado y detalle),
sin overflow ni errores de ejecución; Enter pagina y enfoca encabezados.
No sustituye el ciclo manual autenticado ni la lectura como Auditor.
La comprobación de contraste señala límites heredados de los botones naranjas
y textos secundarios del tema claro; no se acredita conformidad WCAG completa.

Los bloqueos siguientes describen los intentos iniciales del agente; el propietario
renovó su sesión y continuó sus pruebas después.

El inventario de CUA del 2026-10-09 fue `apps: [], browsers: []`. Computer Use sí
detectó una ventana Chrome de Keelwatch, pero la primera aprobación de lectura
caducó. En su único reintento detuvo el acceso porque no pudo determinar la URL
actual con suficiente confianza para aplicar la política. No se realizaron
acciones de interfaz en ese intento.

Tras recibir `http://localhost:5173/app`, Computer Use pudo verificar la URL y
leer la sesión de Operations Manager. La navegación a Fleet mostró el estado
de carga y después `The access token is invalid or expired`; Try again volvió
a producir el mismo error. API health live respondió `ok`. No hubo escrituras.
Se solicitó renovar la sesión al propietario: Computer Use prohíbe automatizar
diálogos de autenticación. En ese momento el ciclo y sus viewports seguían pendientes;
la aceptación posterior del propietario y la revisión visual resuelven esa brecha.

Los pasos siguientes conservan el procedimiento reproducible. La evidencia de su
ejecución funcional es la confirmación del propietario registrada arriba y en
`docs/progress.md`; no se atribuye esa demo autenticada al agente.
`project-master` exige verificar interfaz en 320–375, 768, 1024 y 1440 px, además
de teclado, foco y movimiento reducido. La revisión final cubrió 48 vistas en dos
temas y seis anchos, sin overflow ni errores de ejecución, con navegación de teclado,
foco y movimiento reducido. El propietario confirmó el cierre local de la fase.

1. Iniciar la aplicación local según README y entrar como Operations Manager.
   Registrar una embarcación sintética activa desde Fleet; anotar su enlace.
2. Crear una orden de inspección con responsable elegible y fecha objetivo.
   Abrir su detalle. Confirmar creación, actor, hora y campos en Order history.
3. Cambiar su título 5 veces con sufijos sintéticos distintos. Después de cada
   guardado comprobar confirmación y actualización del historial. Abrir Older
   history y volver con Newer history; la creación debe seguir alcanzable.
4. Abrir el mismo detalle en dos pestañas antes de editar. Guardar un título en A
   y otro en B desde la misma revisión. B debe mostrar conflicto y conservar su
   borrador. Revisar valores actuales sin volver a guardar; el historial consultado
   como Auditor debe contener únicamente el cambio confirmado en A.
5. Recargar la orden y ejecutar Plan, Start, Block con Awaiting resources, Resume
   y Close. Confirmar cambios de estado y motivo de bloqueo retenido en historial.
   La orden final debe ser legible y no aceptar edición ni nuevas transiciones.
6. Crear otra orden y ejecutar Cancel con Incorrect record. Confirmar motivo y
   estado final. Entrar como Auditor y abrir directamente ambas órdenes: campos,
   historial completo y paginación disponibles, sin controles de escritura.
7. Interrumpir una lectura de historial después de un guardado confirmado. El
   éxito debe permanecer visible; Retry history read debe hacer solo una lectura.
   Navegar a otra orden durante una lectura pendiente y comprobar que no aparece
   contenido de la anterior al completarse.
8. Repetir navegación y acciones aplicables en 320/375, 768, 1024 y 1440 px. Usar
   Tab/Shift+Tab/Enter, comprobar foco visible y foco tras paginar/reintentar,
   textos largos sin desbordamiento, consola sin errores y movimiento reducido.
   Verificar loading, vacío, indisponibilidad, acceso denegado y recurso inexistente.

Registrar fecha, viewport, rol, escenario y resultado observado en `docs/progress.md`,
con capturas sintéticas cuando sea posible. Ningún check pendiente se marca como
aprobado por tener pruebas automatizadas equivalentes.
