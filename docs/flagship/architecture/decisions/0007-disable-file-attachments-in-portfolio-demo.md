# ADR-0007: Demo sin cargas ni descargas de archivos

- Estado: accepted por el propietario
- Fecha: 2026-10-06
- Sustituye [ADR-0006](./0006-document-storage-and-retention.md).

## Contexto

Keelwatch es una demo de portafolio, no un servicio documental comercial. El
propietario prioriza tiempo, coste y una superficie de riesgo acotada. Mantener
storage, antivirus, cuarentena y limpieza no aporta suficiente evidencia adicional
frente a los flujos de negocio ya demostrables.

## Decisión

- No aceptar ni servir archivos de usuarios. Eliminar rutas, controles, adapters,
  puertos y trabajos exclusivos de adjuntos, no solo esconder el botón.
- Retirar el SDK y la configuración de Supabase Storage, ClamAV y el simulador
  local. No se requieren buckets, antivirus ni scheduler documental.
- Mantener registros de certificados, fechas, edición, archivado lógico,
  historial, estados derivados, notificaciones, RBAC y auditoría atómica.
- Mostrar en la interfaz que las cargas y descargas están deshabilitadas para
  evitar compartir archivos no confiables. No prometer análisis antivirus.
- No sustituir el flujo con un archivo descargable para volver a subir: también
  exigiría validación y manejo de bytes sin mejorar la demo.

## Datos existentes

Se conservan la migración aplicada, CertificateDocument, sus filas y los archivos
locales históricos ignorados por Git. No se resetea la base ni se borran datos.
La aplicación no consulta, sirve, modifica ni limpia esos adjuntos; los eventos
anteriores siguen visibles en Activity como historia. Los antiguos campos de
retención son históricos: ya no existe una promesa de borrado a 30 días.
Cualquier eliminación física posterior requiere alcance y autorización explícitos.

## Gate de alcance antes de implementar

Cada incremento debe explicar primero qué demuestra al evaluador, cuál es su
versión mínima y qué tiempo, coste, riesgo y operación añade. Si necesita un
servicio externo o infraestructura adicional, presentar alternativas y obtener
aprobación antes de implementarlo, incluso si inicialmente usa un simulador.
Preferir omitir una capacidad no esencial a construir infraestructura especulativa.
Esto no reduce la autorización, validación ni protección de las funciones activas.

## Verificación y consecuencias

Las antiguas rutas de upload, enlaces, descarga y limpieza deben devolver 404 para
visitante, Manager, Auditor e inactivo. OpenAPI no anuncia multipart ni rutas de
adjuntos. La demo funciona sin variables de storage/scanner; los flujos conservados
mantienen sus pruebas. No se crean ni eliminan recursos externos.

Reintroducir adjuntos exige una nueva decisión explícita; no existe un feature flag
para reactivarlos. El despliegue general sigue sujeto a los gates de OIDC, HTTPS,
base de datos y CI, sin dependencias documentales.
