import {
  isValidDeliveryUrl,
  parseDeliveryFiles,
  parseDeliverySubmission,
  serializeDeliveryUrl,
} from '@/types';
import { describe, expect, it } from 'vitest';

describe('delivery submissions', () => {
  it.each([
    'https://github.com/epixum/trabajo',
    'http://localhost:3000/demo',
  ])('acepta una URL HTTP(S) absoluta: %s', (url) => {
    expect(isValidDeliveryUrl(url)).toBe(true);
  });

  it.each([
    '',
    'github.com/epixum/trabajo',
    '/entrega/relativa',
    'javascript:alert(1)',
    'data:text/html,contenido',
  ])('rechaza una URL de entrega inválida: %s', (url) => {
    expect(isValidDeliveryUrl(url)).toBe(false);
  });

  it('serializa y parsea una entrega por URL', () => {
    const serialized = serializeDeliveryUrl('  https://example.com/mi-entrega  ');

    expect(JSON.parse(serialized)).toEqual({
      type: 'url',
      url: 'https://example.com/mi-entrega',
    });
    expect(parseDeliverySubmission(serialized)).toEqual({
      type: 'url',
      url: 'https://example.com/mi-entrega',
    });
    expect(parseDeliveryFiles(serialized)).toEqual([]);
  });

  it('mantiene un snapshot GitHub versionado sin romper el sobre URL anterior', () => {
    const serialized = serializeDeliveryUrl('https://github.com/epixum/trabajo', {
      provider: 'github',
      repositoryFullName: 'epixum/trabajo',
      commitSha: 'a'.repeat(40),
      commitCapturedAt: '2026-08-22T12:00:00.000Z',
      captureSource: 'student-submission',
    });
    expect(parseDeliverySubmission(serialized)).toMatchObject({
      type: 'url', provider: 'github', repositoryFullName: 'epixum/trabajo', commitSha: 'a'.repeat(40),
    });
  });

  it('rechaza la serialización de protocolos no permitidos', () => {
    expect(() => serializeDeliveryUrl('ftp://example.com/entrega')).toThrow(
      'La URL debe ser absoluta y comenzar con http:// o https://',
    );
  });

  it('mantiene el arreglo de archivos actual', () => {
    const files = [
      { name: 'informe.pdf', url: 'https://storage.example.com/informe.pdf' },
      { name: 'fuentes.zip', url: 'https://storage.example.com/fuentes.zip' },
    ];

    expect(parseDeliverySubmission(JSON.stringify(files))).toEqual({ type: 'files', files });
    expect(parseDeliveryFiles(JSON.stringify(files))).toEqual(files);
  });

  it('interpreta una referencia simple heredada como archivo', () => {
    expect(parseDeliverySubmission('https://storage.example.com/entrega%20final.zip')).toEqual({
      type: 'files',
      files: [{ name: 'entrega final.zip', url: 'https://storage.example.com/entrega%20final.zip' }],
    });
  });

  it('no transforma JSON estructurado inválido en un archivo descargable', () => {
    expect(parseDeliverySubmission('{"type":"url","url":"javascript:alert(1)"}')).toEqual({
      type: 'files',
      files: [],
    });
  });
});
