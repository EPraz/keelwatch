# Política clean-room

Estado: aprobada como frontera de trabajo

Aplicación: documentación, código, datos, diseños, demos y material público de
Keelwatch

## Objetivo

Keelwatch debe ser demostrablemente una obra personal e independiente. Puede
beneficiarse de experiencia general de ingeniería y conocimiento público del
dominio marítimo, pero no puede reproducir activos, decisiones propietarias ni
información confidencial de empleadores o clientes.

Esta política es una restricción del producto, no una nota opcional del README.
Si una funcionalidad no puede explicarse y diseñarse usando fuentes públicas y
razonamiento propio, no entra al proyecto.

## Fuentes permitidas

- Estándares, regulaciones y documentación técnica de acceso público.
- Documentación oficial de frameworks, librerías y proveedores.
- Libros, artículos, papers y proyectos open source compatibles con su licencia.
- Entrevistas o feedback creados específicamente para este proyecto y con
  consentimiento de sus participantes.
- Conocimiento profesional general: patrones de arquitectura, prácticas de
  seguridad, UX, testing y operación.
- Requisitos escritos desde cero a partir de problemas genéricos del dominio.

Toda dependencia, recurso visual o fragmento de terceros debe conservar su
atribución y licencia cuando corresponda.

## Material prohibido

- Código fuente, commits, migraciones, esquemas, consultas, tests o configuración
  pertenecientes a un empleador o cliente.
- Capturas, diseños, textos, nombres, iconografía o flujos internos.
- Reglas propietarias, fórmulas, automatizaciones o decisiones no públicas.
- Datos reales, incluso anonimizados, derivados de clientes, embarcaciones,
  tripulantes, documentos, incidentes o proveedores.
- Credenciales, URLs internas, nombres de infraestructura, logs o tickets.
- Métricas profesionales que no estén autorizadas para publicación.
- Documentos redactados copiando o parafraseando especificaciones privadas.

No se utilizará un repositorio, dispositivo, cuenta o ambiente del empleador para
desarrollar o almacenar el proyecto.

## Flujo de diseño independiente

1. Describir el problema en lenguaje genérico y sin nombres privados.
2. Confirmar que el requisito puede sostenerse con una fuente pública o una
   decisión explícita del producto.
3. Diseñar vocabulario, modelo, reglas, interfaz y código desde cero.
4. Generar únicamente fixtures sintéticos con nombres y números ficticios.
5. Documentar los trade-offs sin comparar con implementaciones confidenciales.
6. Ejecutar la checklist de publicación antes de cada release público.

La memoria de una solución privada no es una especificación. Si una decisión
parece demasiado específica y no tiene justificación pública, se reemplaza por
una alternativa propia o se excluye.

## Regla de cuarentena

Cuando exista duda sobre un elemento:

1. No se añade al repositorio ni a un issue público.
2. Se registra únicamente la categoría de la duda, sin copiar el material.
3. Se busca una necesidad equivalente en fuentes públicas.
4. Se rediseña desde principios propios o se elimina del alcance.
5. Si el riesgo permanece, se solicita revisión legal antes de publicar.

“Probablemente está bien” no constituye aprobación.

## Datos sintéticos

- Personas, empresas, embarcaciones, registros y certificados serán ficticios.
- No se modificarán datos reales para intentar hacerlos parecer sintéticos.
- Los fixtures incluirán casos límite diseñados: expirados, incompletos,
  duplicados y accesos denegados.
- Las imágenes de documentos utilizarán plantillas propias con una marca visible
  de `DEMO — NOT A REAL DOCUMENT`.
- El README y la aplicación demo declararán que todos los datos son sintéticos.

## Checklist previa a publicación

- [ ] Cada archivo fue creado para Keelwatch o tiene licencia compatible y
      atribución.
- [ ] No hay nombres, URLs, identificadores, capturas ni datos de terceros.
- [ ] Los fixtures se generaron desde cero y están marcados como demo.
- [ ] Cada regla de dominio tiene una justificación pública o una decisión
      registrada.
- [ ] Los textos y diseños no reproducen otra aplicación.
- [ ] Los secretos están fuera del repositorio y el historial fue revisado.
- [ ] Los logs y ejemplos de errores no exponen tokens ni datos sensibles.
- [ ] Las afirmaciones públicas diferencian el proyecto personal de la experiencia
      profesional.
- [ ] Las métricas publicadas incluyen método, entorno y limitaciones.
- [ ] Cualquier duda abierta fue resuelta o el elemento fue retirado.

## Declaración pública mínima

El README utilizará una declaración equivalente a:

> Keelwatch is an independent portfolio project built from scratch with
> synthetic data. It is not affiliated with, derived from, or representative of
> any employer or client system.

## Respuesta ante una posible filtración

1. Detener publicación y despliegue.
2. Retirar el material de la rama activa sin ocultar el alcance del incidente.
3. Evaluar si el historial remoto o artefactos publicados requieren rotación o
   eliminación coordinada.
4. Rediseñar el elemento desde una fuente permitida.
5. Registrar la causa y añadir una comprobación preventiva a esta política.

La reescritura de historial, si llegara a ser necesaria, requerirá una decisión
explícita y coordinada; nunca será una reacción automática.
