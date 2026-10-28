// @vitest-environment node
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { createReview, saveReviewBlock, reserveReviewBlock, rescheduleReviewBlock } from './review-appointments-service';
import type { Review, ReviewBlock, ReviewSlot, ReviewBooking } from './review-appointments';

describe.skipIf(process.env.REVIEWS_INTEGRATION !== '1')('reprogramación en PocketBase real con datos temporales', () => {
  it('conserva reservas, horarios e identidad y rechaza escrituras directas, alumnos y versiones desactualizadas', async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    const admin = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL); admin.autoCancellation(false);
    await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD!);
    const created: { collection: string; id: string }[] = [];
    async function create(collection: string, data: object) {
      const record = await admin.collection(collection).create(data); created.push({ collection, id: record.id }); return record;
    }
    async function user() {
      const password = `Review-${randomUUID()}!`;
      const record = await create('users', { email: `${randomUUID()}@example.invalid`, name: 'Prueba temporal de reprogramación', role: 'estudiante', verified: true, password, passwordConfirm: password });
      const pb = new PocketBase(admin.baseURL); pb.autoCancellation(false);
      await pb.collection('users').authWithPassword(record.email, password);
      return { pb, id: record.id };
    }
    try {
      const teacher = await user(); const student = await user();
      const course = await create('courses', { title: 'Prueba temporal de reprogramación', teachers: [teacher.id], status: 'borrador', reviewsEnabled: true });
      await create('course_enrollments', { course: course.id, student: student.id });
      const review = await createReview(teacher.pb, course.id, { number: 1, title: 'Reprogramación temporal', instructions: '', open: true, publicationStatus: 'published' });
      const date = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);
      const nextDate = new Date(Date.now() + 86400000 * 8).toISOString().slice(0, 10);
      const fresh = () => teacher.pb.collection('course_reviews').getOne<Review>(review.id);
      await saveReviewBlock(teacher.pb, course.id, review.id, (await fresh()).revision, null, { teacher: teacher.id, date, start: '15:00', end: '17:00', duration: 15, breakEvery: 2, breakMinutes: 10 });
      const slots = await teacher.pb.collection('review_slots').getFullList<ReviewSlot>({ filter: `review = "${review.id}"`, sort: 'startsAt,id' });
      const block = await teacher.pb.collection('review_blocks').getOne<ReviewBlock>(slots[0].block);
      await reserveReviewBlock(student.pb, course.id, review.id, block.id);
      const booking = (await student.pb.collection('review_bookings').getFullList<ReviewBooking>({ filter: `review = "${review.id}"` }))[0];
      const revision = (await fresh()).revision;
      await expect(teacher.pb.collection('review_blocks').update(block.id, { date: nextDate })).rejects.toBeDefined();
      await expect(teacher.pb.collection('review_slots').update(booking.slot, { startsAt: new Date(Date.parse(slots[0].startsAt) + 86400000).toISOString() })).rejects.toBeDefined();
      await expect(rescheduleReviewBlock(student.pb, course.id, review.id, revision, block.id, nextDate)).rejects.toThrow('docentes');
      await rescheduleReviewBlock(teacher.pb, course.id, review.id, revision, block.id, nextDate);
      const movedBlock = await student.pb.collection('review_blocks').getOne<ReviewBlock>(block.id);
      expect(movedBlock).toMatchObject({ date: nextDate, teacher: block.teacher, start: block.start, end: block.end, duration: block.duration, breakEvery: block.breakEvery, breakMinutes: block.breakMinutes });
      expect(movedBlock).not.toHaveProperty('rescheduleKey');
      const movedSlots = await student.pb.collection('review_slots').getFullList<ReviewSlot>({ filter: `review = "${review.id}"`, sort: 'startsAt,id' });
      expect(movedSlots.map(slot => slot.id)).toEqual(slots.map(slot => slot.id));
      movedSlots.forEach((slot, index) => {
        expect(Date.parse(slot.startsAt) - Date.parse(slots[index].startsAt)).toBe(86400000);
        expect(Date.parse(slot.endsAt) - Date.parse(slots[index].endsAt)).toBe(86400000);
        expect(slot).not.toHaveProperty('rescheduleKey');
      });
      expect(await student.pb.collection('review_bookings').getOne(booking.id)).toMatchObject({ slot: booking.slot, student: student.id, status: 'reserved' });
      await expect(rescheduleReviewBlock(teacher.pb, course.id, review.id, revision, block.id, date)).rejects.toThrow('cambió');
      // A second batch from the same revision must fail without moving any slots twice.
      const current = (await fresh()).revision;
      const results = await Promise.allSettled([
        rescheduleReviewBlock(teacher.pb, course.id, review.id, current, block.id, date),
        rescheduleReviewBlock(teacher.pb, course.id, review.id, current, block.id, date),
      ]);
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      const restored = await teacher.pb.collection('review_slots').getFullList<ReviewSlot>({ filter: `review = "${review.id}"`, sort: 'startsAt,id' });
      expect(restored.map(slot => [slot.id, slot.startsAt, slot.endsAt])).toEqual(slots.map(slot => [slot.id, slot.startsAt, slot.endsAt]));
    } finally {
      const failures: string[] = [];
      for (const record of created.reverse()) {
        try { await admin.collection(record.collection).delete(record.id); } catch (error) { if ((error as { status?: number }).status !== 404) failures.push(`${record.collection}/${record.id}`); }
      }
      expect(failures, 'Limpieza de datos temporales').toEqual([]);
    }
  }, 120000);
});
