// @vitest-environment node
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { createReview, updateReview, saveReviewBlock, saveReviewMeeting, reserveReviewBlock, cancelReviewBooking, evaluateReviewBooking, removeReviewBlock, requireReviewCourse } from './review-appointments-service';
import type { Review, ReviewSlot, ReviewBlock, ReviewBooking, ReviewBookingNote, ReviewBlockMeeting } from './review-appointments';

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
      const input = { number: 1, title: 'Primera revisión', instructions: 'Presentar avances', open: true, publicationStatus: 'published' };
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
      // Hidden reviews must protect all related records, including direct API access.
      const hidden = await createReview(teacher.pb, course.id, { number: 3, title: 'En preparación', instructions: 'Privado', open: true });
      expect(hidden.publicationStatus).toBe('draft');
      await saveReviewBlock(teacher.pb, course.id, hidden.id, hidden.revision, null, { ...blockInput, end: '18:30' });
      const hiddenSlots = await teacher.pb.collection('review_slots').getFullList<ReviewSlot>({ filter: `review = "${hidden.id}"` });
      const hiddenFresh = () => teacher.pb.collection('course_reviews').getOne<Review>(hidden.id);
      const checkHidden = async () => {
        for (const [collection, id] of [['course_reviews', hidden.id], ['review_blocks', hiddenSlots[0].block], ['review_slots', hiddenSlots[0].id]]) {
          await expect(student.pb.collection(collection).getOne(id)).rejects.toBeDefined();
          expect((await student.pb.collection(collection).getList(1, 1, { filter: `id = "${id}"` })).totalItems).toBe(0);
        }
        await expect(reserveReviewBlock(student.pb, course.id, hidden.id, hiddenSlots[0].block)).rejects.toBeDefined();
        await expect(student.pb.collection('review_bookings').create({ review: hidden.id, slot: hiddenSlots[0].id, student: student.id, status: 'reserved' })).rejects.toBeDefined();
      };
      await checkHidden();
      const hiddenInput = { ...input, number: 3, title: hidden.title };
      const publishAt = new Date(Date.now() + 3600000).toISOString();
      await updateReview(peer.pb, course.id, hidden.id, (await hiddenFresh()).revision, { ...hiddenInput, publicationStatus: 'scheduled', publishAt });
      await checkHidden();
      // Move only the temporary fixture's publication into the past.
      await admin.collection('course_reviews').update(hidden.id, { publishAt: new Date(Date.now() - 60000).toISOString() });
      expect((await student.pb.collection('course_reviews').getOne(hidden.id)).id).toBe(hidden.id);
      await reserveReviewBlock(student.pb, course.id, hidden.id, hiddenSlots[0].block);
      const hiddenBooking = (await student.pb.collection('review_bookings').getFullList<ReviewBooking>({ filter: `review = "${hidden.id}"` }))[0];
      await expect(student.pb.collection('course_reviews').update(hidden.id, { publicationStatus: 'draft', expectedRevision: (await hiddenFresh()).revision, revision: 'a'.repeat(24) })).rejects.toBeDefined();
      await updateReview(peer.pb, course.id, hidden.id, (await hiddenFresh()).revision, { ...hiddenInput, publicationStatus: 'draft' });
      await expect(student.pb.collection('review_bookings').getOne(hiddenBooking.id)).rejects.toBeDefined();
      await expect(student.pb.collection('review_bookings').update(hiddenBooking.id, { status: 'cancelled' })).rejects.toBeDefined();
      expect((await peer.pb.collection('review_bookings').getOne(hiddenBooking.id)).status).toBe('reserved');
      await updateReview(peer.pb, course.id, hidden.id, (await hiddenFresh()).revision, hiddenInput);
      expect((await student.pb.collection('review_bookings').getOne(hiddenBooking.id)).status).toBe('reserved');
      await cancelReviewBooking(student.pb, course.id, hidden.id, hiddenBooking.id, 'student');
      const third = await user('Otra solicitud de franja');
      await create('course_enrollments', { course: course.id, student: third.id });
      await Promise.all([reserveReviewBlock(student.pb, course.id, hidden.id, hiddenSlots[0].block), reserveReviewBlock(other.pb, course.id, hidden.id, hiddenSlots[0].block)]);
      const filled = await teacher.pb.collection('review_bookings').getFullList<ReviewBooking>({ filter: `review = "${hidden.id}" && status = "reserved"` });
      expect(filled.map(booking => booking.slot).sort()).toEqual(hiddenSlots.map(slot => slot.id).sort());
      await expect(reserveReviewBlock(third.pb, course.id, hidden.id, hiddenSlots[0].block)).rejects.toThrow('no tiene turnos');
      // Cancelling the first allocation makes precisely that gap available next.
      const earliest = filled.find(booking => booking.slot === hiddenSlots.sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0].id)!;
      await cancelReviewBooking(earliest.student === student.id ? student.pb : other.pb, course.id, hidden.id, earliest.id, 'student');
      expect(await reserveReviewBlock(third.pb, course.id, hidden.id, hiddenSlots[0].block)).toBe(earliest.slot);
      await expect(saveReviewBlock(peer.pb, course.id, review.id, (await fresh()).revision, null, blockInput)).rejects.toThrow('superpuesta');
      // Concurrent requests for one range fill the first two slots in order.
      const race = await Promise.allSettled([reserveReviewBlock(student.pb, course.id, review.id, available[0].block), reserveReviewBlock(other.pb, course.id, review.id, available[0].block)]);
      expect(race.filter(r => r.status === 'fulfilled')).toHaveLength(2);
      expect((await bookings(teacher.pb)).map(b => b.slot).sort()).toEqual(available.slice(0, 2).map(s => s.id).sort());
      const winning = (await bookings(teacher.pb))[0];
      const winner = winning.student === student.id ? student : other;
      const loser = winning.student === student.id ? other : student;
      const otherBooking = (await bookings(loser.pb))[0];
      await cancelReviewBooking(loser.pb, course.id, review.id, otherBooking.id, 'student');
      await expect(loser.pb.collection('review_bookings').create({ review: review.id, slot: available[2].id, student: loser.id, status: 'reserved' })).rejects.toBeDefined();
      await expect(loser.pb.collection('review_bookings').create({ review: review.id, slot: available[2].id, student: loser.id, status: 'reserved', allocationKey: 'inventada' })).rejects.toBeDefined();
      await expect(loser.pb.collection('course_reviews').update(review.id, { orderedBooking: false, expectedRevision: (await fresh()).revision, revision: 'a'.repeat(24) })).rejects.toBeDefined();
      await expect(reserveReviewBlock(loser.pb, course.id, review.id, hiddenSlots[0].block)).rejects.toThrow('franja');
      await expect(reserveReviewBlock(loser.pb, course.id, review.id, available[0].id)).rejects.toBeDefined();
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
      // Duplicate requests by the same student still allocate only one slot.
      const ownRace = await Promise.allSettled([reserveReviewBlock(winner.pb, course.id, review.id, available[0].block), reserveReviewBlock(winner.pb, course.id, review.id, available[1].block)]);
      expect(ownRace.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      const attempt = (await bookings(winner.pb)).find(b => b.status === 'reserved')!;
      const past = { startsAt: new Date(Date.now() - 3600000).toISOString(), endsAt: new Date(Date.now() - 1800000).toISOString() };
      await admin.collection('review_slots').update(attempt.slot, past);
      await expect(cancelReviewBooking(winner.pb, course.id, review.id, attempt.id, 'student')).rejects.toThrow('antes');
      await expect(winner.pb.collection('review_bookings').update(attempt.id, { status: 'cancelled' })).rejects.toBeDefined();
      await expect(reserveReviewBlock(winner.pb, course.id, review.id, available[2].block)).rejects.toThrow('pendiente');
      // A failure to save the private note must also roll back the public evaluation.
      const conflictingNote = await admin.collection('review_booking_notes').create({ booking: attempt.id, notes: 'Fixture para provocar conflicto', author: peer.id });
      const revisionBefore = (await fresh()).revision;
      await expect(evaluateReviewBooking(peer.pb, course.id, review.id, attempt.id, { attendance: 'present', status: 'passed', feedback: 'No debe persistir', teacherNotes: 'Nota en conflicto' })).rejects.toThrow('estado cambió');
      expect((await teacher.pb.collection('review_bookings').getOne(attempt.id)).status).toBe('reserved');
      expect((await fresh()).revision).toBe(revisionBefore);
      await admin.collection('review_booking_notes').delete(conflictingNote.id);
      await evaluateReviewBooking(peer.pb, course.id, review.id, attempt.id, { attendance: 'present', status: 'not_passed', feedback: 'Revisar fundamentos.', teacherNotes: 'Seguimiento interno del equipo.' });
      const notes = await teacher.pb.collection('review_booking_notes').getFullList<ReviewBookingNote>({ filter: `booking = "${attempt.id}"` });
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({ notes: 'Seguimiento interno del equipo.', author: peer.id });
      const studentResult = await winner.pb.collection('review_bookings').getOne(attempt.id, { expand: 'review_booking_notes_via_booking' });
      expect(studentResult).toMatchObject({ status: 'not_passed', feedback: 'Revisar fundamentos.' });
      expect(JSON.stringify(studentResult)).not.toContain('Seguimiento interno');
      expect(studentResult.expand?.review_booking_notes_via_booking).toBeUndefined();
      for (const unauthorized of [winner.pb, loser.pb, outsider.pb]) {
        expect((await unauthorized.collection('review_booking_notes').getList(1, 1)).totalItems).toBe(0);
        await expect(unauthorized.collection('review_booking_notes').getOne(notes[0].id)).rejects.toBeDefined();
        await expect(unauthorized.collection('review_booking_notes').create({ booking: attempt.id, notes: 'Intrusión', author: winner.id })).rejects.toBeDefined();
      }
      await expect(teacher.pb.collection('review_booking_notes').update(notes[0].id, { notes: 'Cambiar' })).rejects.toBeDefined();
      await expect(teacher.pb.collection('review_booking_notes').delete(notes[0].id)).rejects.toBeDefined();
      await expect(peer.pb.collection('review_booking_notes').create({ booking: attempt.id, notes: 'Duplicada', author: peer.id })).rejects.toBeDefined();
      await expect(evaluateReviewBooking(peer.pb, course.id, review.id, attempt.id, { attendance: 'present', status: 'passed', feedback: '', teacherNotes: 'Cambiar' })).rejects.toThrow();
      await reserveReviewBlock(winner.pb, course.id, review.id, available[2].block);
      const retry = (await bookings(winner.pb)).find(b => b.status === 'reserved')!;
      await admin.collection('review_slots').update(retry.slot, past);
      await evaluateReviewBooking(teacher.pb, course.id, review.id, retry.id, { attendance: 'absent', status: 'not_passed', feedback: 'No asistió.' });
      await reserveReviewBlock(winner.pb, course.id, review.id, available[3].block);
      const final = (await bookings(winner.pb)).find(b => b.status === 'reserved')!;
      await admin.collection('review_slots').update(final.slot, past);
      await evaluateReviewBooking(peer.pb, course.id, review.id, final.id, { attendance: 'present', status: 'passed', feedback: 'Objetivo alcanzado.' });
      const stillFree = available.slice(0, 2).find(s => s.id !== attempt.slot)!;
      await expect(reserveReviewBlock(winner.pb, course.id, review.id, stillFree.block)).rejects.toThrow('aprobaste');
      await expect(winner.pb.collection('review_bookings').create({ review: review.id, slot: stillFree.id, student: winner.id, status: 'reserved' })).rejects.toBeDefined();
      expect((await bookings(winner.pb)).map(b => b.status)).toEqual(['cancelled', 'not_passed', 'not_passed', 'passed']);
      await expect(evaluateReviewBooking(peer.pb, course.id, review.id, final.id, { attendance: 'present', status: 'not_passed', feedback: 'Cambiar' })).rejects.toThrow();
      // Independent review, closure and removal of a free range.
      const second = await createReview(peer.pb, course.id, { ...input, number: 2 });
      await saveReviewBlock(peer.pb, course.id, second.id, second.revision, null, blockInput);
      const secondSlots = await peer.pb.collection('review_slots').getFullList<ReviewSlot>({ filter: `review = "${second.id}"` });
      let secondFresh = await peer.pb.collection('course_reviews').getOne<Review>(second.id);
      await updateReview(peer.pb, course.id, second.id, secondFresh.revision, { ...input, number: 2, open: false });
      await expect(reserveReviewBlock(winner.pb, course.id, second.id, secondSlots[0].block)).rejects.toThrow('abierta');
      secondFresh = await peer.pb.collection('course_reviews').getOne<Review>(second.id);
      await removeReviewBlock(teacher.pb, course.id, second.id, secondFresh.revision, secondSlots[0].block);
      expect((await peer.pb.collection('review_slots').getOne<ReviewSlot>(secondSlots[0].id)).active).toBe(false);
      // Teachers configure a message; stale or missing acknowledgements cannot reserve.
      const messageInput = { ...input, number: 5, title: 'Con indicaciones', bookingMessage: 'Traé tu proyecto.' };
      const messageReview = await createReview(teacher.pb, course.id, messageInput);
      await saveReviewBlock(peer.pb, course.id, messageReview.id, messageReview.revision, null, blockInput);
      const messageSlot = (await teacher.pb.collection('review_slots').getFullList<ReviewSlot>({ filter: `review = "${messageReview.id}"`, sort: 'startsAt' }))[0];
      const messageFresh = () => teacher.pb.collection('course_reviews').getOne<Review>(messageReview.id);
      expect((await third.pb.collection('course_reviews').getOne(messageReview.id)).bookingMessage).toBe('Traé tu proyecto.');
      await expect(reserveReviewBlock(third.pb, course.id, messageReview.id, messageSlot.block)).rejects.toThrow('indicaciones');
      await updateReview(peer.pb, course.id, messageReview.id, (await messageFresh()).revision, { ...messageInput, bookingMessage: 'Traé tu proyecto y su documentación.' });
      await expect(reserveReviewBlock(third.pb, course.id, messageReview.id, messageSlot.block, 'Traé tu proyecto.')).rejects.toThrow('indicaciones');
      await expect(third.pb.collection('course_reviews').update(messageReview.id, { bookingMessage: '', expectedRevision: (await messageFresh()).revision, revision: 'a'.repeat(24) })).rejects.toBeDefined();
      await reserveReviewBlock(third.pb, course.id, messageReview.id, messageSlot.block, 'Traé tu proyecto y su documentación.');
      const messageBooking = (await third.pb.collection('review_bookings').getFullList<ReviewBooking>({ filter: `review = "${messageReview.id}"` }))[0];
      await cancelReviewBooking(third.pb, course.id, messageReview.id, messageBooking.id, 'student');
      const { bookingMessage: omittedMessage, ...legacyUpdate } = messageInput;
      void omittedMessage;
      await updateReview(peer.pb, course.id, messageReview.id, (await messageFresh()).revision, legacyUpdate);
      expect((await messageFresh()).bookingMessage).toBe('Traé tu proyecto y su documentación.');
      await updateReview(peer.pb, course.id, messageReview.id, (await messageFresh()).revision, { ...messageInput, bookingMessage: '' });
      await reserveReviewBlock(other.pb, course.id, messageReview.id, messageSlot.block);
      // A Meet room belongs to a range and is visible only while the student is booked.
      const meetingReview = await createReview(teacher.pb, course.id, { ...input, number: 6, title: 'Revisión por Meet' });
      const meetUrl = 'https://meet.google.com/abc-defg-hij';
      const updatedMeetUrl = 'https://zoom.us/j/123456789';
      await saveReviewBlock(peer.pb, course.id, meetingReview.id, meetingReview.revision, null, { ...blockInput, meetUrl });
      const meetingFresh = () => teacher.pb.collection('course_reviews').getOne<Review>(meetingReview.id);
      const meetingSlots = await teacher.pb.collection('review_slots').getFullList<ReviewSlot>({ filter: `review = "${meetingReview.id}"`, sort: 'startsAt' });
      const meetingBlock = meetingSlots[0].block;
      const meetingRecord = (await teacher.pb.collection('review_block_meetings').getFullList<ReviewBlockMeeting>({ filter: `block = "${meetingBlock}"` }))[0];
      expect(meetingRecord.url).toBe(meetUrl);
      for (const unauthorized of [student.pb, other.pb, outsider.pb]) {
        expect((await unauthorized.collection('review_block_meetings').getList(1, 1, { filter: `block = "${meetingBlock}"` })).totalItems).toBe(0);
        await expect(unauthorized.collection('review_block_meetings').getOne(meetingRecord.id)).rejects.toBeDefined();
      }
      expect(JSON.stringify(await student.pb.collection('review_blocks').getOne(meetingBlock, { expand: 'review_block_meetings_via_block' }))).not.toContain(meetUrl);
      await reserveReviewBlock(student.pb, course.id, meetingReview.id, meetingBlock);
      const meetingBooking = (await student.pb.collection('review_bookings').getFullList<ReviewBooking>({ filter: `review = "${meetingReview.id}"` }))[0];
      expect((await student.pb.collection('review_block_meetings').getOne(meetingRecord.id)).url).toBe(meetUrl);
      await expect(student.pb.collection('review_block_meetings').update(meetingRecord.id, { url: updatedMeetUrl })).rejects.toBeDefined();
      await expect(student.pb.collection('review_block_meetings').delete(meetingRecord.id)).rejects.toBeDefined();
      await expect(saveReviewMeeting(teacher.pb, otherCourse.id, meetingReview.id, (await meetingFresh()).revision, meetingBlock, updatedMeetUrl)).rejects.toThrow('pertenece');
      await expect(saveReviewMeeting(peer.pb, course.id, meetingReview.id, (await meetingFresh()).revision, meetingBlock, 'javascript:alert(1)')).rejects.toThrow();
      // Link updates remain available with pending reservations and preserve slot identity.
      await saveReviewMeeting(peer.pb, course.id, meetingReview.id, (await meetingFresh()).revision, meetingBlock, updatedMeetUrl);
      expect((await student.pb.collection('review_block_meetings').getOne(meetingRecord.id)).url).toBe(updatedMeetUrl);
      expect((await student.pb.collection('review_bookings').getOne(meetingBooking.id)).slot).toBe(meetingBooking.slot);
      await cancelReviewBooking(student.pb, course.id, meetingReview.id, meetingBooking.id, 'student');
      await reserveReviewBlock(other.pb, course.id, meetingReview.id, meetingBlock);
      await expect(student.pb.collection('review_block_meetings').getOne(meetingRecord.id)).rejects.toBeDefined();
      expect((await other.pb.collection('review_block_meetings').getOne(meetingRecord.id)).url).toBe(updatedMeetUrl);
      await saveReviewMeeting(peer.pb, course.id, meetingReview.id, (await meetingFresh()).revision, meetingBlock, '');
      expect((await other.pb.collection('review_block_meetings').getList(1, 1, { filter: `block = "${meetingBlock}"` })).totalItems).toBe(0);
      await saveReviewMeeting(teacher.pb, course.id, meetingReview.id, (await meetingFresh()).revision, meetingBlock, meetUrl);
      expect((await other.pb.collection('review_block_meetings').getFullList<ReviewBlockMeeting>({ filter: `block = "${meetingBlock}"` }))[0].url).toBe(meetUrl);
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
