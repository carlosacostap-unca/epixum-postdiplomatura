import assert from 'node:assert/strict';
import test from 'node:test';
import { applyReviewAppointmentsSchema as applySchema, applyReviewBookingMessageSchema, reviewRules, reviewBookingNotesRules, orderedReviewBookingRule } from './review-appointments-schema.mjs';
const applyReviewAppointmentsSchema = pb => applySchema(pb, 'a'.repeat(64));

function fixture() {
  const state = new Map([
    ['courses', { id: 'courses', fields: [{ id: 'old-title', name: 'title', type: 'text' }], indexes: ['CREATE INDEX old_course_title ON courses (title)'] }],
    ['users', { id: 'users', fields: [] }],
  ]);
  let settings = { batch: { enabled: false, maxRequests: 50, timeout: 8, maxBodySize: 5000000 } };
  const pb = {
    collections: {
      async getOne(name) { if (!state.has(name)) throw { status: 404 }; return structuredClone(state.get(name)); },
      async create(data) { const value = { ...structuredClone(data), id: data.name }; state.set(data.name, value); return value; },
      async update(id, data) { const value = { ...state.get(id), ...structuredClone(data) }; state.set(id, value); return value; },
    },
    settings: { async getAll() { return structuredClone(settings); }, async update(data) { settings = structuredClone(data); } },
  };
  return { pb, state };
}
test('migración repetible sin escrituras de registros ni pérdida de campos, índices o ajustes', async () => {
  const { pb, state } = fixture();
  await applyReviewAppointmentsSchema(pb);
  const snapshot = structuredClone(state);
  await applyReviewAppointmentsSchema(pb);
  assert.deepEqual(state, snapshot);
  assert.equal(state.get('courses').fields.find(f => f.name === 'title').id, 'old-title');
  assert.deepEqual(state.get('courses').indexes, ['CREATE INDEX old_course_title ON courses (title)']);
  assert.deepEqual((await pb.settings.getAll()).batch, { enabled: true, maxRequests: 200, timeout: 8, maxBodySize: 5000000 });
});
test('conserva un límite de lotes superior ya configurado', async () => {
  const { pb } = fixture();
  await pb.settings.update({ batch: { enabled: true, maxRequests: 300, timeout: 10 } });
  await applyReviewAppointmentsSchema(pb);
  assert.equal((await pb.settings.getAll()).batch.maxRequests, 300);
});

test('el mensaje previo es opcional y solamente los docentes pueden modificarlo', async () => {
  const { pb, state } = fixture();
  await applyReviewAppointmentsSchema(pb);
  const field = state.get('course_reviews').fields.find(f => f.name === 'bookingMessage');
  assert.equal(field.type, 'text');
  assert.equal(field.max, 4000);
  assert.equal(field.required, false);
  assert.match(reviewRules.reviews.updateRule, /@request.body.bookingMessage:changed = false/);
});

test('la migración incremental conserva reglas existentes y es repetible', async () => {
  const { pb, state } = fixture();
  await applyReviewAppointmentsSchema(pb);
  await pb.collections.update('course_reviews', { updateRule: '@request.auth.id != "" && course.reviewsEnabled = true' });
  const priorReadRule = state.get('course_reviews').viewRule;
  await applyReviewBookingMessageSchema(pb);
  const snapshot = structuredClone(state);
  await applyReviewBookingMessageSchema(pb);
  assert.deepEqual(state, snapshot);
  assert.equal(state.get('course_reviews').viewRule, priorReadRule);
  assert.match(state.get('course_reviews').updateRule, /^\(@request.auth.id != "" && course.reviewsEnabled = true\)/);
  assert.match(state.get('course_reviews').updateRule, /@request.body.bookingMessage:changed = false/);
});

test('la asignación ordenada requiere la capacidad del servidor y no puede desactivarla un alumno', async () => {
  const { pb, state } = fixture();
  await applyReviewAppointmentsSchema(pb);
  assert.equal(state.get('course_reviews').fields.find(f => f.name === 'orderedBooking').type, 'bool');
  assert.equal(state.get('review_bookings').createRule, orderedReviewBookingRule('a'.repeat(64)));
  assert.match(reviewRules.reviews.updateRule, /@request.body.orderedBooking:changed = false/);
});

test('las notas se almacenan aparte con lectura docente, una por reserva y sin modificación', async () => {
  const { pb, state } = fixture();
  await applyReviewAppointmentsSchema(pb);
  const notes = state.get('review_booking_notes');
  assert.equal(notes.fields.find(f => f.name === 'booking').collectionId, 'review_bookings');
  assert.equal(notes.fields.find(f => f.name === 'notes').max, 8000);
  assert.ok(notes.indexes.some(index => index.includes('UNIQUE') && index.includes('(booking)')));
  assert.equal(state.get('review_bookings').fields.some(f => f.name === 'teacherNotes'), false);
  assert.match(reviewBookingNotesRules.viewRule, /booking.review.course.teachers.id \?= @request.auth.id/);
  assert.doesNotMatch(reviewBookingNotesRules.listRule, /course_enrollments/);
  assert.equal(notes.updateRule, null);
  assert.equal(notes.deleteRule, null);
});

test('incluye publicación programada y protege lecturas y reservas relacionadas', async () => {
  const { pb, state } = fixture();
  await applyReviewAppointmentsSchema(pb);
  const fields = state.get('course_reviews').fields;
  assert.deepEqual(fields.find(f => f.name === 'publicationStatus').values, ['draft', 'published', 'scheduled']);
  assert.equal(fields.find(f => f.name === 'publishAt').type, 'date');
  for (const rules of Object.values(reviewRules)) {
    assert.match(rules.listRule, /publicationStatus/);
    assert.match(rules.viewRule, /publishAt <= @now/);
  }
  assert.match(reviewRules.reviews.updateRule, /@request.body.publicationStatus:changed = false/);
  assert.match(reviewRules.reviews.updateRule, /@request.body.publishAt:changed = false/);
  assert.match(reviewRules.bookings.createRule, /review.publishAt <= @now/);
});
test('un error de lectura no crea colecciones de reemplazo', async () => {
  const { pb, state } = fixture(); const get = pb.collections.getOne;
  pb.collections.getOne = async name => { if (name === 'course_reviews') throw { status: 500 }; return get(name); };
  await assert.rejects(applyReviewAppointmentsSchema(pb), e => e.status === 500);
  assert.equal(state.has('course_reviews'), false);
});
