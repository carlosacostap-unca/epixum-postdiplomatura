import { describe, expect, it } from 'vitest';
import { outcomeDraftSchema, outcomeGradeLabel, outcomeHasPendingChanges, publishedOutcomeDto } from './course-outcomes';

const draft = { status: 'aprobado' as const, grade: null, feedback: '' };
describe('contrato de resultados de cursada', () => {
  it.each(['aprobado', 'no_aprobado', 'no_completo'])('acepta %s con nota y devolución opcionales', status => {
    expect(outcomeDraftSchema.parse({ ...draft, status })).toEqual({ ...draft, status });
  });
  it('distingue cero de ausencia y admite dos decimales', () => {
    expect(outcomeDraftSchema.parse({ status: 'aprobado' })).toEqual(draft);
    expect(outcomeDraftSchema.parse({ ...draft, grade: 0 }).grade).toBe(0);
    expect(outcomeDraftSchema.parse({ ...draft, grade: 8.75 }).grade).toBe(8.75);
    expect(outcomeGradeLabel(0)).toBe('0');
    expect(outcomeGradeLabel(null)).toBe('Sin nota');
  });
  it.each([{ status: 'regular' }, { grade: -1 }, { grade: 11 }, { grade: 8.123 }, { grade: '' }, { grade: true }, { grade: Number.NaN }, { feedback: 'a'.repeat(5001) }, { student: 'otra-persona' }, { published: {} }])('rechaza una entrada inválida %j', patch => {
    expect(outcomeDraftSchema.safeParse({ ...draft, ...patch }).success).toBe(false);
  });
  it('no deriva el estado de la nota y normaliza la devolución', () => {
    expect(outcomeDraftSchema.parse({ status: 'no_completo', grade: 10, feedback: '  Faltó la actividad final.  ' })).toEqual({ status: 'no_completo', grade: 10, feedback: 'Faltó la actividad final.' });
  });
  it('proyecta solo los campos publicados y detecta correcciones pendientes', () => {
    const published = { ...draft, grade: 0, publishedAt: '2026-10-30T18:00:00Z' };
    expect(publishedOutcomeDto({ ...published, actorName: 'Privado', revision: 'secreto', draft: { status: 'no_aprobado' } })).toEqual(published);
    expect(publishedOutcomeDto(null)).toBeNull();
    expect(outcomeHasPendingChanges({ draft: { ...draft, grade: 0 }, published })).toBe(false);
    expect(outcomeHasPendingChanges({ draft: { ...draft, grade: 1 }, published })).toBe(true);
    expect(outcomeHasPendingChanges({ draft, published: null })).toBe(true);
    expect(() => publishedOutcomeDto({ ...draft, publishedAt: 'ayer' })).toThrow();
  });
});
