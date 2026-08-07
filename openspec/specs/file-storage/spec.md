# Almacenamiento y transferencia de archivos

## Purpose
Definir el uso del almacenamiento compatible con S3 para recursos y entregas mediante URLs temporales, sin canalizar archivos pesados por Next.js.

## Requirements

### Requirement: Configuración S3-compatible
El servidor MUST construir el cliente de almacenamiento con endpoint, bucket, región y credenciales provenientes exclusivamente de variables de entorno.

#### Scenario: Inicio con configuración válida
- **WHEN** están presentes las variables `IDRIVE_*` requeridas
- **THEN** el servidor puede firmar operaciones contra el bucket configurado usando path-style

#### Scenario: Bucket ausente
- **WHEN** falta `IDRIVE_BUCKET_NAME`
- **THEN** la acción devuelve un error de configuración y no genera una URL inválida

### Requirement: Subida directa con URL prefirmada
El sistema MUST generar URLs de subida con vencimiento de una hora y el tipo MIME solicitado.

#### Scenario: Subida de estudiante
- **WHEN** un estudiante autenticado solicita autorización para su entrega
- **THEN** recibe una URL PUT temporal y la clave de almacenamiento

#### Scenario: Subida de recurso
- **WHEN** un docente o administrador solicita autorización para un recurso
- **THEN** recibe una URL temporal equivalente

#### Scenario: Rol no permitido
- **WHEN** un rol fuera del permitido solicita una subida
- **THEN** la acción rechaza la solicitud antes de firmar la operación

### Requirement: Descarga temporal y autorizada
El sistema MUST validar sesión, rol o propiedad antes de generar una URL de descarga con vencimiento de una hora.

#### Scenario: Estudiante descarga su entrega
- **WHEN** el propietario solicita descargar su archivo
- **THEN** se extrae la clave de almacenamiento y se devuelve una URL temporal

#### Scenario: Estudiante solicita entrega ajena
- **WHEN** un estudiante solicita un `deliveryId` de otra persona
- **THEN** el servidor rechaza la descarga

#### Scenario: Docente descarga una entrega
- **WHEN** un docente o administrador solicita un archivo de una entrega
- **THEN** el servidor valida el rol y firma la descarga

### Requirement: Referencias persistentes
PocketBase MUST almacenar referencias o listas JSON de archivos, pero MUST NOT almacenar los binarios de entregas y recursos administrados por iDrive.

#### Scenario: Entrega con varios archivos lógicos
- **WHEN** una entrega se representa como una lista JSON
- **THEN** el sistema conserva nombre y URL de cada elemento
- **AND** sigue interpretando una URL única de entregas heredadas

### Requirement: CORS del bucket
La aplicación MUST poder configurar CORS del bucket para habilitar cargas directas desde el navegador y MUST informar cuando esa configuración falla.

#### Scenario: Recuperación de error CORS
- **WHEN** una subida falla por configuración del bucket y un actor autorizado solicita corregirla
- **THEN** el servidor intenta aplicar las reglas CORS definidas
- **AND** la interfaz permite reintentar la subida
