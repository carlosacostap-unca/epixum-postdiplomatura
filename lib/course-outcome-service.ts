import 'server-only';
import { randomBytes } from 'node:crypto';
import type PocketBase from 'pocketbase';
import type { Course, User } from '@/types';
import { OutcomeError, outcomeDraftSchema, publishedOutcomeDto, type CourseOutcome, type OutcomeDraft, type OutcomeHistory, type PublishedOutcome } from './course-outcomes';

const nonce = () => randomBytes(16).toString('hex');
const recordId = () => randomBytes(8).toString('hex').slice(0, 15);
const conflict = () => new OutcomeError('El resultado cambió o no pudimos confirmar la operación. Actualizá la página antes de volver a guardar.');
export const outcomePage = (value: unknown) => typeof value === 'string' && /^\d{1,6}$/.test(value) ? Math.max(1, Number(value)) : 1;
async function first<T>(pb: PocketBase, collection: string, filter: string, fields?: string): Promise<T | null> {
  try { return await pb.collection(collection).getFirstListItem<T>(filter, { fields }); }
  catch (error) { if (error && typeof error === 'object' && 'status' in error && error.status === 404) return null; throw error; }
}
export async function requireOutcomeCourse(pb: PocketBase, courseId: string, mode: 'manager' | 'student' = 'manager') {
  const user = pb.authStore.record as unknown as User | null;
  if (!pb.authStore.isValid || !user?.id) throw new OutcomeError('Iniciá sesión para continuar.');
  const course = await pb.collection('courses').getOne<Course>(courseId);
  if (!course.outcomesEnabled) throw new OutcomeError('Los resultados de cursada no están habilitados en este curso.');
  const teaches = Boolean(course.teachers?.includes(user.id));
  if (mode === 'manager') {
    if (user.role !== 'admin' && !teaches) throw new OutcomeError('No tenés permisos para gestionar los resultados de este curso.');
  } else {
    if (teaches || course.status === 'borrador') throw new OutcomeError('No tenés acceso estudiantil al resultado de este curso.');
    const enrollment = await first(pb, 'course_enrollments', pb.filter('course = {:course} && student = {:student}', { course: courseId, student: user.id }), 'id');
    if (!enrollment) throw new OutcomeError('Necesitás una matrícula vigente en este curso.');
  }
  return { course, user };
}
async function requireTarget(service: PocketBase, course: Course, studentId: string) {
  if (course.teachers?.includes(studentId)) throw new OutcomeError('La persona está asignada como docente en este curso.');
  const enrollment = await first(service, 'course_enrollments', service.filter('course = {:course} && student = {:student}', { course: course.id, student: studentId }), 'id');
  if (!enrollment) throw new OutcomeError('El alumno no tiene una matrícula vigente en este curso.');
  return service.collection('users').getOne<Pick<User, 'id' | 'name' | 'email'>>(studentId, { fields: 'id,name,email' });
}
async function findOutcome(service: PocketBase, course: string, student: string) {
  const record = await first<CourseOutcome>(service, 'course_outcomes', service.filter('course = {:course} && student = {:student}', { course, student }), 'id,course,student,draft,published,revision');
  if (!record) return null;
  return { id: record.id, course: record.course, student: record.student, draft: outcomeDraftSchema.parse(record.draft), published: publishedOutcomeDto(record.published), revision: record.revision };
}
export async function readOwnCourseOutcome(pb: PocketBase, service: PocketBase, courseId: string): Promise<PublishedOutcome | null> {
  const { user } = await requireOutcomeCourse(pb, courseId, 'student');
  // Identity always comes from the session; drafts/history never leave the server.
  const record = await first<{ published: unknown }>(service, 'course_outcomes', service.filter('course = {:course} && student = {:student}', { course: courseId, student: user.id }), 'published');
  return publishedOutcomeDto(record?.published);
}
export async function readManagedCourseOutcome(pb: PocketBase, service: PocketBase, courseId: string, studentId: string, historyPage = 1) {
  const { course } = await requireOutcomeCourse(pb, courseId);
  const student = await requireTarget(service, course, studentId);
  const outcome = await findOutcome(service, courseId, studentId);
  const history = outcome ? await service.collection('course_outcome_history').getList<OutcomeHistory>(historyPage, 20, {
    filter: service.filter('outcome = {:outcome}', { outcome: outcome.id }), sort: '-occurredAt,-id', fields: 'id,action,actorName,occurredAt,snapshot',
  }) : { items: [], page: 1, totalPages: 0, totalItems: 0 };
  return { course, student, outcome, history };
}
export async function readCourseOutcomeRoster(pb: PocketBase, service: PocketBase, courseId: string, page = 1, query = '') {
  const { course } = await requireOutcomeCourse(pb, courseId);
  const search = query.trim().slice(0, 100);
  const filter = service.filter('course = {:course}' + (search ? ' && (student.name ~ {:query} || student.email ~ {:query})' : ''), { course: courseId, query: search });
  const enrollments = await service.collection('course_enrollments').getList<{ student: string; expand?: { student?: Pick<User, 'id' | 'name' | 'email'> } }>(page, 25, {
    filter, sort: 'student.name,student.id', expand: 'student', fields: 'student,expand.student.id,expand.student.name,expand.student.email',
  });
  const ids = enrollments.items.map(e => e.student);
  const params: Record<string, string> = { course: courseId };
  const students = ids.map((id, i) => { params[`s${i}`] = id; return `student = {:s${i}}`; });
  const records = ids.length ? await service.collection('course_outcomes').getFullList<CourseOutcome>({ filter: service.filter(`course = {:course} && (${students.join(' || ')})`, params), fields: 'student,draft,published' }) : [];
  return { course, query: search, page: enrollments.page, totalPages: enrollments.totalPages, totalItems: enrollments.totalItems,
    rows: enrollments.items.flatMap(e => {
      const student = e.expand?.student;
      if (!student || course.teachers?.includes(student.id)) return [];
      const record = records.find(r => r.student === student.id);
      return [{ student, draft: record ? outcomeDraftSchema.parse(record.draft) : null, published: publishedOutcomeDto(record?.published) }];
    }),
  };
}

export async function changeCourseOutcome(pb: PocketBase, service: PocketBase, courseId: string, studentId: string, expectedRevision: string, command: 'save' | 'publish' | 'withdraw', input?: unknown) {
  const { course, user } = await requireOutcomeCourse(pb, courseId);
  await requireTarget(service, course, studentId);
  const current = await findOutcome(service, courseId, studentId);
  if ((current?.revision || '') !== expectedRevision) throw conflict();
  let draft: OutcomeDraft;
  if (command === 'save') {
    const parsed = outcomeDraftSchema.safeParse(input);
    if (!parsed.success) throw new OutcomeError(parsed.error.issues[0].message);
    draft = parsed.data;
  } else {
    if (!current) throw new OutcomeError('Guardá primero el borrador del resultado.');
    draft = current.draft;
    if (command === 'withdraw' && !current.published) throw new OutcomeError('No hay una publicación para retirar.');
  }
  const occurredAt = new Date().toISOString();
  const published = command === 'publish' ? { ...draft, publishedAt: occurredAt } : command === 'withdraw' ? null : current?.published || null;
  const id = current?.id || recordId();
  const batch = service.createBatch();
  const next = { draft, published, revision: nonce() };
  if (current) batch.collection('course_outcomes').update(id, next);
  else batch.collection('course_outcomes').create({ id, course: courseId, student: studentId, ...next });
  // The unique consumed revision rejects concurrent writes and rolls back the update.
  batch.collection('course_outcome_history').create({ outcome: id, revision: current?.revision || 'initial', action: command, actor: user.id, actorName: (user.name || user.email || 'Administrador').slice(0, 500), occurredAt, snapshot: { draft, published } });
  const latestAccess = await requireOutcomeCourse(pb, courseId);
  await requireTarget(service, latestAccess.course, studentId);
  try { await batch.send(); } catch { throw conflict(); }
}
