# ADR-0004: Auth0 como proveedor OIDC hospedado

- Estado: accepted; provisioning diferido
- Fecha: 2026-09-30

## Contexto

ADR-0003 exige OIDC, Authorization Code con PKCE para la SPA, validación de
issuer/audience/firma/expiración en la API y roles propios de Keelwatch. Fase 1
necesita elegir un proveedor sin crear cuentas, credenciales ni dependencia de
roles externos.

## Criterios

1. OIDC estándar y PKCE documentado para SPA.
2. Validación de access tokens de una API por issuer y audience.
3. SDK o integración mantenida para React/Node sin imponer autorización de
   negocio en el proveedor.
4. Entorno gratuito suficiente para una demo pequeña y coste entendible.
5. Experiencia de login hospedada, logout y configuración reproducible.
6. Portabilidad: Keelwatch conserva el mapeo `sub` → User y su RBAC local.
7. Eliminación clara del tenant y ausencia de secretos en el repositorio.

## Opciones evaluadas

| Opción               | Ajuste                                                                                                    | Coste/operación                                                                                                                                           | Resultado                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Auth0                | Documenta Authorization Code con PKCE para SPA, SDK React y validación de issuer/audience para APIs Node. | Plan Free sin tarjeta, hasta 25,000 usuarios activos mensuales según la página consultada. Login hospedado; no operamos el IdP.                           | Seleccionada.                                         |
| ZITADEL Cloud        | User Agent apps usan Code + PKCE; React puede usar `react-oidc-context`.                                  | Plan Free con 100 usuarios activos diarios. Buena portabilidad, pero añade convenciones propias de audience/scopes y menos señal directa para este stack. | Alternativa viable.                                   |
| Keycloak self-hosted | OIDC y adaptador JS maduros; control total.                                                               | Sin licencia SaaS, pero requiere imagen optimizada, TLS, base de datos, upgrades, backups y operación adicional.                                          | Rechazada para la primera demo por coste operacional. |

## Decisión

Usar Auth0 como proveedor OIDC hospedado para preview/producción. La SPA seguirá
Authorization Code con PKCE y solicitará un access token para el audience de la
API. La API validará firma mediante JWKS, issuer, audience y expiración. El claim
`sub` solo identifica la identidad externa; User activo, roles y permisos se
resuelven siempre en PostgreSQL.

Para desarrollo y pruebas se implementará un adaptador de identidad local,
determinista y sintético detrás del mismo límite. Debe requerir configuración
explícita, negarse a iniciar en producción y no aceptar secretos reales.

No se crea un tenant ni una aplicación Auth0 como parte de esta decisión.

## Consecuencias

- El primer incremento puede probar 401, usuario inactivo, rol permitido y rol
  denegado sin credenciales externas.
- La integración real requerirá URLs de callback/logout y variables administradas
  fuera del repositorio.
- El límite OIDC y el RBAC local permiten reemplazar Auth0 sin migrar permisos de
  negocio.

## Fuentes oficiales consultadas

Consultadas el 2026-09-30:

- [Auth0: Authorization Code Flow with PKCE](https://auth0.com/docs/api/authentication/authorization-code-flow-with-pkce/authorize-with-pkce)
- [Auth0: React SPA quickstart](https://auth0.com/docs/quickstart/spa/react)
- [Auth0: Node API token validation](https://auth0.com/docs/quickstart/backend/nodejs)
- [Auth0 pricing](https://auth0.com/pricing)
- [ZITADEL application types and PKCE](https://zitadel.com/docs/guides/manage/console/applications-overview)
- [ZITADEL pricing](https://zitadel.com/pricing)
- [Keycloak JavaScript adapter](https://www.keycloak.org/securing-apps/javascript-adapter)
- [Keycloak production configuration](https://www.keycloak.org/server/configuration-production)
