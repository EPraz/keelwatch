# ADR-0003: OIDC para identidad y RBAC dentro de la aplicación

- Estado: accepted; proveedor diferido
- Fecha: 2026-09-29

Enmienda aceptada el 2026-10-11:
[ADR-0008](./0008-public-demo-access.md) añade acceso público para cuentas demo.
OIDC y el RBAC de servidor se conservan para el login normal.

## Contexto

El proyecto debe demostrar autenticación segura y autorización real sin
convertirse en un ejercicio de almacenamiento de contraseñas. Los roles de
Operations Manager, Compliance Officer, Auditor y Platform Administrator son
conceptos del producto y deben permanecer bajo control de la aplicación.

## Decisión

Usar un proveedor compatible con OpenID Connect para autenticar usuarios.

- La SPA utiliza Authorization Code con PKCE.
- La API valida firma, issuer, audience y expiración.
- `sub` se mapea a un User local.
- Estado y roles se consultan en Keelwatch.
- Endpoints protegidos aplican deny by default y políticas RBAC en servidor.
- El frontend utiliza permisos para experiencia, no como frontera de seguridad.

La selección de Auth0, Keycloak u otro proveedor queda diferida hasta comparar
costo, experiencia demo, automatización, soporte local y eliminación de datos.

## Consecuencias

### Positivas

- No gestionamos contraseñas ni recuperación de cuenta.
- El límite usa un estándar portable.
- Cambiar roles no requiere editar claims en un proveedor externo.
- Los casos negativos se pueden probar en la API.

### Costes

- Existe dependencia operacional del proveedor para nuevos logins.
- Provisioning y desactivación requieren sincronizar identidad externa y usuario
  local.
- El entorno E2E necesita una estrategia de identidad controlada.

## Alternativas rechazadas

- **Email/password propio:** añade superficie de seguridad sin aportar señal
  diferencial al portfolio.
- **Roles solo en token externo:** acopla reglas de negocio al proveedor y puede
  dejar permisos obsoletos hasta renovar token.
- **Autorización solo en UI:** insegura; las llamadas directas evitarían el
  control.
