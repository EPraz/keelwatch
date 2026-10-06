# Identidad y separación de repositorios

Estado: accepted

Fecha de screening básico: 2026-09-29

## Decisión

Usar **Keelwatch** como nombre del flagship. Edwin confirmó esta identidad el
2026-09-29.

- `Keel` remite a la estructura que da estabilidad sin describir una función
  regulatoria específica.
- `Watch` comunica vigilancia y atención a vencimientos.
- Es pronunciable en inglés y no depende de una sigla interna.
- Permite extender compliance hacia maintenance sin renombrar el producto.

Descriptor público:

> Maritime compliance and operations workspace

Tagline de trabajo:

> Keep every vessel ready.

## Screening realizado

Una búsqueda web básica no encontró un producto de software marítimo obvio con
el nombre exacto `Keelwatch`. Esto no demuestra disponibilidad jurídica ni de
dominio.

Se descartaron:

- **FleetSignal:** ya es utilizado por productos activos de fleet analytics y
  por una [plataforma orientada a embarcaciones](https://fleet-signal.com/).
- **Harbor Ledger:** ya identifica [software existente](https://github.com/FrankReed/harbor-ledger)
  y un [producto anunciado en el espacio marítimo](https://smarter-harbor.com/).

Antes de publicar se debe comprobar nuevamente:

- Repositorios y organizaciones en GitHub.
- Búsqueda general y tiendas de aplicaciones.
- Dominio deseado, solo si se decide comprar uno.
- Bases de datos de marcas relevantes si el proyecto evoluciona a uso comercial.

El screening actual es suficiente para un working name, no es asesoría legal ni
una autorización comercial.

## Repositorio

El flagship vivirá en un repositorio independiente con slug recomendado
`keelwatch`.

Razones:

- Mantiene historia, issues, releases y CI centrados en el producto.
- Evita convertir el sitio del portfolio en un monorepo accidental.
- Permite evaluar el flagship sin ruido visual o assets 3D del sitio.
- Hace posible versionar demo, migraciones y documentación juntos.
- El portfolio puede consumir únicamente capturas, resumen y enlaces públicos.

La transición terminó el 2026-09-30. El repositorio independiente está ubicado
canónicamente en `C:\Users\epile\Documents\Projects\GIT\Keelwatch` y contiene
este paquete como fuente editable de verdad. No se recuperarán ni sincronizarán
copias desde el antiguo directorio temporal salvo que se demuestre que falta un
artefacto concreto.

## Próxima acción

Construir el walking skeleton de Fase 1 en este repositorio. La futura
integración con el sitio del portfolio consumirá únicamente evidencia pública y
enlaces; no devolverá la implementación a ese repositorio.
