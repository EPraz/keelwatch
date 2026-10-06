# Threat model — evidencia documental

Estado: histórico; retirado del alcance por [ADR-0007](./architecture/decisions/0007-disable-file-attachments-in-portfolio-demo.md) el 2026-10-06.
Fecha: 2026-10-05. Decisión: [ADR-0006](./architecture/decisions/0006-document-storage-and-retention.md).

Los controles y plazos siguientes describen el ensayo retirado, no capacidades
actuales ni gates pendientes. La demo ya no acepta ni sirve adjuntos y no requiere
Supabase Storage, ClamAV ni limpieza documental.

Solo archivos sintéticos adjuntos a Certificate. No cubre PII, documentos marítimos
reales, OCR, firma electrónica ni obligaciones legales de retención.

## Fronteras y activos

Navegador no confiable → API autenticada/RBAC → PostgreSQL y storage privado →
scanner. La API conserva service-role solo en servidor. PostgreSQL es fuente de
verdad para el estado, scope y fechas; no contiene binarios. El prefijo de storage
no sustituye autorización. Se conserva un único objeto actual por certificado.

## Amenazas y controles

| Amenaza                            | Control y evidencia local                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso no autorizado o scope falso | Guards antes del parser; Manager escribe, Auditor solo lee; relación Vessel/Certificate/Document comprobada. HTTP prueba 401/403, scope incorrecto y certificado archivado.                                                     |
| Memoria/archivo excesivo           | Multipart limitado a un archivo de 5 MiB, sin campos adicionales. Buffer acotado, no se afirma streaming end-to-end. HTTP prueba 413 y campos extra. Rate limiting/concurrencia global requieren hardening antes de exposición. |
| Tipo engañoso                      | Allowlist PDF/JPEG/PNG, extensión y magic bytes. No se aceptan SVG, HTML, Office, archives o ejecutables. La firma no prueba integridad completa ni ausencia de polyglots.                                                      |
| Malware/scan inconcluso            | QUARANTINED sin acceso, solo veredicto claro libera. Local detecta EICAR pero NO es antivirus; producción requiere ClamAV real, firmas vigentes, red privada y smoke test. Timeout/error rechazan.                              |
| Path traversal/overwrite           | UUID servidor, nombre saneado solo para presentación, key validada en adapter, escritura local wx/Supabase upsert false.                                                                                                        |
| Publicación accidental             | Bucket privado comprobado al arrancar; service role nunca en web. RLS/anon/direct-read denial se verifican externamente; el SDK evita RLS y no reemplaza RBAC.                                                                  |
| Token filtrado                     | URLs hasta 60 s, attachment, no-store en API, redacción de query y ruta de token en logs. Supabase cacheControl 0; CDN/revocación efectiva son verificación externa.                                                            |
| Contenido activo                   | Sin preview inline, descarga attachment. Local añade nosniff/no-referrer; comprobar headers reales del proveedor antes de exposición.                                                                                           |
| Fallo entre object store y DB      | Objeto primero; metadata+audit atómicos; cleanup inmediato al fallar; huérfanos mayores de 24 h reconciliados. No hay transacción distribuida.                                                                                  |
| Carreras y repetición              | Lock de certificado, índice parcial único, finalización condicional, auditoría una vez; PostgreSQL prueba concurrencia y rollback. Archivo y finalización se serializan sobre el mismo certificado.                             |
| Borrado fallido                    | Rechazados reintentados sin esperar al deadline; disponibles archivados vencen a 30 días. Borrado del proveedor confirmado antes de metadata+audit de eliminación; fallo posterior se reintenta idempotentemente.               |
| Datos en logs                      | IDs/estado/correlation ID; sin contenido, credencial, hash, nombre completo ni URL. DTO omite storage key/hash/scanner interno.                                                                                                 |
| Mezcla de storage local/real       | Entornos separados; no cambiar proveedor con registros sin migrar. ClamAV no firma evidencia aprobada por el simulador.                                                                                                         |

## Lifecycle y retención

1. Validar identidad, permiso, tipo/tamaño y certificado activo antes del storage.
2. Guardar key opaca sin sobrescribir y confirmar QUARANTINED+audit en transacción.
3. Escanear; AVAILABLE solo si claro, REJECTED en amenaza/fallo. Un crash deja
   cuarentena sin descarga; el reconciliador verifica hash antes de reescanear.
4. Intentar borrar rechazados inmediatamente. Si falla, conservar estado denegado
   y reintentar en cada job, con plazo operativo de 24 h.
5. Archivar el certificado fija 30 días para evidencia aceptada/pendiente sin
   ampliar el plazo de un rechazo. No existe restauración en este slice.
6. Negar nuevas URLs al vencer retención. Job elimina bytes y confirma estado
   DELETED (o REJECTED con objectDeletedAt), conservando auditoría sanitizada.
7. Limpiar objetos incompletos sin metadata tras una ventana de seguridad de 24 h.

La ejecución local es manual y autenticada, con counts visibles y errores
reintentables. No promete limpieza automática: antes de producción configurar y
probar scheduler, alertas y drenaje de lotes de 100. Un proveedor caído puede impedir
cumplir el plazo físico; la denegación de acceso continúa. No aplicar lifecycle
ciego al prefijo quarantine, pues también contiene evidencia aceptada.

## Matriz de verificación

- Unit: firmas/tamaño/nombres, EICAR, protocolo ClamAV con servidor simulado, HMAC,
  expiración/tamper, storage privado/no-overwrite y errores seguros.
- HTTP: roles, bytes/tipos inválidos, scope, duplicados, cuarentena/rechazo,
  recuperación tras fallo de metadata/finalización, retención y huérfanos.
- PostgreSQL: metadata+audit, constraint de estado, concurrencia, rollback,
  idempotencia, archivo30d y reintento de rechazo antes de24h.
- UI: vacío, validación, pending, éxito, rechazo, archivo, descarga, error/reintento
  con archivo conservado, Auditor read-only y axe.
- Gates externos: bucket privado/RLS sin bypass por usuarios finales, ClamAV real
  con firmas vigentes y EICAR, URL vencida y headers/CDN, scheduler y alertas,
  restauración de objetos/metadata, límites de tráfico y presupuesto.

## Riesgos residuales

URL transferible hasta expirar, descarga ya obtenida no revocable, formatos con
contenido activo y falsos negativos de antivirus. Ningún test demuestra seguridad
absoluta. La demo y sus fixtures no son documentos operativos reales. No se crearon
recursos ni se accedió a un bucket externo durante la implementación.
