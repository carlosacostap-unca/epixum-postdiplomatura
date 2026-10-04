import { randomBytes } from 'node:crypto';
import type PocketBase from 'pocketbase';
import type { Course } from '@/types';
import { generateReviewSlots, ReviewError, reviewSchema, reviewBlockSchema, reviewEvaluationSchema, type Review, type ReviewBlock, type ReviewSlot, type ReviewBooking } from './review-appointments';

const nonce = () => randomBytes(12).toString('hex');
const recordId = () => randomBytes(8).toString('hex').slice(0, 15);
export type ReviewMode = 'teacher' | 'student';

export async function requireReviewCourse(pb: PocketBase, courseId: string, mode: ReviewMode) {
  const user = pb.authStore.record;
  if (!pb.authStore.isValid || !user?.id) throw new ReviewError('Iniciá sesión para continuar.');
  const course = await pb.collection('courses').getOne<Course>(courseId);
  if (!course.reviewsEnabled) throw new ReviewError('Las revisiones no están habilitadas en este curso.');
  if (mode === 'teacher') {
    if (!course.teachers?.includes(user.id)) throw new ReviewError('Solamente los docentes asignados pueden gestionar estas revisiones.');
  } else {
    if (course.teachers?.includes(user.id)) throw new ReviewError('Ingresá desde la vista docente para gestionar este curso.');
    const enrollment = await pb.collection('course_enrollments').getList(1, 1, { filter: pb.filter('course = {:course} && student = {:student}', { course: courseId, student: user.id }), fields: 'id' });
    if (!enrollment.totalItems) throw new ReviewError('Necesitás una matrícula vigente en este curso.');
  }
  return course;
}

async function scopedReview(pb: PocketBase, courseId: string, reviewId: string, mode: ReviewMode) {
  const course = await requireReviewCourse(pb, courseId, mode);
  const review = await pb.collection('course_reviews').getOne<Review>(reviewId);
  if (review.course !== courseId) throw new ReviewError('La revisión no pertenece a este curso.');
  return { course, review };
}
function guard(pb: PocketBase, review: Review) {
  const batch = pb.createBatch();
  batch.collection('course_reviews').update(review.id, { expectedRevision: review.revision, revision: nonce() });
  return batch;
}
async function commit(batch: ReturnType<PocketBase['createBatch']>) {
  try { await batch.send(); }
  catch {
    throw new ReviewError('La disponibilidad o el estado cambió, o no se pudo confirmar la operación. Actualizá la página y revisá tus turnos antes de intentar nuevamente.');
  }
}
function checkVersion(review: Review, expected: string) {
  if (review.revision !== expected) throw new ReviewError('La revisión cambió mientras trabajabas. Actualizá la página para ver los últimos datos.');
}

export async function createReview(pb: PocketBase, courseId: string, input: unknown) {
  await requireReviewCourse(pb, courseId, 'teacher');
  const data = reviewSchema.parse(input);
  try { return await pb.collection('course_reviews').create<Review>({ ...data, course: courseId, revision: nonce() }); }
  catch { throw new ReviewError('No pudimos crear la revisión. Verificá que el número no esté usado en este curso.'); }
}
export async function updateReview(pb: PocketBase, courseId: string, reviewId: string, expected: string, input: unknown) {
  const { review } = await scopedReview(pb, courseId, reviewId, 'teacher');
  checkVersion(review, expected);
  const data = reviewSchema.parse(input);
  if (data.number !== review.number) throw new ReviewError('El número de una revisión existente no se puede cambiar.');
  const batch = pb.createBatch();
  batch.collection('course_reviews').update(review.id, { ...data, expectedRevision: review.revision, revision: nonce() });
  await commit(batch);
}

export async function saveReviewBlock(pb: PocketBase, courseId: string, reviewId: string, expected: string, blockId: string | null, input: unknown) {
  const { course, review } = await scopedReview(pb, courseId, reviewId, 'teacher');
  checkVersion(review, expected);
  const data = reviewBlockSchema.parse(input);
  if (!course.teachers?.includes(data.teacher)) throw new ReviewError('Elegí un docente asignado al curso.');
  const plan = generateReviewSlots(data);
  if (Date.parse(plan.startsAt) <= Date.now()) throw new ReviewError('La franja debe comenzar en el futuro.');
  const blocks = await pb.collection('review_blocks').getFullList<ReviewBlock>({ filter: pb.filter('review = {:review} && active = true', { review: review.id }) });
  const previous = blockId ? blocks.find(b => b.id === blockId) : null;
  if (blockId && !previous) throw new ReviewError('No se encontró la franja activa en esta revisión.');
  if (blocks.some(b => b.id !== blockId && b.teacher === data.teacher && Date.parse(b.startsAt) < Date.parse(plan.endsAt) && Date.parse(b.endsAt) > Date.parse(plan.startsAt))) throw new ReviewError('Este docente ya tiene una franja superpuesta en esta revisión.');
  const batch = guard(pb, review);
  const id = blockId || recordId();
  if (previous) {
    const slots = await editableBlockSlots(pb, review, previous);
    for (const slot of slots) batch.collection('review_slots').update(slot.id, { active: false });
    batch.collection('review_blocks').update(id, { ...data, startsAt: plan.startsAt, endsAt: plan.endsAt });
  } else {
    batch.collection('review_blocks').create({ ...data, id, review: review.id, startsAt: plan.startsAt, endsAt: plan.endsAt, active: true });
  }
  for (const slot of plan.slots) batch.collection('review_slots').create({ ...slot, review: review.id, block: id, teacher: data.teacher, active: true });
  await commit(batch);
}

async function editableBlockSlots(pb: PocketBase, review: Review, block: ReviewBlock) {
  if (Date.parse(block.startsAt) <= Date.now()) throw new ReviewError('No se puede modificar una franja que ya comenzó.');
  const bookings = await pb.collection('review_bookings').getList(1, 1, { filter: pb.filter('review = {:review} && slot.block = {:block} && status = "reserved"', { review: review.id, block: block.id }), fields: 'id' });
  if (bookings.totalItems) throw new ReviewError('Esta franja tiene reservas pendientes. Cancelá las reservas antes de cambiar sus horarios.');
  return pb.collection('review_slots').getFullList<ReviewSlot>({ filter: pb.filter('review = {:review} && block = {:block} && active = true', { review: review.id, block: block.id }) });
}
export async function removeReviewBlock(pb: PocketBase, courseId: string, reviewId: string, expected: string, blockId: string) {
  const { review } = await scopedReview(pb, courseId, reviewId, 'teacher');
  checkVersion(review, expected);
  const block = await pb.collection('review_blocks').getOne<ReviewBlock>(blockId);
  if (block.review !== review.id || !block.active) throw new ReviewError('La franja no está disponible.');
  const slots = await editableBlockSlots(pb, review, block);
  const batch = guard(pb, review);
  for (const slot of slots) batch.collection('review_slots').update(slot.id, { active: false });
  batch.collection('review_blocks').update(block.id, { active: false });
  await commit(batch);
}

export async function reserveReviewSlot(pb: PocketBase, courseId: string, reviewId: string, slotId: string) {
  const { course, review } = await scopedReview(pb, courseId, reviewId, 'student');
  if (!review.open) throw new ReviewError('Esta revisión no está abierta para nuevas reservas.');
  const slot = await pb.collection('review_slots').getOne<ReviewSlot>(slotId);
  if (slot.review !== review.id || !slot.active || !course.teachers?.includes(slot.teacher) || Date.parse(slot.startsAt) <= Date.now()) throw new ReviewError('El turno ya no está disponible.');
  const existing = await pb.collection('review_bookings').getList<ReviewBooking>(1, 1, { filter: pb.filter('review = {:review} && student = {:student} && (status = "reserved" || status = "passed")', { review: review.id, student: pb.authStore.record!.id }) });
  if (existing.items[0]?.status === 'passed') throw new ReviewError('Ya aprobaste esta revisión.');
  if (existing.items.length) throw new ReviewError('Ya tenés un turno reservado o pendiente de evaluación para esta revisión.');
  const batch = guard(pb, review);
  batch.collection('review_bookings').create({ review: review.id, slot: slot.id, student: pb.authStore.record!.id, status: 'reserved' });
  await commit(batch);
}

export async function cancelReviewBooking(pb: PocketBase, courseId: string, reviewId: string, bookingId: string, mode: ReviewMode) {
  const { review } = await scopedReview(pb, courseId, reviewId, mode);
  const booking = await pb.collection('review_bookings').getOne<ReviewBooking>(bookingId);
  if (booking.review !== review.id || (mode === 'student' && booking.student !== pb.authStore.record!.id)) throw new ReviewError('No tenés acceso a esta reserva.');
  if (booking.status !== 'reserved') throw new ReviewError('La reserva ya no está pendiente.');
  const slot = await pb.collection('review_slots').getOne<ReviewSlot>(booking.slot);
  if (Date.parse(slot.startsAt) <= Date.now()) throw new ReviewError('Sólo se puede cancelar antes del inicio del turno.');
  const batch = guard(pb, review);
  batch.collection('review_bookings').update(booking.id, { status: 'cancelled' });
  await commit(batch);
}

export async function evaluateReviewBooking(pb: PocketBase, courseId: string, reviewId: string, bookingId: string, input: unknown) {
  const { review } = await scopedReview(pb, courseId, reviewId, 'teacher');
  const data = reviewEvaluationSchema.parse(input);
  const booking = await pb.collection('review_bookings').getOne<ReviewBooking>(bookingId);
  if (booking.review !== review.id || booking.status !== 'reserved') throw new ReviewError('La reserva no está pendiente de evaluación en esta revisión.');
  const slot = await pb.collection('review_slots').getOne<ReviewSlot>(booking.slot);
  if (Date.parse(slot.endsAt) > Date.now()) throw new ReviewError('La evaluación se registra después de finalizar el turno.');
  const batch = guard(pb, review);
  batch.collection('review_bookings').update(booking.id, { ...data, evaluatedBy: pb.authStore.record!.id });
  await commit(batch);
}
