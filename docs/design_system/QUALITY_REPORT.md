# Informe de consolidación y calidad

Fecha de medición: 4 de agosto de 2026. Entorno: Next.js 16.3 en desarrollo local, PocketBase remoto y Chromium automatizado. Los tiempos son direccionales y no constituyen un SLA de producción.

## Rendimiento de portadas

`createServerClient` y `getCurrentUser` se memoizan por render de servidor. Esto comparte una sola autenticación entre layout, página y loaders sin compartir estado entre requests o usuarios.

| Portada | Requests PocketBase antes | Requests después | Carga local observada |
| --- | ---: | ---: | ---: |
| Administración | 4 | 3 | 1.271 ms |
| Docencia | 8 | 5 | 1.228 ms |
| Estudio | 9 | 6 | 1.176 ms |

El conteo incluye `authRefresh`. Las portadas sin cursos cortan anticipadamente después de autenticación y consulta de cursos/matrículas. La matrícula estudiante pagina de a 100 registros y sólo añade requests si una persona supera ese volumen.

Durante la medición se corrigió una incompatibilidad de PocketBase: ordenar `course_enrollments` en el servidor junto con su regla relacional devolvía HTTP 400. Las consultas de matrículas del estudiante y participantes del curso ahora paginan sin `sort` y ordenan los pocos resultados en memoria.

## Accesibilidad y responsive

Se inspeccionaron los árboles semánticos de login, administración, docencia y estudio con sesiones temporales por rol.

- 320 px: login, administración y estudio no presentaron overflow. Docencia mostró inicialmente 291 px de overflow; tras ajustar el track móvil a `minmax(0,1fr)`, quedó en 0 px.
- Teclado: el primer Tab enfoca “Saltar al contenido” con contorno de 3 px; Enter mueve el foco a `main`.
- Diálogo de matrícula: abre con foco en “Clave del curso”, Escape cierra y devuelve el foco a “Sumarme a un curso”.
- Lectura estructural: landmarks, títulos, estados, tablas/listas y controles aparecen con nombres y roles comprensibles en el árbol de accesibilidad.
- Movimiento reducido: con `prefers-reduced-motion: reduce`, las transiciones comprobadas bajan de 150 ms a 0,01 ms.
- Reflow 200 %: se comprobó el equivalente de 640 CSS px y, adicionalmente, 320 px como condición más restrictiva, sin pérdida de acciones ni scroll horizontal.

## Validación automática

- ESLint: sin errores ni advertencias.
- TypeScript: sin errores.
- Vitest: incluye shell, navegación, diálogos, toast, tablas, roles, matrícula, alcance docente, vencimientos, `ErrorState` y la regresión de matrículas.
- Build de producción: correcto con Next.js 16.3.
- OpenSpec: validación estricta requerida antes de archivar el cambio.
