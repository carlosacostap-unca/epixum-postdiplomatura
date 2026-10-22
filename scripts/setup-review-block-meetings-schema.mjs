import { mkdir, writeFile } from 'node:fs/promises';
import { testAdmin } from './live-test-fixtures.mjs';
import { applyReviewBlockMeetingsSchema } from './review-appointments-schema.mjs';

try {
  const pb = await testAdmin();
  await mkdir('backups/pocketbase', { recursive: true });
  await writeFile(`backups/pocketbase/review-block-meetings-${Date.now()}.json`, JSON.stringify({ collections: await pb.collections.getFullList() }, null, 2), { flag: 'wx' });
  await applyReviewBlockMeetingsSchema(pb);
  console.log('Sala de reunión por franja: esquema configurado con respaldo, sin modificar turnos ni reservas existentes.');
} catch (error) {
  console.error('No se pudo configurar el esquema de salas de reunión por franja.', error.status || '', error.response?.data || error.message);
  process.exitCode = 1;
}
