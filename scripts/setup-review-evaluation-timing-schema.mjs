import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyReviewEvaluationTimingSchema } from './review-evaluation-timing-schema.mjs';

try {
  const pb = await testAdmin();
  const collections = await Promise.all(['review_bookings', 'review_booking_notes'].map(name => pb.collections.getOne(name)));
  await mkdir('backups/pocketbase', { recursive: true });
  await writeFile(`backups/pocketbase/review-evaluation-timing-${Date.now()}.json`, JSON.stringify({ collections }, null, 2), { flag: 'wx' });
  await applyReviewEvaluationTimingSchema(pb);
  console.log('Evaluación desde el inicio configurada con respaldo. No se modificaron reservas, turnos ni evaluaciones.');
} catch (error) {
  console.error('No se pudo configurar la evaluación desde el inicio.', error.status || '', error.message);
  process.exitCode = 1;
}
