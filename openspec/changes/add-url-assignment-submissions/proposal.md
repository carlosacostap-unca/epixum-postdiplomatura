## Why

Las entregas de trabajos prácticos actualmente exigen subir uno o más archivos, lo que impide entregar proyectos alojados en repositorios, documentos compartidos u otras plataformas. Los estudiantes necesitan poder elegir entre conservar la carga de archivos existente o registrar una URL accesible para el docente.

## What Changes

- Incorporar una modalidad de entrega por URL como alternativa a la carga de archivos.
- Validar en cliente y servidor que la URL sea absoluta y utilice HTTP o HTTPS.
- Permitir crear y actualizar una entrega cambiando entre archivos y URL antes del vencimiento.
- Mostrar la URL entregada como enlace seguro tanto al estudiante como al docente, manteniendo las descargas prefirmadas para archivos.
- Conservar la regla de una entrega por estudiante y trabajo y los controles actuales de matrícula, rol y fecha límite.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `assignments-deliveries-and-evaluation`: ampliar las entregas para admitir, de forma excluyente, uno o más archivos o una URL HTTP(S), incluyendo su consulta y revisión docente.

## Impact

- Componentes de entrega estudiantil y listado/revisión docente.
- Acciones de servidor y utilidades de serialización de entregas.
- Persistencia compatible sobre el campo existente `deliveries.repositoryUrl`; no requiere migración ni nuevas dependencias.
- Las entregas de archivos ya almacenadas continúan siendo legibles y descargables.
