## ADDED Requirements

### Requirement: Retorno seguro a clases interactivas
El sistema MUST conservar el destino de ingreso a una clase interactiva después de autenticarse y MUST aceptar únicamente destinos locales de las rutas interactivas habilitadas.

#### Scenario: Enlace recibido sin sesión
- **WHEN** un alumno abre el enlace de ingreso sin autenticación vigente
- **THEN** inicia sesión y vuelve al ingreso con el código original

#### Scenario: Destino manipulado
- **WHEN** se solicita regresar a una URL externa o ruta no admitida
- **THEN** se utiliza el inicio habitual de la cuenta
