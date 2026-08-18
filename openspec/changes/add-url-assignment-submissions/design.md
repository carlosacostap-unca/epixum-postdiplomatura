## Context

La entrega actual guarda en `deliveries.repositoryUrl` un arreglo JSON de archivos subidos a S3 y conserva compatibilidad con referencias simples antiguas. El flujo atraviesa tipos compartidos, acciones de servidor y vistas de estudiante y docente. Ver `proposal.md` y la delta spec de `assignments-deliveries-and-evaluation` para el comportamiento esperado.

## Goals / Non-Goals

**Goals:**

- Distinguir de manera inequívoca una entrega por URL de una entrega de archivos.
- Reutilizar el registro y campo existentes sin migración de PocketBase.
- Centralizar el parseo y la validación para evitar que una URL externa pase por el flujo de descarga S3.
- Mantener legibles las entregas de archivos actuales y las referencias simples heredadas.

**Non-Goals:**

- Verificar que la URL externa sea pública, exista o permanezca disponible.
- Copiar, previsualizar o analizar con IA el contenido remoto.
- Eliminar de S3 archivos reemplazados por otra modalidad.

## Decisions

### Usar un sobre JSON discriminado para las nuevas URL

Las entregas por URL se guardarán en el campo existente como `{"type":"url","url":"https://..."}`. Los archivos conservarán el arreglo JSON actual. Un parser compartido devolverá una unión discriminada (`files` o `url`) y seguirá interpretando referencias simples antiguas como archivos.

Esto evita una migración de esquema y, a diferencia de guardar la URL nueva como texto simple, permite distinguirla sin heurísticas de una URL S3 heredada.

### Exponer una única acción de escritura por tipo de contenido

Las acciones nuevas de URL compartirán las mismas comprobaciones de rol, pertenencia, matrícula, trabajo y vencimiento que las acciones de archivos. La validación HTTP(S) se ejecutará en el servidor aunque el cliente ya use un campo `type="url"`.

Se descarta aceptar esquemas arbitrarios porque protocolos como `javascript:` o `data:` no son apropiados para una entrega navegable y amplían innecesariamente la superficie de riesgo.

### Selector explícito de modalidad en la interfaz

El formulario presentará controles para alternar entre “Archivos” y “URL”. Solo los datos de la modalidad activa se validarán y enviarán. Al editar, el selector se iniciará con la modalidad persistida, y cambiar de modalidad reemplazará el contenido anterior después de confirmar el envío.

### Renderizar URLs como enlaces externos, no como descargas

Las vistas de estudiante y docente mostrarán la URL con `target="_blank"` y `rel="noopener noreferrer"`. Las acciones de URL prefirmada seguirán aceptando exclusivamente elementos de una entrega de archivos. La pantalla histórica de detalle también distinguirá ambas modalidades para no ofrecer descarga o preevaluación de una URL externa.

## Risks / Trade-offs

- [Una URL puede dejar de funcionar o requerir autenticación externa] → Informar que el enlace debe ser accesible para el docente; no prometer verificación de disponibilidad.
- [Los archivos reemplazados quedan almacenados sin referencia] → Mantener el comportamiento actual y tratar la limpieza de objetos como una mejora separada.
- [Referencias simples antiguas no tienen discriminador] → Interpretarlas como archivos heredados para conservar el flujo de descarga existente.
- [El campo `repositoryUrl` deja de reflejar un único formato] → Encapsular toda lectura y escritura en utilidades tipadas y cubrirlas con pruebas unitarias.

## Migration Plan

No se requiere migración de datos. El despliegue incorpora primero el parser compatible y luego los productores y consumidores del nuevo sobre. Para revertir, las entregas nuevas por URL permanecerían almacenadas pero no serían utilizables por una versión anterior, por lo que el rollback debe conservar al menos el parser y la visualización del formato discriminado.
