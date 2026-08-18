## Context

La pantalla `/login` ofrece actualmente una única acción “Continuar con Google”. Véase `proposal.md` para la motivación y `specs/authentication-and-access/spec.md` para el comportamiento esperado. La aclaración debe estar disponible antes de OAuth, conservar el diseño compacto del acceso y no introducir captura de datos ni estado nuevo.

## Goals / Non-Goals

**Goals:**

- Mostrar una explicación breve y accionable dentro de la tarjeta de acceso.
- Distinguir Cuenta de Google de dirección Gmail.
- Dar una salida clara cuando el correo compartido por Google no coincide con el invitado.
- Cubrir el contenido mediante una prueba de componente independiente.

**Non-Goals:**

- Agregar Microsoft OAuth, autenticación por contraseña o magic links.
- Detectar dominios o validar previamente si un correo pertenece a una Cuenta de Google.
- Modificar automáticamente emails invitados.

## Decisions

### 1. Orientación visible y estática en el login

Se incorporará un bloque informativo debajo de la acción OAuth, con el título “¿Tu correo no termina en @gmail.com?”. Permanecerá visible sin desplegables para que la persona lo encuentre antes de intentar ingresar. Se descarta un modal porque añadiría una interacción innecesaria y podría pasar inadvertido.

### 2. Componente presentacional independiente

El contenido se aislará en un componente sin estado reutilizado por `/login`. Esto permite probar semántica, texto y enlace con la configuración actual de Vitest, que incluye componentes pero no páginas de `app`.

### 3. Enlace a documentación oficial

El bloque enlazará a la ayuda oficial de Google sobre crear una Cuenta de Google con un correo existente. Se abrirá en otra pestaña con atributos seguros, para conservar el acceso a Epixum mientras la persona completa el procedimiento externo.

### 4. Sin prometer coincidencia de correos alternativos

La copia indicará elegir exactamente el email autorizado y contactar a administración si la invitación no aparece. No afirmará que cualquier correo alternativo de una Cuenta de Google será necesariamente el email compartido por OAuth.

## Risks / Trade-offs

- **[La ayuda externa cambia de URL o contenido]** → Usar el centro oficial de Google y mantener el texto esencial también dentro de Epixum.
- **[La tarjeta de acceso gana altura]** → Mantener el bloque breve, con tipografía secundaria y reflujo natural en pantallas pequeñas.
- **[La persona selecciona otra Cuenta de Google]** → Destacar la coincidencia exacta con el email invitado y el contacto administrativo como recuperación.

## Migration Plan

Desplegar el componente junto con su integración en `/login`; no hay migración de datos. El rollback consiste en retirar el bloque informativo sin afectar sesiones, usuarios ni invitaciones.
