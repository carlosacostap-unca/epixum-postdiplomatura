import 'server-only';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { requireReviewCourse, type ReviewMode } from './review-appointments-service';
import { ReviewError, type Review, type ReviewBlock, type ReviewSlot, type ReviewBooking } from './review-appointments';

export async function getCourseReviews(courseId: string, mode: ReviewMode) {
  const pb = await createServerClient();
  const course = await requireReviewCourse(pb, courseId, mode);
  const reviews = await pb.collection('course_reviews').getFullList<Review>({ filter: pb.filter('course = {:course}', { course: courseId }), sort: 'number' });
  const bookings = mode === 'student' ? await pb.collection('review_bookings').getFullList<ReviewBooking>({ filter: pb.filter('review.course = {:course} && student = {:student}', { course: courseId, student: pb.authStore.record!.id }), fields: 'review,status' }) : [];
  return { course, reviews, progress: reviews.map(r => ({ id: r.id, status: bookings.some(b => b.review === r.id && b.status === 'passed') ? 'passed' : bookings.some(b => b.review === r.id && b.status === 'reserved') ? 'reserved' : 'available' })) };
}

export async function getReviewAgenda(courseId: string, reviewId: string, mode: ReviewMode) {
  const pb = await createServerClient();
  const course = await requireReviewCourse(pb, courseId, mode);
  const review = await pb.collection('course_reviews').getOne<Review>(reviewId);
  if (review.course !== courseId) throw new ReviewError('La revisión no pertenece al curso.');
  const filter = pb.filter('review = {:review}', { review: review.id });
  const [blocks, slots, bookings] = await Promise.all([
    pb.collection('review_blocks').getFullList<ReviewBlock>({ filter, sort: 'startsAt' }),
    pb.collection('review_slots').getFullList<ReviewSlot>({ filter, sort: 'startsAt' }),
    pb.collection('review_bookings').getFullList<ReviewBooking>({ filter, sort: '-created,-id' }),
  ]);
  // Read only after authorizing the course; never expose other students or feedback.
  const service = await createServiceClient();
  const occupied = mode === 'teacher' ? bookings.filter(b => b.status !== 'cancelled') : await service.collection('review_bookings').getFullList<{ slot: string }>({ filter: `${filter} && status != "cancelled"`, fields: 'slot' });
  const peopleIds = [...new Set([...(course.teachers || []), ...slots.map(s => s.teacher), ...(mode === 'teacher' ? bookings.map(b => b.student) : [])])];
  const people = peopleIds.length ? await service.collection('users').getFullList<{ id: string; name: string; firstName?: string; lastName?: string }>({ filter: peopleIds.map(id => service.filter('id = {:id}', { id })).join(' || '), fields: 'id,name,firstName,lastName' }) : [];
  const names = Object.fromEntries(people.map(p => [p.id, [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || 'Participante']));
  return {
    course, review, blocks: blocks.filter(b => b.active),
    slots: slots.map(s => ({ ...s, occupied: occupied.some(b => b.slot === s.id) })),
    bookings, names, now: Date.now(),
    teachers: (course.teachers || []).map(id => ({ id, name: names[id] || 'Docente' })),
  };
}
