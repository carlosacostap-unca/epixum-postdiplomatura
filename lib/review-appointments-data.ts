import 'server-only';
import { createServerClient } from './pocketbase-server';
import { createServiceClient } from './pocketbase-service';
import { isPublicationVisible } from './publication';
import { ensureReviewAllocationKey, requireReviewCourse, type ReviewMode } from './review-appointments-service';
import { ReviewError, type Review, type ReviewBlock, type ReviewSlot, type ReviewBooking, type ReviewBookingNote, type ReviewBlockMeeting } from './review-appointments';

export async function getCourseReviews(courseId: string, mode: ReviewMode) {
  const pb = await createServerClient();
  const course = await requireReviewCourse(pb, courseId, mode);
  const allReviews = await pb.collection('course_reviews').getFullList<Review>({ filter: pb.filter('course = {:course}', { course: courseId }), sort: 'number' });
  const reviews = mode === 'student' ? allReviews.filter(review => isPublicationVisible(review)) : allReviews;
  const bookings = mode === 'student' ? await pb.collection('review_bookings').getFullList<ReviewBooking>({ filter: pb.filter('review.course = {:course} && student = {:student}', { course: courseId, student: pb.authStore.record!.id }), fields: 'review,status' }) : [];
  return { course, reviews, progress: reviews.map(r => ({ id: r.id, status: bookings.some(b => b.review === r.id && b.status === 'passed') ? 'passed' : bookings.some(b => b.review === r.id && b.status === 'reserved') ? 'reserved' : 'available' })) };
}

export async function getReviewAgenda(courseId: string, reviewId: string, mode: ReviewMode) {
  const pb = await createServerClient();
  const course = await requireReviewCourse(pb, courseId, mode);
  const review = await pb.collection('course_reviews').getOne<Review>(reviewId);
  if (review.course !== courseId) throw new ReviewError('La revisión no pertenece al curso.');
  if (mode === 'student' && !isPublicationVisible(review)) throw new ReviewError('Esta revisión todavía no está publicada.');
  const service = await createServiceClient();
  if (mode === 'student') await ensureReviewAllocationKey(service, review.id);
  const filter = pb.filter('review = {:review}', { review: review.id });
  const [blocks, slots, bookings, meetings] = await Promise.all([
    pb.collection('review_blocks').getFullList<ReviewBlock>({ filter, sort: 'startsAt' }),
    pb.collection('review_slots').getFullList<ReviewSlot>({ filter, sort: 'startsAt' }),
    pb.collection('review_bookings').getFullList<ReviewBooking>({ filter, sort: '-created,-id' }),
    pb.collection('review_block_meetings').getFullList<ReviewBlockMeeting>({ filter: pb.filter('block.review = {:review}', { review: review.id }), fields: 'block,url' }),
  ]);
  // Private notes are fetched only with the assigned teacher's authenticated client.
  const notes = mode === 'teacher' ? await pb.collection('review_booking_notes').getFullList<ReviewBookingNote>({
    filter: pb.filter('booking.review = {:review}', { review: review.id }), fields: 'booking,notes',
  }) : [];
  const teacherNotes = Object.fromEntries(notes.map(note => [note.booking, note.notes]));
  // Read only after authorizing the course; never expose other students or feedback.
  const occupied = mode === 'teacher' ? bookings.filter(b => b.status !== 'cancelled') : await service.collection('review_bookings').getFullList<{ slot: string }>({ filter: `${filter} && status != "cancelled"`, fields: 'slot' });
  const peopleIds = mode === 'teacher' ? [...new Set([...(course.teachers || []), ...slots.map(s => s.teacher), ...bookings.map(b => b.student)])] : [];
  const people = peopleIds.length ? await service.collection('users').getFullList<{ id: string; name: string; firstName?: string; lastName?: string }>({ filter: peopleIds.map(id => service.filter('id = {:id}', { id })).join(' || '), fields: 'id,name,firstName,lastName' }) : [];
  const names = Object.fromEntries(people.map(p => [p.id, [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || 'Participante']));
  const now = Date.now();
  const availability = slots.map(slot => ({ ...slot, occupied: occupied.some(booking => booking.slot === slot.id) }));
  const ownSlots = new Set(bookings.map(booking => booking.slot));
  const meetingByBlock = Object.fromEntries(meetings.map(meeting => [meeting.block, meeting.url]));
  const meetingLinks = Object.fromEntries(bookings.filter(booking => booking.status === 'reserved').flatMap(booking => {
    const slot = slots.find(slot => slot.id === booking.slot);
    const url = slot && meetingByBlock[slot.block];
    return url ? [[booking.id, url]] : [];
  }));
  return {
    course: mode === 'teacher' ? course : { ...course, teachers: [] }, review,
    blocks: blocks.filter(block => block.active && (mode === 'teacher' || course.teachers?.includes(block.teacher))).map(block => ({
      ...block, teacher: mode === 'teacher' ? block.teacher : '', meetUrl: mode === 'teacher' ? meetingByBlock[block.id] || '' : '',
      availableSlots: availability.filter(slot => slot.block === block.id && slot.active && !slot.occupied && Date.parse(slot.startsAt) > now && course.teachers?.includes(slot.teacher)).length,
    })),
    slots: mode === 'teacher' ? availability : availability.filter(slot => ownSlots.has(slot.id)).map(slot => ({ ...slot, teacher: '' })),
    bookings, meetingLinks, ...(mode === 'teacher' ? { teacherNotes } : {}), names, now,
    teachers: mode === 'teacher' ? (course.teachers || []).map(id => ({ id, name: names[id] || 'Docente' })) : [],
  };
}
