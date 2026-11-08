import 'server-only';
import { canViewCourseDraft } from './course-roles';
import { randomBytes } from 'node:crypto';
import type PocketBase from 'pocketbase';
import type { Course, User } from '@/types';
import { aggregateSurvey, parseSurveyAnswers, surveyDesignSchema, surveyIsOpen, surveyPublicDto, SurveyError, type CourseSurvey, type SurveyResponse, type SurveyResults, type SurveySummary } from './course-surveys';
import { matchesSurveyAudience } from './survey-audience';

export type SurveyMode = 'manager' | 'student';
const nonce = () => randomBytes(16).toString('hex');
const recordId = () => randomBytes(8).toString('hex').slice(0, 15);
type StoredSurvey = CourseSurvey & { opening: string };
const conflict = () => new SurveyError('La encuesta cambió o no pudimos confirmar la operación. Actualizá la página e intentá nuevamente.');

async function first<T>(pb: PocketBase, collection: string, filter: string, fields = 'id'): Promise<T | null> {
  try { return await pb.collection(collection).getFirstListItem<T>(filter, { fields }); }
  catch (error) { if (error && typeof error === 'object' && 'status' in error && error.status === 404) return null; throw error; }
}

export async function requireSurveyAccess(pb: PocketBase, courseId: string, mode: SurveyMode) {
  const user = pb.authStore.record as unknown as User | null;
  if (!pb.authStore.isValid || !user?.id) throw new SurveyError('Iniciá sesión para continuar.');
  const course = await pb.collection('courses').getOne<Course>(courseId);
  if (!course.surveysEnabled) throw new SurveyError('Las encuestas no están habilitadas en este curso.');
  const teacher = Boolean(course.teachers?.includes(user.id));
  if (mode === 'manager') {
    if (user.role !== 'admin' && !teacher) throw new SurveyError('No tenés permisos para gestionar encuestas en este curso.');
  } else {
    if (teacher || !canViewCourseDraft(course,user)) throw new SurveyError('No tenés acceso estudiantil a las encuestas de este curso.');
    const enrollment = await first(pb, 'course_enrollments', pb.filter('course = {:course} && student = {:student}', { course: courseId, student: user.id }));
    if (!enrollment) throw new SurveyError('Necesitás una matrícula vigente en este curso.');
  }
  return { course, user };
}

async function scopedSurvey(service: PocketBase, courseId: string, surveyId: string, mode: SurveyMode) {
  const survey = await service.collection('course_surveys').getOne<StoredSurvey>(surveyId);
  if (survey.course !== courseId || (mode === 'student' && survey.status === 'draft')) throw new SurveyError('Esta encuesta no está disponible en este curso.');
  return { ...surveyPublicDto(survey), opening: survey.opening || '' };
}

async function publishedStudentStatus(service: PocketBase, course: Course, student: string): Promise<unknown> {
  if (!course.outcomesEnabled) return null;
  const outcome = await first<{ published?: { status?: unknown } | null }>(service, 'course_outcomes', service.filter('course = {:course} && student = {:student}', { course: course.id, student }), 'published');
  return outcome?.published?.status || null;
}

async function requireSurveyAudience(service: PocketBase, survey: CourseSurvey, access: Awaited<ReturnType<typeof requireSurveyAccess>>) {
  const status = survey.audience === 'all' || !survey.audience ? null : await publishedStudentStatus(service, access.course, access.user.id);
  if (!matchesSurveyAudience(survey.audience, status, Boolean(access.course.outcomesEnabled))) throw new SurveyError('Esta encuesta no está disponible para tu resultado de cursada.');
}

export async function readCourseSurvey(pb: PocketBase, service: PocketBase, courseId: string, surveyId: string, mode: SurveyMode) {
  const access = await requireSurveyAccess(pb, courseId, mode);
  const survey = await scopedSurvey(service, courseId, surveyId, mode);
  if (mode === 'student') await requireSurveyAudience(service, survey, access);
  const submitted = mode === 'student' && Boolean(await first(service, 'course_survey_participations', service.filter('survey = {:survey} && student = {:student}', { survey: surveyId, student: access.user.id })));
  return { ...access, survey: surveyPublicDto(survey), submitted };
}

export async function listCourseSurveys(pb: PocketBase, service: PocketBase, courseId: string, mode: SurveyMode) {
  const access = await requireSurveyAccess(pb, courseId, mode);
  const filter = service.filter(mode === 'student' ? 'course = {:course} && status != "draft"' : 'course = {:course}', { course: courseId });
  const records = await service.collection('course_surveys').getFullList<CourseSurvey>({ filter, sort: '-created,-id' });
  const status = mode === 'student' && records.some(record => record.audience && record.audience !== 'all') ? await publishedStudentStatus(service, access.course, access.user.id) : null;
  const visible = mode === 'student' ? records.filter(record => matchesSurveyAudience(record.audience, status, Boolean(access.course.outcomesEnabled))) : records;
  const surveys: SurveySummary[] = await Promise.all(visible.map(async record => {
    const filter = service.filter(mode === 'student' ? 'survey = {:survey} && student = {:student}' : 'survey = {:survey}', { survey: record.id, student: access.user.id });
    const participation = await service.collection('course_survey_participations').getList(1, 1, { filter, fields: 'id' });
    return { ...surveyPublicDto(record), responseCount: mode === 'manager' ? participation.totalItems : 0, submitted: mode === 'student' && participation.totalItems > 0 };
  }));
  return { course: access.course, surveys };
}

function guardedBatch(service: PocketBase, survey: CourseSurvey) {
  const batch = service.createBatch();
  // Consuming a revision exactly once is a compare-and-swap across all app processes.
  batch.collection('course_survey_revisions').create({ survey: survey.id, revision: survey.revision });
  batch.collection('course_surveys').update(survey.id, { revision: nonce() });
  return batch;
}

export async function saveCourseSurvey(pb: PocketBase, service: PocketBase, courseId: string, surveyId: string | null, expectedRevision: string, input: unknown) {
  await requireSurveyAccess(pb, courseId, 'manager');
  const parsed = surveyDesignSchema.safeParse(input);
  if (!parsed.success) throw new SurveyError(parsed.error.issues[0].message);
  if (!surveyId) {
    const created = await service.collection('course_surveys').create<CourseSurvey>({ ...parsed.data, course: courseId, status: 'draft', revision: nonce() });
    return created.id;
  }
  const survey = await scopedSurvey(service, courseId, surveyId, 'manager');
  if (survey.status !== 'draft') throw new SurveyError('El diseño ya está publicado. Duplicá la encuesta para modificarlo.');
  if (survey.revision !== expectedRevision) throw conflict();
  const batch = guardedBatch(service, survey);
  batch.collection('course_surveys').update(surveyId, parsed.data);
  try { await batch.send(); } catch { throw conflict(); }
  return surveyId;
}

export type SurveyCommand = 'publish' | 'close' | 'duplicate' | 'delete';
export async function commandCourseSurvey(pb: PocketBase, service: PocketBase, courseId: string, surveyId: string, command: SurveyCommand, expectedRevision: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { course } = await requireSurveyAccess(pb, courseId, 'manager');
    const survey = await scopedSurvey(service, courseId, surveyId, 'manager');
    if (command === 'duplicate') return saveCourseSurvey(pb, service, courseId, null, '', { ...surveyDesignSchema.parse({ title: survey.title, description: survey.description, questions: survey.questions, anonymous: survey.anonymous, audience: survey.audience, closesAt: '' }), title: `${survey.title.slice(0, 150)} (copia)` });
    if (command === 'close' && survey.status === 'closed') return survey.id;
    if (command === 'close' ? survey.status !== 'published' : survey.status !== 'draft') throw new SurveyError('La operación no está disponible en el estado actual de la encuesta.');
    if (command !== 'close' && survey.revision !== expectedRevision) throw conflict();
    if (command === 'publish') {
      if (survey.audience !== 'all' && !course.outcomesEnabled) throw new SurveyError('La administración debe habilitar los resultados de cursada antes de publicar una encuesta segmentada.');
      surveyDesignSchema.parse({ title: survey.title, description: survey.description, anonymous: survey.anonymous, audience: survey.audience, closesAt: survey.closesAt, questions: survey.questions });
      if (survey.closesAt && Date.parse(survey.closesAt) <= Date.now()) throw new SurveyError('La fecha de cierre debe estar en el futuro.');
    }
    const batch = guardedBatch(service, survey);
    if (command === 'delete') batch.collection('course_surveys').delete(survey.id);
    else if (command === 'publish') {
      const opening = recordId();
      batch.collection('course_survey_openings').create({ id: opening, survey: survey.id });
      batch.collection('course_surveys').update(survey.id, { status: 'published', opening });
    } else {
      if (survey.opening) batch.collection('course_survey_openings').delete(survey.opening);
      batch.collection('course_surveys').update(survey.id, { status: 'closed', opening: '' });
    }
    try { await batch.send(); return survey.id; }
    catch { if (command !== 'close' || attempt === 5) throw conflict(); }
  }
  throw conflict();
}

export async function submitCourseSurvey(pb: PocketBase, service: PocketBase, courseId: string, surveyId: string, input: unknown) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const access = await requireSurveyAccess(pb, courseId, 'student');
    const { user } = access;
    const survey = await scopedSurvey(service, courseId, surveyId, 'student');
    await requireSurveyAudience(service, survey, access);
    const filter = service.filter('survey = {:survey} && student = {:student}', { survey: survey.id, student: user.id });
    if (await first(service, 'course_survey_participations', filter)) return;
    if (!surveyIsOpen(survey)) throw new SurveyError('Esta encuesta ya está cerrada.');
    const answers = parseSurveyAnswers(survey.questions, input);
    if (!survey.opening) throw conflict();
    const batch = service.createBatch();
    batch.collection('course_survey_participations').create({ survey: survey.id, student: user.id });
    // The relation must resolve inside the transaction. Closing deletes its target;
    // an in-flight submission then rolls back without serializing other students.
    batch.collection('course_survey_responses').create({ survey: survey.id, opening: survey.opening, answers, ...(survey.anonymous ? {} : { student: user.id }) });
    const latestAccess = await requireSurveyAccess(pb, courseId, 'student');
    await requireSurveyAudience(service, survey, latestAccess);
    // Recheck the clock after authorization and before sending the atomic transaction.
    if (!surveyIsOpen(survey)) throw new SurveyError('Esta encuesta ya está cerrada.');
    try { await batch.send(); return; }
    catch { if (attempt === 5) throw conflict(); }
  }
}

export async function readSurveyResults(pb: PocketBase, service: PocketBase, courseId: string, surveyId: string): Promise<SurveyResults> {
  await requireSurveyAccess(pb, courseId, 'manager');
  const survey = await scopedSurvey(service, courseId, surveyId, 'manager');
  const responses = await service.collection('course_survey_responses').getFullList<SurveyResponse & { expand?: { student?: Pick<User, 'name'> } }>({
    filter: service.filter('survey = {:survey}', { survey: survey.id }),
    fields: survey.anonymous ? 'answers' : 'answers,expand.student.name',
    ...(survey.anonymous ? {} : { expand: 'student' }),
  });
  const individuals: SurveyResults['individuals'] = [];
  if (!survey.anonymous) {
    for (const response of responses) {
      individuals.push({ name: response.expand?.student?.name || 'Cuenta no disponible', answers: response.answers });
    }
    individuals.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }
  return { ...aggregateSurvey(survey, responses), individuals };
}
