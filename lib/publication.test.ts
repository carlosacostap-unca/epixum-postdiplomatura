import { describe, expect, it } from 'vitest';
import { isPublicationVisible, scheduledPublicationPatch } from './publication';

const now = new Date('2026-10-13T15:00:00Z');
describe('publicación programada', () => {
  it('mantiene visibles los anteriores y bloquea borradores aunque tengan fecha pasada', () => {
    for (const publicationStatus of [undefined, '', 'published']) expect(isPublicationVisible({ publicationStatus }, now)).toBe(true);
    expect(isPublicationVisible({ publicationStatus: 'draft', publishAt: '2020-01-01T00:00:00Z' }, now)).toBe(false);
  });
  it('se hace visible exactamente en el instante elegido y falla cerrado sin fecha válida', () => {
    for (const publishAt of [undefined, '', 'invalid', '2026-10-13T15:00:01Z']) expect(isPublicationVisible({ publicationStatus: 'scheduled', publishAt }, now)).toBe(false);
    for (const publishAt of ['2026-10-13T15:00:00Z', '2026-10-13T11:59:59-03:00']) expect(isPublicationVisible({ publicationStatus: 'scheduled', publishAt }, now)).toBe(true);
  });
  it('crea borradores, conserva cambios parciales y cancela la programación al cambiar estado', () => {
    const form = new FormData();
    expect(scheduledPublicationPatch(form, true)).toEqual({ publicationStatus: 'draft', publishAt: '' });
    expect(scheduledPublicationPatch(form)).toEqual({});
    form.set('publicationStatus', 'published'); form.set('publishAt', '2027-01-01T00:00:00Z');
    expect(scheduledPublicationPatch(form)).toEqual({ publicationStatus: 'published', publishAt: '' });
    form.set('publicationStatus', 'draft');
    expect(scheduledPublicationPatch(form)).toEqual({ publicationStatus: 'draft', publishAt: '' });
  });
  it('rechaza fechas ausentes o ambiguas y normaliza zonas horarias a UTC', () => {
    const form = new FormData(); form.set('publicationStatus', 'scheduled');
    for (const value of ['', 'bad', '2026-10-13T12:00']) {
      form.set('publishAt', value); expect(() => scheduledPublicationPatch(form)).toThrow('fecha y hora');
    }
    form.set('publishAt', '2026-10-13T12:00:00-03:00');
    expect(scheduledPublicationPatch(form)).toEqual({ publicationStatus: 'scheduled', publishAt: '2026-10-13T15:00:00.000Z' });
  });
});
