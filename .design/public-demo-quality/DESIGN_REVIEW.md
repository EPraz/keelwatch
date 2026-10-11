# Design Review: public demo quality — #14

Fecha: 2026-10-11. Referencias: [Product brief](../../docs/flagship/PRODUCT_BRIEF.md),
[QA de #14](../../docs/flagship/DEMO_JOURNEY_QA.md) y la dirección explícita del propietario:
secciones sin marco alineadas con los paneles vecinos, 8 px entre etiqueta de sección
y título, y valores de Fleet identity de 14 px. Se conserva el diseño implementado:
tipografía editorial, superficies teal/papel y acento naranja.

## Resultado

Las cuatro capturas del propietario documentan móvil, iPad, Surface Pro y Crew profiles.
No equivalen a aceptación funcional de los cuatro recorridos ni a ejecución pública.
Se corrige la sangría restante de Crew profiles y la compresión de paneles/filtros
tras aparecer la barra lateral. Los checks anteriores de overflow de documento no
detectaban texto recortado dentro de selects.

## Should fix — resuelto

- **Crew registry desalineado:** heredaba entre 24 y 48 px de padding horizontal de
  `.vessel-activity`. Ver `screenshots/crew-ready-manager-dark-1280-before.png`.
  `.crew-registry` reutiliza la regla sin padding horizontal de Crew composition y
  Assignment plans. El título, lista, cabecera y formulario comparten ahora el extremo
  izquierdo; no se añade marco. Se mide diferencia de 0 px en los diez anchos.
- **Columnas prematuras en tablets:** a 1025 px el sidebar reduce el ancho disponible,
  mientras las columnas de Compliance exigían 704 px. Fleet identity y formularios
  también se comprimían. Ver `screenshots/workspace-empty-manager-dark-1180-before.png`.
  Las reglas de Compliance, `.form-layout` y `.vessel-detail-grid` pasan a dos columnas
  a 80 rem (1280 px). Debajo se apilan; a 1280/1440 se conserva la composición de escritorio.
- **Filtros de Maintenance estrechos:** a 1025 px cada select disponía de 114.53 px,
  frente a 143.93/147.00 px necesarios para sus selecciones iniciales, padding y flecha.
  Las acciones ocupan ahora otra fila bajo 1280 px. A 768 y menos se conserva una
  columna. Se verifica que las selecciones iniciales caben en los diez anchos; no
  se afirma que todas las opciones largas sean visibles sin abrir el select nativo.

## Revisión visual y técnica

- Jerarquía y tipografía: cabecera, estado documental y títulos siguen el orden
  existente. Las etiquetas conservan 8 px medidos hasta el título; Fleet identity
  conserva 14 px y el identificador mono. Los títulos se envuelven sin invadir campos.
- Consistencia y componentes: mismos inputs, botones, tokens, formularios y superficies.
  Crew permanece sin marco; se conserva el padding de Maintenance y de los paneles
  inversos. No se añade navegación, estado, abstracción ni comportamiento de escritura.
- Adaptación: se inspeccionan las 40 vistas finales de workspace/Crew y ocho del
  formulario Fleet, individualmente para las vistas clave y mediante galerías para
  comparar todos los anchos. Las columnas se reorganizan y las acciones pasan de fila.
  Se verifica ausencia de overflow de documento; la navegación móvil conserva su
  scroll interno cuando es necesario.
- Temas: claro/oscuro mantienen superficies inversas y la paleta del producto. No se
  cambian colores o escala de texto en este seguimiento.
- Accesibilidad y estados: 48 vistas finales sin errores de ejecución ni violaciones
  de axe; mediciones de alineación, selección visible, 8 px y 14 px pasan. La evidencia
  de foco/teclado, validación, error/reintento y estados del incremento original se
  conserva en la guía QA. Este seguimiento no vuelve a certificar esos recorridos ni
  declara conformidad WCAG completa.
- Alcance: Chrome headless renderiza React real con respuestas externas sintéticas;
  no prueba persistencia, OIDC real, dispositivos físicos ni despliegue público.
  El ancho CSS de las capturas aportadas no se infiere de su nombre de dispositivo.

## Must fix

Sin hallazgos pendientes en la alineación y adaptación verificadas. La aceptación
manual funcional y pública de #14 permanece pendiente en su registro QA.

## Could improve

Sin trabajo adicional propuesto: se conserva la escala y el espaciado existentes
aprobados por el propietario.

## Screenshots Captured

Capturas full-page locales en `.design/public-demo-quality/screenshots/`, ignoradas
por Git. Móvil: 375×812; tablet: 768×1024; escritorio: 1280/1440×800.
Otros anchos usan altura de viewport 900 px. Los archivos terminados en
`-before.png` son la reproducción previa de workspace/Crew en los mismos diez anchos
y dos temas; se conservan para comparación, sin presentarlos como resultados finales.

| Ancho | Tema  | Workspace final                                      | Crew final                                      |
| ----- | ----- | ---------------------------------------------------- | ----------------------------------------------- |
| 320   | dark  | `screenshots/workspace-empty-manager-dark-320.png`   | `screenshots/crew-ready-manager-dark-320.png`   |
| 320   | light | `screenshots/workspace-empty-manager-light-320.png`  | `screenshots/crew-ready-manager-light-320.png`  |
| 375   | dark  | `screenshots/workspace-empty-manager-dark-375.png`   | `screenshots/crew-ready-manager-dark-375.png`   |
| 375   | light | `screenshots/workspace-empty-manager-light-375.png`  | `screenshots/crew-ready-manager-light-375.png`  |
| 768   | dark  | `screenshots/workspace-empty-manager-dark-768.png`   | `screenshots/crew-ready-manager-dark-768.png`   |
| 768   | light | `screenshots/workspace-empty-manager-light-768.png`  | `screenshots/crew-ready-manager-light-768.png`  |
| 1024  | dark  | `screenshots/workspace-empty-manager-dark-1024.png`  | `screenshots/crew-ready-manager-dark-1024.png`  |
| 1024  | light | `screenshots/workspace-empty-manager-light-1024.png` | `screenshots/crew-ready-manager-light-1024.png` |
| 1025  | dark  | `screenshots/workspace-empty-manager-dark-1025.png`  | `screenshots/crew-ready-manager-dark-1025.png`  |
| 1025  | light | `screenshots/workspace-empty-manager-light-1025.png` | `screenshots/crew-ready-manager-light-1025.png` |
| 1080  | dark  | `screenshots/workspace-empty-manager-dark-1080.png`  | `screenshots/crew-ready-manager-dark-1080.png`  |
| 1080  | light | `screenshots/workspace-empty-manager-light-1080.png` | `screenshots/crew-ready-manager-light-1080.png` |
| 1100  | dark  | `screenshots/workspace-empty-manager-dark-1100.png`  | `screenshots/crew-ready-manager-dark-1100.png`  |
| 1100  | light | `screenshots/workspace-empty-manager-light-1100.png` | `screenshots/crew-ready-manager-light-1100.png` |
| 1180  | dark  | `screenshots/workspace-empty-manager-dark-1180.png`  | `screenshots/crew-ready-manager-dark-1180.png`  |
| 1180  | light | `screenshots/workspace-empty-manager-light-1180.png` | `screenshots/crew-ready-manager-light-1180.png` |
| 1280  | dark  | `screenshots/workspace-empty-manager-dark-1280.png`  | `screenshots/crew-ready-manager-dark-1280.png`  |
| 1280  | light | `screenshots/workspace-empty-manager-light-1280.png` | `screenshots/crew-ready-manager-light-1280.png` |
| 1440  | dark  | `screenshots/workspace-empty-manager-dark-1440.png`  | `screenshots/crew-ready-manager-dark-1440.png`  |
| 1440  | light | `screenshots/workspace-empty-manager-light-1440.png` | `screenshots/crew-ready-manager-light-1440.png` |

Los archivos previos tienen los mismos nombres de la tabla, con `-before` antes de
`.png` (40 capturas de reproducción). Referencias comparadas arriba:
`crew-ready-manager-dark-1280-before.png` y
`workspace-empty-manager-dark-1180-before.png`.

| Ancho | Fleet claro                                       | Fleet oscuro                                     |
| ----- | ------------------------------------------------- | ------------------------------------------------ |
| 768   | `screenshots/create-ready-manager-light-768.png`  | `screenshots/create-ready-manager-dark-768.png`  |
| 1025  | `screenshots/create-ready-manager-light-1025.png` | `screenshots/create-ready-manager-dark-1025.png` |
| 1280  | `screenshots/create-ready-manager-light-1280.png` | `screenshots/create-ready-manager-dark-1280.png` |
| 1440  | `screenshots/create-ready-manager-light-1440.png` | `screenshots/create-ready-manager-dark-1440.png` |
