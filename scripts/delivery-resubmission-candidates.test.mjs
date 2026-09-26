import assert from 'node:assert/strict';
import test from 'node:test';
import {
  candidateSummary,
  confirmedLegacyResubmissionPatch,
  legacyResubmissionCandidate,
} from './delivery-resubmission-candidates.mjs';

function candidate(overrides = {}) {
  return {
    id: 'delivery-1',
    assignment: 'assignment-1',
    student: 'student-1',
    created: '2026-08-01T10:00:00.000Z',
    updated: '2026-08-10T10:00:30.000Z',
    submittedAt: '2026-08-01T10:00:00.000Z',
    status: 'published',
    verdict: 'Corregir y reenviar',
    feedback: 'Corregir validación.',
    grade: 4,
    submissionVersion: 1,
    resubmissionCount: 0,
    repositoryUrl: JSON.stringify({
      type: 'url',
      url: 'https://github.com/alumno/tp',
      provider: 'github',
      repositoryFullName: 'alumno/tp',
      commitSha: 'a'.repeat(40),
      commitCapturedAt: '2026-08-10T10:00:00.000Z',
      captureSource: 'student-update',
    }),
    ...overrides,
  };
}

test('informa solamente actualizaciones GitHub cuya captura coincide con la última escritura', () => {
  assert.equal(legacyResubmissionCandidate(candidate()), true);
  assert.equal(legacyResubmissionCandidate(candidate({ updated: '2026-08-11T10:00:00.000Z' })), false);
  assert.equal(legacyResubmissionCandidate(candidate({ verdict: 'Aprobado' })), false);
  assert.equal(legacyResubmissionCandidate(candidate({ resubmissionCount: 1 })), false);
});

test('convierte únicamente un candidato confirmado sin inventar el contenido anterior', () => {
  const patch = confirmedLegacyResubmissionPatch(candidate());
  assert.deepEqual({
    status: patch.status,
    submissionVersion: patch.submissionVersion,
    evaluatedVersion: patch.evaluatedVersion,
    resubmissionCount: patch.resubmissionCount,
    submittedAt: patch.submittedAt,
  }, {
    status: 'pending',
    submissionVersion: 2,
    evaluatedVersion: 1,
    resubmissionCount: 1,
    submittedAt: '2026-08-10T10:00:00.000Z',
  });
  assert.equal(patch.history[0].contentUnavailable, true);
  assert.equal(patch.history[0].repositoryUrl, undefined);
  assert.equal(patch.history[0].evaluation.verdict, 'Corregir y reenviar');
  assert.throws(() => confirmedLegacyResubmissionPatch(candidate({ verdict: 'Aprobado' })), /no cumple/);
});

test('el resumen identifica al alumno sin incluir secretos', () => {
  const summary = candidateSummary(candidate({ expand: { student: { name: 'Ada', email: 'ada@example.com' }, assignment: { title: 'TP 1' } } }));
  assert.deepEqual(summary, {
    deliveryId: 'delivery-1',
    assignmentId: 'assignment-1',
    assignment: 'TP 1',
    studentId: 'student-1',
    student: 'Ada',
    email: 'ada@example.com',
    capturedAt: '2026-08-10T10:00:00.000Z',
    repository: 'alumno/tp',
  });
});
