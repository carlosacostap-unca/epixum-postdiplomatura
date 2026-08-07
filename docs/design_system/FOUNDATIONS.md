# Fundamentos visuales accesibles

Este documento complementa `DESIGN.md` con el contrato técnico de tokens y accesibilidad usado por la implementación `redesign-role-based-experience`.

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
| Texto principal | `#ffffff` | `#0e0e0e` | 19.30:1 |
| Texto principal en superficie alta | `#ffffff` | `#262626` | 15.13:1 |
| Texto secundario | `#c4c0c1` | `#0e0e0e` | 10.72:1 |
| Texto secundario en superficie alta | `#c4c0c1` | `#262626` | 8.40:1 |
| Texto atenuado | `#9f9b9c` | `#0e0e0e` | 7.03:1 |
| Texto atenuado en tarjeta | `#9f9b9c` | `#1a1a1a` | 6.33:1 |
| Marca/éxito | `#3fff8b` | `#0e0e0e` | 14.61:1 |
| Texto sobre acción primaria | `#000000` | `#3fff8b` | 15.89:1 |
| Error | `#ffb4ab` | `#262626` | 8.91:1 |
| Advertencia | `#ffd166` | `#262626` | 10.50:1 |
| Información | `#7ae6ff` | `#262626` | 10.51:1 |
| Límite de control | `#777274` | `#262626` | 3.20:1 |
| Foco | `#7ae6ff` | `#0e0e0e` | 13.41:1 |

Los colores de estado nunca deben ser el único medio de comunicación: se acompañan con texto, icono o ambos.

## Reglas globales

- El foco de teclado usa un contorno visible de 3 px y separación de 3 px.
- Botones, campos y controles táctiles nuevos tienen un objetivo mínimo de 44 × 44 px.
- El documento soporta 320 px sin desplazamiento horizontal de página; los desbordes pertenecen a componentes explícitos.
- `prefers-reduced-motion: reduce` elimina animaciones y desplazamientos no esenciales.
- Los estados `disabled` conservan legibilidad y los estados `busy` deben incluir una etiqueta comprensible.
- Las fronteras decorativas pueden ser más sutiles; los límites necesarios para identificar controles usan `outline` u otra señal equivalente con contraste mínimo de 3:1.

## Alcance de esta etapa

Los tokens y reglas globales quedan disponibles sin rediseñar todavía cada pantalla. Las etapas posteriores migrarán componentes y reemplazarán valores heredados gradualmente, evitando un cambio transversal difícil de revertir.
