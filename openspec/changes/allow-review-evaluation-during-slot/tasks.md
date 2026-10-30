## 1. Implementación

- [x] 1.1 Habilitar evaluación desde startsAt en la agenda y el servicio, indicando el bloqueo de turnos futuros.
- [x] 1.2 Ajustar reglas de reservas y notas privadas e incorporar migración incremental respaldada sin modificar registros.
- [x] 1.3 Actualizar la guía operativa con disponibilidad desde el inicio y carácter definitivo.

## 2. Verificación

- [x] 2.1 Probar límites temporales, autorización y reservas ya evaluadas en servicio y pantalla.
- [x] 2.2 Probar idempotencia y conservación de reglas de la migración; verificar PocketBase con un turno sintético en curso y notas privadas.
- [x] 2.3 Ejecutar controles de tipos, lint y validación estricta de OpenSpec; registrar el estado de publicación.

Validación local y de PocketBase completada el 30/10/2026. Migración aplicada con respaldo. Se prepara publicación aislada de este ajuste en main y verificación de la acción publicada mediante el ensayo sintético documentado.
