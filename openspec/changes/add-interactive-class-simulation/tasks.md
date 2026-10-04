## 1. Simulación

- [x] 1.1 Separar presentación de la sala y transporte, conservando el flujo real.
- [x] 1.2 Implementar motor aislado, ingreso, participantes, comandos y reinicio.
- [x] 1.3 Incorporar ruta protegida, enlaces y panel docente/alumnos.

## 2. Verificación

- [x] 2.1 Probar permisos, respuestas independientes, reconexión, cierre, reinicio y ausencia de tráfico real.
- [x] 2.2 Actualizar guía y verificar lint, tipos, build y especificaciones.

Validación: 40 pruebas pasan; tipos, compilación de producción y OpenSpec estricto pasan. Lint del proyecto pasa excluyendo tmp/**; el lint general detecta un error previo en tmp/evaluar-pendientes-20261003.mjs, ajeno al cambio. Navegador de producción local: ingreso y respuesta sincronizada, material borrador sin clase, escritorio/móvil y consola sin errores. Sin sesiones reales creadas; fixtures temporales eliminados. No se desplegó el VPS.
