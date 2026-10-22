import { createHmac } from 'node:crypto';

// The capability lives only in server configuration and administrative API rules.
// Never store it in records students can query, or return it to a browser.
export function reviewAllocationKey(environment = process.env) {
  const password = environment.POCKETBASE_SUPERUSER_PASSWORD || environment.POCKETBASE_ADMIN_PASSWORD;
  const url = environment.NEXT_PUBLIC_POCKETBASE_URL;
  if (!password || !url) throw new Error('Falta configurar el servicio de asignación de turnos.');
  return createHmac('sha256', password).update(`review-block-allocation-v1:${url}`).digest('hex');
}
