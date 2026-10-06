# Product brief — Keelwatch

Estado: baseline funcional de Fase 0

Nombre: provisional

Descriptor: Maritime compliance and operations workspace

## Product statement

Keelwatch ayuda a un equipo marítimo pequeño a saber qué embarcaciones están
listas para operar, qué evidencia falta y qué acción debe realizarse después,
sin depender de hojas de cálculo y recordatorios aislados.

No intenta controlar navegación, tráfico marítimo ni hardware a bordo. Organiza
registros operativos y conserva evidencia de quién cambió información crítica.

## Usuario principal

El usuario principal es el **Operations Manager** de una flota pequeña o mediana.
Es responsable de mantener información confiable sobre embarcaciones y
documentación, priorizar riesgos y coordinar correcciones.

Su pregunta principal es:

> What needs attention before this vessel can operate confidently?

La vista donde debería pasar aproximadamente el 80% de su tiempo es el
**Vessel Workspace**: identidad de la embarcación, estado de cumplimiento,
evidencia faltante y actividad reciente en un solo contexto.

## Problema

Cuando registros, fechas y responsabilidades viven en fuentes separadas:

- Es difícil distinguir información vigente de información simplemente presente.
- Los vencimientos se descubren tarde.
- No queda claro quién cambió un dato o por qué.
- Cada revisión obliga a reconstruir contexto manualmente.
- Los usuarios con responsabilidad de consulta reciben más acceso del necesario.

El primer valor de Keelwatch es producir un estado explicable desde registros
concretos, no predecir riesgos ni reemplazar criterio profesional.

## Trabajos principales, en orden

1. Identificar embarcaciones con documentación faltante, próxima a vencer o
   vencida.
2. Abrir una embarcación y entender por qué tiene ese estado.
3. Registrar o corregir evidencia documental con validación.
4. Confirmar quién realizó un cambio crítico.
5. Compartir una vista de solo lectura con un auditor.
6. Más adelante, coordinar tripulación y mantenimiento en el mismo contexto.

## Personas y acceso

| Rol                    | Necesidad                                 | Acceso inicial                                                        |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| Operations Manager     | Mantener flota y resolver riesgos.        | Leer y modificar embarcaciones/certificados; consultar actividad.     |
| Compliance Officer     | Mantener evidencia y preparar revisiones. | Leer flota; crear/modificar certificados; consultar actividad.        |
| Auditor                | Verificar estado y trazabilidad.          | Solo lectura; nunca puede modificar.                                  |
| Platform Administrator | Administrar acceso técnico.               | Gestionar usuarios/roles; no obtiene edición operacional por defecto. |

Los permisos se evalúan en el backend. Ocultar un botón nunca será el único
control de autorización.

## Alcance de la primera release

- Inicio/cierre de sesión mediante OIDC.
- Roles propios de la aplicación.
- Alta, listado, detalle y edición básica de embarcaciones.
- Catálogo controlado de tipos de certificado.
- Registro de certificados y cálculo de estado.
- Dashboard mínimo que enlaza cada conteo con evidencia filtrada.
- Eventos de auditoría para altas y cambios críticos.
- Datos demo sintéticos y una cuenta de solo lectura.

## Reglas iniciales

- El `registry number` se normaliza a mayúsculas y es único.
- Una embarcación archivada permanece consultable y no acepta nuevos registros.
- `issued on` no puede ser posterior a `expires on`.
- Un tipo marcado como obligatorio sin certificado vigente produce `MISSING`.
- Un certificado con expiración anterior a la fecha evaluada está `EXPIRED`.
- Una expiración entre 0 y 30 días, ambos inclusive, está `EXPIRING_SOON`.
- Una expiración posterior a 30 días está `VALID`.
- El estado se deriva al consultar; no se almacena como verdad duplicada.
- Los cambios críticos producen un evento de auditoría con actor y timestamp.
- El backend utiliza tiempo UTC; fechas de emisión/expiración son fechas de
  calendario, no instantes.

Estas reglas son decisiones propias del demo y no pretenden representar la
normativa de una jurisdicción o cliente real.

## Navegación y contenido

La navegación tendrá como máximo dos niveles. Solo mostrará módulos
implementados; no habrá enlaces decorativos a funcionalidades futuras.

- **Fleet:** lista de embarcaciones y Vessel Workspace.
- **Compliance:** cola transversal de documentación, cuando exista suficiente
  volumen para justificarla.
- **Activity:** historial consultable según permisos.
- **Access:** administración de usuarios y roles, solo para administradores.
- **Account:** sesión, preferencias esenciales y salida.

La especificación completa vive en
[`INFORMATION_ARCHITECTURE.md`](./INFORMATION_ARCHITECTURE.md).

## No-objetivos de la primera release

- Tracking GPS, navegación, clima o telemetría de hardware.
- Recomendaciones basadas en IA.
- Comunicación con autoridades o validación reglamentaria real.
- Multi-tenancy comercial, billing o suscripciones.
- App móvil u operación offline.
- Fuel management, inventario o procurement.
- Microservicios, Kubernetes, event sourcing o sincronización en tiempo real.
- Importar hojas de cálculo antes de comprender la forma de los datos.

## Señales técnicas que debe demostrar

- Un corte vertical React → REST → NestJS → PostgreSQL verificable.
- Componentes y módulos organizados por responsabilidad de negocio.
- RBAC con casos positivos y negativos.
- Invariantes en dominio y base de datos.
- Estados loading, vacío, error, forbidden y recuperación.
- Pruebas seleccionadas por riesgo.
- Migraciones, datos demo y despliegue reproducibles.
- Logs correlacionables sin secretos.
- Decisiones y limitaciones documentadas.

## Éxito del producto demo

Un reviewer debe poder, en menos de diez minutos:

1. Entrar con un usuario demo.
2. Registrar una embarcación o abrir una existente.
3. Añadir evidencia y observar cómo cambia un estado explicable.
4. Confirmar el evento en el historial.
5. Repetir una acción como auditor y ver un rechazo seguro.
6. Encontrar en GitHub la regla, prueba y decisión relacionada.

No utilizaremos adopción, ahorro o impacto comercial ficticio como criterio de
éxito.

## Supuestos por validar durante el walking skeleton

- Vessel Workspace es una mejor vista central que un dashboard genérico.
- Un umbral demo de 30 días produce casos comprensibles.
- Dos niveles de navegación son suficientes para la primera release.
- Un catálogo pequeño de certificados demuestra las reglas sin simular una
  regulación completa.
- Operations Manager y Auditor producen suficiente contraste de autorización
  antes de añadir roles adicionales.
