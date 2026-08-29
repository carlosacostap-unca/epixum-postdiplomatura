## Purpose

Definir la validación, captura inmutable y preparación segura de repositorios públicos de GitHub utilizados como evidencia de una entrega académica.

## ADDED Requirements

### Requirement: Repositorio público elegible
El sistema MUST considerar elegible solamente una URL HTTPS que identifique la raíz de un repositorio público de `github.com`, y MUST normalizar propietario, nombre y URL antes de utilizarla.

#### Scenario: URL raíz válida
- **WHEN** una entrega informa `https://github.com/propietario/repositorio` o la variante equivalente terminada en `.git` o `/`
- **THEN** el servidor confirma que el repositorio existe y es público
- **AND** conserva una URL canónica sin credenciales, parámetros ni fragmentos

#### Scenario: Host o ruta no admitidos
- **WHEN** la URL pertenece a otro host, identifica un gist, archivo, issue, pull request o ruta que no sea la raíz de un repositorio
- **THEN** el sistema conserva el flujo general de entrega por URL cuando corresponda
- **AND** MUST NOT considerarla elegible para preevaluación

#### Scenario: Repositorio privado, vacío o inexistente
- **WHEN** GitHub no permite consultar el repositorio público o no existe un commit descargable
- **THEN** el sistema informa que la entrega no puede prepararse para preevaluación
- **AND** MUST NOT intentar acceder mediante credenciales aportadas por el estudiante

### Requirement: Captura inmutable de la entrega
Para un trabajo configurado para preevaluar repositorios GitHub, el sistema MUST resolver y persistir el SHA completo del commit vigente al crear o actualizar la entrega antes del vencimiento, y las preevaluaciones posteriores MUST utilizar ese SHA.

#### Scenario: Nueva entrega elegible
- **WHEN** un estudiante guarda una URL GitHub válida en un trabajo configurado para preevaluación
- **THEN** el servidor resuelve la rama predeterminada y persiste el SHA de su commit actual junto con la referencia de entrega
- **AND** muestra al estudiante el commit que quedó entregado

#### Scenario: Actualización antes del vencimiento
- **WHEN** el estudiante actualiza su entrega GitHub antes de la fecha límite
- **THEN** el servidor vuelve a resolver la referencia y reemplaza el SHA capturado en el mismo registro de entrega

#### Scenario: Repositorio modificado después de entregar
- **WHEN** el repositorio recibe nuevos commits después de la entrega
- **THEN** la preevaluación utiliza el SHA persistido y MUST NOT cambiar silenciosamente al nuevo estado de la rama

#### Scenario: Entrega heredada sin SHA
- **WHEN** un docente solicita por primera vez preevaluar una URL GitHub creada antes de esta capacidad
- **THEN** el servidor captura el commit vigente en ese momento y lo conserva para intentos posteriores
- **AND** la interfaz informa al docente que la captura fue posterior a la entrega original

### Requirement: Descarga controlada del código
El servidor MUST descargar el archivo generado por GitHub para el SHA capturado, MUST aplicar límites de tiempo y tamaño, y MUST NOT ejecutar código, scripts de instalación ni comandos incluidos en el repositorio.

#### Scenario: Descarga válida
- **WHEN** GitHub entrega el archivo correspondiente al SHA persistido dentro de los límites configurados
- **THEN** el servidor prepara su contenido en un área temporal no pública
- **AND** elimina los datos temporales al finalizar o fallar el intento

#### Scenario: Redirección no confiable
- **WHEN** la descarga intenta redirigir fuera de los hosts oficiales admitidos para archivos de GitHub
- **THEN** el servidor cancela la operación
- **AND** registra un error sanitizado sin solicitar contenido al destino

#### Scenario: Repositorio fuera de límites
- **WHEN** el archivo, el contenido expandido, la cantidad de entradas o el tiempo de descarga exceden los límites del servicio
- **THEN** la preparación finaliza como fallida con un motivo comprensible para el docente
- **AND** MUST NOT invocar OpenAI con evidencia parcial no declarada

### Requirement: Selección y cobertura de archivos
La preparación MUST incluir únicamente archivos de texto, código, configuración, documentación y pruebas admitidos, MUST excluir secretos y contenido generado o irrelevante, y MUST producir un resumen de cobertura verificable.

#### Scenario: Proyecto dentro de límites
- **WHEN** el repositorio contiene fuentes compatibles
- **THEN** la evidencia conserva la ruta y contenido de cada archivo seleccionado
- **AND** la cobertura informa commit, cantidad de archivos analizados, omitidos, bytes considerados y motivos de omisión

#### Scenario: Contenido sensible o generado
- **WHEN** se detectan archivos de entorno, credenciales, binarios, dependencias vendorizadas o directorios generados
- **THEN** esos elementos se omiten de la evidencia enviada al modelo
- **AND** la cobertura registra la omisión sin exponer el contenido sensible

#### Scenario: Evidencia insuficiente
- **WHEN** después del filtrado no queda código o texto suficiente para evaluar
- **THEN** el sistema rechaza la preevaluación
- **AND** explica al docente qué cobertura faltó
