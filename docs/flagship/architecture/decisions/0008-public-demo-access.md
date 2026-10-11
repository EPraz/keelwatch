# ADR-0008: Acceso público mediante cuentas demo compartidas

- Estado: accepted; Demo Auditor y Demo Manager implementados localmente; activación pública pendiente
- Fecha: 2026-10-11

Los visitantes del portfolio necesitan explorar ambos roles sin recibir ni copiar
credenciales. Se aceptan dos botones de acceso, Demo Manager y Demo Auditor, que
solicitan sesiones temporales al servidor para cuentas sintéticas compartidas.
Esta excepción acotada modifica [ADR-0003](./0003-oidc-and-application-rbac.md) y
[ADR-0004](./0004-auth0-as-hosted-oidc-provider.md); el login normal con Auth0 y PKCE
se conserva.

## Límites de la decisión

- Cada `DemoAccount` es distinta de las cuentas Auth0 del propietario y tiene un
  rol fijo. El servidor solo permite seleccionar entre esas dos cuentas; no acepta
  identidades o privilegios arbitrarios enviados por el navegador.
- La API resuelve usuario activo, roles y permisos y aplica autorización en cada
  operación. Demo Manager puede crear, editar, archivar y cancelar registros
  operativos; Demo Auditor solo consulta. Ninguna cuenta demo administra usuarios
  ni roles. No se habilita el adaptador local de desarrollo en producción.
- Las sesiones duran una hora y sobreviven a la recarga de la pestaña. Tras
  expirar se requiere otro clic; cambiar de rol exige cerrar sesión y seleccionar
  el otro botón. Logout limpia la sesión y los datos del rol anterior del cliente.
- La emisión y validación de sesiones pertenece al servidor; no se incluyen
  contraseñas ni secretos de emisión en el cliente, repositorio o logs. El formato
  de sesión y sus detalles de transporte quedan para la especificación técnica.
- El acceso demo requiere habilitación explícita mediante configuración del
  servidor, se mantiene desactivado por defecto y puede deshabilitarse sin afectar
  Auth0. La emisión de sesiones y las escrituras demo tienen límites configurables
  con mensajes claros de reintento; las cuotas implementadas se describen abajo.

## Consecuencias aceptadas

El dataset es sintético y compartido. Las escrituras de Demo Manager permanecen
tras cerrar sesión y son visibles para otros visitantes; Activity atribuye las
acciones a la cuenta demo y no identifica a la persona que la utilizó. Se acepta
esa limitación de trazabilidad para el portfolio, sin añadir aislamiento por
visitante, resets automáticos ni infraestructura de pago.

Los controles de sesión y permisos requieren casos positivos y negativos antes
de habilitar este acceso público. El incremento #12 implementa Demo Auditor con
JWT firmado del servidor, prefijo y tipo distintos de OIDC, TTL de una hora,
estado y rol consultados en la API y almacenamiento en la pestaña. La emisión
tiene una cuota predeterminada de 30 intentos por 60 segundos por proceso API;
configuración y límites quedan descritos en el README. El incremento #13 añade
Demo Manager y 60 intentos de escritura por ventana fija de una hora, compartidos
por todas sus credenciales y visitantes de un proceso API. Se consume tras
autorización y antes de validar entradas o reglas, incluso en intentos `400`/`409`.
Entrar de nuevo no reinicia la cuota; vencer la ventana o reiniciar el proceso sí.
No es una garantía distribuida ni durable, y las cuentas OIDC no consumen esa cuota.
La activación pública y sus escenarios siguen pendientes por decisión del propietario;
#13 continúa localmente sobre `1b626ac` sin publicar previamente #12.

Esta decisión no añade obligaciones de backup, exportación/restauración,
monitoreo permanente o disponibilidad.

## Alternativas descartadas

- Autocompletar o publicar la contraseña de Auth0: la contraseña utilizada en el
  navegador seguiría siendo accesible al visitante.
- Reutilizar en producción los tokens estáticos del adaptador local: incumple su
  límite de desarrollo y no proporciona las sesiones temporales acordadas.
- Reemplazar el login normal de Auth0 o crear espacios aislados por visitante:
  amplía el alcance sin ser necesario para explorar la demo compartida.
