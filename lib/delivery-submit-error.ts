import { getErrorMessage } from './errors';

export function deliverySubmitError(error: unknown, saving: boolean) {
  const message = getErrorMessage(error, 'Ocurrió un error inesperado. Intentá nuevamente.');
  if (/^Unauthorized$|^No autorizado(?:\b|:)|Tu sesión venció/i.test(message)) {
    return 'Tu sesión venció. Volvé a iniciar sesión y luego intentá enviar nuevamente.';
  }
  if (/An unexpected response was received from the server|Failed to find Server Action|Server Action [\s\S]*was not found on the server/i.test(message)) {
    return saving
      ? 'No pudimos confirmar si la entrega se guardó. Recargá la página y revisá su estado antes de volver a enviarla. Si se solicita, iniciá sesión nuevamente.'
      : 'La página o la sesión pueden estar desactualizadas. Recargá la página, iniciá sesión nuevamente si se solicita y volvé a seleccionar los archivos para enviar.';
  }
  return message;
}
