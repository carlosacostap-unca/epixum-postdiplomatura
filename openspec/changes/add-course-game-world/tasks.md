## 1. Dominio y acceso

- [x] 1.1 Crear catálogo optativo del piloto y proyección de clases y misiones con estados académicos reales.
- [x] 1.2 Crear adaptador servidor autorizado con consultas por curso y estudiante, filtros de publicación y errores explícitos.

## 2. Experiencia

- [x] 2.1 Construir mapa original de aldea, selección de lugares, vista de lista y tablero de misiones responsivos y accesibles.
- [x] 2.2 Integrar ruta estudiantil, recuperación de errores y navegación condicional conservando cambios existentes.

## 3. Verificación y entrega

- [x] 3.1 Probar aislamiento, publicación, estados de entrega y navegación de la interfaz; ejecutar TypeScript y lint de archivos afectados.
- [x] 3.2 Documentar alcance, activación, limitaciones y resultados de validación; validar los artefactos OpenSpec.

## 4. Evolución Phaser

- [x] 4.1 Integrar Phaser con carga cliente, ciclo de vida seguro y controles de animación accesibles.
- [x] 4.2 Construir aldea pixel art y animaciones originales con selección sincronizada al panel.
- [x] 4.3 Verificar pruebas, tipos, lint, escritorio y móvil; abrir la vista previa local y documentar resultados.

## 5. Aula inmersiva

- [x] 5.1 Convertir el juego en una vista de ventana completa y hacerlo entrada predeterminada del curso piloto, conservando acceso explícito al aula clásica.
- [x] 5.2 Agregar menú ampliable con salida a Epixum, encuentros, misiones, diario, ayuda y pausa; navegación accesible y retorno de foco.
- [x] 5.3 Probar rutas, menú y regresiones; verificar la vista previa en escritorio y móvil y actualizar documentación.

## 6. Personaje y bienvenida

- [x] 6.1 Implementar modelo validado de personaje, datos personales y progreso privado del onboarding; preparar migración idempotente y servicio autorizado.
- [x] 6.2 Crear editor pixel art, formulario precargado y recorrido guiado obligatorio, reanudable y accesible; integrar personaje al juego y salida a Epixum.
- [x] 6.3 Probar autorización, validación, persistencia y navegación; actualizar la vista previa sin guardar datos personales reales y documentar el despliegue pendiente.

## 7. Nodo Tecnológico Catamarca

- [x] 7.1 Representar el edificio de las fotografías en pixel art nativo y reunir allí todas las clases.
- [x] 7.2 Actualizar orientación, probar acceso por teclado, verificar la vista local y documentar el cambio.

## 8. Personaje caminante

- [x] 8.1 Implementar movimiento de avatar con teclado y controles táctiles, límites, colisiones y entrada al Nodo.
- [x] 8.2 Verificar pausa de controles, recorrido, acceso a clases y vista previa; documentar alcance.

## 9. Interior transitable

- [x] 9.1 Crear interior pixel art con pasillo, aulas por clase, colisiones y salida al exterior.
- [x] 9.2 Verificar recorrido completo, clases adicionales, accesibilidad y vista previa; documentar alcance.

## 10. Aulas transitables y pizarra

- [x] 10.1 Añadir escena de aula con escritorios, sillas, pizarra, colisiones y salida al pasillo.
- [x] 10.2 Activar contenido por proximidad a la pizarra, verificar navegación y actualizar vista previa/documentación.

## 11. Contenido integrado en la pizarra

- [x] 11.1 Cargar descripción y materiales publicados con autorización por curso/clase y URLs de archivos firmadas mediante el flujo existente.
- [x] 11.2 Mostrar lectura y visores compatibles dentro del juego, con reintentos, contenido seguro y retorno al mismo lugar.
- [x] 11.3 Probar aislamiento, recursos privados, renderizado seguro y navegación; actualizar vista previa y documentación.

## 12. Orientación del personaje

- [x] 12.1 Dibujar cuatro orientaciones personalizadas y elegirlas según el desplazamiento real.
- [x] 12.2 Verificar dirección, reposo, diagonales, tipos y vista previa local.


## 13. Animación de caminata

- [x] 13.1 Articular brazos y piernas según dirección y sincronizar pasos con distancia recorrida.
- [x] 13.2 Restablecer reposo, probar alternancia en cuatro direcciones y verificar vista local.


## 14. Caminar con clic o tap

- [x] 14.1 Convertir clic y tap a destinos, distinguir arrastre y permitir cancelación manual.
- [x] 14.2 Buscar rutas con colisiones compartidas y mostrar el destino sin atravesar obstáculos.
- [x] 14.3 Verificar rutas, controles, escalado y vista local.


## 15. Accesos caminando

- [x] 15.1 Hacer que las entradas al Nodo y aulas seleccionen destinos transitables en vez de cambiar de escena inmediatamente.
- [x] 15.2 Verificar umbrales de ocho puertas, teclado, alas adicionales y recorrido local completo.


## 16. Reloj del servidor y activación de aulas

- [x] 16.1 Sincronizar hora del servidor autenticado y representar fecha/hora de Argentina en el HUD.
- [x] 16.2 Bloquear puertas, colisiones, accesos alternativos y lectura de pizarra antes del inicio de clase.
- [x] 16.3 Confirmar aperturas con el servidor, manejar pérdida de sincronización y probar calendario, reloj y accesos.
- [x] 16.4 Verificar vista local con reloj del servidor Vite y documentar alcance de demostración.


## 17. Calendario real y Aula 0

- [x] 17.1 Consultar horarios reales y sustituir los registros ficticios de la vista local por una copia verificada.
- [x] 17.2 Simplificar reloj y añadir acceso independiente siempre abierto al Aula 0 con introducción en pizarra.
- [x] 17.3 Verificar acceso, contenido y compatibilidad de numeración y horarios.


## 18. Sincronización automática del calendario

- [x] 18.1 Sustituir copia local por lector PocketBase en servidor Vite, acotado al curso y sin credenciales en cliente.
- [x] 18.2 Reconciliar altas, bajas, orden, títulos y horarios manteniendo selección por ID.
- [x] 18.3 Probar consultas frescas, visibilidad, fallos y cambios de catálogo; verificar conexión real sin escrituras.


## 19. Perro robot compañero

- [x] 19.1 Dibujar mascota pixel art basada en referencia, con cuatro orientaciones y trote articulado.
- [x] 19.2 Añadir seguimiento con rutas, separación, colisiones y pausa durante paneles.
- [x] 19.3 Incorporar pista contextual en menú y verificar movimiento, arte y vista local.


## 20. Conversación de ayuda con el perro

- [x] 20.1 Habilitar clic/tap y teclado sobre el compañero con pausa del juego.
- [x] 20.2 Añadir preguntas sugeridas y escritas con orientación contextual y calendario sincronizado.
- [x] 20.3 Verificar interacción, límites de respuestas, tipos, lint y vista local.


## 21. Edición del personaje desde el menú

- [x] 21.1 Reutilizar el editor con datos actuales, cancelación y guardado de perfil, apariencia y mascota.
- [x] 21.2 Incorporar actualización autenticada y atómica sin reiniciar el recorrido.
- [x] 21.3 Verificar edición, cancelación, autorización, fallos de persistencia, tipos y lint.

## 22. Barrio del Nodo en pixel art

- [x] 22.1 Consultar ubicación y vista satelital del predio.
- [x] 22.2 Recrear calles, plaza y manzanas con arte original y escala jugable.
- [x] 22.3 Adaptar colisiones y acceso; verificar rutas, mascota, tipos y lint.

## 23. Barrio ampliado y seguimiento de cámara

- [x] 23.1 Revisar satélite a dos escalas y corregir predio y conexiones viales.
- [x] 23.2 Ampliar el mundo a 960 × 960 y centrar la cámara con límites y resize.
- [x] 23.3 Adaptar clics, mascota, colisiones y navegación A* para rutas largas.
- [x] 23.4 Verificar rutas, accesos, cámara, tipos, lint y vista local.
