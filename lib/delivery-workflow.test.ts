import { describe, expect, it } from 'vitest';
import type { Delivery } from '@/types';
import {
  canStudentModifyDelivery,
  getStudentDeliveryState,
  getTeacherDeliveryState,
  latestPublishedEvaluation,
  normalizeDeliveryWorkflow,
  prepareDeliveryRevision,
} from './delivery-workflow';

function delivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: 'delivery0000001',
    collectionId: 'deliveries',
    collectionName: 'deliveries',
    created: '2026-09-01T12:00:00.000Z',
    updated: '2026-09-02T12:00:00.000Z',
    assignment: 'assignment-1',
    student: 'student-1',
    repositoryUrl: JSON.stringify({ type: 'url', url: 'https://github.com/example/v1' }),
    ...overrides,
  };
}

describe('flujo versionado de entregas', () => {
  it('normaliza registros históricos sin campos nuevos como versión inicial', () => {
    expect(normalizeDeliveryWorkflow(delivery({ status: 'published', verdict: 'Aprobado' }))).toMatchObject({
      status: 'published',
      submissionVersion: 1,
      evaluatedVersion: 1,
      submittedAt: '2026-09-01T12:00:00.000Z',
      evaluatedAt: '2026-09-02T12:00:00.000Z',
      resubmissionCount: 0,
      history: [],
    });
  });

  it.each([
    [{ status: 'pending' }, 'pending', 'pending'],
    [{ status: 'pending', resubmissionCount: 1 }, 'resubmitted', 'resubmitted'],
    [{ status: 'draft', resubmissionCount: 1 }, 'resubmitted', 'draft'],
    [{ status: 'published', verdict: 'Corregir y reenviar' }, 'correction_requested', 'correction_requested'],
    [{ status: 'published', verdict: 'Aprobado' }, 'approved', 'approved'],
    [{ status: 'published', verdict: 'Desaprobado' }, 'rejected', 'rejected'],
  ] as const)('deriva estados para estudiante y docente', (overrides, studentState, teacherState) => {
    const record = delivery(overrides as Partial<Delivery>);
    expect(getStudentDeliveryState(record)).toBe(studentState);
    expect(getTeacherDeliveryState(record)).toBe(teacherState);
  });

  it('permite una corrección después del vencimiento y archiva la devolución publicada', () => {
    const current = delivery({
      status: 'published',
      verdict: 'Corregir y reenviar',
      feedback: 'Corregí la validación.',
      grade: 4,
      submissionVersion: 1,
      evaluatedVersion: 1,
      submittedAt: '2026-09-01T12:00:00.000Z',
      evaluatedAt: '2026-09-02T12:00:00.000Z',
    });
    const result = prepareDeliveryRevision(
      current,
      JSON.stringify({ type: 'url', url: 'https://github.com/example/v2' }),
      '2026-09-10T12:00:00.000Z',
      true,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.correctionResubmission).toBe(true);
    expect(result.patch).toMatchObject({ status: 'pending', submissionVersion: 2, evaluatedVersion: 1, resubmissionCount: 1 });
    expect(result.patch.history[0].evaluation).toMatchObject({ verdict: 'Corregir y reenviar', grade: 4, feedback: 'Corregí la validación.' });
  });

  it('consume la excepción posterior al vencimiento hasta otra corrección publicada', () => {
    const current = delivery({ status: 'pending', submissionVersion: 2, evaluatedVersion: 1, resubmissionCount: 1 });
    expect(canStudentModifyDelivery(current, true)).toBe(false);
    expect(prepareDeliveryRevision(current, 'nuevo', '2026-09-10T12:00:00.000Z', true)).toMatchObject({ success: false });
  });

  it.each(['Aprobado', 'Desaprobado'] as const)('cierra una entrega con resultado final %s', (verdict) => {
    const current = delivery({ status: 'published', verdict });
    expect(canStudentModifyDelivery(current, false)).toBe(false);
    expect(canStudentModifyDelivery(current, true)).toBe(false);
  });

  it('mantiene disponible la última devolución mientras el reenvío espera revisión', () => {
    const evaluation = { verdict: 'Corregir y reenviar' as const, feedback: 'Revisar.', grade: 5, evaluatedAt: '2026-09-02T12:00:00.000Z' };
    const current = delivery({
      status: 'pending',
      submissionVersion: 2,
      evaluatedVersion: 1,
      resubmissionCount: 1,
      history: [{ version: 1, submittedAt: '2026-09-01T12:00:00.000Z', repositoryUrl: 'v1', evaluation }],
    });
    expect(latestPublishedEvaluation(current)).toEqual(evaluation);
  });
});
