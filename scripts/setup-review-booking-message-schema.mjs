import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyReviewBookingMessageSchema } from './review-appointments-schema.mjs';

try {
  const pb = await testAdmin();
  await mkdir('backups/pocketbase', { recursive: true });
  await writeFile(`backups/pocketbase/review-booking-message-${Date.now()}.json`, JSON.stringify({ collection: await pb.collections.getOne('course_reviews') }, null, 2), { flag: 'wx' });
  await applyReviewBookingMessageSchema(pb);
  console.log('Mensaje previo a la reserva: esquema configurado con respaldo, sin modificar revisiones ni reservas existentes.');
} catch (error) {
  console.error('No se pudo aplicar el esquema del mensaje previo.', error.status || '', error.response?.data || error.message);
  process.exitCode = 1;
}
