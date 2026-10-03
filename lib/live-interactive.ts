import { randomBytes } from 'node:crypto';
import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Course, Class } from '@/types';
import { requireInteractiveCourse, requireInteractiveLesson } from './interactive-class-access';
import { isInteractiveLessonReady, parseInteractiveMaterial } from './interactive-material';
import { publicScreen, validateLiveAnswer, type LiveSession, type LiveState, type LiveCommand, type LiveAnswer } from './live-interactive-contract';

export class LiveError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const nonce = () => randomBytes(12).toString('hex');
const recordId = () => randomBytes(8).toString('hex').slice(0, 15);
const answerOptions = (screen: LiveSession['screen']) => Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`option${i}`, 'options' in screen ? screen.options[i]?.id || '' : '']));
export function liveUser(pb: PocketBase) {
  if (!pb.authStore.isValid || !pb.authStore.record?.id) throw new LiveError('Iniciá sesión para continuar.', 401);
  return pb.authStore.record.id;
}
function notFound(error: unknown) { return typeof error === 'object' && error !== null && 'status' in error && error.status === 404; }
async function first<T>(pb: PocketBase, collection: string, filter: string): Promise<T | null> {
  try { return await pb.collection(collection).getFirstListItem<T>(filter); }
  catch (error) { if (notFound(error)) return null; throw error; }
}
async function enrolled(pb: PocketBase, course: string, user: string) {
  return Boolean(await first(pb, 'course_enrollments', pb.filter('course = {:course} && student = {:user}', { course, user })));
}
export async function liveAccess(pb: PocketBase, sessionId: string) {
  const user = liveUser(pb);
  const session = await pb.collection('interactive_sessions').getOne<LiveSession>(sessionId);
  const course = await pb.collection('courses').getOne<Course>(session.course);
  if (!course.interactiveClassesEnabled) throw new LiveError('Las clases interactivas de este curso están deshabilitadas.', 403);
  const teacher = Boolean(course.teachers?.includes(user));
  if (!teacher && !await enrolled(pb, course.id, user)) throw new LiveError('Necesitás una matrícula vigente en el curso.', 403);
  return { user, session, teacher };
}
async function sessionMaterial(pb: PocketBase, session: string) {
  const record = await pb.collection('interactive_session_materials').getFirstListItem(pb.filter('session = {:session}', { session }));
  const material = parseInteractiveMaterial(record.material);
  if (!material) throw new LiveError('No se encuentra el material de la sesión.', 500);
  return material;
}

export async function startLiveSession(pb: PocketBase, courseId: string, lessonId: string) {
  const user = liveUser(pb);
  await requireInteractiveCourse(pb, courseId);
  const lesson = await requireInteractiveLesson(pb, courseId, lessonId);
  const activeFilter = pb.filter('lesson = {:lesson} && status = "live"', { lesson: lessonId });
  const active = await first<LiveSession>(pb, 'interactive_sessions', activeFilter);
  if (active) return active;
  if (!isInteractiveLessonReady(lesson)) throw new LiveError('Prepará el material y asociá una clase antes de iniciar.');
  const linkedClass = await pb.collection('classes').getOne<Class>(lesson.class!);
  if (linkedClass.course !== courseId) throw new LiveError('La clase asociada no pertenece al curso.');
  const material = parseInteractiveMaterial(lesson.material)!;
  const screen = publicScreen(material.screens[0]);
  const id = recordId();
  const batch = pb.createBatch();
  batch.collection('interactive_sessions').create({ id, course: courseId, lesson: lessonId, class: linkedClass.id, controller: user, title: lesson.title, classTitle: linkedClass.title, code: randomBytes(4).toString('hex').toUpperCase(), status: 'live', screenIndex: 0, screenId: screen.id, screenType: screen.type, screen, ...answerOptions(screen), activityOpen: false, revision: nonce() });
  batch.collection('interactive_session_materials').create({ session: id, material });
  try { await batch.send(); }
  catch (error) {
    const concurrent = await first<LiveSession>(pb, 'interactive_sessions', activeFilter);
    if (concurrent) return concurrent;
    throw error;
  }
  return pb.collection('interactive_sessions').getOne<LiveSession>(id);
}

// Only the resolver needs elevated read access; all enrollment and mutations use pb.
export async function joinLiveSession(pb: PocketBase, code: string, resolveCode: (code: string) => Promise<LiveSession | null>) {
  const user = liveUser(pb);
  const session = await resolveCode(code);
  if (!session || session.status !== 'live') throw new LiveError('El código no corresponde a una sesión abierta.', 404);
  const course = await pb.collection('courses').getOne<Course>(session.course);
  if (!course.interactiveClassesEnabled || !await enrolled(pb, course.id, user)) throw new LiveError('Necesitás una matrícula vigente en el curso de esta sesión.', 403);
  const filter = pb.filter('session = {:session} && student = {:user}', { session: session.id, user });
  const existing = await first<RecordModel>(pb, 'interactive_participants', filter);
  if (existing) await pb.collection('interactive_participants').update(existing.id, { ping: nonce() });
  else {
    try { await pb.collection('interactive_participants').create({ session: session.id, student: user, joinCode: code, ping: nonce() }); }
    catch (error) { if (!await first(pb, 'interactive_participants', filter)) throw error; }
  }
  // Recheck permissions/status after concurrent join/close or enrollment removal.
  const visible = await pb.collection('interactive_sessions').getOne<LiveSession>(session.id);
  if (visible.status !== 'live') throw new LiveError('La sesión acaba de finalizar.', 409);
  return visible;
}

function answerDto(record: RecordModel): LiveAnswer {
  return { id: record.id, student: record.student, screenId: record.screenId, answer: record.answer, created: record.created };
}
export async function readLiveState(pb: PocketBase, sessionId: string, resultsScreenId?: string): Promise<LiveState> {
  const { user, session, teacher } = await liveAccess(pb, sessionId);
  const base = { session, serverTime: Date.now(), ownAnswer: null };
  if (!teacher) {
    const own = await first<RecordModel>(pb, 'interactive_responses', pb.filter('session = {:session} && student = {:user} && screenId = {:screen}', { session: sessionId, user, screen: session.screenId }));
    return { ...base, role: 'student', ownAnswer: own ? answerDto(own) : null };
  }
  const material = await sessionMaterial(pb, sessionId);
  const selected = material.screens.some((screen) => screen.id === resultsScreenId) ? resultsScreenId! : session.screenId;
  const [participants, answers] = await Promise.all([
    pb.collection('interactive_participants').getFullList({ filter: pb.filter('session = {:session}', { session: sessionId }), expand: 'student', fields: 'id,student,updated,expand.student.name,expand.student.id', sort: 'created,id' }),
    pb.collection('interactive_responses').getFullList({ filter: pb.filter('session = {:session} && screenId = {:screen}', { session: sessionId, screen: selected }), sort: 'created,id' }),
  ]);
  return { ...base, role: 'teacher', canControl: session.controller === user, material, resultsScreenId: selected,
    participants: participants.map((p) => ({ id: p.id, student: p.student, updated: p.updated, name: p.expand?.student?.name || `Alumno ${p.student.slice(-6)}` })), answers: answers.map(answerDto) };
}

export async function executeLiveCommand(pb: PocketBase, sessionId: string, command: LiveCommand) {
  const { user, session, teacher } = await liveAccess(pb, sessionId);
  if (command.kind === 'heartbeat') {
    if (session.status !== 'live') return;
    const participant = await first<RecordModel>(pb, 'interactive_participants', pb.filter('session = {:session} && student = {:user}', { session: sessionId, user }));
    if (participant) await pb.collection('interactive_participants').update(participant.id, { ping: nonce() });
    return;
  }
  if (command.kind === 'answer') {
    if (teacher) throw new LiveError('Las respuestas se registran desde la vista del alumno.', 403);
    const filter = pb.filter('session = {:session} && student = {:user} && screenId = {:screen}', { session: sessionId, user, screen: command.screenId });
    const previous = await first<RecordModel>(pb, 'interactive_responses', filter);
    const reuse = (record: RecordModel) => {
      if (record.answer !== command.answer.trim()) throw new LiveError('Ya enviaste otra respuesta para esta actividad.', 409);
      return answerDto(record);
    };
    if (previous) return reuse(previous);
    if (session.status !== 'live' || !session.activityOpen || session.revision !== command.revision || session.screenId !== command.screenId) throw new LiveError('La actividad cambió o ya está cerrada. Actualizamos la pantalla.', 409);
    const answer = validateLiveAnswer(session.screen, command.answer);
    try { return answerDto(await pb.collection('interactive_responses').create({ session: sessionId, student: user, screenId: session.screenId, screenRevision: command.revision, answer })); }
    catch {
      const concurrent = await first<RecordModel>(pb, 'interactive_responses', filter);
      if (concurrent) return reuse(concurrent);
      throw new LiveError('No se guardó la respuesta. La actividad pudo cerrarse; revisá el estado e intentá nuevamente.', 409);
    }
  }
  if (!teacher || session.controller !== user) throw new LiveError('Sólo el docente que inició la sesión puede conducirla.', 403);
  if (session.status !== 'live' || session.revision !== command.revision) throw new LiveError('La sesión cambió. Actualizá el estado antes de continuar.', 409);
  const patch: Record<string, unknown> = { expectedRevision: command.revision, revision: nonce() };
  if (command.kind === 'screen') {
    const material = await sessionMaterial(pb, sessionId);
    if (!material.screens[command.index]) throw new LiveError('Esa pantalla no existe.');
    const screen = publicScreen(material.screens[command.index]);
    Object.assign(patch, { screenIndex: command.index, screenId: screen.id, screenType: screen.type, screen, ...answerOptions(screen), activityOpen: false });
  } else if (command.kind === 'activity') {
    if (session.screenType === 'content') throw new LiveError('Esta pantalla no tiene una actividad.');
    patch.activityOpen = command.open;
  } else Object.assign(patch, { status: 'closed', activityOpen: false, closedAt: new Date().toISOString() });
  try { await pb.collection('interactive_sessions').update(sessionId, patch); }
  catch { throw new LiveError('No se aplicó el cambio. Actualizá la sesión e intentá nuevamente.', 409); }
}
