import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyReviewBookingNotesSchema } from './review-appointments-schema.mjs';

try {
  const pb = await testAdmin();
  await mkdir('backups/pocketbase', { recursive: true });
  await writeFile(`backups/pocketbase/review-booking-notes-${Date.now()}.json`, JSON.stringify({ collections: await pb.collections.getFullList() }, null, 2), { flag: 'wx' });
  await applyReviewBookingNotesSchema(pb);
  console.log('Notas privadas de revisiones: esquema configurado con respaldo, sin modificar reservas ni evaluaciones existentes.');
} catch (error) {
  console.error('No se pudo aplicar el esquema de notas privadas.', error.status || '', error.response?.data || error.message);
  process.exitCode = 1;
}
