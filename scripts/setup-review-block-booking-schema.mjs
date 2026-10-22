import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyReviewBlockBookingSchema } from './review-appointments-schema.mjs';

try {
  const pb = await testAdmin();
  await mkdir('backups/pocketbase', { recursive: true });
  await writeFile(`backups/pocketbase/review-block-booking-${Date.now()}.json`, JSON.stringify({ collections: await pb.collections.getFullList() }, null, 2), { flag: 'wx' });
  await applyReviewBlockBookingSchema(pb);
  console.log('Reserva por franja: esquema configurado con respaldo. Las reservas existentes se conservan.');
} catch (error) {
  console.error('No se pudo aplicar el esquema de reserva por franja.', error.status || '', error.response?.data || error.message);
  process.exitCode = 1;
}
