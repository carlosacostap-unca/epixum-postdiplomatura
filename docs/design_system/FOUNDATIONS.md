# Fundamentos visuales accesibles

Este documento complementa `DESIGN.md` con el contrato técnico de tokens y accesibilidad actualizado por `redesign-dark-learning-workspace`.

## Tokens semánticos

- Fondo y superficies: `background`, `surface`, `surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`.
- Texto: `on-surface`, `on-surface-variant`, `text-muted`.
- Marca y acciones: `primary`, `primary-hover`, `primary-pressed`, `primary-container`, `on-primary`, `tertiary`.
- Estado: `success`, `warning`, `error`, `info` y sus colores `on-*`.
- Controles: `outline`, `outline-variant`, `focus` y `focus-offset`.
- Forma y ritmo: radios, sombras, duración, curva de movimiento, ancho de contenido y objetivo táctil mínimo.

El nombre semántico expresa intención y evita que una pantalla dependa directamente de un color físico.

## Validación de contraste WCAG 2.2

Los valores se calcularon con luminancia relativa sRGB y `(L1 + 0.05) / (L2 + 0.05)`. Los pares de texto normal superan 4.5:1; foco y límites esenciales superan 3:1.

| Uso | Primer plano | Fondo | Ratio |
| --- | --- | --- | ---: |
| Texto principal | `#f2f4f7` | `#0c1014` | 17.33:1 |
| Texto principal en superficie alta | `#f2f4f7` | `#2b3845` | 10.86:1 |
| Texto secundario | `#b9c4d0` | `#0c1014` | 10.79:1 |
| Texto secundario en superficie alta | `#b9c4d0` | `#2b3845` | 6.77:1 |
| Texto atenuado | `#a4b1c0` | `#0c1014` | 8.75:1 |
| Texto atenuado en tarjeta | `#a4b1c0` | `#141a21` | 8.03:1 |
| Marca/éxito | `#78e8ae` | `#0c1014` | 12.69:1 |
| Texto sobre acción primaria | `#092117` | `#78e8ae` | 11.24:1 |
| Error | `#ffb4ab` | `#2b3845` | 7.05:1 |
| Advertencia | `#ffd166` | `#2b3845` | 8.30:1 |
| Información | `#9dbdff` | `#2b3845` | 6.36:1 |
| Límite de control | `#7a899b` | `#2b3845` | 3.35:1 |
| Foco | `#a8c7ff` | `#0c1014` | 11.16:1 |

Los colores de estado nunca deben ser el único medio de comunicación: se acompañan con texto, icono o ambos.

## Reglas globales

- El foco de teclado usa un contorno visible de 3 px y separación de 3 px.
- Botones, campos y controles táctiles nuevos tienen un objetivo mínimo de 44 × 44 px.
- El documento soporta 320 px sin desplazamiento horizontal de página; los desbordes pertenecen a componentes explícitos.
- `prefers-reduced-motion: reduce` elimina animaciones y desplazamientos no esenciales.
- Los estados `disabled` conservan legibilidad y los estados `busy` deben incluir una etiqueta comprensible.
- Las fronteras decorativas pueden ser más sutiles; los límites necesarios para identificar controles usan `outline` u otra señal equivalente con contraste mínimo de 3:1.

## Alcance de esta etapa

Los tokens, el shell y los componentes compartidos se aplican a las áreas de estudiantes, docentes y administración. Los recorridos de ingreso, curso, creación y revisión de trabajos y recursos usan esta dirección. La revisión visual empleó datos sintéticos; no constituye una certificación completa de accesibilidad ni una prueba de todas las combinaciones de datos reales. Ver `DARK_REDESIGN_REVIEW.md` para resultados y límites.
