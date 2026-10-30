import assert from 'node:assert/strict';
import test from 'node:test';
import { applyReviewEvaluationTimingSchema } from './review-evaluation-timing-schema.mjs';
import { reviewRules, reviewBookingNotesRules } from './review-appointments-schema.mjs';

function fixture() {
  const state = new Map([
    ['review_bookings', { id: 'review_bookings', updateRule: `(${reviewRules.bookings.updateRule.replace('slot.startsAt <= @now', 'slot.endsAt <= @now')}) && custom = true`, createRule: 'ordered-bookings', fields: ['existing'], indexes: ['unique-booking'] }],
    ['review_booking_notes', { id: 'review_booking_notes', createRule: reviewBookingNotesRules.createRule.replace('booking.slot.startsAt <= @now', 'booking.slot.endsAt <= @now'), listRule: 'private-teacher-notes', updateRule: null }],
  ]);
  const writes = [];
  const pb = { collections: {
    getOne: async name => structuredClone(state.get(name)),
    update: async (id, patch) => { writes.push({ id, patch }); state.set(id, { ...state.get(id), ...patch }); },
  } };
  return { pb, state, writes };
}

test('migra solo los dos límites y conserva permisos, condiciones adicionales y metadatos', async () => {
  const f = fixture(); const prior = structuredClone(f.state);
  await applyReviewEvaluationTimingSchema(f.pb);
  assert.equal(f.writes.length, 2);
  for (const [name, field, previous, next] of [
    ['review_bookings', 'updateRule', 'slot.endsAt <= @now', 'slot.startsAt <= @now'],
    ['review_booking_notes', 'createRule', 'booking.slot.endsAt <= @now', 'booking.slot.startsAt <= @now'],
  ]) {
    assert.deepEqual(f.state.get(name), { ...prior.get(name), [field]: prior.get(name)[field].replace(previous, next) });
  }
  assert.match(f.state.get('review_bookings').updateRule, /slot.startsAt > @now/);
});

test('repetir la migración no vuelve a escribir', async () => {
  const f = fixture(); await applyReviewEvaluationTimingSchema(f.pb);
  const snapshot = structuredClone(f.state); f.writes.length = 0;
  await applyReviewEvaluationTimingSchema(f.pb);
  assert.deepEqual(f.state, snapshot); assert.equal(f.writes.length, 0);
});

test('permite reanudar una aplicación parcial sin reescribir la regla ya migrada', async () => {
  const f = fixture();
  f.state.get('review_bookings').updateRule = reviewRules.bookings.updateRule;
  await applyReviewEvaluationTimingSchema(f.pb);
  assert.deepEqual(f.writes.map(w => w.id), ['review_booking_notes']);
});

for (const rule of [null, '', 'unrecognized-rule', 'booking.slot.endsAt <= @now && booking.slot.endsAt <= @now']) {
  test(`rechaza reglas inesperadas antes de cualquier escritura: ${rule}`, async () => {
    const f = fixture(); f.state.get('review_booking_notes').createRule = rule;
    await assert.rejects(applyReviewEvaluationTimingSchema(f.pb), /inesperada/);
    assert.equal(f.writes.length, 0);
  });
}
