import { expect, it } from 'vitest';
import { isSharedResource, isSharedResourceAudience, resourceAudiencePatch } from './resource-audience';

it('conserva recursos anteriores y falla cerrado para audiencias desconocidas', () => {
  for (const audience of [undefined, null, '', 'everyone']) expect(isSharedResourceAudience(audience)).toBe(true);
  for (const audience of ['teachers', 'unknown']) expect(isSharedResourceAudience(audience)).toBe(false);
});

it('reserva clases y trabajos al equipo docente sin afectar contenidos independientes', () => {
  expect(isSharedResource({ class: 'class-1', audience: 'teachers' })).toBe(false);
  expect(isSharedResource({ assignment: 'tp-1', audience: 'teachers' })).toBe(false);
  expect(isSharedResource({ audience: 'teachers' })).toBe(true);
});

it('crea compartidos, conserva ediciones parciales y valida cambios explícitos', () => {
  expect(resourceAudiencePatch(null, true)).toEqual({ audience: 'everyone' });
  expect(resourceAudiencePatch(null)).toEqual({});
  expect(resourceAudiencePatch('teachers')).toEqual({ audience: 'teachers' });
  expect(resourceAudiencePatch('everyone')).toEqual({ audience: 'everyone' });
  expect(() => resourceAudiencePatch('unknown')).toThrow('Disponibilidad');
});
