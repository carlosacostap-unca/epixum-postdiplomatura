// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

const path = 'https://epixum.com/estudiantes/cursos/curso/tps/tp';
const expiredToken = `header.${Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url')}.signature`;

describe('recuperación de sesión en el proxy', () => {
  it.each([undefined, `pb_auth=${expiredToken}`])('devuelve un error legible para una acción sin sesión vigente: %s', async cookie => {
    const response = proxy(new NextRequest(path, {
      method: 'POST', headers: { 'next-action': 'action-id', ...(cookie ? { cookie } : {}) },
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('location')).toBeNull();
    expect(await response.text()).toContain('Tu sesión venció');
    if (cookie) expect(response.cookies.get('pb_auth')?.value).toBe('');
  });

  it('conserva el redireccionamiento al iniciar una navegación sin sesión', () => {
    const response = proxy(new NextRequest(path));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/login');
  });

  it('permite invocar el inicio de sesión sin tener una sesión previa', () => {
    const response = proxy(new NextRequest('https://epixum.com/login', { method: 'POST', headers: { 'next-action': 'login-action' } }));
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('deja pasar una acción con cookie vigente para que la aplicación valide al usuario', () => {
    const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })).toString('base64url')}.signature`;
    const response = proxy(new NextRequest(path, { method: 'POST', headers: { 'next-action': 'action-id', cookie: `pb_auth=${token}` } }));
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
