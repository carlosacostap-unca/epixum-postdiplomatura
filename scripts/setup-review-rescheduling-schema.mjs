import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyReviewReschedulingSchema } from './review-appointments-schema.mjs';

try {
  const pb = await testAdmin();
  await mkdir('backups/pocketbase', { recursive: true });
  const collections = await Promise.all(['review_blocks', 'review_slots'].map(name => pb.collections.getOne(name)));
  await writeFile(`backups/pocketbase/review-rescheduling-${Date.now()}.json`, JSON.stringify({ collections }, null, 2), { flag: 'wx' });
  await applyReviewReschedulingSchema(pb);
  console.log('Reprogramación de franjas configurada con respaldo. No se modificaron franjas, turnos ni reservas.');
} catch (error) {
  console.error('No se pudo configurar la reprogramación de franjas.', error.status || '', error.message);
  process.exitCode = 1;
}
