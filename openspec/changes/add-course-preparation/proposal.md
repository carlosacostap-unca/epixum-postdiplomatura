## Why

Los alumnos necesitan practicar con evaluaciones simuladas antes de una instancia formal. Actualmente el curso no dispone de un espacio autónomo para resolver cuestionarios y recibir una devolución de práctica.

## What Changes

- Opción administrativa Preparación por curso, desactivada inicialmente.
- Gestión docente de cuestionarios de opción múltiple, borradores, publicación y archivo.
- Resolución individual, corrección y consulta del historial sin afectar calificaciones oficiales.
- Devolución al confirmar cada pregunta, avance persistente entre dispositivos y elección de continuar o crear un intento nuevo, con resumen final completo.
- Permisos por curso, separación de soluciones antes de la corrección y conservación de intentos frente a ediciones.

## Capabilities

### New Capabilities

- `course-preparation`: sección opcional, gestión de evaluaciones simuladas, intentos y seguimiento docente.

### Modified Capabilities

Ninguna.

## Impact

Formulario administrativo, navegación de docentes y alumnos, nuevas páginas y acciones Next.js y nuevas colecciones PocketBase. Migración aditiva con respaldo y flag falso para cursos existentes; no se alteran clases interactivas, entregas ni notas. El usuario confirmó intentos ilimitados y una respuesta correcta; posteriormente pidió reemplazar la devolución sólo al finalizar por feedback por pregunta, progreso persistente y resumen al terminar.
