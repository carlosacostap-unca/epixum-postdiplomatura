## Why

Epixum reúne todas las tareas académicas, pero las pantallas largas, la navegación por anclas inexistentes en cursos por unidades y la mezcla de estilos dificultan encontrar la próxima acción. Se solicita un rediseño profundo, oscuro y usable en computadora y celular para estudiantes, docentes y administración.

## What Changes

- Renovar superficies, tipografía, proporciones, estados y componentes compartidos con una identidad oscura sobria y acentos verdes.
- Reorganizar el shell: ubicación visible, navegación con etiquetas claras, inicio administrativo explícito y menú móvil accesible que no ocupe una barra con un solo destino.
- Hacer que los cursos por unidades tengan un destino real «Unidades»; conservar Clases y Trabajos en cursos tradicionales.
- Permitir plegar unidades con sus cantidades y estado visibles para reducir desplazamiento sin ocultar acciones.
- Priorizar continuidad y pendientes en las portadas; añadir accesos operativos en administración.
- Unificar el ingreso, los formularios, recursos y evaluación con el lenguaje visual común y feedback accesible.
- Corregir desbordes de formularios, tablas y revisión de entregas en anchos pequeños.

## Capabilities

### New Capabilities

- `dark-learning-workspace`: experiencia integral oscura, navegación adaptable por organización del curso y unidades plegables accesibles.

### Modified Capabilities

Ninguna modificación de reglas académicas o de autorización existentes.

## Impact

Afecta `app/`, `components/ui`, `components/shell`, navegación y componentes de curso. Conserva URLs de detalle, permisos y acciones de servidor. No requiere migraciones, escrituras de datos, cambios de autenticación ni nuevas dependencias. Se mantienen los cambios locales preexistentes del usuario. La propuesta y validación quedan registradas en este cambio.
