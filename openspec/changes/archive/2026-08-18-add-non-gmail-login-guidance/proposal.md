## Why

Las personas invitadas con direcciones Hotmail, Yahoo u otros dominios pueden interpretar que “Continuar con Google” exige una cuenta `@gmail.com` y quedar bloqueadas antes de iniciar sesión. Epixum debe explicar, en el propio acceso, que pueden usar su dirección existente si está asociada a una Cuenta de Google y qué hacer cuando la invitación no aparece.

## What Changes

- Añadir en `/login` instrucciones visibles para personas cuyo correo invitado no termina en `@gmail.com`.
- Explicar que deben crear o utilizar una Cuenta de Google asociada al mismo correo autorizado, sin reemplazar su dirección actual.
- Proporcionar un enlace a la guía oficial de Google y advertir que deben elegir en Google exactamente la cuenta cuyo email fue invitado.
- Indicar que contacten a la administración si, después de ingresar, la invitación no aparece.
- Mantener Google OAuth como único mecanismo de autenticación; no se incorporan credenciales locales ni nuevos proveedores.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `authentication-and-access`: ampliar el comportamiento observable de la pantalla de acceso con orientación para correos no-Gmail y selección de la identidad invitada.

## Impact

- Interfaz y pruebas de `/login`.
- Especificación de autenticación y acceso.
- Sin cambios en PocketBase, usuarios, invitaciones, matrículas, secretos ni compatibilidad del flujo OAuth existente.
