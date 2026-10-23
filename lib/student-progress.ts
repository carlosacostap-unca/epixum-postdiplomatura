export type ProgressStudent = { id: string; name: string; email: string; enrolledAt: string };
export type ProgressPractice = { id: string; student: string; quiz: string; title: string; created: string; updated: string };
export type ProgressResult = { id: string; attempt: string; student: string; correct: number; total: number; created?: string; finishedAt?: string; reason?: string };
export type ProgressExam = { id: string; title: string; status: string; opensAt: string; closesAt: string };
export type ProgressExamAttempt = { id: string; student: string; exam: string; title: string; created: string; updated: string; deadline: string };
export type ProgressAnswer = { attempt: string; student: string; created: string };
export type ProgressSource = {
  students: ProgressStudent[]; preparationEnabled: boolean; examsEnabled: boolean;
  quizzes: { id: string; title: string; status: string }[]; practices: ProgressPractice[]; practiceResults: ProgressResult[]; practiceAnswers: ProgressAnswer[];
  exams: ProgressExam[]; examAttempts: ProgressExamAttempt[]; examResults: ProgressResult[]; examAnswers: ProgressAnswer[];
};
export type StudentExamProgress = ProgressExam & { state: 'not_started' | 'in_progress' | 'closing' | 'submitted'; attemptId: string | null; startedAt: string | null; finishedAt: string | null; grade: number | null; correct: number | null; total: number | null; reason: string | null };
export type StudentProgressRow = ProgressStudent & {
  lastActivity: string | null;
  preparation: { attempts: number; completedAttempts: number; publishedCompleted: number; publishedTotal: number; latestGrade: number | null; bestGrade: number | null };
  exams: StudentExamProgress[]; submittedExams: number; latestExamGrade: number | null;
};
export type StudentPracticeHistory = ProgressPractice & { answerCount: number; finishedAt: string | null; grade: number | null; correct: number | null; total: number | null };
export const examProgressLabels = { not_started: 'Sin iniciar', in_progress: 'En curso', closing: 'Plazo vencido, cierre pendiente', submitted: 'Entregado' };
export function progressTimestamp(value?: string | null) { const n = value ? Date.parse(value.replace(' ', 'T')) : NaN; return Number.isFinite(n) ? n : 0; }
export function progressGrade(correct: number, total: number) { return total > 0 ? Math.round(correct / total * 1000) / 100 : null; }
export function progressGradeLabel(grade: number | null) { return grade === null ? 'Sin nota' : `${grade.toLocaleString('es-AR', { maximumFractionDigits: 2 })} / 10`; }
function grouped<T extends { student: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) { const group = groups.get(item.student) || []; group.push(item); groups.set(item.student, group); }
  return groups;
}
export function buildStudentProgress(source: ProgressSource, now = Date.now()): StudentProgressRow[] {
  const practices = grouped(source.practices); const practiceAnswers = grouped(source.practiceAnswers);
  const examAttempts = grouped(source.examAttempts); const examAnswers = grouped(source.examAnswers);
  const practiceResults = new Map(source.practiceResults.map(r => [r.attempt, r]));
  const examResults = new Map(source.examResults.map(r => [r.attempt, r]));
  const publishedQuizzes = new Set(source.quizzes.filter(q => q.status === 'published').map(q => q.id));
  return source.students.map(student => {
    const attempts = practices.get(student.id) || [];
    const finished = attempts.flatMap(a => { const result = practiceResults.get(a.id); return result ? [{ ...result, quiz: a.quiz }] : []; }).sort((a, b) => progressTimestamp(b.finishedAt || b.created) - progressTimestamp(a.finishedAt || a.created));
    const grades = finished.map(r => progressGrade(r.correct, r.total)).filter((g): g is number => g !== null);
    const examsForStudent = examAttempts.get(student.id) || [];
    const attemptMap = new Map(examsForStudent.map(a => [a.exam, a]));
    const exams: StudentExamProgress[] = source.exams.filter(e => e.status === 'published' || attemptMap.has(e.id)).map(exam => {
      const attempt = attemptMap.get(exam.id); const result = attempt && examResults.get(attempt.id);
      return { ...exam, state: result ? 'submitted' : !attempt ? 'not_started' : progressTimestamp(attempt.deadline) <= now ? 'closing' : 'in_progress', attemptId: attempt?.id || null, startedAt: attempt?.created || null, finishedAt: result?.finishedAt || null, grade: result ? progressGrade(result.correct, result.total) : null, correct: result?.correct ?? null, total: result?.total ?? null, reason: result?.reason || null };
    });
    const submitted = exams.filter(e => e.state === 'submitted').sort((a, b) => progressTimestamp(b.finishedAt) - progressTimestamp(a.finishedAt));
    const activity = [...attempts.flatMap(a => [a.created, a.updated]), ...finished.flatMap(r => [r.finishedAt, r.created]), ...(practiceAnswers.get(student.id) || []).map(a => a.created), ...examsForStudent.flatMap(a => [a.created, a.updated]), ...submitted.map(e => e.finishedAt), ...(examAnswers.get(student.id) || []).map(a => a.created)].filter((v): v is string => !!v && progressTimestamp(v) > 0).sort((a, b) => progressTimestamp(b) - progressTimestamp(a));
    return { ...student, lastActivity: activity[0] || null, preparation: { attempts: attempts.length, completedAttempts: finished.length, publishedCompleted: new Set(finished.filter(r => publishedQuizzes.has(r.quiz)).map(r => r.quiz)).size, publishedTotal: publishedQuizzes.size, latestGrade: finished[0] ? progressGrade(finished[0].correct, finished[0].total) : null, bestGrade: grades.length ? Math.max(...grades) : null }, exams, submittedExams: submitted.length, latestExamGrade: submitted[0]?.grade ?? null };
  });
}
export function studentPracticeHistory(source: ProgressSource, studentId: string): StudentPracticeHistory[] {
  const results = new Map(source.practiceResults.map(r => [r.attempt, r]));
  const counts = new Map<string, number>(); for (const answer of source.practiceAnswers) counts.set(answer.attempt, (counts.get(answer.attempt) || 0) + 1);
  return source.practices.filter(a => a.student === studentId).map(attempt => {
    const result = results.get(attempt.id);
    return { ...attempt, answerCount: counts.get(attempt.id) || 0, finishedAt: result ? result.finishedAt || result.created || null : null, grade: result ? progressGrade(result.correct, result.total) : null, correct: result?.correct ?? null, total: result?.total ?? null };
  }).sort((a, b) => progressTimestamp(b.created) - progressTimestamp(a.created));
}
type Params = Record<string, string | string[] | undefined>;
export type ProgressFilters = { q: string; preparation: string; exam: string; examState: string; activity: string; minGrade: string; maxGrade: string; sort: string; page: number };
export function parseProgressFilters(params: Params): ProgressFilters {
  const value = (key: string) => { const v = params[key]; return (Array.isArray(v) ? v[0] : v) || ''; };
  const choice = (key: string, choices: string[], fallback = 'all') => choices.includes(value(key)) ? value(key) : fallback;
  const grade = (key: string) => value(key).trim() !== '' && Number.isFinite(Number(value(key))) && Number(value(key)) >= 0 && Number(value(key)) <= 10 ? String(Number(value(key))) : '';
  const page = Number(value('p'));
  return { q: value('q').trim().slice(0, 120), preparation: choice('preparacion', ['all', 'none', 'started', 'completed', 'all_completed']), exam: /^[a-zA-Z0-9_-]{1,64}$/.test(value('parcial')) ? value('parcial') : '', examState: choice('estado_parcial', ['all', 'not_started', 'in_progress', 'submitted', 'missing_after_close']), activity: choice('actividad', ['all', 'none', 'active', 'recent7', 'inactive14']), minGrade: grade('nota_min'), maxGrade: grade('nota_max'), sort: choice('orden', ['name', 'activity', 'grade_asc', 'grade_desc', 'preparation'], 'name'), page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1 };
}
export function progressFilterQuery(filters: ProgressFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ q: filters.q, preparacion: filters.preparation, parcial: filters.exam, estado_parcial: filters.examState, actividad: filters.activity, nota_min: filters.minGrade, nota_max: filters.maxGrade, orden: filters.sort })) if (value && value !== 'all' && !(key === 'orden' && value === 'name')) params.set(key, value);
  if (filters.page > 1) params.set('p', String(filters.page));
  return params.toString();
}
export function filterStudentProgress(rows: StudentProgressRow[], filters: ProgressFilters, now = Date.now()) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const gradeFor = (row: StudentProgressRow) => filters.exam ? row.exams.find(e => e.id === filters.exam)?.grade ?? null : row.latestExamGrade;
  const filtered = rows.filter(row => {
    if (filters.q && !normalize(`${row.name} ${row.email}`).includes(normalize(filters.q))) return false;
    const prep = row.preparation;
    if (filters.preparation === 'none' && prep.attempts !== 0) return false;
    if (filters.preparation === 'started' && (prep.attempts === 0 || prep.completedAttempts > 0)) return false;
    if (filters.preparation === 'completed' && prep.completedAttempts === 0) return false;
    if (filters.preparation === 'all_completed' && (!prep.publishedTotal || prep.publishedCompleted < prep.publishedTotal)) return false;
    const exams = filters.exam ? row.exams.filter(e => e.id === filters.exam) : row.exams;
    if (filters.exam && !exams.length) return false;
    if (filters.examState !== 'all' && !exams.some(e => filters.examState === 'missing_after_close' ? e.state !== 'submitted' && progressTimestamp(e.closesAt) > 0 && progressTimestamp(e.closesAt) <= now : e.state === filters.examState)) return false;
    const activity = progressTimestamp(row.lastActivity);
    if (filters.activity === 'none' && activity) return false;
    if (filters.activity === 'active' && !activity) return false;
    if (filters.activity === 'recent7' && (!activity || activity < now - 7 * 86400000)) return false;
    if (filters.activity === 'inactive14' && activity > now - 14 * 86400000) return false;
    const grade = gradeFor(row);
    if (filters.minGrade !== '' && (grade === null || grade < Number(filters.minGrade))) return false;
    if (filters.maxGrade !== '' && (grade === null || grade > Number(filters.maxGrade))) return false;
    return true;
  });
  filtered.sort((a, b) => {
    if (filters.sort === 'activity') return progressTimestamp(b.lastActivity) - progressTimestamp(a.lastActivity) || a.name.localeCompare(b.name, 'es');
    if (filters.sort === 'preparation') return b.preparation.publishedCompleted - a.preparation.publishedCompleted || a.name.localeCompare(b.name, 'es');
    if (filters.sort === 'grade_asc' || filters.sort === 'grade_desc') { const x = gradeFor(a); const y = gradeFor(b); return x === null ? y === null ? a.name.localeCompare(b.name, 'es') : 1 : y === null ? -1 : (filters.sort === 'grade_asc' ? x - y : y - x) || a.name.localeCompare(b.name, 'es'); }
    return a.name.localeCompare(b.name, 'es') || a.id.localeCompare(b.id);
  });
  const total = filtered.length; const totalPages = Math.max(1, Math.ceil(total / 20)); const page = Math.min(filters.page, totalPages);
  return { items: filtered.slice((page - 1) * 20, page * 20), total, totalPages, page };
}
