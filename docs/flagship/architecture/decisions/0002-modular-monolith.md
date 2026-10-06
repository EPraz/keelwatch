# ADR-0002: Monolito modular como arquitectura inicial

- Estado: accepted
- Fecha: 2026-09-29

## Contexto

El dominio contiene identidad, flota, cumplimiento, tripulación, mantenimiento y
auditoría. Son límites útiles para organizar ownership, pero la primera release
tendrá una escala, equipo y frecuencia de despliegue pequeños. No existe
evidencia de que necesiten procesos o bases de datos independientes.

## Decisión

Implementar una sola aplicación NestJS desplegable con módulos de negocio y una
base PostgreSQL. Cada módulo posee casos de uso, interfaces y persistencia; las
dependencias entre módulos son explícitas.

Las tablas pueden compartir base de datos, pero un módulo no escribe repositories
privados de otro. Las transacciones que cruzan un cambio crítico y AuditEvent se
mantienen locales al proceso.

## Consecuencias

### Positivas

- Despliegue, debugging y transacciones simples.
- Menor costo operativo para una demo pública.
- Refactors de límites todavía baratos.
- Un request puede trazarse sin infraestructura distribuida.

### Costes

- Un despliegue cambia toda la API.
- Una consulta mal diseñada puede afectar el mismo proceso o database pool.
- Los límites dependen de arquitectura y tests, no de la red.

## Señales para reconsiderar

- Módulo con carga o disponibilidad radicalmente distinta y mediciones que lo
  demuestren.
- Necesidad de despliegue independiente por ownership de equipos.
- Fallos repetidos que no puedan aislarse razonablemente dentro del proceso.
- Data ownership que requiera ciclos de persistencia independientes.

## Alternativas rechazadas

- **Microservicios por cada sustantivo:** multiplican despliegue, contratos,
  observabilidad y consistencia sin necesidad actual.
- **Una capa global por controllers/services/repositories:** diluye ownership y
  vuelve cada cambio transversal.
- **Serverless function por endpoint:** fragmenta casos de uso y complica
  transacciones sin un patrón de carga que lo justifique.
