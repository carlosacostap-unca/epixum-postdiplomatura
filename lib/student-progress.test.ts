import { expect, it } from 'vitest';
import { buildStudentProgress, filterStudentProgress, parseProgressFilters, progressFilterQuery, studentPracticeHistory, type ProgressSource } from './student-progress';

const now = Date.parse('2026-10-23T15:00:00Z');
const old = '2026-10-01T12:00:00Z'; const recent = '2026-10-23T12:00:00Z'; const future = '2026-10-24T12:00:00Z';
function source(): ProgressSource {
  return {
    preparationEnabled: true, examsEnabled: true,
    students: ['Ána', 'Bruno', 'Celia'].map((name, i) => ({ id: `s${i}`, name, email: `${i}@example.invalid`, enrolledAt: old })),
    quizzes: [{ id: 'quiz', title: 'Práctica', status: 'published' }, { id: 'other', title: 'Otra', status: 'published' }, { id: 'archived', title: 'Antigua', status: 'archived' }],
    practices: ['p1', 'p2', 'p3'].map((id, i) => ({ id, student: 's0', quiz: i === 2 ? 'archived' : 'quiz', title: 'Práctica', created: old, updated: old })),
    practiceResults: ['p1', 'p2', 'p3'].map((attempt, i) => ({ id: `r${i}`, attempt, student: 's0', correct: i, total: 2, created: old, finishedAt: i === 2 ? recent : old })),
    practiceAnswers: [{ attempt: 'p1', student: 's0', created: old }],
    exams: [{ id: 'exam', title: 'Primer parcial', status: 'published', opensAt: old, closesAt: recent }, { id: 'future', title: 'Segundo parcial', status: 'published', opensAt: recent, closesAt: future }, { id: 'draft', title: 'Borrador', status: 'draft', opensAt: '', closesAt: '' }],
    examAttempts: [{ id: 'a1', exam: 'exam', student: 's0', title: 'Primer parcial', created: old, updated: old, deadline: recent }, { id: 'a2', exam: 'future', student: 's0', title: 'Segundo parcial', created: recent, updated: recent, deadline: future }, { id: 'b1', exam: 'exam', student: 's1', title: 'Primer parcial', created: old, updated: old, deadline: recent }],
    examResults: [{ id: 'r1', attempt: 'a1', student: 's0', correct: 0, total: 2, finishedAt: old }],
    examAnswers: [{ attempt: 'a2', student: 's0', created: recent }],
  };
}
const filter = (params: Parameters<typeof parseProgressFilters>[0] = {}) => filterStudentProgress(buildStudentProgress(source(), now), parseProgressFilters(params), now);
it('cuenta prácticas distintas publicadas y conserva las repeticiones y notas históricas', () => {
  const [ana] = buildStudentProgress(source(), now);
  expect(ana.preparation).toEqual({ attempts: 3, completedAttempts: 3, publishedCompleted: 1, publishedTotal: 2, latestGrade: 10, bestGrade: 10 });
  const history = studentPracticeHistory(source(), 's0');
  expect(history).toHaveLength(3); expect(history.find(p => p.id === 'p1')).toMatchObject({ answerCount: 1, grade: 0 });
  expect(filter({ preparacion: 'all_completed' }).total).toBe(0);
});
it('distingue entrega con cero, sin iniciar, en curso y cierre pendiente', () => {
  const rows = buildStudentProgress(source(), now);
  expect(rows[0].exams.map(e => [e.id, e.state, e.grade])).toEqual([['exam', 'submitted', 0], ['future', 'in_progress', null]]);
  expect(rows[1].exams[0].state).toBe('closing'); expect(rows[2].lastActivity).toBeNull();
  expect(filter({ nota_max: '0' }).items.map(r => r.id)).toEqual(['s0']);
  expect(filter({ estado_parcial: 'missing_after_close', parcial: 'exam' }).items.map(r => r.id)).toEqual(['s1', 's2']);
  expect(filter({ estado_parcial: 'missing_after_close', parcial: 'future' }).total).toBe(0);
});
it('combina búsqueda sin acentos, preparación, estado, nota y actividad', () => {
  expect(filter({ q: 'ana', preparacion: 'completed', estado_parcial: 'submitted', parcial: 'exam', nota_min: '0', nota_max: '5', actividad: 'recent7' }).items.map(r => r.id)).toEqual(['s0']);
  expect(filter({ actividad: 'inactive14' }).items.map(r => r.id)).toEqual(['s1', 's2']);
  expect(filter({ preparacion: 'none', actividad: 'none' }).items.map(r => r.id)).toEqual(['s2']);
});
it('usa la nota del parcial elegido en vez de otra entrega', () => {
  const input = source(); input.examResults.push({ id: 'r2', attempt: 'a2', student: 's0', correct: 2, total: 2, finishedAt: recent });
  const rows = buildStudentProgress(input, now);
  expect(filterStudentProgress(rows, parseProgressFilters({ nota_min: '9' }), now).total).toBe(1);
  expect(filterStudentProgress(rows, parseProgressFilters({ parcial: 'exam', nota_min: '9' }), now).total).toBe(0);
});
it.each(['grade_asc', 'grade_desc'])('ordena sin convertir ausencia de nota en cero (%s)', orden => {
  expect(filter({ orden }).items.map(r => r.id)).toEqual(['s0', 's1', 's2']);
});
it('pagina de a veinte y conserva criterios normalizados al regresar del detalle', () => {
  const [row] = buildStudentProgress(source(), now);
  const rows = Array.from({ length: 25 }, (_, i) => ({ ...row, id: `s${i}`, name: `Estudiante ${String(i).padStart(2, '0')}` }));
  const filters = parseProgressFilters({ q: ' Estudiante ', p: '999', nota_min: '-1', nota_max: 'NaN', preparacion: 'invalid', parcial: '../otro' });
  const page = filterStudentProgress(rows, filters, now);
  expect(page).toMatchObject({ page: 2, total: 25, totalPages: 2 }); expect(page.items).toHaveLength(5);
  expect(progressFilterQuery({ ...filters, page: page.page })).toBe('q=Estudiante&p=2');
});
