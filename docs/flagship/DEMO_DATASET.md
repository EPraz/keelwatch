# Dataset operacional sintético de la demo

Solicitud del propietario, 2026-10-11: ofrecer escenarios visibles en Fleet,
Compliance, Crew y Maintenance antes de que los visitantes creen registros.
Este complemento no inicia #15 ni sustituye la aceptación pública de #12/#13/#14.

## Carga explícita

Desde la raíz del checkout actualizado, con dependencias y cliente Prisma
generado, ejecutar:

```sh
npm run prisma:seed:demo
```

El comando usa `DATABASE_URL` del entorno del proceso o, si no existe, del `.env`
local ignorado. Configurar privadamente la conexión de la base de destino; la
configuración de Render no se copia automáticamente al equipo local. Para cargar
Neon desde el equipo, el valor local debe apuntar a ese Neon. No compartirlo en
chat, logs ni Git. También se puede ejecutar el comando en el checkout del
servicio existente, si su consola está disponible.

La base debe tener las migraciones existentes, el catálogo `SAFETY_EQUIPMENT`
obligatorio y Demo Manager activo con su único rol Operations Manager. El seed
base `npm run prisma:seed`, con `DEMO_ACCESS_ENABLED=true`, provisiona esas cuentas
y el catálogo. El comando operacional no modifica usuarios, roles ni catálogo.
No requiere migraciones nuevas ni reset. No se añade a build, arranque o deploy.

## Escenarios al cargar por primera vez

Todos los nombres, referencias, trabajos y reglas son originales y sintéticos.
Los estados temporales se calculan por la API; la tabla describe el día inicial.

| Embarcación    | Referencia | Escenarios                                                                                                                             |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| MV Demo Aurora | KW-970001  | Certificado válido y otro archivado; dos planes actuales con cobertura completa y aviso; mantenimiento abierto, planificado y cerrado. |
| MV Demo Beacon | KW-970002  | Certificado próximo a vencer; planes actual y terminado; cobertura incompleta; mantenimiento bloqueado.                                |
| MV Demo Coral  | KW-970003  | Certificado vencido; plan futuro; mantenimiento en curso con fecha objetivo pasada.                                                    |
| MV Demo Drift  | KW-970004  | Certificado ausente; plan y mantenimiento cancelados con motivos cerrados.                                                             |
| MV Demo Harbor | KW-970005  | Embarcación archivada, sin nuevos certificados, planes u órdenes.                                                                      |

Se crean 33 registros operacionales: 5 embarcaciones, 4 certificados, 5 perfiles,
7 cualificaciones, 6 planes y 6 órdenes. Los perfiles `KW-C-970001` a
`KW-C-970005` muestran cualificaciones válidas, próximas a vencer, vencidas,
todavía no válidas y ausentes. Las órdenes cubren las tres categorías,
prioridades y los seis estados, con responsables elegibles donde corresponda.
Cada alta y las transiciones iniciales tienen eventos Audit de Demo Manager.

Overview y la cola de Compliance derivan sus datos de esos registros. Activity
y los historiales muestran sus eventos. La watch de notificaciones se obtiene
con el botón existente **Run expiry check** de Manager: el seed no inventa runs,
alertas ni adjuntos, ni ejecuta jobs contra otros registros de la base.

## Conservación y fallos

- Una transacción carga registros y auditoría juntos. Un conflicto de referencia,
  plan solapado, prerrequisito ausente o fallo de escritura revierte la carga.
- IDs y referencias reservadas identifican el dataset. No se adopta ni sobrescribe
  una fila diferente porque tenga una referencia coincidente.
- Una segunda ejecución conserva los registros existentes: nombres editados,
  certificados archivados, cancelaciones, estados, fechas, revisiones e historial.
  Conserva también los registros ajenos al dataset y no duplica auditoría.
- El día UTC de la primera carga queda anclado en la creación de Aurora. Repetir
  el comando no rejuvenece certificados ni desplaza periodos. Los estados cambian
  naturalmente al pasar el tiempo; no hay resets ni refresh automáticos.
- La salida informa `referenceDay`, `created` y `preserved`, sin credenciales.
  Una carga inicial completa informa 33 creados; una repetición completa, 33
  conservados. Un error no imprime mensajes internos de Prisma ni conexiones.

## Verificación

Pruebas PostgreSQL en schemas locales aislados ejecutan el CLI real y consultan
la API por HTTP. Comprueban rollback ante conflicto, los escenarios de ambos
roles, historial de mantenimiento, negativa de escritura de Auditor y repetición
tras modificaciones mediante los endpoints existentes. No ejecutan el seed sobre
la base pública ni sobre los registros locales retenidos.

Después de cargar Neon, abrir Fleet y Compliance con ambos roles, Aurora para
Crew composition/Assignment plans, Crew profiles para vigencias y los workspaces
para órdenes/historial. Los totales pueden incluir registros previos de QA o de
visitantes; el seed los conserva.
