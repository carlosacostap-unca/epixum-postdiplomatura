# Validación

- Compilación de producción con Next.js 16.3 y comprobación TypeScript: correctas.
- Suite completa Vitest: 133 archivos aprobados, 12 omitidos; 805 pruebas aprobadas, 22 omitidas por la configuración existente.
- Pruebas finales del shell, navegación contextual y formulario: 19 aprobadas. Incluyen salto de foco al contenido, herramientas condicionales, navegación móvil, navegación de pestañas por teclado y conservación de valores ocultos en FormData.
- ESLint sobre el área modificada: sin errores. Advertencia previa por `examId` sin utilizar en `app/admin/courses/[id]/parciales/nuevo/page.tsx`, archivo sin cambios.
- OpenSpec estricto y `git diff --check`: correctos.

## Revisión en navegador

Se ejecutó la aplicación Next.js real con un servidor local de datos ficticios que rechaza escrituras de registros. La autenticación y el cliente de servicio de esa instancia temporal se dirigieron únicamente al servidor local, con credenciales de prueba.

- 14 vistas principales del admin en escritorio (1280 px) y móvil (375 px), sin errores JavaScript ni desbordamiento horizontal de página.
- Cuatro detalles adicionales: creación de parcial, creación de simulación, creación de encuesta y resultado individual de cursada.
- Comprobaciones adicionales a 320 y 768 px en inicio, cursos, usuarios, configuración, participantes y acceso.
- Confirmación de eliminación abierta y cancelada; navegación del selector móvil; apertura y cierre por Escape del menú; recuperación del campo obligatorio oculto; salto al contenido con foco verificado.
- Capturas de escritorio y móvil en `output/playwright/admin-implemented-*.png` (salida local ignorada por Git).

Las comprobaciones no modificaron datos de producción ni ejecutaron operaciones de eliminación o publicación.
