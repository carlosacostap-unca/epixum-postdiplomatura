// @vitest-environment node
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { createReview, updateReview, saveReviewBlock, reserveReviewSlot, cancelReviewBooking, evaluateReviewBooking, removeReviewBlock, requireReviewCourse } from './review-appointments-service';
import type { Review, ReviewSlot, ReviewBlock, ReviewBooking } from './review-appointments';

describe.skipIf(process.env.REVIEWS_INTEGRATION !== '1')('revisiones en PocketBase real', () => {
  it('agenda, permisos, carreras, cancelación, evaluación, reintento y aprobación', async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    const admin = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL); admin.autoCancellation(false);
    await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL!, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD!);
    const created: { collection: string; id: string }[] = [];
    const create = async (collection: string, data: object) => {
      const record = await admin.collection(collection).create(data); created.push({ collection, id: record.id }); return record;
    };
    const user = async (name: string) => {
      const password = `Review-${randomUUID()}!`;
      const record = await create('users', { email: `${randomUUID()}@example.invalid`, name, role: 'estudiante', verified: true, password, passwordConfirm: password });
      const pb = new PocketBase(admin.baseURL); pb.autoCancellation(false); await pb.collection('users').authWithPassword(record.email, password);
      return { id: record.id, pb };
    };
    try {
      const teacher = await user('Docente revisión'); const peer = await user('Otro docente');
      const student = await user('Alumna revisión'); const other = await user('Otra alumna'); const outsider = await user('Sin matrícula');
      const course = await create('courses', { title: 'Prueba temporal de revisiones', teachers: [teacher.id, peer.id], status: 'borrador', reviewsEnabled: true });
      const enrollment = await create('course_enrollments', { course: course.id, student: student.id });
      await create('course_enrollments', { course: course.id, student: other.id });
      const input = { number: 1, title: 'Primera revisión', instructions: 'Presentar avances', open: true };
      const review = await createReview(teacher.pb, course.id, input);
      const otherCourse = await create('courses', { title: 'Otro curso temporal', teachers: [teacher.id], status: 'borrador', reviewsEnabled: true });
      await expect(updateReview(teacher.pb, otherCourse.id, review.id, review.revision, input)).rejects.toThrow('pertenece');
      const fresh = () => teacher.pb.collection('course_reviews').getOne<Review>(review.id);
      const slots = () => teacher.pb.collection('review_slots').getFullList<ReviewSlot>({ filter: `review = "${review.id}" && active = true`, sort: 'startsAt' });
      const bookings = (pb: PocketBase) => pb.collection('review_bookings').getFullList<ReviewBooking>({ filter: `review = "${review.id}"`, sort: 'created' });
      await expect(createReview(student.pb, course.id, { ...input, number: 2 })).rejects.toThrow();
      await expect(createReview(teacher.pb, course.id, input)).rejects.toThrow();
      await expect(requireReviewCourse(outsider.pb, course.id, 'student')).rejects.toThrow();
      await expect(teacher.pb.collection('courses').update(course.id, { reviewsEnabled: false })).rejects.toBeDefined();
      const date = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
      const blockInput = { teacher: peer.id, date, start: '18:00', end: '19:00', duration: 15, breakEvery: 2, breakMinutes: 10 };
      await expect(saveReviewBlock(teacher.pb, course.id, review.id, review.revision, null, { ...blockInput, teacher: outsider.id })).rejects.toThrow();
      await saveReviewBlock(teacher.pb, course.id, review.id, review.revision, null, blockInput);
      let available = await slots(); expect(available).toHaveLength(3);
      const foreignReview = await createReview(teacher.pb, otherCourse.id, input);
      await create('course_enrollments', { course: otherCourse.id, student: student.id });
      await expect(student.pb.collection('review_bookings').create({ review: foreignReview.id, slot: available[0].id, student: student.id, status: 'reserved' })).rejects.toBeDefined();
      await expect(student.pb.collection('review_bookings').create({ review: review.id, slot: available[0].id, student: other.id, status: 'reserved' })).rejects.toBeDefined();
      const block = await teacher.pb.collection('review_blocks').getOne<ReviewBlock>(available[0].block);
      await expect(saveReviewBlock(peer.pb, course.id, review.id, (await fresh()).revision, null, blockInput)).rejects.toThrow('superpuesta');
      // Two students competing for one slot; exactly one persists.
      const race = await Promise.allSettled([reserveReviewSlot(student.pb, course.id, review.id, available[0].id), reserveReviewSlot(other.pb, course.id, review.id, available[0].id)]);
      expect(race.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      const winning = (await bookings(teacher.pb))[0];
      const winner = winning.student === student.id ? student : other;
      const loser = winning.student === student.id ? other : student;
      expect(await bookings(loser.pb)).toHaveLength(0);
      await expect(loser.pb.collection('review_bookings').getOne(winning.id)).rejects.toBeDefined();
      await expect(outsider.pb.collection('review_slots').getOne(available[0].id)).rejects.toBeDefined();
      await expect(evaluateReviewBooking(peer.pb, course.id, review.id, winning.id, { attendance: 'present', status: 'passed', feedback: '' })).rejects.toThrow('después');
      await expect(saveReviewBlock(peer.pb, course.id, review.id, (await fresh()).revision, block.id, { ...blockInput, end: '20:00' })).rejects.toThrow('reservas');
      await expect(peer.pb.collection('review_slots').update(available[0].id, { active: false })).rejects.toBeDefined();
      await expect(peer.pb.collection('review_blocks').update(block.id, { active: false })).rejects.toBeDefined();
      // The unique constraint must also hold when bypassing service prechecks.
      await expect(winner.pb.collection('review_bookings').create({ review: review.id, slot: available[1].id, student: winner.id, status: 'reserved' })).rejects.toBeDefined();
      await expect(winner.pb.collection('review_bookings').update(winning.id, { status: 'passed', attendance: 'present', evaluatedBy: peer.id })).rejects.toBeDefined();
      await cancelReviewBooking(winner.pb, course.id, review.id, winning.id, 'student');
      await saveReviewBlock(peer.pb, course.id, review.id, (await fresh()).revision, block.id, { ...blockInput, end: '19:30' });
      available = await slots(); expect(available.length).toBeGreaterThan(3);
      expect((await bookings(winner.pb))[0].status).toBe('cancelled');
      // Same student racing different slots still gets only one pending reservation.
      const ownRace = await Promise.allSettled([reserveReviewSlot(winner.pb, course.id, review.id, available[0].id), reserveReviewSlot(winner.pb, course.id, review.id, available[1].id)]);
      expect(ownRace.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      const attempt = (await bookings(winner.pb)).find(b => b.status === 'reserved')!;
      const past = { startsAt: new Date(Date.now() - 3600000).toISOString(), endsAt: new Date(Date.now() - 1800000).toISOString() };
      await admin.collection('review_slots').update(attempt.slot, past);
      await expect(cancelReviewBooking(winner.pb, course.id, review.id, attempt.id, 'student')).rejects.toThrow('antes');
      await expect(winner.pb.collection('review_bookings').update(attempt.id, { status: 'cancelled' })).rejects.toBeDefined();
      await expect(reserveReviewSlot(winner.pb, course.id, review.id, available[2].id)).rejects.toThrow('pendiente');
      await evaluateReviewBooking(peer.pb, course.id, review.id, attempt.id, { attendance: 'present', status: 'not_passed', feedback: 'Revisar fundamentos.' });
      await reserveReviewSlot(winner.pb, course.id, review.id, available[2].id);
      const retry = (await bookings(winner.pb)).find(b => b.status === 'reserved')!;
      await admin.collection('review_slots').update(retry.slot, past);
      await evaluateReviewBooking(teacher.pb, course.id, review.id, retry.id, { attendance: 'absent', status: 'not_passed', feedback: 'No asistió.' });
      await reserveReviewSlot(winner.pb, course.id, review.id, available[3].id);
      const final = (await bookings(winner.pb)).find(b => b.status === 'reserved')!;
      await admin.collection('review_slots').update(final.slot, past);
      await evaluateReviewBooking(peer.pb, course.id, review.id, final.id, { attendance: 'present', status: 'passed', feedback: 'Objetivo alcanzado.' });
      const stillFree = available.slice(0, 2).find(s => s.id !== attempt.slot)!;
      await expect(reserveReviewSlot(winner.pb, course.id, review.id, stillFree.id)).rejects.toThrow('aprobaste');
      await expect(winner.pb.collection('review_bookings').create({ review: review.id, slot: stillFree.id, student: winner.id, status: 'reserved' })).rejects.toBeDefined();
      expect((await bookings(winner.pb)).map(b => b.status)).toEqual(['cancelled', 'not_passed', 'not_passed', 'passed']);
      await expect(evaluateReviewBooking(peer.pb, course.id, review.id, final.id, { attendance: 'present', status: 'not_passed', feedback: 'Cambiar' })).rejects.toThrow();
      // Independent review, closure and removal of a free range.
      const second = await createReview(peer.pb, course.id, { ...input, number: 2 });
      await saveReviewBlock(peer.pb, course.id, second.id, second.revision, null, blockInput);
      const secondSlots = await peer.pb.collection('review_slots').getFullList<ReviewSlot>({ filter: `review = "${second.id}"` });
      let secondFresh = await peer.pb.collection('course_reviews').getOne<Review>(second.id);
      await updateReview(peer.pb, course.id, second.id, secondFresh.revision, { ...input, number: 2, open: false });
      await expect(reserveReviewSlot(winner.pb, course.id, second.id, secondSlots[0].id)).rejects.toThrow('abierta');
      secondFresh = await peer.pb.collection('course_reviews').getOne<Review>(second.id);
      await removeReviewBlock(teacher.pb, course.id, second.id, secondFresh.revision, secondSlots[0].block);
      expect((await peer.pb.collection('review_slots').getOne<ReviewSlot>(secondSlots[0].id)).active).toBe(false);
      await admin.collection('course_enrollments').delete(enrollment.id);
      await expect(requireReviewCourse(student.pb, course.id, 'student')).rejects.toThrow();
      await admin.collection('courses').update(course.id, { reviewsEnabled: false });
      await expect(requireReviewCourse(teacher.pb, course.id, 'teacher')).rejects.toThrow('habilitadas');
      expect((await bookings(teacher.pb))).toHaveLength(0);
    } finally {
      const failures: string[] = [];
      for (const record of created.reverse()) {
        try { await admin.collection(record.collection).delete(record.id); } catch (e) { if ((e as { status?: number }).status !== 404) failures.push(record.collection + '/' + record.id); }
      }
      expect(failures, 'Limpieza de datos temporales').toEqual([]);
    }
  }, 120000);
});
