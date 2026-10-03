// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { liveBody, liveFailure } from './live-interactive-http';
import { LiveError } from './live-interactive';

function request(origin: string | null = 'https://campus.example', content = '{}', contentType = 'application/json') {
  return new Request('http://localhost/api/interactivas/ingresar', { method: 'POST', headers: { Host: 'campus.example', 'Content-Type': contentType, ...(origin ? { Origin: origin } : {}) }, body: content });
}
describe('solicitudes en vivo', () => {
  it('acepta el Host público conservado por el proxy HTTPS', async () => expect(await liveBody(request())).toEqual({}));
  it.each([null, 'null', 'https://otro.example', 'ftp://campus.example'])('rechaza origen %s', async (origin) => {
    await expect(liveBody(request(origin))).rejects.toMatchObject({ status: 403 });
  });
  it('rechaza cuerpos grandes y JSON inválido', async () => {
    await expect(liveBody(request(undefined, JSON.stringify({ answer: 'x'.repeat(12001) })))).rejects.toMatchObject({ status: 413 });
    await expect(liveBody(request(undefined, '{'))).rejects.toMatchObject({ status: 400 });
    await expect(liveBody(request(undefined, '{}', 'text/plain'))).rejects.toMatchObject({ status: 415 });
  });
  it('no divulga errores de infraestructura y prohíbe caché', async () => {
    const hidden = liveFailure(new Error('Información interna'));
    expect(JSON.stringify(await hidden.json())).not.toContain('Información interna');
    expect(hidden.headers.get('cache-control')).toBe('private, no-store');
    expect(liveFailure(new LiveError('Iniciá sesión', 401)).status).toBe(401);
  });
});
