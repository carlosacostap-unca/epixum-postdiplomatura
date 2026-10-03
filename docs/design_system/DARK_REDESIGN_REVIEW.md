# Revisión UX/UI y rediseño oscuro

Fecha: 3 de octubre de 2026. Cambio: `redesign-dark-learning-workspace`.

## Criterios acordados

Revisión de las tareas de estudiantes, docentes y administración; rediseño profundo con criterio propio; computadora y celular; conservación del tema oscuro.

## Problemas encontrados y mejoras implementadas

| Problema | Mejora |
| --- | --- |
| Mezcla de estilos, radios excesivos y encabezados que desplazaban las tareas importantes | Paleta oscura unificada, bordes discretos, títulos adaptables, tarjetas y espaciado compactos |
| Navegación móvil con poco contexto y una barra inferior de un único destino | Menú con etiquetas, secciones y cambio de espacio; cabecera de ubicación y perfil |
| Enlaces de Clases/Trabajos sin destino en cursos semanales | Navegación compartida que distingue Unidades y organización tradicional; pruebas para ambos roles |
| Listados extensos de unidades | Unidades plegables con cantidades visibles; apertura inicial de la próxima actividad para estudiantes y de la primera unidad para docentes |
| Próxima tarea diluida entre indicadores | Continuidad antes de métricas para estudiantes; accesos de gestión y borradores para administración |
| Selección múltiple dependiente de Ctrl/Cmd | Casillas etiquetadas, independientes y táctiles; mismo contrato de envío al servidor |
| Formularios y filas difíciles de usar en anchos pequeños | Controles y botones adaptables, filas de entregas apiladas, tarjetas móviles y desbordamiento local de tablas/pestañas |
| Ancho mínimo global recortaba el margen derecho con barras de desplazamiento clásicas | Contenedores flexibles sin ancho mínimo impuesto al documento |
| Evaluación con estilos heredados y poca jerarquía | Identidad del estudiante, versión, fecha y estado claros; mejor lectura del borrador de evaluación |
| Estado activo del editor no se actualizaba siempre y había extensión de enlaces duplicada | Suscripción al estado de edición, botones con etiquetas y estado accesible, registro único de enlaces |
| Errores de descarga podían dejar una espera inconclusa | Liberación del estado en finally y aviso de error persistente para reintentar |

## Alcance del código

Renovación transversal del shell, tokens y componentes; migración del contenedor de página en las áreas de estudiantes, docentes y administración y en revisión de entregas. Ingreso, cursos, creación de trabajos/consultas, editor, formularios, recursos y entregas usan la misma dirección visual.

Se conservaron las acciones de servidor, permisos, reglas académicas, contratos de formularios y contenido guardado. Los cambios locales preexistentes del usuario permanecen intactos.

## Verificación técnica

- `npm run test:ui -- --reporter=dot`: **60 archivos y 255 pruebas aprobadas**, 2 archivos/pruebas omitidos según la suite existente.
- `tsc --noEmit --incremental false`: aprobado.
- ESLint en `app`, `components`, `lib/navigation.ts` y `lib/course-navigation.ts`: aprobado sin advertencias.
- `npm run build`: aprobado, rutas de producción generadas.
- Validación OpenSpec estricta de este cambio: aprobada.
- `git diff --check`: aprobado.

El lint global detecta un error preexistente en `tmp/evaluar-pendientes-20261003.mjs:19`, regla `@next/next/no-assign-module-variable`. Ese script es trabajo local previo y no se modificó.

La primera compilación encontró tipos de desarrollo de la vista temporal ya retirada. Se eliminaron únicamente esos tipos generados y la compilación final pasó. La ruta temporal no integra el resultado de producción.

## Revisión visual y de interacción

Navegador Chromium con Playwright, anchos de 320, 768 y 1440 px:

- Ingreso real en escritorio y celular; ingreso servido también desde la compilación de producción.
- Representaciones con los componentes reales y datos sintéticos de estudiantes, docentes y administración.
- Formularios de curso, listados, unidades y entregas; controles de revisión docente abiertos en celular.
- Sin desplazamiento horizontal del documento en las vistas comprobadas. Pestañas y tablas admiten desplazamiento interno cuando corresponde.
- Escape cierra el menú móvil y devuelve el foco a su botón.
- Enter alterna una unidad nativa y conserva el foco en summary.
- Prueba con el editor real: el botón Negrita cambia su estado accesible al activar y desactivar formato.
- Contrastes sRGB calculados en [FOUNDATIONS.md](FOUNDATIONS.md): texto normal de los pares documentados supera 4.5:1; foco y límites esenciales superan 3:1.

Capturas locales en `output/playwright/`: `login-desktop.png`, `login-mobile.png`, `student-desktop.png`, `student-mobile.png`, `teacher-desktop.png`, `teacher-mobile.png`, `teacher-review-mobile.png`, `admin-desktop.png` y `admin-mobile.png`. Algunas capturas docentes/administrativas corresponden a iteraciones previas a los últimos ajustes de margen y avatar.

## Límites y siguiente validación de producto

Las vistas autenticadas se revisaron con datos sintéticos locales, sin escribir cuentas, matrículas ni evaluaciones en la instancia real. Esto no prueba integralmente OAuth, descarga desde almacenamiento, publicación de una evaluación ni todas las combinaciones de datos reales.

Conviene realizar una sesión de aceptación con usuarios de los tres espacios: encontrar la próxima actividad, entregar un trabajo, revisar y publicar una devolución, y gestionar participantes. Esa sesión permitirá ajustar prioridades según el uso observado. La revisión realizada no equivale a una certificación completa de accesibilidad.

La dirección vigente se documenta en [DESIGN.md](DESIGN.md); propuesta, requisitos y tareas están en `openspec/changes/redesign-dark-learning-workspace/`.
