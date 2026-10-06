# ADR-0001: Repositorio independiente y workspace sencillo

- Estado: accepted
- Fecha: 2026-09-29

## Contexto

El flagship necesita web, API, documentación, infraestructura local y pipeline.
El portfolio actual es otra aplicación con ciclo de entrega y propósito
distintos. Separar web y API del flagship en repositorios diferentes aumentaría
la coordinación de contratos y haría más difícil revisar un slice completo.

## Decisión

Crear un repositorio independiente para el producto. Dentro de ese repositorio,
web y API vivirán en npm workspaces bajo `apps/web` y `apps/api`.

No se introducirá Nx, Turborepo ni un sistema de publicación de packages hasta
que exista un problema de rendimiento o coordinación que npm workspaces no
resuelva.

## Consecuencias

### Positivas

- Un commit puede contener un slice full-stack coherente.
- CI, documentación y issues pertenecen al mismo producto.
- El reviewer puede seguir contrato, implementación y pruebas sin saltar entre
  repositorios.
- El sitio del portfolio conserva un alcance pequeño.

### Costes

- Web y API comparten permisos del repositorio y release cadence inicial.
- Los quality gates deben filtrar por workspace sin ocultar una verificación
  completa.
- Los contratos requieren disciplina para no importar código del backend en el
  frontend.

## Alternativas rechazadas

- **Implementar dentro de 3DPortafolio:** mezcla producto y presentación,
  dependencias y ciclos de vida.
- **Repositorios web/API separados:** añade coordinación sin equipos ni despliegue
  independientes.
- **Nx/Turborepo desde el inicio:** resuelve problemas que todavía no existen.
