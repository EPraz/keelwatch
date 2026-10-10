# Revisión del espaciado de Maintenance

Referencia: dirección explícita del propietario — reutilizar el proyecto implementado,
sus tokens y CSS base. No se introduce un brief ni una estética nueva.

## Capturas

Componentes reales en Vite/Chrome aislado, con datos sintéticos y lecturas simuladas;
no representan una nueva ejecución del flujo autenticado completo.

| Ancho   | Oscuro                                                  | Claro                                                    |
| ------- | ------------------------------------------------------- | -------------------------------------------------------- |
| 375 px  | [Captura](screenshots/review-maintenance-dark-375.png)  | [Captura](screenshots/review-maintenance-light-375.png)  |
| 768 px  | [Captura](screenshots/review-maintenance-dark-768.png)  | [Captura](screenshots/review-maintenance-light-768.png)  |
| 1280 px | [Captura](screenshots/review-maintenance-dark-1280.png) | [Captura](screenshots/review-maintenance-light-1280.png) |

## Hallazgo y corrección

Crew composition y Assignment plans heredan el padding de `.vessel-activity`:
`clamp(var(--space-5), 5vw, var(--space-7))`. Sus contenedores exteriores no tienen
borde ni fondo propio. Maintenance está dentro de `.vessel-detail-grid`, que sí
delimita el panel, y sustituía ese padding por `--space-4` hasta 768 px.

Se elimina la excepción exterior de Maintenance y Order history: ahora reutilizan
el mismo padding responsive. En 320/375 px pasa de 16 a 24 px; a 768 px sigue el
clamp compartido. Los formularios anidados conservan su padding compacto para evitar
acumular espacios y estrechar excesivamente los campos.

La tabla de cinco columnas dividía nombres en exceso a 768 px. Se conservan las
tarjetas de Fleet hasta 1024 px, donde ya hay espacio para presentar la tabla.

## Verificación y límites

La comparación de padding calculado con el patrón base pasa en los seis anchos.
Texto largo envuelve, formularios reorganizan columnas y paginación admite salto
de línea. No hay overflow ni errores de ejecución en ambos temas; Enter pagina y
enfoca el encabezado, con movimiento reducido emulado. Tipografías y colores siguen
los tokens existentes. Este ajuste no altera estados, formularios ni permisos.

Permanece el límite conocido de contraste de los botones naranjas y algunos textos
secundarios del tema claro. La revisión de espaciado no acredita WCAG completo.
