import { describe, expect, it } from 'vitest';
import type { Delivery } from '@/types';
import { deliveryReviewHref, matchesReview, parseReviewContext, reviewQueue, reviewSearch, reviewStatus } from './teacher-review';

const delivery = (id: string, overrides: Partial<Delivery> = {}): Delivery => ({
  id, assignment: 'tp-1', status: 'pending', created: '2026-09-01T10:00:00Z', submissionVersion: 1, evaluatedVersion: 0,
  expand: { student: { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com' } }, ...overrides,
} as Delivery);

describe('contexto de revisión docente', () => {
  it('ignora parámetros desconocidos, estados inválidos y valores repetidos', () => {
    const context = parseReviewContext({ reviewState: '//otro-sitio', reviewQuery: ['Ana', 'Bea'], returnTo: 'https://example.com' });
    expect(context).toEqual({ query: '', filter: 'all' });
    expect(reviewSearch(context)).toBe('');
  });

  it('codifica la búsqueda y conserva exactamente el filtro en el enlace de detalle', () => {
    const href = deliveryReviewHref('tp-1', 'd1', { query: 'Ana & Pérez', filter: 'resubmitted' });
    const url = new URL(href, 'https://epixum.test');
    expect(url.pathname).toBe('/assignments/tp-1/deliveries/d1');
    expect(parseReviewContext(Object.fromEntries(url.searchParams))).toEqual({ query: 'Ana & Pérez', filter: 'resubmitted' });
  });

  it('agrupa publicados por veredicto y deja borradores y reenvíos por revisar', () => {
    const published = delivery('d1', { status: 'published', verdict: 'Aprobado', evaluatedVersion: 1 });
    expect(reviewStatus(published)).toBe('published');
    expect(matchesReview(published, { query: '', filter: 'unreviewed' })).toBe(false);
    expect(matchesReview(delivery('d2', { status: 'draft' }), { query: 'PÉREZ', filter: 'unreviewed' })).toBe(true);
    expect(matchesReview(delivery('d3', { submissionVersion: 2, evaluatedVersion: 1, resubmissionCount: 1 }), { query: 'ana@', filter: 'resubmitted' })).toBe(true);
  });

  it('mantiene la posición de la recién publicada, filtra vecinas y aísla otros trabajos', () => {
    const rows = [delivery('before'), delivery('current', { status: 'published', evaluatedVersion: 1, verdict: 'Aprobado' }), delivery('excluded', { expand: { student: { name: 'Beatriz' } } as Delivery['expand'] }), delivery('next'), delivery('other-tp', { assignment: 'tp-2' })];
    expect(reviewQueue(rows, 'tp-1', 'current', { query: 'Ana', filter: 'unreviewed' }).map(item => item.id)).toEqual(['before', 'current', 'next']);
    expect(reviewQueue(rows, 'tp-2', 'current', { query: '', filter: 'all' }).map(item => item.id)).toEqual(['other-tp']);
  });
});
