import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyReviewAppointmentsSchema } from './review-appointments-schema.mjs';

try {
  const pb = await testAdmin();
  await mkdir('backups/pocketbase', { recursive: true });
  const settings = await pb.settings.getAll();
  await writeFile(`backups/pocketbase/review-appointments-${Date.now()}.json`, JSON.stringify({ collections: await pb.collections.getFullList(), batch: settings.batch }, null, 2), { flag: 'wx' });
  await applyReviewAppointmentsSchema(pb);
  console.log('Revisiones: esquema y lotes configurados con respaldo. Los cursos existentes no se habilitaron.');
} catch (error) {
  console.error('No se pudo aplicar el esquema de revisiones.', error.status || '', error.response?.data || error.message);
  process.exitCode = 1;
}
