# Aceptación local de Maintenance — Fase 4

Ticket: [#10](https://github.com/EPraz/keelwatch/issues/10), sobre las implementaciones
locales de #8 y #9. Solo datos sintéticos. Esta guía no cierra issues ni acredita
un despliegue.

## Evidencia automatizada

Desde la raíz, con PostgreSQL local configurado y las migraciones aplicadas:

```text
npm run test:postgres -- maintenance-history.postgres.integration.spec.ts
npm test --workspace @keelwatch/web -- maintenance-history.test.tsx maintenance-detail-page.test.tsx
```

El primer comando ejecuta HTTP real contra NestJS/PostgreSQL con fixtures aislados.
Verifica creación, edición, Plan → Start → Block → Resume → Close y cancelación de
otra orden, leídos como Auditor. Conserva identidad tras inactivar un responsable
sintético y archivar su embarcación. Otra prueba produce 23 eventos, fija timestamps
iguales y recorre páginas de 20 y 3; una nueva escritura entre lecturas no desplaza
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

## Demo manual pendiente

El inventario de CUA del 2026-10-09 fue `apps: [], browsers: []`. Los pasos siguientes
son un procedimiento reproducible, **no evidencia de haber ejecutado la demo**.
`project-master` exige verificar interfaz en 320–375, 768, 1024 y 1440 px, además
de teclado, foco y movimiento reducido. La fase permanece abierta hasta hacerlo.

1. Iniciar la aplicación local según README y entrar como Operations Manager.
   Registrar una embarcación sintética activa desde Fleet; anotar su enlace.
2. Crear una orden de inspección con responsable elegible y fecha objetivo.
   Abrir su detalle. Confirmar creación, actor, hora y campos en Order history.
3. Cambiar su título 20 veces con sufijos sintéticos distintos. Después de cada
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
