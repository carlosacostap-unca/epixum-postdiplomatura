import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';
import { visiblePublicationRule, withScheduledPublicationFields } from './publication-fields.mjs';
import { reviewAllocationKey } from '../lib/review-allocation-key.mjs';

const auth = '@request.auth.id != ""';
const teacher = 'course.teachers.id ?= @request.auth.id';
const enrolled = 'course.course_enrollments_via_course.student.id ?= @request.auth.id';
const scope = `${auth} && course.reviewsEnabled = true`;
const member = `${scope} && (${teacher} || (${enrolled} && ${visiblePublicationRule()}))`;
const relatedScope = `${auth} && review.course.reviewsEnabled = true`;
const relatedTeacher = 'review.course.teachers.id ?= @request.auth.id';
const assignedTeacher = '@collection.courses:assigned.id ?= review.course && @collection.courses:assigned.teachers.id ?= teacher';
const relatedEnrolled = 'review.course.course_enrollments_via_course.student.id ?= @request.auth.id';
const relatedMember = `${relatedScope} && (${relatedTeacher} || (${relatedEnrolled} && ${visiblePublicationRule('review.')}))`;
const own = `student = @request.auth.id && ${relatedEnrolled}`;
const unchanged = names => names.map(n => `@request.body.${n}:changed = false`).join(' && ');
const dates = '@request.body.created:isset = false && @request.body.updated:isset = false';
const version = '@request.body.expectedRevision = revision && @request.body.revision:isset = true && @request.body.revision != revision';
const bookingRead = `${relatedScope} && (${relatedTeacher} || (${own} && ${visiblePublicationRule('review.')}))`;
const validPublication = '(publicationStatus = "" || publicationStatus = "draft" || publicationStatus = "published" || (publicationStatus = "scheduled" && publishAt != ""))';
const noteTeacher = `${auth} && booking.review.course.reviewsEnabled = true && booking.review.course.teachers.id ?= @request.auth.id`;

export const reviewBookingNotesRules = {
  listRule: noteTeacher, viewRule: noteTeacher,
  createRule: `${noteTeacher} && author = @request.auth.id && booking.evaluatedBy = @request.auth.id && booking.slot.endsAt <= @now && (booking.status = "passed" || booking.status = "not_passed") && ${dates}`,
  updateRule: null, deleteRule: null,
};

export const reviewRules = {
  reviews: {
    listRule: member, viewRule: member,
    createRule: `${scope} && ${teacher} && ${validPublication} && (publicationStatus != "scheduled" || publishAt > @now) && @request.body.orderedBooking:isset = false && ${dates}`,
    updateRule: `${member} && ${version} && ${validPublication} && ${unchanged(['course', 'number', 'orderedBooking'])} && (${teacher} || (${unchanged(['title', 'instructions', 'bookingMessage', 'open', 'publicationStatus', 'publishAt'])})) && ${dates}`,
    deleteRule: null,
  },
  blocks: {
    listRule: relatedMember, viewRule: relatedMember,
    createRule: `${relatedScope} && ${relatedTeacher} && ${assignedTeacher} && startsAt > @now && endsAt > startsAt && active = true && ${dates}`,
    updateRule: `${relatedScope} && ${relatedTeacher} && startsAt > @now && review_slots_via_block.review_bookings_via_slot.status != "reserved" && ${unchanged(['review'])} && ${dates}`,
    deleteRule: null,
  },
  slots: {
    listRule: relatedMember, viewRule: relatedMember,
    createRule: `${relatedScope} && ${relatedTeacher} && ${assignedTeacher} && block.review = review && block.teacher = teacher && block.active = true && active = true && startsAt >= block.startsAt && endsAt <= block.endsAt && startsAt > @now && endsAt > startsAt && ${dates}`,
    updateRule: `${relatedScope} && ${relatedTeacher} && startsAt > @now && review_bookings_via_slot.status != "reserved" && @request.body.active = false && ${unchanged(['review', 'block', 'teacher', 'startsAt', 'endsAt'])} && ${dates}`,
    deleteRule: null,
  },
  bookings: {
    listRule: bookingRead, viewRule: bookingRead,
    createRule: `${relatedScope} && ${own} && ${visiblePublicationRule('review.')} && review.course.teachers.id != @request.auth.id && review.open = true && review = slot.review && slot.active = true && slot.block.active = true && review.course.teachers.id ?= slot.teacher && slot.startsAt > @now && status = "reserved" && attendance = "" && feedback = "" && evaluatedBy = "" && ${dates}`,
    updateRule: `${relatedScope} && status = "reserved" && ${unchanged(['review', 'slot', 'student'])} && ${dates} && ((((${own} && ${visiblePublicationRule('review.')}) || ${relatedTeacher}) && slot.startsAt > @now && @request.body.status = "cancelled" && ${unchanged(['attendance', 'feedback', 'evaluatedBy'])}) || (${relatedTeacher} && slot.endsAt <= @now && @request.body.evaluatedBy = @request.auth.id && ((@request.body.attendance = "present" && (@request.body.status = "passed" || @request.body.status = "not_passed")) || (@request.body.attendance = "absent" && @request.body.status = "not_passed"))))`,
    deleteRule: null,
  },
};

const timestamps = [{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false }, { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }];
const rel = (name, collectionId) => ({ name, type: 'relation', collectionId, required: true, maxSelect: 1, cascadeDelete: true });
const text = (name, max, required = true) => ({ name, type: 'text', required, max });
const num = (name, min, max) => ({ name, type: 'number', min, max, onlyInt: true });
const date = name => ({ name, type: 'date', required: true });
export const reviewOrderedBookingField = { name: 'orderedBooking', type: 'bool' };
export const reviewBookingMessageField = text('bookingMessage', 4000, false);
export async function applyReviewBookingMessageSchema(pb) {
  const current = await pb.collections.getOne('course_reviews');
  const rules = current.updateRule !== null && !current.updateRule.includes('@request.body.bookingMessage:changed = false')
    ? { updateRule: `(${current.updateRule}) && (${teacher} || @request.body.bookingMessage:changed = false)` } : {};
  return ensure(pb, 'course_reviews', [reviewBookingMessageField], rules);
}
export function orderedReviewBookingRule(allocationKey) {
  if (!/^[a-f0-9]{64}$/.test(allocationKey)) throw new Error('Clave de asignación inválida.');
  return `${reviewRules.bookings.createRule} && (review.orderedBooking != true || @request.body.allocationKey = "${allocationKey}")`;
}

export async function applyReviewBlockBookingSchema(pb, allocationKey = reviewAllocationKey()) {
  await ensure(pb, 'course_reviews', [reviewOrderedBookingField, reviewBookingMessageField], reviewRules.reviews);
  const booking = await pb.collections.getOne('review_bookings');
  await pb.collections.update(booking.id, { createRule: orderedReviewBookingRule(allocationKey) });
}
async function ensure(pb, name, fields, rules = {}, indexes = []) {
  let current;
  try { current = await pb.collections.getOne(name); } catch (error) { if (error.status !== 404) throw error; }
  const merged = [...(current?.fields || [])];
  for (const field of fields) {
    const index = merged.findIndex(f => f.name === field.name);
    if (index < 0) merged.push(field); else merged[index] = { ...merged[index], ...field };
  }
  const data = { fields: merged, ...rules, indexes: [...new Set([...(current?.indexes || []), ...indexes])] };
  return current ? pb.collections.update(current.id, data) : pb.collections.create({ name, type: 'base', ...data });
}

export async function applyReviewBookingNotesSchema(pb) {
  const booking = await pb.collections.getOne('review_bookings');
  const users = await pb.collections.getOne('users');
  return ensure(pb, 'review_booking_notes', [rel('booking', booking.id), text('notes', 8000),
    { ...rel('author', users.id), cascadeDelete: false }, ...timestamps], reviewBookingNotesRules, [
    'CREATE UNIQUE INDEX idx_review_booking_notes_booking ON review_booking_notes (booking)',
  ]);
}

export async function applyReviewAppointmentsSchema(pb, allocationKey = reviewAllocationKey()) {
  const courses = await pb.collections.getOne('courses');
  const users = await pb.collections.getOne('users');
  await ensure(pb, 'courses', [{ name: 'reviewsEnabled', type: 'bool' }], { updateRule: COURSE_UPDATE_RULE });
  // Create related collections locked, then install rules once every relation exists.
  const review = await ensure(pb, 'course_reviews', withScheduledPublicationFields([rel('course', courses.id), num('number', 1, 9999), text('title', 160), text('instructions', 4000, false), reviewBookingMessageField, { name: 'open', type: 'bool' }, reviewOrderedBookingField, { ...text('revision', 24), min: 24, pattern: '^[a-f0-9]{24}$' }, ...timestamps]), {}, [
    'CREATE UNIQUE INDEX idx_course_review_number ON course_reviews (course, number)',
  ]);
  const block = await ensure(pb, 'review_blocks', [rel('review', review.id), rel('teacher', users.id), text('date', 10), text('start', 5), text('end', 5), num('duration', 5, 240), num('breakEvery', 0, 96), num('breakMinutes', 0, 120), date('startsAt'), date('endsAt'), { name: 'active', type: 'bool' }, ...timestamps], {}, [
    'CREATE INDEX idx_review_blocks ON review_blocks (review, startsAt)',
  ]);
  const slot = await ensure(pb, 'review_slots', [rel('review', review.id), rel('block', block.id), rel('teacher', users.id), date('startsAt'), date('endsAt'), { name: 'active', type: 'bool' }, ...timestamps], {}, [
    'CREATE INDEX idx_review_slots ON review_slots (review, startsAt)',
  ]);
  const booking = await ensure(pb, 'review_bookings', [rel('review', review.id), rel('slot', slot.id), rel('student', users.id),
    { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['reserved', 'cancelled', 'not_passed', 'passed'] },
    { name: 'attendance', type: 'select', maxSelect: 1, values: ['present', 'absent'] }, text('feedback', 8000, false),
    { ...rel('evaluatedBy', users.id), required: false, cascadeDelete: false }, ...timestamps], {}, [
    "CREATE UNIQUE INDEX idx_review_booking_slot ON review_bookings (slot) WHERE status != 'cancelled'",
    "CREATE UNIQUE INDEX idx_review_booking_student ON review_bookings (review, student) WHERE status = 'reserved' OR status = 'passed'",
    'CREATE INDEX idx_review_booking_history ON review_bookings (review, student, created)',
  ]);
  for (const [record, rules] of [[review, reviewRules.reviews], [block, reviewRules.blocks], [slot, reviewRules.slots], [booking, { ...reviewRules.bookings, createRule: orderedReviewBookingRule(allocationKey) }]]) await pb.collections.update(record.id, rules);
  await applyReviewBookingNotesSchema(pb);
  const settings = await pb.settings.getAll();
  if (!settings.batch?.enabled || settings.batch.maxRequests < 200) await pb.settings.update({ batch: { ...settings.batch, enabled: true, maxRequests: Math.max(settings.batch?.maxRequests || 0, 200) } });
}
