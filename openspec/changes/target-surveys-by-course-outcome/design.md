## Context

Las encuestas ya usan colecciones privadas, servicio autorizado y diseño inmutable al publicar. Los resultados de cursada tienen snapshots publicados separados de borradores. El curso activo de Pensamiento Crítico tiene 149 matrículas, sin encuestas ni resultados publicados; las funciones están deshabilitadas. Hay otra cohorte en borrador que queda fuera del alcance.

## Goals / Non-Goals

**Goals:** Compartir una regla de elegibilidad en las tres entradas estudiantiles, preservar las encuestas anteriores y entregar dos borradores concretos.

**Non-Goals:** Publicar resultados, inferir aprobación desde notas o actividades, publicar automáticamente encuestas, mensajes externos, listas manuales de alumnos o modificar otras tareas en curso.

## Decisions

- Campo select opcional audience en course_surveys: all, approved, not_approved_or_incomplete. Valores ausentes o vacíos se interpretan como all por compatibilidad. Valores desconocidos se rechazan, nunca se convierten en all.
- Contrato con audience opcional para los consumidores existentes; validación de guardado lo normaliza a all. Editor incorpora destinatarios y vistas docentes muestran una etiqueta; los títulos estudiantiles son neutrales.
- Obtener una vez el snapshot publicado propio al listar y filtrar los registros antes de consultar participación. Reutilizar la misma función de elegibilidad en apertura y envío. Consultar solo el curso y alumno autenticado; ninguna identidad procede de parámetros de destinatarios.
- Encuestas segmentadas requieren outcomesEnabled y un estado publicado reconocido. Se permite preparar borradores con resultados deshabilitados; publicar una encuesta segmentada exige habilitar resultados primero. Las encuestas generales continúan funcionando sin esta dependencia.
- Revalidar permisos de curso, matrícula y elegibilidad inmediatamente antes del envío transaccional. El diseño y destinatario quedan fijos desde publicación. Las respuestas anteriores se conservan si se cambia el resultado; el acceso posterior corresponde al resultado publicado vigente.
- Migración aditiva e idempotente con respaldo y comprobación de inventario; sin backfill de registros ni modificaciones de respuestas.
- Preparación idempotente de dos borradores anónimos con IDs estables en el curso identificado, validación del contrato, respaldo y lote atómico. Habilitar solo encuestas en ese curso para poder revisarlas; conservar outcomesEnabled deshabilitado y no publicar nada. Verificar que los borradores preexistentes con esos IDs coincidan antes de reutilizarlos; nunca sobrescribir una encuesta editada o publicada.
- Contenido: seis preguntas comunes (claridad, materiales, ritmo, acompañamiento, actividades y mejora) y cuatro específicas de cada experiencia. Incluir respuestas «No participé / no puedo valorar» y opciones de dificultad que no asumen haber rendido o completado. Textos libres opcionales y aviso de anonimato dentro del grupo.

## Risks / Trade-offs

- Resultado modificado durante una solicitud → lectura vigente y nueva comprobación antes del lote; futuras solicitudes vuelven a autorizarse.
- Grupos pequeños → preservar las garantías actuales de anonimato de la aplicación y evitar preguntas que pidan identificarse; el destinatario no representa anonimato entre cohortes.
- Código previo al despliegue ignora campos nuevos → mantener las dos encuestas en borrador hasta desplegar el filtro, habilitar resultados y publicar los estados.
- Otros cambios locales en curso → editar solo los archivos de encuestas y los nuevos artefactos; no agregar ni revertir cambios ajenos.

## Migration Plan

Aplicar el campo con respaldo; verificar pruebas reales con alumnos de los tres estados y un resultado pendiente. Desplegar el código antes de publicar encuestas segmentadas. Crear los dos borradores del curso activo, habilitando únicamente encuestas. Para revertir, conservar datos y deshabilitar encuestas en los cursos con segmentadas antes de volver a una versión sin filtro, que también mostraría las encuestas cerradas.
