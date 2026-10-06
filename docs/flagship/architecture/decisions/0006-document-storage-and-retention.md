# ADR-0006: Storage y retención de evidencia documental

- Estado: superseded el 2026-10-06 por [ADR-0007](./0007-disable-file-attachments-in-portfolio-demo.md)
- Fecha: 2026-10-05
- Sustituye la propuesta no aceptada de AWS S3 + GuardDuty del 2026-10-04.

## Decisión

Este documento conserva la decisión histórica. Sus servicios, controles y plazos
no describen el runtime actual ni son requisitos de despliegue de la demo.

Usar Supabase Storage mediante `@supabase/supabase-js` exclusivamente en el backend,
con service-role key, bucket privado dedicado y un puerto angosto de storage en
Compliance. El navegador no recibe la credencial ni decide la key. No se crean
cuentas, buckets, políticas, gastos ni despliegues como parte de esta decisión.

El propietario aprobó filesystem local y un scanner determinista para probar el
lifecycle. Este scanner detecta la firma de prueba EICAR; **no es antivirus**.
Producción exige `STORAGE_PROVIDER=supabase` y
`DOCUMENT_SCANNER_PROVIDER=clamav`; el arranque rechaza las variantes locales.
ClamAV usa INSTREAM con límite temporal, respuesta cerrada por defecto y red privada.
Firmas actualizadas, recursos suficientes y prueba con un scanner real son gates
externos, no resultados atribuidos al simulador.

## Contrato implementado

- PDF/JPEG/PNG, extensión y magic bytes compatibles, 5 MiB por petición.
- Objeto privado, key UUID generada por servidor, prefijo `quarantine/`, SHA-256,
  sin overwrite. El prefijo no es una política de acceso por sí solo.
- Primero se almacena el objeto; luego metadata QUARANTINED y auditoría se confirman
  juntas. Un fallo elimina el objeto o lo deja para reconciliación de huérfanos.
- El scan se intenta dentro de la petición. Solo NO_THREATS_FOUND habilita lectura;
  error, timeout o amenaza rechazan. Una interrupción conserva cuarentena y permite
  reconciliar comprobando el hash antes de escanear otra vez.
- Un archivo actual por certificado. Uploads concurrentes se serializan y el índice
  parcial evita dobles adjuntos; el perdedor elimina su objeto.
- Manager escribe; Manager/Auditor leen. API valida estado, permisos y relación
  documento → certificado → embarcación antes de emitir acceso.
- Descarga como attachment, URL de hasta 60 segundos, sin persistir ni loguear el
  token. En local se usa una capacidad HMAC y se vuelve a comprobar disponibilidad.
- Rechazados: intento de borrado inmediato, reintento en cada comprobación y objetivo
  máximo de 24 horas. Certificado archivado: 30 días desde archivo; la API deniega
  nuevas descargas al vencer aunque la eliminación física esté pendiente.
- Reconciliación autenticada por Manager: hasta 100 scans y 100 eliminaciones por
  ejecución, más huérfanos con antigüedad superior a 24 horas. El caller debe repetir
  hasta vaciar backlog. No hay scheduler automático configurado en esta entrega.
- Metadata y auditoría se conservan; no se conservan bytes ni URLs en PostgreSQL.

## Seguridad y operación

La service-role key evita RLS: toda autorización de negocio pertenece a la API.
La comprobación de arranque verifica que el bucket exista y sea privado; no prueba
que sus políticas RLS sean restrictivas. Antes de exposición pública hay que
verificar ausencia de grants de lectura/escritura anónimos o de usuarios finales,
restricciones de tamaño/MIME, descarga directa denegada y protección del secreto.

La limpieza con plazo requiere un scheduler autenticado y alertas de fallos/backlog
antes de producción (cadencia recomendada 15 minutos, sin prometer un SLA durante
una caída del proveedor). No se inventa identidad de sistema ni se atribuyen
acciones automáticas a un usuario: la API audita al actor real que inicia el job.
Un único bucket dedicado debe pertenecer a esta aplicación; el reconciliador no
debe compartirlo con otros productos.

La URL firmada es una capacidad transferible. La caducidad de 60 segundos es un
objetivo de autorización, no revocación instantánea de bytes ya descargados ni de
cachés del proveedor. Se usa cacheControl 0 y se debe verificar comportamiento real
de CDN antes de desplegar. No se asume un veredicto malware administrado de Supabase.

No cambiar de filesystem a Supabase sobre registros existentes sin un procedimiento
explícito de migración de objetos y reescaneo. Los registros aprobados por el
simulador no reciben URLs cuando la aplicación está configurada con ClamAV.

## Alternativas

AWS S3 + GuardDuty fue rechazado por el propietario; no se añade esa nube.
Filesystem es suficiente para desarrollo, no almacenamiento durable del servicio
Render. Una carga directa desde el navegador ampliaría innecesariamente la
superficie de autorización; este slice usa multipart mediado por la API.

## Evidencia y fuentes

El [threat model](../../DOCUMENT_UPLOAD_THREAT_MODEL.md) identifica controles,
pruebas y límites. Los resultados locales y los gates externos se registran en
[progress](../../../progress.md).

Fuentes oficiales consultadas el 2026-10-05:

- [Supabase access control y service role](https://supabase.com/docs/guides/storage/security/access-control)
- [Buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Carga estándar y no-overwrite](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Límites de archivo](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Descarga y signed URLs](https://supabase.com/docs/guides/storage/serving/downloads)
- [Límites de caché/CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn)
- [Operaciones de objetos mediante API, no SQL de storage](https://supabase.com/docs/guides/storage/schema/design)
- [ClamAV INSTREAM](https://docs.clamav.net/manual/Usage/ClamdProtocol.html)
