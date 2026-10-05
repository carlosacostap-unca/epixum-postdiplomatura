# Bedeles por curso

En **Administración → Cursos → un curso → Bedeles**, se asignan nombre, apellido y email. La asignación es opcional y no tiene un máximo de personas por curso. Un email puede tener asignaciones en varios cursos; no puede repetirse en el mismo curso. Para corregir una asignación, retirarla y volver a cargarla.

No hace falta crear una cuenta previamente ni enviar una invitación de estudiante. Cuando la persona inicia sesión con ese email verificado mediante el acceso existente, aparece el espacio **Bedelía** con sus cursos. Los correos se comparan sin distinguir mayúsculas. El nombre y apellido ingresados identifican la asignación; no sobrescriben el perfil personal.

Bedel es una participación por curso y un espacio de navegación, como la docencia contextual del campus. No se cambia el rol global de una cuenta existente. Puede enseñar o estudiar en otros cursos. La aplicación impide asignaciones simultáneas de bedel y docente/alumno en el mismo curso; para cambiar la participación, primero retirar la anterior. Los privilegios globales de administración continúan siendo independientes: no se puede convertir un administrador en una cuenta de solo lectura asignándolo como bedel.

## Permisos y alcance

- Consulta del contenido: descripción, clases, trabajos prácticos, semanas (incluidos borradores), contenidos independientes y material de clases interactivas cuando están habilitados.
- Apertura de enlaces y descarga de archivos del curso, con una nueva comprobación de asignación y pertenencia del recurso en cada descarga.
- Consulta de asistencias ya registradas en las instancias de revisión, con estudiante, instancia, fecha y presente/ausente. El campus todavía no tiene una colección de asistencia general por clase; no se interpreta la conexión a una clase en vivo como asistencia.
- Sin edición, entregas, calificaciones, configuración de IA, claves de matrícula, respuestas de estudiantes ni guiones privados de docentes.
- Retirar una asignación corta las nuevas consultas al curso. Como en las descargas existentes del campus, una URL de archivo ya firmada conserva su vigencia de hasta una hora.

Las lecturas privilegiadas están en `lib/course-bedel-data.ts`, exclusivamente en servidor. Primero se comprueba la asignación con el cliente autenticado; después se consulta un conjunto fijo de campos y colecciones, filtrado por el curso autorizado. No se amplían las reglas de escritura existentes ni se entrega el cliente de servicio al navegador. PocketBase permite leer únicamente las asignaciones propias con email verificado y reserva sus mutaciones a administración.

## Instalación

Antes de usar Bedelía, ejecutar en el entorno que se quiera actualizar:

```sh
npm run schema:bedels
```

Usa las variables existentes de `.env.local`: `NEXT_PUBLIC_POCKETBASE_URL` y `POCKETBASE_SUPERUSER_EMAIL` / `POCKETBASE_SUPERUSER_PASSWORD` (o sus alternativas `POCKETBASE_ADMIN_*`). La aplicación necesita estas mismas credenciales de servicio para leer el contenido autorizado, igual que otros módulos del campus.

La migración crea `course_bedels` con relación al curso, nombre, apellido, email e índice único por curso/email. Es repetible y conserva campos e índices ajenos. No modifica registros de usuarios, matrículas, docentes ni reglas de otras colecciones. El esquema declarativo de referencia también incluye la colección; debe reemplazarse `COURSES_COLLECTION_ID` al importarlo manualmente.

## Verificación

```sh
npm run schema:bedels:test
npm run test:ui -- lib/course-bedel-data.test.ts lib/actions-course-bedels.test.ts lib/actions-bedel-resources.test.ts lib/course-bedel-access.test.ts components/CourseBedelManager.test.tsx
npx tsc --noEmit
```

Prueba manual después de migrar: asignar dos emails a un curso y uno de ellos a otro; entrar con cada identidad y verificar sus cursos; abrir materiales y asistencias; intentar una URL de un curso ajeno; retirar una asignación y verificar que se pierde el acceso. Comprobar que docentes y estudiantes conservan sus espacios anteriores.
