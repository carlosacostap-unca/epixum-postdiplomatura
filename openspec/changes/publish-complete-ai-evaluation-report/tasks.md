## 1. Informe pedagógico

- [x] 1.1 Crear el formateador puro del informe completo, con pruebas de todos los criterios, listas, cobertura, rúbrica histórica, ausencia de detalle y selección explícita de campos.
- [x] 1.2 Incluir en el DTO docente los criterios de la rúbrica histórica necesarios para el informe, sin exponer el snapshot completo.

## 2. Publicación y compatibilidad

- [x] 2.1 Componer por defecto la devolución completa para nuevas sugerencias, mantenerla editable y conservar textos guardados y evaluación manual; probar confirmación y publicación del texto editado.
- [x] 2.2 Probar persistencia del informe íntegro, visibilidad estudiantil e historial, conservando bloqueos por versión, commit y autorización.

## 3. Validación y operación

- [x] 3.1 Documentar publicación del informe y ausencia de migración/reevaluación automática; ejecutar pruebas, TypeScript, lint, build y validación OpenSpec.

Validación local 03/10/2026: 247 pruebas aprobadas y 2 smoke externos omitidos; TypeScript, lint de archivos afectados y build de producción aprobados. OpenSpec validado con modo estricto. No se modificaron registros de producción ni permisos de PocketBase. Queda pendiente el despliegue para utilizar el cambio en epixum.com.
