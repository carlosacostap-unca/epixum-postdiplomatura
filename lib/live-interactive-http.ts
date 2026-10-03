import 'server-only';
import { ZodError } from 'zod';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { LiveError, liveUser } from './live-interactive';
import type { LiveSession } from './live-interactive-contract';

export const liveHeaders = { 'Cache-Control': 'private, no-store' };
export async function liveRequestClient() {
  const pb = await createServerClient();
  liveUser(pb);
  return pb;
}
export async function liveBody(request: Request) {
  const origin = request.headers.get('origin');
  let parsedOrigin: URL | null = null;
  try { parsedOrigin = origin ? new URL(origin) : null; } catch { /* invalid origin */ }
  // The VPS reverse proxy must preserve Host. Do not trust forwarded headers supplied by clients.
  if (!parsedOrigin || !['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.host !== request.headers.get('host')) throw new LiveError('El origen de la solicitud no es válido.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new LiveError('Se requiere una solicitud JSON.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new LiveError('Faltan los datos de la solicitud.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 12000) { await reader.cancel(); throw new LiveError('La solicitud es demasiado grande.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
  catch { throw new LiveError('La solicitud no contiene datos válidos.'); }
}
export function liveFailure(error: unknown) {
  if (error instanceof LiveError) return Response.json({ error: error.message }, { status: error.status, headers: liveHeaders });
  if (error instanceof ZodError) return Response.json({ error: 'Revisá los datos enviados.' }, { status: 400, headers: liveHeaders });
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 500;
  return Response.json({ error: status === 404 || status === 403 ? 'La sesión no está disponible para esta cuenta.' : 'No pudimos completar la operación. Intentá nuevamente.' }, { status: [400, 401, 403, 404].includes(status) ? status : 503, headers: liveHeaders });
}

// Service credentials stay server-side. Reuse only this read-only service client,
// never an end-user auth store. Collapse simultaneous joins into one authentication.
let resolverClient: ReturnType<typeof createServiceClient> | undefined;
let resolverExpires = 0;
export async function resolveLiveCode(code: string) {
  if (!resolverClient || resolverExpires < Date.now()) {
    resolverExpires = Date.now() + 5 * 60_000;
    resolverClient = createServiceClient().catch((error) => { resolverClient = undefined; throw error; });
  }
  const pb = await resolverClient;
  const result = await pb.collection('interactive_sessions').getList<LiveSession>(1, 1, { filter: pb.filter('code = {:code} && status = "live"', { code }) });
  return result.items[0] || null;
}
